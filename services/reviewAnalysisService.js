import { supabase } from '../utils/supabaseClient.js';
import { logger } from '../utils/logger.js';

/**
 * DB에 저장된 리뷰 데이터를 분석하고 결과를 저장
 * @param {string} userStoreId - 사용자 스토어 ID
 * @param {Array} reviews - 리뷰 데이터 배열
 * @returns {Object} 분석 결과
 */
export const analyzeReviewsFromDB = async (userStoreId, reviews) => {
  try {
    logger.info(`리뷰 분석 시작: ${userStoreId}, 리뷰 ${reviews.length}개`);
    
    if (!reviews || reviews.length === 0) {
      logger.warn('분석할 리뷰가 없습니다');
      return null;
    }

    // 1. 기본 통계 계산
    const totalReviews = reviews.length;
    const validRatings = reviews.filter(r => r.rating && r.rating >= 1 && r.rating <= 5);
    const averageRating = validRatings.length > 0 
      ? Math.round((validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length) * 100) / 100
      : 0;
    
    // 2. 평점별 개수 계산
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    validRatings.forEach(review => {
      if (ratingCounts[review.rating] !== undefined) {
        ratingCounts[review.rating]++;
      }
    });
    
    // 3. 감정 분석 (간단한 키워드 기반)
    const positiveKeywords = ['맛있', '친절', '깔끔', '좋', '만족', '추천', '훌륭', '최고', '완벽'];
    const negativeKeywords = ['별로', '아쉽', '부족', '나쁘', '실망', '최악', '별점', '환불', '불만'];
    
    let positiveCount = 0, negativeCount = 0, neutralCount = 0;
    
    reviews.forEach(review => {
      const content = (review.content || review.review_content || '').toLowerCase();
      const positiveMatch = positiveKeywords.some(keyword => content.includes(keyword));
      const negativeMatch = negativeKeywords.some(keyword => content.includes(keyword));
      
      if (positiveMatch && !negativeMatch) {
        positiveCount++;
      } else if (negativeMatch && !positiveMatch) {
        negativeCount++;
      } else {
        neutralCount++;
      }
    });
    
    // 4. 만족도 퍼센티지 계산
    const total = positiveCount + negativeCount + neutralCount;
    const positivePercent = total > 0 ? Math.round((positiveCount / total) * 100) : 0;
    const neutralPercent = total > 0 ? Math.round((neutralCount / total) * 100) : 0;
    const negativePercent = total > 0 ? Math.round((negativeCount / total) * 100) : 0;
    
    // 5. 최근 리뷰 정리 (최대 5개)
    const recentReviews = reviews
      .slice(0, 5)
      .map(r => ({
        content: r.content || r.review_content || '',
        nickname: r.nickname || r.author_nickname || '익명',
        rating: r.rating || 0,
        date: r.date || r.review_date || ''
      }));
    
    // 6. 분석 결과 구성
    const analysisResult = {
      total_reviews: totalReviews,
      average_rating: averageRating,
      positive_count: positiveCount,
      negative_count: negativeCount,
      neutral_count: neutralCount,
      positive_percent: positivePercent,
      neutral_percent: neutralPercent,
      negative_percent: negativePercent,
      rating_5_count: ratingCounts[5],
      rating_4_count: ratingCounts[4],
      rating_3_count: ratingCounts[3],
      rating_2_count: ratingCounts[2],
      rating_1_count: ratingCounts[1],
      recent_reviews: recentReviews,
      last_analyzed_at: new Date(),
      satisfaction: {
        positive: positivePercent,
        neutral: neutralPercent,
        negative: negativePercent
      }
    };
    
    // 7. review_summary_unified 테이블에 저장/업데이트
    const { data, error } = await supabase
      .from('review_summary_unified')
      .upsert({
        user_store_id: userStoreId,
        total_reviews: totalReviews,
        average_rating: averageRating,
        positive_count: positiveCount,
        negative_count: negativeCount,
        neutral_count: neutralCount,
        rating_5_count: ratingCounts[5],
        rating_4_count: ratingCounts[4],
        rating_3_count: ratingCounts[3],
        rating_2_count: ratingCounts[2],
        rating_1_count: ratingCounts[1],
        recent_reviews: recentReviews,
        last_analyzed_at: new Date()
      }, {
        onConflict: 'user_store_id'
      });
      
    if (error) {
      logger.error('리뷰 분석 결과 저장 실패:', error);
      throw error;
    }
    
    logger.info(`리뷰 분석 완료: ${userStoreId}`, {
      totalReviews,
      averageRating,
      positiveCount,
      negativeCount,
      neutralCount
    });
    
    return analysisResult;
    
  } catch (error) {
    logger.error('리뷰 분석 중 오류 발생:', error);
    throw error;
  }
};

/**
 * 기존 분석 결과 조회
 * @param {string} userStoreId - 사용자 스토어 ID
 * @returns {Object|null} 분석 결과
 */
export const getAnalysisResult = async (userStoreId) => {
  try {
    const { data, error } = await supabase
      .from('review_summary_unified')
      .select('*')
      .eq('user_store_id', userStoreId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // 데이터가 없는 경우
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    logger.error('분석 결과 조회 실패:', error);
    throw error;
  }
};

