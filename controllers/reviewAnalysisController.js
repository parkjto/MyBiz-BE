import { analyzeReviewsFromDB, getAnalysisResult } from '../services/reviewAnalysisService.js';
import { getStoredReviews } from '../services/reviewService.js';
import { logger } from '../utils/logger.js';
import { supabase } from '../utils/supabaseClient.js';

export const analyzeReview = async (req, res, next) => {
  try {
    const { userStoreId } = req.body;
    const userId = req.user.id;

    if (!userStoreId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userStoreId가 필요합니다' 
      });
    }

    // UUID 형식 검증
    if (!isValidUUID(userStoreId)) {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 userStoreId 형식입니다' 
      });
    }

    // 본인의 스토어인지 확인
    const { data: store, error: storeError } = await supabase
      .from('user_stores')
      .select('id, store_name')
      .eq('id', userStoreId)
      .eq('user_id', userId)
      .single();

    if (storeError || !store) {
      return res.status(404).json({ 
        success: false, 
        message: '분석할 수 있는 스토어가 없습니다' 
      });
    }

    logger.info(`리뷰 분석 시작: ${store.store_name} (${userStoreId})`);

    // 저장된 리뷰 조회
    const reviews = await getStoredReviews(userStoreId);
    
    if (!reviews || reviews.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '분석할 리뷰가 없습니다. 먼저 리뷰를 스크래핑해주세요.' 
      });
    }

    // 리뷰 분석 수행
    const analysisResult = await analyzeReviewsFromDB(userStoreId, reviews);
    
    logger.info(`리뷰 분석 완료: ${userStoreId}`, {
      reviewCount: reviews.length,
      hasAnalysis: !!analysisResult
    });
    
    res.json({ 
      success: true, 
      message: '리뷰 분석 완료', 
      data: {
        reviews: reviews,
        analysis: analysisResult
      }
    });
  } catch(e){ 
    logger.error('리뷰 분석 에러:', e);
    next(e); 
  }
};

export const getReviewAnalysis = async (req, res, next) => {
  try {
    const { userStoreId } = req.params;
    const userId = req.user.id;

    if (!userStoreId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userStoreId가 필요합니다' 
      });
    }

    // UUID 형식 검증
    if (!isValidUUID(userStoreId)) {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 userStoreId 형식입니다' 
      });
    }

    // 본인의 스토어인지 확인
    const { data: store, error: storeError } = await supabase
      .from('user_stores')
      .select('id, store_name')
      .eq('id', userStoreId)
      .eq('user_id', userId)
      .single();

    if (storeError || !store) {
      return res.status(404).json({ 
        success: false, 
        message: '조회할 수 있는 스토어가 없습니다' 
      });
    }

    // 기존 분석 결과 조회
    const analysisResult = await getAnalysisResult(userStoreId);
    
    if (!analysisResult) {
      return res.status(404).json({ 
        success: false, 
        message: '분석 결과가 없습니다. 먼저 리뷰 분석을 수행해주세요.' 
      });
    }
    
    logger.info(`리뷰 분석 결과 조회: ${userStoreId}`);
    
    res.json({ 
      success: true, 
      message: '분석 결과 조회 완료', 
      data: analysisResult
    });
  } catch(e){ 
    logger.error('리뷰 분석 결과 조회 에러:', e);
    next(e); 
  }
};

// UUID 형식 검증 함수
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

