import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import path from 'path';
import { promises as fs } from 'fs';
import pLimit from 'p-limit';
import levenshtein from 'fast-levenshtein';

// 🎯 상수 설정 import 추가
import { OCR_CONFIG } from '../../config/constants.js';

class OcrService {
  constructor() {
    // 🎯 Tesseract.js 최적화 설정
    this.config = {
          // 이미지 분할 설정
    maxChunkHeight: OCR_CONFIG.MAX_CHUNK_HEIGHT,
    overlap: parseInt(process.env.OCR_OVERLAP) || 200,
    minLastChunk: parseInt(process.env.OCR_MIN_LAST_CHUNK) || 500,
    maxChunks: parseInt(process.env.OCR_MAX_CHUNKS) || 100,
    concurrency: parseInt(process.env.OCR_CONCURRENCY) || 3,
    resizeWidth: OCR_CONFIG.RESIZE_WIDTH,
    retries: parseInt(process.env.OCR_RETRIES) || 3,
    
    // 전처리 설정 (가이드 기반 최적화)
    thresholdValue: OCR_CONFIG.THRESHOLD_VALUE,
      jpegQuality: parseInt(process.env.OCR_JPEG_QUALITY) || 90,
      contrastMultiplier: parseFloat(process.env.OCR_CONTRAST_MULTIPLIER) || 1.8,
      brightnessOffset: parseFloat(process.env.OCR_BRIGHTNESS_OFFSET) || -0.3,
      sharpenSigma: parseFloat(process.env.OCR_SHARPEN_SIGMA) || 2.0,
      useAdaptiveThreshold: process.env.OCR_USE_ADAPTIVE_THRESHOLD === 'true',
      
      // 고급 샤픈 설정
      sharpenM1: parseFloat(process.env.OCR_SHARPEN_M1) || 1.5,
      sharpenM2: parseFloat(process.env.OCR_SHARPEN_M2) || 1.0,
      sharpenX1: parseFloat(process.env.OCR_SHARPEN_X1) || 3.0,
      sharpenY2: parseFloat(process.env.OCR_SHARPEN_Y2) || 3.0,
      sharpenY3: parseFloat(process.env.OCR_SHARPEN_Y3) || 0.1,
      medianRadius: parseInt(process.env.OCR_MEDIAN_RADIUS) || 2,
      
      // Tesseract.js 최적화 설정
      language: process.env.TESSERACT_LANGUAGE || 'kor+eng',
      oem: parseInt(process.env.TESSERACT_OEM) || 1, // LSTM 기반
      psm: parseInt(process.env.TESSERACT_PSM) || 4,  // 한 컬럼 텍스트 (긴 스크롤용)
      
      // 후처리 설정
      minLineLength: parseInt(process.env.OCR_MIN_LINE_LENGTH) || 6,
      similarityThreshold: parseFloat(process.env.OCR_SIMILARITY_THRESHOLD) || 0.2,
      
      // 이미지 품질 설정
      minDpi: parseInt(process.env.OCR_MIN_DPI) || 300,
      minFontSize: parseInt(process.env.OCR_MIN_FONT_SIZE) || 12
    };
    
    console.log('✅ OCR 서비스 초기화 완료 (Tesseract.js 지연 로딩)');
  }

