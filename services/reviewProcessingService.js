import { supabase } from '../config/db.js';
import { analyzeOcrText } from './mockOpenaiService.js'; // 모킹 서비스 사용
import MockOcrService from './mockOcrService.js'; // 모킹 OCR 서비스 사용
import { v4 as uuidv4 } from 'uuid';

class ReviewProcessingService {
  constructor() {
    this.ocrService = new MockOcrService(); // 모킹 OCR 서비스 사용
    console.log('[INFO] ReviewProcessingService 초기화 완료 (모킹 모드)');
  }

  /**
   * 이미지 파일을 OCR → GPT → DB 저장하는 전체 플로우
   */
  async processImageToDatabase(imageFile, storeId, userId = null) {
    const processId = uuidv4();
    console.log(`[INFO] [${processId}] 리뷰 이미지 처리 시작: ${imageFile.originalname}`);

    try {
      // 1단계: OCR 처리
      console.log(`[DEBUG] [${processId}] OCR 처리 시작`);
      const rawText = await this.ocrService.processImage(imageFile.path);
      console.log(`[DEBUG] [${processId}] OCR 처리 완료: ${rawText.length}자`);

      // 2단계: GPT로 텍스트 정리 및 구조화
      console.log(`[DEBUG] [${processId}] GPT 분석 시작`);
      const structuredReviews = await analyzeOcrText(rawText);
      console.log(`[DEBUG] [${processId}] GPT 분석 완료: ${structuredReviews.length}개 리뷰 추출`);

      // 3단계: DB 저장
      console.log(`[DEBUG] [${processId}] DB 저장 시작`);
      const savedReviews = await this.saveReviewsToDatabase(
        structuredReviews, 
        rawText, 
        storeId, 
        userId, 
        imageFile.path
      );
      console.log(`[INFO] [${processId}] DB 저장 완료: ${savedReviews.length}개 리뷰 저장`);

      // 🎯 리뷰 처리 완료 후 업로드된 이미지 파일 자동 삭제 (모바일 앱 호환)
      try {
        await fs.unlink(imageFile.path);
        console.log(`🗑️ 리뷰 처리 완료 후 파일 자동 삭제: ${imageFile.filename}`);
      } catch (deleteError) {
        console.error(`⚠️ 리뷰 처리 완료 후 파일 자동 삭제 실패: ${imageFile.filename}`, deleteError);
      }
      
      return {
        success: true,
        processId,
        totalReviews: structuredReviews.length,
        savedReviews: savedReviews.length,
        rawTextLength: rawText.length
      };

    } catch (error) {
      console.error(`[ERROR] [${processId}] 리뷰 처리 실패:`, error.message);
      
      // 에러 상태로 DB에 기록
      await this.saveErrorRecord(storeId, userId, imageFile.path, error.message, processId);
      
      // 🎯 에러 발생 시에도 업로드된 이미지 파일 자동 삭제 (모바일 앱 호환)
      try {
        await fs.unlink(imageFile.path);
        console.log(`🗑️ 에러 발생 후 파일 자동 삭제: ${imageFile.filename}`);
      } catch (deleteError) {
        console.error(`⚠️ 에러 발생 후 파일 자동 삭제 실패: ${imageFile.filename}`, deleteError);
      }
      
      throw new Error(`리뷰 처리 실패: ${error.message}`);
    }
  }

