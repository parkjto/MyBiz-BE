const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const pLimit = require('p-limit');
const levenshtein = require('fast-levenshtein');

/**
 * OCR 서비스: Google Cloud Vision API 호출 래퍼 + 긴 스크롤 캡처 이미지 분할 처리
 * 실제 호출은 @google-cloud/vision 클라이언트를 런타임 의존성으로 사용
 */
class OcrService {
  constructor() {
    try {
      // Lazy require to avoid crash if module not installed in some envs
      // eslint-disable-next-line global-require
      const vision = require('@google-cloud/vision');
      this.client = new vision.ImageAnnotatorClient();
    } catch (err) {
      // Defer error until first call
      this.initError = err;
    }

    // OCR 설정값 (환경변수에서 로드, 기본값 제공)
    this.config = {
      maxChunkHeight: parseInt(process.env.OCR_MAX_CHUNK_HEIGHT) || 1024,
      overlap: parseInt(process.env.OCR_OVERLAP) || 200,
      minLastChunk: parseInt(process.env.OCR_MIN_LAST_CHUNK) || 512,
      concurrency: parseInt(process.env.OCR_CONCURRENCY) || 3,
      resizeWidth: parseInt(process.env.OCR_RESIZE_WIDTH) || 1024,
      retries: parseInt(process.env.OCR_RETRIES) || 3,
      minLineLength: parseInt(process.env.OCR_MIN_LINE_LENGTH) || 6,
      thresholdValue: parseInt(process.env.OCR_THRESHOLD_VALUE) || 128,
      jpegQuality: parseInt(process.env.OCR_JPEG_QUALITY) || 75
    };
  }

  /**
   * OCR 결과를 구조화된 데이터로 변환
   * @param {string} text
   * @returns {Object}
   */
  _structureOcrResult(text) {
    if (!text) return { reviews: [], menus: [], summary: '' };

    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const reviews = [];
    const menus = [];
    let currentReview = null;

    for (const line of lines) {
      // 리뷰 시작 패턴 감지
      if (line.includes('영수증') || line.includes('결제내역')) {
        if (currentReview) {
          reviews.push(currentReview);
        }
        currentReview = {
          date: this._extractDate(line),
          type: line.includes('영수증') ? '영수증' : '결제내역',
          content: [],
          rating: null
        };
      }
      // 메뉴 및 가격 패턴 감지 (개선된 로직)
      else if (this._isMenuLine(line)) {
        const menuData = this._extractMenuData(line);
        if (menuData) {
          menus.push(menuData);
        }
      }
      // 리뷰 내용 추가
      else if (currentReview && line.length > 5) {
        currentReview.content.push(line);
        
        // 평점 추출 (개선된 로직)
        const rating = this._extractRating(line);
        if (rating && !currentReview.rating) {
          currentReview.rating = rating;
        }
      }
    }

    // 마지막 리뷰 추가
    if (currentReview) {
      reviews.push(currentReview);
    }

    return {
      reviews: reviews.filter(r => r.content.length > 0),
      menus: menus.filter(m => m.name.length > 1 && m.price > 0),
      summary: this._generateSummary(text)
    };
  }

