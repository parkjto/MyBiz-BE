import { supabase } from '../utils/supabaseClient.js';
import { logger } from '../utils/logger.js';

/**
 * 리뷰 데이터를 DB에 저장
 * @param {string} userStoreId - 사용자 스토어 ID
 * @param {Array} reviews - 리뷰 데이터 배열
 * @returns {Array} 저장된 리뷰 데이터
 */
export const saveReviews = async (userStoreId, reviews) => {
  try {
    logger.info(`리뷰 저장 시작: ${userStoreId}, 리뷰 ${reviews.length}개`);
    
    if (!reviews || reviews.length === 0) {
      logger.warn('저장할 리뷰가 없습니다');
      return [];
    }

    // 1. 기존 리뷰 삭제 (중복 방지)
    const { error: deleteError } = await supabase
      .from('naver_reviews')
      .delete()
      .eq('user_store_id', userStoreId);
    
    if (deleteError) {
      logger.error('기존 리뷰 삭제 실패:', deleteError);
      throw deleteError;
    }
    
    logger.info(`기존 리뷰 삭제 완료: ${userStoreId}`);

    // 2. 새 리뷰들 저장
    const reviewData = reviews.map(review => ({
      user_store_id: userStoreId,
      review_content: review.content || review.review_content || '',
      author_nickname: review.nickname || review.author_nickname || '익명',
      review_date: review.date || review.review_date || null,
      rating: review.rating || null,
      extra_metadata: {
        scraped_at: new Date().toISOString(),
        source: 'naver_smartplace',
        original_data: review
      }
    }));
    
    const { data, error } = await supabase
      .from('naver_reviews')
      .insert(reviewData)
      .select('*');
      
    if (error) {
      logger.error('새 리뷰 저장 실패:', error);
      throw error;
    }
    
    logger.info(`리뷰 저장 완료: ${userStoreId}, ${data.length}개`);
    return data || [];
    
  } catch (error) {
    logger.error('리뷰 저장 중 오류 발생:', error);
    throw error;
  }
};

/**
 * DB에 저장된 리뷰 데이터 조회
 * @param {string} userStoreId - 사용자 스토어 ID
 * @returns {Array} 리뷰 데이터 배열
 */
export const getStoredReviews = async (userStoreId) => {
  try {
    logger.info(`저장된 리뷰 조회: ${userStoreId}`);
    
    const { data, error } = await supabase
      .from('naver_reviews')
      .select('*')
      .eq('user_store_id', userStoreId)
      .order('review_date', { ascending: false })
      .order('created_at', { ascending: false });
      
    if (error) {
      logger.error('저장된 리뷰 조회 실패:', error);
      throw error;
    }
    
    const reviews = data || [];
    logger.info(`저장된 리뷰 조회 완료: ${userStoreId}, ${reviews.length}개`);
    
    return reviews;
    
  } catch (error) {
    logger.error('저장된 리뷰 조회 중 오류 발생:', error);
    throw error;
  }
};

/**
 * 특정 스토어의 리뷰 통계 조회
 * @param {string} userStoreId - 사용자 스토어 ID
 * @returns {Object} 리뷰 통계 정보
 */
export const getReviewStats = async (userStoreId) => {
  try {
    const { data, error } = await supabase
      .from('naver_reviews')
      .select('rating, review_date')
      .eq('user_store_id', userStoreId);
      
    if (error) {
      logger.error('리뷰 통계 조회 실패:', error);
      throw error;
    }
    
    const reviews = data || [];
    const totalReviews = reviews.length;
    const validRatings = reviews.filter(r => r.rating && r.rating >= 1 && r.rating <= 5);
    
    const stats = {
      total_reviews: totalReviews,
      total_ratings: validRatings.length,
      average_rating: validRatings.length > 0 
        ? Math.round((validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length) * 100) / 100
        : 0,
      rating_distribution: {
        1: reviews.filter(r => r.rating === 1).length,
        2: reviews.filter(r => r.rating === 2).length,
        3: reviews.filter(r => r.rating === 3).length,
        4: reviews.filter(r => r.rating === 4).length,
        5: reviews.filter(r => r.rating === 5).length
      },
      latest_review_date: reviews.length > 0 
        ? Math.max(...reviews.map(r => new Date(r.review_date || r.created_at)).filter(d => !isNaN(d)))
        : null
    };
    
    return stats;
    
  } catch (error) {
    logger.error('리뷰 통계 조회 중 오류 발생:', error);
    throw error;
  }
};

