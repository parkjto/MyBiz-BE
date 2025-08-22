import ReviewProcessingService from '../services/reviewProcessingService.js';
import { supabase } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

// 🎯 ReviewProcessingService 인스턴스 생성
const reviewProcessingService = new ReviewProcessingService();

/**
 * 🎯 통합 리뷰 처리 플로우 (이미지 업로드 → GPT → DB 저장)
 * POST /api/review-processing/integrated-flow
 */
export const integratedReviewFlow = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        code: 'ERR_NO_FILE',
        message: '이미지 파일이 필요합니다.'
      });
    }

    console.log('🔄 통합 리뷰 처리 시작:', req.file.filename);

    // 🎯 테스트용 store_id와 user_id 설정 (실제로는 인증에서 가져와야 함)
    const storeId = req.body.storeId || uuidv4();
    const userId = req.body.userId || null;

    // 🎯 ReviewProcessingService를 통한 전체 플로우 실행
    const result = await reviewProcessingService.processImageToDatabase(
      req.file, 
      storeId, 
      userId
    );

    console.log('✅ 통합 리뷰 처리 완료:', result);

    res.json({
      success: true,
      message: '통합 리뷰 처리 완료',
      result: {
        processId: result.processId,
        totalReviews: result.totalReviews,
        savedReviews: result.savedReviews,
        rawTextLength: result.rawTextLength,
        filename: req.file.filename,
        originalName: req.file.originalname,
        storeId: storeId,
        userId: userId
      }
    });

  } catch (error) {
    console.error('❌ 통합 리뷰 처리 실패:', error);
    res.status(500).json({
      success: false,
      code: 'ERR_INTEGRATED_FLOW_FAIL',
      message: '통합 리뷰 처리 실패',
      error: error.message
    });
  }
};

/**
 * 🎯 배치 리뷰 처리 (여러 이미지 동시 처리)
 * POST /api/review-processing/batch
 */
export const batchReviewProcessing = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'ERR_NO_FILES',
        message: '최소 1개 이상의 이미지 파일이 필요합니다.'
      });
    }

    console.log(`🔄 배치 리뷰 처리 시작: ${req.files.length}개 파일`);

    // 🎯 테스트용 store_id와 user_id 설정
    const storeId = req.body.storeId || uuidv4();
    const userId = req.body.userId || null;

    // 🎯 배치 처리 실행
    const result = await reviewProcessingService.processBatchImages(
      req.files, 
      storeId, 
      userId
    );

    console.log('✅ 배치 리뷰 처리 완료:', result);

    res.json({
      success: true,
      message: '배치 리뷰 처리 완료',
      result: {
        batchId: result.batchId,
        totalFiles: result.totalFiles,
        successCount: result.successCount,
        failedCount: result.failedCount,
        results: result.results
      }
    });

  } catch (error) {
    console.error('❌ 배치 리뷰 처리 실패:', error);
    res.status(500).json({
      success: false,
      code: 'ERR_BATCH_PROCESSING_FAIL',
      message: '배치 리뷰 처리 실패',
      error: error.message
    });
  }
};

/**
 * 🎯 처리된 리뷰 조회
 * GET /api/review-processing/reviews/:storeId
 */
export const getProcessedReviews = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page = 1, limit = 10, startDate, endDate, sentiment } = req.query;

    console.log(`🔍 처리된 리뷰 조회: storeId=${storeId}`);

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      startDate: startDate || null,
      endDate: endDate || null,
      sentiment: sentiment || null
    };

    const result = await reviewProcessingService.getProcessedReviews(storeId, options);

    res.json({
      success: true,
      message: '처리된 리뷰 조회 완료',
      result: {
        storeId: storeId,
        reviews: result.reviews,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });

  } catch (error) {
    console.error('❌ 처리된 리뷰 조회 실패:', error);
    res.status(500).json({
      success: false,
      code: 'ERR_GET_REVIEWS_FAIL',
      message: '처리된 리뷰 조회 실패',
      error: error.message
    });
  }
};

/**
 * 🎯 리뷰 처리 상태 확인
 * GET /api/review-processing/status
 */
export const getProcessingStatus = async (req, res) => {
  try {
    res.json({
      success: true,
      message: '리뷰 처리 서비스 상태 확인 완료',
      status: {
        service: 'ReviewProcessingService',
        active: true,
        timestamp: new Date().toISOString(),
        features: {
          ai: 'OpenAI GPT-4o-mini',
          database: 'Supabase',
          imageProcessing: 'Sharp',
          batchProcessing: true
        }
      }
    });
  } catch (error) {
    console.error('❌ 리뷰 처리 상태 확인 실패:', error);
    res.status(500).json({
      success: false,
      code: 'ERR_STATUS_CHECK_FAIL',
      message: '리뷰 처리 상태 확인 실패',
      error: error.message
    });
  }
};

/**
 * 🎯 리뷰 처리 통계 조회
 * GET /api/review-processing/stats/:storeId
 */
export const getProcessingStats = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    console.log(`📊 리뷰 처리 통계 조회: storeId=${storeId}`);

    // 🎯 Supabase에서 통계 데이터 조회
    let query = supabase
      .from('store_reviews')
      .select('*')
      .eq('store_id', storeId);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: reviews, error } = await query;

    if (error) {
      throw error;
    }

    // 🎯 통계 계산
    const totalReviews = reviews?.length || 0;
    const sentimentStats = reviews?.reduce((stats, review) => {
      const sentiment = review.sentiment?.type || '보통';
      stats[sentiment] = (stats[sentiment] || 0) + 1;
      return stats;
    }, { 긍정: 0, 부정: 0, 보통: 0 }) || { 긍정: 0, 부정: 0, 보통: 0 };

    const statusStats = reviews?.reduce((stats, review) => {
      const status = review.status || 'pending';
      stats[status] = (stats[status] || 0) + 1;
      return stats;
    }, {}) || {};

    // 🎯 키워드 통계
    const keywordStats = reviews?.reduce((stats, review) => {
      if (review.keywords && Array.isArray(review.keywords)) {
        review.keywords.forEach(keyword => {
          stats[keyword] = (stats[keyword] || 0) + 1;
        });
      }
      return stats;
    }, {}) || {};

    // 🎯 상위 키워드 정렬
    const topKeywords = Object.entries(keywordStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));

    res.json({
      success: true,
      message: '리뷰 처리 통계 조회 완료',
      result: {
        storeId: storeId,
        period: { startDate, endDate },
        totalReviews: totalReviews,
        sentimentStats: sentimentStats,
        statusStats: statusStats,
        topKeywords: topKeywords,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ 리뷰 처리 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      code: 'ERR_GET_STATS_FAIL',
      message: '리뷰 처리 통계 조회 실패',
      error: error.message
    });
  }
};

export default {
  integratedReviewFlow,
  batchReviewProcessing,
  getProcessedReviews,
  getProcessingStatus,
  getProcessingStats
};