  /**
   * 날짜 추출
   * @param {string} text
   * @returns {string}
   */
  _extractDate(text) {
    const dateMatch = text.match(/(\d{4})\.?\s*(\d{1,2})\.?\s*(\d{1,2})/);
    if (dateMatch) {
      return `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
    }
    return '';
  }

  /**
   * 요약 생성
   * @param {string} text
   * @returns {string}
   */
  _generateSummary(text) {
    const lines = text.split('\n');
    const reviewLines = lines.filter(line => 
      line.includes('맛있어요') || 
      line.includes('친절해요') || 
      line.includes('좋아요') ||
      line.includes('가성비')
    );
    
    if (reviewLines.length > 0) {
      return `총 ${reviewLines.length}개의 긍정적 리뷰가 있습니다. 주요 키워드: ${reviewLines.slice(0, 3).join(', ')}`;
    }
    
    return '리뷰 데이터를 분석했습니다.';
  }

  /**
   * 파일 경로 배열을 받아 OCR 텍스트를 병합하여 반환
   * @param {string[]} filePaths
   * @returns {Promise<Object>}
   */
  async extractMergedText(filePaths) {
    if (this.initError) throw this._makeError(500, 'ERR_OCR_INIT', `OCR 클라이언트 초기화 실패: ${this.initError.message}`);
    if (!Array.isArray(filePaths) || filePaths.length === 0) return { text: '', structured: { reviews: [], menus: [], summary: '' } };

    const texts = await Promise.all(filePaths.map((p) => this._processImageWithSplitting(p)));
    const mergedText = this._postProcess(texts.join('\n'));
    const structured = this._structureOcrResult(mergedText);
    
    return {
      text: mergedText,
      structured
    };
  }

  /**
   * 긴 스크롤 캡처 이미지를 분할하여 OCR 처리
   * @param {string} filePath
   * @returns {Promise<string>}
   */
  async _processImageWithSplitting(filePath) {
    try {
      const img = sharp(filePath);
      const { width, height } = await img.metadata();
      
      // 이미지가 분할이 필요한 크기인지 확인
      if (height <= this.config.maxChunkHeight) {
        return await this._documentTextDetection(filePath);
      }

      // 이미지 분할 및 병렬 OCR 처리
      const chunks = await this._splitImageIntoChunks(img, height);
      const limit = pLimit(this.config.concurrency);
      
      const tasks = chunks.map(({ top, height: chunkHeight }) => 
        limit(() => this._processChunk(filePath, top, chunkHeight, width))
      );

      const chunkResults = await Promise.all(tasks);
      return this._finalizeTextFromChunks(chunkResults);
    } catch (error) {
      throw this._makeError(500, 'ERR_OCR_SPLIT_FAIL', `이미지 분할 처리 실패: ${error.message}`);
    }
  }

  /**
   * 이미지를 청크로 분할
   * @param {sharp.Sharp} img
   * @param {number} totalHeight
   * @returns {Array<{top: number, height: number}>}
   */
  async _splitImageIntoChunks(img, totalHeight) {
    const chunks = [];
    let y = 0;
    
    // 안전장치: 최대 청크 수 제한 (메모리 오버플로우 방지)
    const maxChunks = 100;
    let chunkCount = 0;

    console.log(`🔍 이미지 분할 시작: 총 높이=${totalHeight}px, 최대 청크 높이=${this.config.maxChunkHeight}px`);

    while (y < totalHeight && chunkCount < maxChunks) {
      let chunkHeight = Math.min(this.config.maxChunkHeight, totalHeight - y);
      
      // 마지막 청크가 너무 작으면 앞 청크에 합치기 (overlap 중복 방지)
      const remainingHeight = totalHeight - (y + chunkHeight);
      if (remainingHeight > 0 && remainingHeight < this.config.minLastChunk) {
        chunkHeight = totalHeight - y;
        console.log(`🔗 마지막 청크를 앞 청크에 합침: height=${chunkHeight}px`);
      }

      // 경계값 검증 - Sharp의 extract_area 오류 방지
      if (y + chunkHeight > totalHeight) {
        chunkHeight = totalHeight - y;
      }

      // 최소 높이 보장
      if (chunkHeight <= 0) {
        console.warn(`⚠️ 청크 높이가 0 이하: y=${y}, height=${chunkHeight}`);
        break;
      }

      console.log(`📏 청크 ${chunkCount + 1}: top=${y}, height=${chunkHeight}, 남은 높이=${totalHeight - (y + chunkHeight)}`);

      chunks.push({ top: y, height: chunkHeight });
      
      // 마지막 청크인 경우 더 이상 진행하지 않음
      if (y + chunkHeight >= totalHeight) {
        console.log(`🏁 마지막 청크 도달: y=${y}, height=${chunkHeight}`);
        break;
      }
      
      // 다음 청크의 시작 위치 계산
      const nextY = y + chunkHeight - this.config.overlap;
      
      // 진행이 없으면 무한 루프 방지를 위해 중단
      if (nextY <= y) {
        console.warn(`⚠️ 청크 분할 진행 불가: y=${y}, nextY=${nextY}`);
        break;
      }
      
      y = nextY;
      chunkCount++;
    }

    // 경고: 청크 수가 제한에 도달한 경우
    if (chunkCount >= maxChunks) {
      console.warn(`⚠️ 이미지가 너무 깁니다. 최대 ${maxChunks}개 청크로 제한되었습니다.`);
    }

    console.log(`✅ 이미지 분할 완료: 총 ${chunks.length}개 청크`);
    return chunks;
  }

  /**
   * 개별 청크 처리 (전처리 + OCR)
   * @param {string} filePath
   * @param {number} top
   * @param {number} height
   * @param {number} originalWidth
   * @returns {Promise<string>}
   */
  async _processChunk(filePath, top, height, originalWidth) {
    try {
      // 경계값 검증 - Sharp의 extract_area 오류 방지
      if (top < 0 || height <= 0 || originalWidth <= 0) {
        throw new Error(`잘못된 이미지 추출 파라미터: top=${top}, height=${height}, width=${originalWidth}`);
      }

      console.log(`🔧 청크 처리: top=${top}, height=${height}, width=${originalWidth}`);

      // 각 청크마다 새로운 Sharp 객체 생성
      const img = sharp(filePath);

      // 이미지 전처리: 추출, 리사이즈, 그레이스케일, 샤픈, 이진화, 압축
      const buffer = await img
        .extract({ left: 0, top, width: originalWidth, height })
        .resize({ width: this.config.resizeWidth })
        .grayscale()
        .sharpen()
        .threshold(this.config.thresholdValue)
        .jpeg({ quality: this.config.jpegQuality })
        .toBuffer();

      // OCR 호출 (재시도 로직 포함)
      return await this._ocrWithRetry(buffer);
    } catch (error) {
      throw this._makeError(500, 'ERR_OCR_CHUNK_FAIL', `청크 처리 실패: ${error.message}`);
    }
  }

  /**
   * OCR 호출 (재시도 및 백오프 포함)
   * @param {Buffer} buffer
   * @returns {Promise<string>}
   */
  async _ocrWithRetry(buffer) {
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        return await this._ocrFromBuffer(buffer);
      } catch (error) {
        // 마지막 시도이거나 할당량 초과 에러인 경우
        if (attempt === this.config.retries || 
            error.code === 'RESOURCE_EXHAUSTED' || 
            error.message.includes('quota')) {
          throw error;
        }
        
        // 백오프: 점진적으로 대기 시간 증가
        const delay = 1000 * attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Buffer에서 OCR 실행
   * @param {Buffer} buffer
   * @returns {Promise<string>}
   */
  async _ocrFromBuffer(buffer) {
    try {
      const [result] = await this.client.documentTextDetection({
        image: { content: buffer }
      });
      return result?.fullTextAnnotation?.text || '';
    } catch (error) {
      throw this._makeError(500, 'ERR_OCR_API_FAIL', `Google Vision API 호출 실패: ${error.message}`);
    }
  }

  /**
   * 청크 결과들을 병합하고 중복 제거
   * @param {string[]} chunks
   * @returns {string}
   */
  _finalizeTextFromChunks(chunks) {
    if (chunks.length === 0) return '';
    if (chunks.length === 1) return chunks[0].trim();

    const merged = [chunks[0].trim()];

    for (let i = 1; i < chunks.length; i++) {
      const prev = merged[i - 1].split('\n');
      const curr = chunks[i].trim().split('\n');
      
      // 중복 제거: 최소 라인 길이 이상인 경우에만 유사도 비교
      const filtered = curr.filter(line => {
        if (line.length < this.config.minLineLength) return true;
        
        return !prev.some(prevLine => {
          const distance = levenshtein.get(prevLine, line);
          const maxLength = Math.max(prevLine.length, line.length);
          return distance / maxLength < 0.2; // 20% 유사도 기준
        });
      });

      merged.push(filtered.join('\n'));
    }

    return merged.join('\n\n');
  }

  /**
   * 기존 단일 파일 OCR 처리 (하위 호환성)
   * @param {string} filePath
   * @returns {Promise<string>}
   */
  async _documentTextDetection(filePath) {
    try {
      const [result] = await this.client.documentTextDetection(filePath);
      return result?.fullTextAnnotation?.text || '';
    } catch (err) {
      throw this._makeError(500, 'ERR_OCR_FAIL', `Google Vision 호출 실패: ${err.message}`);
    }
  }

  /**
   * 텍스트 후처리
   * @param {string} text
   * @returns {string}
   */
  _postProcess(text) {
    if (!text) return '';
    
    return text
      // 기본 정리
      .replace(/[\t\r]+/g, ' ')
      .replace(/[^\S\r\n]{2,}/g, ' ') // 연속 공백 정리
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // 제로 너비 공백 제거
      
      // 특수문자 및 불필요한 문자 정리
      .replace(/[^\w\s가-힣\.\,\?\!…\-\/\(\)\:]+/g, '') // 허용할 특수문자만 남김
      
      // 줄바꿈 정리
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      
      // 하이픈 줄바꿈 정리
      .map(line => line.replace(/-\s*\n/g, ''))
      
      // 중복 라인 제거 (유사한 패턴)
      .filter((line, index, arr) => {
        if (index === 0) return true;
        const prevLine = arr[index - 1];
        
        // 완전히 동일한 라인 제거
        if (line === prevLine) return false;
        
        // 매우 유사한 패턴 제거 (예: "답글쓰기", "음식이 맛있어요" 등)
        if (line.length > 3 && prevLine.length > 3) {
          const similarity = 1 - (levenshtein.get(line, prevLine) / Math.max(line.length, prevLine.length));
          if (similarity > 0.8) return false;
        }
        
        return true;
      })
      
      // 빈 줄 제거 후 다시 결합
      .join('\n')
      .replace(/\n{3,}/g, '\n\n') // 3개 이상 연속 줄바꿈을 2개로
      .trim();
  }

  /**
   * 에러 생성 헬퍼
   * @param {number} statusCode
   * @param {string} code
   * @param {string} message
   * @returns {Error}
   */
  _makeError(statusCode, code, message) {
    const e = new Error(message);
    e.statusCode = statusCode;
    e.code = code;
    return e;
  }

  /**
   * 현재 OCR 설정 조회 (디버깅용)
   * @returns {Object}
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * 메뉴 라인인지 판단
   * @param {string} line
   * @returns {boolean}
   */
  _isMenuLine(line) {
    // 날짜 패턴이 아닌 경우만 메뉴로 간주
    if (line.match(/^\d{4}\.\s*\d{1,2}\.\s*\d{1,2}/)) return false;
    
    // 메뉴명으로 적합하지 않은 패턴들 제외
    const excludePatterns = [
      /^[0-9\s\.]+$/, // 숫자와 점만 있는 경우
      /^[가-힣\s]+[0-9]+$/, // 한글 + 숫자만 있는 경우
      /답글쓰기/, // 답글쓰기
      /음식이\s*맛있어요/, // 음식이 맛있어요
      /친절해요/, // 친절해요
      /가성비가\s*좋아요/, // 가성비가 좋아요
      /매장이\s*청결해요/, // 매장이 청결해요
      /재료가\s*신선해요/, // 재료가 신선해요
      /혼밥하기\s*좋아요/, // 혼밥하기 좋아요
      /치맥하기\s*좋아요/, // 치맥하기 좋아요
      /원정갔습니다/, // 원정갔습니다
      /단골\s*맥주집/, // 단골 맥주집
      /광고/, // 광고
      /리뷰/, // 리뷰
      /고객\s*통계/, // 고객 통계
      /비즈니스\s*스쿨/, // 비즈니스 스쿨
      /금융지원/, // 금융지원
      /NAVER/, // NAVER
      /LG\s*U/, // LG U
      /AD/, // AD
      /전체/, // 전체
      /작성일순/, // 작성일순
      /키워드설정/, // 키워드설정
      /방문자리뷰\s*블로그/ // 방문자리뷰 블로그
    ];
    
    for (const pattern of excludePatterns) {
      if (pattern.test(line)) return false;
    }
    
    // 가격 패턴이 있는지 확인 (원 단위)
    const hasPrice = line.match(/\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*원/);
    
    // 메뉴명이 2글자 이상이고 가격이 있는 경우
    return line.length >= 2 && line.length <= 30 && hasPrice;
  }

  /**
   * 메뉴 데이터 추출
   * @param {string} line
   * @returns {Object|null}
   */
  _extractMenuData(line) {
    // 가격 패턴 매칭 (원, , 등 포함)
    const priceMatch = line.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*원?/);
    if (!priceMatch) return null;

    const price = parseFloat(priceMatch[1].replace(/,/g, ''));
    const name = line.replace(priceMatch[0], '').trim();
    
    // 메뉴명이 너무 짧거나 숫자만 있는 경우 제외
    if (name.length < 2 || /^\d+$/.test(name)) return null;
    
    return { name, price };
  }

  /**
   * 평점 추출 (개선된 로직)
   * @param {string} line
   * @returns {number|null}
   */
  _extractRating(line) {
    // "맛있어요 4" 패턴
    const ratingMatch = line.match(/맛있어요\s*(\d)/);
    if (ratingMatch) return parseInt(ratingMatch[1]);
    
    // "음식이 맛있어요 4" 패턴
    const ratingMatch2 = line.match(/음식이\s*맛있어요\s*(\d)/);
    if (ratingMatch2) return parseInt(ratingMatch2[1]);
    
    // "친절해요 3" 패턴
    const ratingMatch3 = line.match(/친절해요\s*(\d)/);
    if (ratingMatch3) return parseInt(ratingMatch3[1]);
    
    return null;
  }
}

module.exports = new OcrService();


