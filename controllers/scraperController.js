import { scrapeReviewsWithSession } from '../services/scraperService.js';
import { scrapeNaverReviewsComplete } from '../services/finalNaverReviewService.js';
import { saveNaverSession } from '../services/sessionService.js';
import { logger } from '../utils/logger.js';
import { supabase } from '../utils/supabaseClient.js';

export const scrapeReviews = async (req, res, next) => {
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
        message: '스크래핑할 수 있는 스토어가 없습니다' 
      });
    }

    logger.info(`리뷰 스크래핑 시작: ${store.store_name} (${userStoreId})`);

    // 광고 회피 기능이 포함된 새로운 리뷰 스크래핑 서비스 사용
    const result = await scrapeNaverReviewsComplete(userStoreId);
    
    logger.info(`리뷰 스크래핑 완료: ${userStoreId}`, result);
    
    res.json({ 
      success: true, 
      message: '광고 회피 리뷰 스크래핑 완료', 
      data: result,
      store: {
        id: store.id,
        name: store.store_name
      }
    });
  } catch(e){ 
    logger.error('리뷰 스크래핑 에러:', e);
    next(e); 
  }
};

export const setSession = async (req, res, next) => {
  try {
    const { userStoreId, cookies, expiresAt } = req.body;
    const userId = req.user.id;

    if (!userStoreId || !Array.isArray(cookies)) {
      return res.status(400).json({ 
        success: false, 
        message: 'userStoreId와 cookies가 필요합니다' 
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
        message: '세션을 저장할 수 있는 스토어가 없습니다' 
      });
    }

    await saveNaverSession(userStoreId, { cookies, expiresAt });
    
    logger.info(`네이버 세션 저장 완료: ${store.store_name} (${userStoreId})`);
    
    res.json({ 
      success: true, 
      message: '세션 저장 완료',
      store: {
        id: store.id,
        name: store.store_name
      }
    });
  } catch(e){ 
    logger.error('세션 저장 에러:', e);
    next(e); 
  }
};

// UUID 형식 검증 함수
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