  /**
   * 구조화된 리뷰를 데이터베이스에 저장
   */
  async saveReviewsToDatabase(structuredReviews, rawText, storeId, userId, imagePath) {
    const savedReviews = [];

    for (const review of structuredReviews) {
      try {
        const reviewData = {
          id: uuidv4(),
          store_id: storeId,
          user_id: userId,
          raw_text: rawText,
          cleaned_text: review.리뷰,
          sentiment: {
            type: review.감정,
            confidence: 0.9, // GPT 분석 결과이므로 높은 신뢰도
            analysis_date: new Date().toISOString()
          },
          keywords: [
            ...(review.장점키워드 || []),
            ...(review.단점키워드 || [])
          ],
          summary: this.generateSummary(review),
          ocr_image_url: imagePath,
          status: 'processed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('store_reviews')  // 테이블명 변경
          .insert([reviewData])
          .select();

        if (error) {
          console.error(`[ERROR] 리뷰 저장 실패:`, error);
          throw error;
        }

        savedReviews.push(data[0]);
        console.log(`[DEBUG] 리뷰 저장 성공: ${reviewData.id}`);

      } catch (error) {
        console.error(`[ERROR] 개별 리뷰 저장 실패:`, error.message);
        // 개별 실패는 로그만 남기고 계속 진행
      }
    }

    return savedReviews;
  }

  /**
   * 에러 발생 시 에러 레코드 저장
   */
  async saveErrorRecord(storeId, userId, imagePath, errorMessage, processId) {
    try {
      const errorData = {
        id: uuidv4(),
        store_id: storeId,
        user_id: userId,
        raw_text: '',
        cleaned_text: '',
        sentiment: [],
        keywords: [],
        summary: '',
        ocr_image_url: imagePath,
        status: 'error',
        error_message: `[${processId}] ${errorMessage}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('store_reviews')  // 테이블명 변경
        .insert([errorData]);

      if (error) {
        console.error(`[ERROR] 에러 레코드 저장 실패:`, error);
      } else {
        console.log(`[DEBUG] 에러 레코드 저장 완료: ${errorData.id}`);
      }

    } catch (error) {
      console.error(`[ERROR] 에러 레코드 저장 중 추가 오류:`, error.message);
    }
  }

  /**
   * 리뷰 요약 생성
   */
  generateSummary(review) {
    const sentiment = review.감정;
    const pros = review.장점키워드?.length > 0 ? review.장점키워드.join(', ') : '없음';
    const cons = review.단점키워드?.length > 0 ? review.단점키워드.join(', ') : '없음';
    
    return `${sentiment} 리뷰입니다. 장점: ${pros}, 단점: ${cons}`;
  }

  /**
   * 배치 이미지 처리
   */
  async processBatchImages(imageFiles, storeId, userId = null) {
    console.log(`[INFO] 배치 이미지 처리 시작: ${imageFiles.length}개 파일`);
    
    const results = [];
    const batchId = uuidv4();

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      console.log(`[DEBUG] [${batchId}] ${i + 1}/${imageFiles.length} 파일 처리: ${file.originalname}`);
      
      try {
        const result = await this.processImageToDatabase(file, storeId, userId);
        results.push({
          filename: file.originalname,
          success: true,
          ...result
        });
      } catch (error) {
        console.error(`[ERROR] [${batchId}] 파일 처리 실패: ${file.originalname}`, error.message);
        
        // 🎯 에러 발생 시에도 업로드된 이미지 파일 자동 삭제 (모바일 앱 호환)
        try {
          await fs.unlink(file.path);
          console.log(`🗑️ 배치 처리 에러 후 파일 자동 삭제: ${file.filename}`);
        } catch (deleteError) {
          console.error(`⚠️ 배치 처리 에러 후 파일 자동 삭제 실패: ${file.filename}`, deleteError);
        }
        
        results.push({
          filename: file.originalname,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[INFO] [${batchId}] 배치 처리 완료: ${successCount}/${imageFiles.length} 성공`);

    return {
      batchId,
      totalFiles: imageFiles.length,
      successCount,
      failedCount: imageFiles.length - successCount,
      results
    };
  }

  /**
   * 처리된 리뷰 조회
   */
  async getProcessedReviews(storeId, options = {}) {
    try {
      let query = supabase
        .from('store_reviews')  // 테이블명 변경
        .select('*')
        .eq('store_id', storeId)
        .eq('status', 'processed');

      // 날짜 범위 필터링
      if (options.startDate) {
        query = query.gte('created_at', options.startDate);
      }
      if (options.endDate) {
        query = query.lte('created_at', options.endDate);
      }

      // 감정별 필터링
      if (options.sentiment) {
        query = query.contains('sentiment', { type: options.sentiment });
      }

      // 정렬
      query = query.order('created_at', { ascending: false });

      // 페이지네이션
      if (options.page && options.limit) {
        const from = (options.page - 1) * options.limit;
        const to = from + options.limit - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        reviews: data || [],
        total: count || 0,
        page: options.page || 1,
        limit: options.limit || 10
      };

    } catch (error) {
      console.error(`[ERROR] 리뷰 조회 실패:`, error.message);
      throw new Error(`리뷰 조회 실패: ${error.message}`);
    }
  }

  /**
   * 서비스 정리
   */
  async cleanup() {
    try {
      await this.ocrService.cleanup();
      console.log('[INFO] ReviewProcessingService 정리 완료');
    } catch (error) {
      console.error('[ERROR] ReviewProcessingService 정리 실패:', error.message);
    }
  }
}

export default ReviewProcessingService;
