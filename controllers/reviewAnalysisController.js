import { analyzeAndSave } from '../services/reviewAnalysisService.js';
import { logger } from '../utils/logger.js';
import { supabase } from '../utils/supabaseClient.js';

export const analyzeReview = async (req, res, next) => {
  try {
    const { reviewId } = req.body;
    const userId = req.user.id;

    if (!reviewId) {
      return res.status(400).json({ 
        success: false, 
        message: 'reviewId가 필요합니다' 
      });
    }

    // UUID 형식 검증
    if (!isValidUUID(reviewId)) {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 reviewId 형식입니다' 
      });
    }

    // 본인의 리뷰인지 확인 (스토어를 통해)
    const { data: review, error: reviewError } = await supabase
      .from('naver_reviews')
      .select(`
        id,
        user_stores!inner(user_id)
      `)
      .eq('id', reviewId)
      .eq('user_stores.user_id', userId)
      .single();

    if (reviewError || !review) {
      return res.status(404).json({ 
        success: false, 
        message: '분석할 수 있는 리뷰가 없습니다' 
      });
    }

    logger.info(`리뷰 분석 시작: ${reviewId} (사용자: ${userId})`);

    const saved = await analyzeAndSave(reviewId);
    
    logger.info(`리뷰 분석 완료: ${reviewId}`, saved);
    
    res.json({ 
      success: true, 
      message: '분석 저장 완료', 
      data: saved 
    });
  } catch(e){ 
    logger.error('리뷰 분석 에러:', e);
    next(e); 
  }
};

// UUID 형식 검증 함수
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