  /**
   * 🎯 Tesseract.js OCR 실행
   */
  async _ocrFromBuffer(buffer) {
    try {
      // 🎯 Tesseract.js v6 최신 API 사용
      const result = await Tesseract.recognize(buffer, 'kor+eng', {
        logger: m => {
          if (process.env.NODE_ENV === 'development' && m.status === 'recognizing text') {
            console.log(`OCR 진행률: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      // 🎯 텍스트 정리
      return this._cleanText(result.data.text);
    } catch (error) {
      console.error('❌ Tesseract.js OCR 실패:', error);
      throw new Error(`OCR 인식 실패: ${error.message}`);
    }
  }

  /**
   * 🎯 단일 이미지 OCR 처리
   */
  async _documentTextDetection(filePath) {
    try {
      // 🎯 이미지 전처리 (가이드 기반)
      const buffer = await this._preprocessImage(filePath);
      
      // 🎯 OCR 처리
      return await this._ocrWithRetry(buffer);
    } catch (error) {
      console.error('❌ 단일 이미지 OCR 실패:', error);
      throw new Error(`OCR 처리 실패: ${error.message}`);
    }
  }

  /**
   * 🎯 이미지 전처리 (가이드 기반 최적화)
   */
  async _preprocessImage(filePath) {
    const img = sharp(filePath);
    
    // 🎯 이미지 품질 검증
    const { width, height } = await img.metadata();
    
    // 🎯 해상도가 낮으면 리사이즈로 개선
    let processedImg = img;
    if (width < 800 || height < 600) {
      processedImg = processedImg.resize({ 
        width: Math.max(800, width * 1.5),
        height: Math.max(600, height * 1.5),
        kernel: 'lanczos3' // 🎯 고품질 리사이즈
      });
    }
    
    // 🎯 전처리 파이프라인 (가이드 기반)
    return await processedImg
      .grayscale() // 🎯 그레이스케일 변환
      .linear(this.config.contrastMultiplier, this.config.brightnessOffset) // 🎯 대비 향상
      .sharpen({ 
        sigma: this.config.sharpenSigma,
        m1: this.config.sharpenM1,
        m2: this.config.sharpenM2,
        x1: this.config.sharpenX1,
        y2: this.config.sharpenY2,
        y3: this.config.sharpenY3
      }) // 🎯 다층 샤픈 시스템
      .threshold(this.config.thresholdValue) // 🎯 환경변수 기반 이진화
      .median(this.config.medianRadius) // 🎯 노이즈 제거
      .png() // 🎯 PNG로 저장
      .toBuffer();
  }

  /**
   * 🎯 텍스트 정리 및 후처리 (이미지 영역, 이모티콘 제거)
   */
  _cleanText(text) {
    if (!text) return '';
    
    return text
      // 🎯 이모티콘 제거 (유니코드 범위)
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // 이모티콘
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // 기타 기호
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // 교통 기호
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // 보충 기호
      .replace(/[\u{2600}-\u{26FF}]/gu, '')   // 기상 기호
      .replace(/[\u{2700}-\u{27BF}]/gu, '')   // 장식 기호
      
      // 🎯 이미지 관련 텍스트 패턴 제거
      .replace(/[가-힣]*\s*[이미지|사진|그림]\s*[가-힣]*/g, '')
      .replace(/[가-힣]*\s*>\s*$/gm, '') // 끝에 > 있는 라인
      .replace(/[가-힣]*\s*[시세|나이]\s*[가-힣]*/g, '') // 특정 키워드
      
      // 🎯 특수문자 과다 라인 제거 (적절한 강도로 조정)
      .split('\n')
      .filter(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) return false;
        
        // 🎯 특수문자 비율 계산
        const specialCharCount = (trimmedLine.match(/[^\w가-힣\s]/g) || []).length;
        const specialCharRatio = specialCharCount / trimmedLine.length;
        
        // 🎯 특수문자가 70% 이상인 라인만 제거 (30% → 70%로 완화)
        if (specialCharRatio > 0.7) return false;
        
        // 🎯 순수 특수문자만 있는 라인 제거
        if (/^[^\w가-힣]*$/.test(trimmedLine)) return false;
        
        // 🎯 이미지 영역으로 보이는 패턴 제거
        if (/[가-힣]*\s*>\s*$/.test(trimmedLine)) return false;
        if (/[가-힣]*\s*[시세|나이]\s*[가-힣]*/.test(trimmedLine)) return false;
        
        // 🎯 의미 없는 짧은 라인 제거 (1글자 이하)
        if (trimmedLine.length <= 1 && specialCharRatio > 0.5) return false;
        
        return true;
      })
      .join('\n')
      
      // 🎯 기본 정리
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\s+\n/g, '\n')
      .trim();
  }

  /**
   * 🎯 청크 결과 병합 및 중복 제거 (가이드 기반)
   */
  _finalizeTextFromChunks(chunks) {
    if (chunks.length === 0) return '';
    if (chunks.length === 1) return chunks[0].trim();

    const merged = [chunks[0].trim()];

    for (let i = 1; i < chunks.length; i++) {
      const prev = merged[i - 1].split('\n');
      const curr = chunks[i].trim().split('\n');
      
      // 🎯 Levenshtein 거리로 중복 제거 (가이드 기반)
      const filtered = curr.filter(line => {
        if (line.length < this.config.minLineLength) return true;
        
        return !prev.some(prevLine => {
          const distance = levenshtein.get(prevLine, line);
          const maxLength = Math.max(prevLine.length, line.length);
          return distance / maxLength < this.config.similarityThreshold; // 🎯 20% 유사도 기준
        });
      });

      merged.push(filtered.join('\n'));
    }

    return merged.join('\n\n');
  }

  /**
   * 🎯 회색 연한 글씨 최적화 설정
   */
  async optimizeForGrayText(filePath) {
    try {
      const img = sharp(filePath);
      
      // 🎯 회색 글씨 최적화 전처리 (가이드 기반)
      const buffer = await img
        .resize({ width: this.config.resizeWidth }) // 🎯 환경변수 기반 리사이즈
        .grayscale()
        .linear(2.0, -0.3) // 🎯 대비 2배, 밝기 -0.3
        .sharpen({ 
          sigma: 2.0, // 🎯 강한 샤픈
          m1: 1.5, m2: 1.0, // 🎯 다층 샤픈
          x1: 3, y2: 3, y3: 0.1 // 🎯 방향별 샤픈
        })
        .threshold(this.config.thresholdValue + 22) // 🎯 기본 임계값 + 22 (회색 글씨 최적화)
        .median(2) // 🎯 노이즈 제거
        .png() // 🎯 압축 손실 방지
        .toBuffer();
      
      return await this._ocrWithRetry(buffer);
    } catch (error) {
      console.error('❌ 회색 글씨 최적화 실패:', error);
      throw new Error(`회색 글씨 최적화 실패: ${error.message}`);
    }
  }

  /**
   * 🎯 메인 OCR 처리 메서드 (긴 이미지 자동 분할 지원)
   */
  async processImage(filePath) {
    try {
      console.log(`🔍 이미지 처리 시작: ${path.basename(filePath)}`);
      
      // 🎯 이미지 메타데이터 확인
      const img = sharp(filePath);
      const { width, height } = await img.metadata();
      
      console.log(`📏 이미지 크기: ${width}x${height}px`);
      
      // 🎯 이미지 품질 검증 (가이드 기반)
      if (height < 100) {
        throw new Error('이미지가 너무 작습니다. 최소 100px 높이가 필요합니다.');
      }
      
      // 🎯 긴 이미지 자동 분할 처리
      if (height > this.config.maxChunkHeight) {
        console.log(`✂️ 긴 이미지 분할 처리 시작: ${height}px → ${Math.ceil(height / this.config.maxChunkHeight)}개 청크`);
        return await this._processImageWithSplitting(filePath);
      } else {
        console.log(`🔄 단일 이미지 처리`);
        return await this._documentTextDetection(filePath);
      }
    } catch (error) {
      console.error('❌ 이미지 처리 실패:', error);
      throw new Error(`OCR 처리 실패: ${error.message}`);
    }
  }

  /**
   * 🎯 긴 이미지 자동 분할 처리 (가이드 기반 최적화)
   */
  async _processImageWithSplitting(filePath) {
    const img = sharp(filePath);
    const { width, height } = await img.metadata();
    
    // 🎯 스마트 분할 로직
    const chunks = await this._splitImageIntoChunks(img, height);
    console.log(`✅ 이미지 분할 완료: ${chunks.length}개 청크`);
    
    // 🎯 병렬 처리 (동시성 제한)
    const limit = pLimit(this.config.concurrency);
    const tasks = chunks.map(({ top, height: chunkHeight }) => 
      limit(() => this._processChunk(filePath, top, chunkHeight, width))
    );
    
    // 🎯 모든 청크를 병렬로 처리
    const chunkResults = await Promise.all(tasks);
    console.log(`✅ 청크 처리 완료: ${chunkResults.length}개 결과`);
    
    // 🎯 결과 병합 및 중복 제거
    const finalText = this._finalizeTextFromChunks(chunkResults);
    console.log(`✅ 텍스트 병합 완료: ${finalText.length}자`);
    
    return finalText;
  }

  /**
   * 🎯 스마트 이미지 분할 알고리즘 (가이드 기반)
   */
  async _splitImageIntoChunks(img, totalHeight) {
    const chunks = [];
    let y = 0;
    let chunkCount = 0;
    
    while (y < totalHeight && chunkCount < this.config.maxChunks) {
      // 🎯 각 청크의 높이 계산
      let chunkHeight = Math.min(this.config.maxChunkHeight, totalHeight - y);
      
      // 🎯 마지막 청크가 너무 작으면 앞 청크에 합치기
      const remainingHeight = totalHeight - (y + chunkHeight);
      if (remainingHeight > 0 && remainingHeight < this.config.minLastChunk) {
        chunkHeight = totalHeight - y;
        console.log(`🔗 마지막 청크를 앞 청크에 합침: height=${chunkHeight}px`);
      }
      
      chunks.push({ top: y, height: chunkHeight });
      chunkCount++;
      
      // 🎯 다음 청크 시작 위치 (오버랩 고려)
      const nextY = y + chunkHeight - this.config.overlap;
      y = nextY;
      
      // 🎯 무한 루프 방지
      if (y >= totalHeight) break;
    }
    
    return chunks;
  }

  /**
   * 🎯 개별 청크 처리 (전처리 + OCR)
   */
  async _processChunk(filePath, top, height, originalWidth) {
    try {
      const img = sharp(filePath);
      
      // 🎯 특정 영역 추출 및 전처리 (가이드 기반)
      const buffer = await img
        .extract({ 
          left: 0,
          top: top,
          width: originalWidth,
          height: height
        })
        .resize({ width: this.config.resizeWidth }) // 🎯 적당한 크기로 리사이즈
        .grayscale() // 🎯 그레이스케일 변환
        .linear(this.config.contrastMultiplier, this.config.brightnessOffset) // 🎯 대비 향상
        .sharpen({ 
          sigma: this.config.sharpenSigma,
          m1: this.config.sharpenM1,
          m2: this.config.sharpenM2,
          x1: this.config.sharpenX1,
          y2: this.config.sharpenY2,
          y3: this.config.sharpenY3
        }) // 🎯 다층 샤픈 시스템
        .threshold(this.config.thresholdValue) // 🎯 환경변수 기반 이진화
        .median(this.config.medianRadius) // 🎯 노이즈 제거
        .png() // 🎯 PNG로 저장 (압축 손실 방지)
        .toBuffer();
      
      // 🎯 OCR 처리 및 재시도
      return await this._ocrWithRetry(buffer);
    } catch (error) {
      console.error(`❌ 청크 처리 실패 (top: ${top}, height: ${height}):`, error);
      throw new Error(`청크 처리 실패: ${error.message}`);
    }
  }

  /**
   * 🎯 Tesseract.js OCR 처리 (재시도 로직 포함)
   */
  async _ocrWithRetry(buffer) {
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        return await this._ocrFromBuffer(buffer);
      } catch (error) {
        if (attempt === this.config.retries) {
          throw error;
        }
        
        // 🎯 백오프: 점진적으로 대기 시간 증가
        const delay = OCR_CONFIG.DELAY_BASE * attempt;
        console.log(`🔄 OCR 재시도 ${attempt}/${this.config.retries}, ${delay}ms 대기`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * 🎯 OCR 설정 조회
   */
  getConfig() {
    return {
      ...this.config,
      workerPoolSize: 0 // 워커 풀 관련 정보 제거
    };
  }

  /**
   * 🎯 OCR 설정 업데이트
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('✅ OCR 설정 업데이트 완료');
  }

  /**
   * 🎯 서비스 정리
   */
  async cleanup() {
    // 워커 풀 정리 로직 제거
    console.log('✅ OCR 서비스 정리 완료');
  }
}

export default OcrService;


