import { supabase } from '../utils/supabaseClient.js';
import { logger } from '../utils/logger.js';

export class NaverReviewStorageService {
  
  /**
   * 스크래핑된 네이버 리뷰를 naver_reviews 테이블에 저장
   * @param {string} userStoreId - 사용자 스토어 ID
   * @param {Array} reviews - 스크래핑된 리뷰 배열
   * @returns {Object} 저장 결과
   */
  static async storeNaverReviews(userStoreId, reviews) {
    try {
      logger.info(`[INFO] 네이버 리뷰 저장 시작: ${reviews.length}개`);
      
      // 리뷰 데이터를 테이블 구조에 맞게 변환
      const reviewRecords = reviews.map(review => ({
        user_store_id: userStoreId,
        review_content: review.content || '',
        author_nickname: review.author?.name || '',
        review_date: review.dates?.visit ? new Date(review.dates.visit) : null,
        rating: this.extractRating(review.tag),
        extra_metadata: {
          original_id: review.id,
          user_stats: review.author?.stats || '',
          write_date: review.dates?.write || '',
          images: review.images || [],
          tag: review.tag || '',
          extracted_at: review.extractedAt,
          place_id: review.placeId,
          booking_business_id: review.bookingBusinessId
        }
      }));

      // 배치 내 중복 제거 (author_nickname + review_content + review_date)
      const seen = new Set();
      const dedupedRecords = [];
      for (const r of reviewRecords) {
        const key = `${r.author_nickname}||${r.review_content}||${r.review_date ? new Date(r.review_date).toISOString().slice(0,10) : ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          dedupedRecords.push(r);
        }
      }
      logger.info(`[INFO] 메모리 중복 제거: ${reviewRecords.length} -> ${dedupedRecords.length}`);

      // DB 기준 중복 리뷰 필터링
      const uniqueReviews = await this.filterDuplicateReviews(userStoreId, dedupedRecords);
      
      if (uniqueReviews.length === 0) {
        logger.info('[INFO] 저장할 새로운 리뷰가 없습니다');
        return {
          success: true,
          storedCount: 0,
          duplicateCount: reviewRecords.length,
          message: '모든 리뷰가 이미 저장되어 있습니다'
        };
      }

      // 리뷰 일괄 저장
      const { data, error } = await supabase
        .from('naver_reviews')
        .insert(uniqueReviews)
        .select('id, review_content, author_nickname');

      if (error) {
        logger.error('[ERROR] 네이버 리뷰 저장 실패:', error);
        throw new Error(`리뷰 저장 실패: ${error.message}`);
      }

      logger.info(`[INFO] 네이버 리뷰 저장 완료: ${data.length}개`);
      
      return {
        success: true,
        storedCount: data.length,
        duplicateCount: reviewRecords.length - uniqueReviews.length,
        storedReviews: data,
        message: `${data.length}개 리뷰 저장 완료`
      };

    } catch (error) {
      logger.error('[ERROR] 네이버 리뷰 저장 중 오류:', error.message);
      throw error;
    }
  }

  /**
   * 중복 리뷰 필터링
   * @param {string} userStoreId - 사용자 스토어 ID
   * @param {Array} newReviews - 새로운 리뷰 배열
   * @returns {Array} 중복되지 않은 리뷰 배열
   */
  static async filterDuplicateReviews(userStoreId, newReviews) {
    try {
      const uniqueReviews = [];
      
      for (const review of newReviews) {
        // 기존 리뷰와 중복 체크 (더 정확한 조건)
        const { data: existingReviews, error: checkError } = await supabase
          .from('naver_reviews')
          .select('id, review_content, author_nickname, review_date')
          .eq('user_store_id', userStoreId)
          .eq('author_nickname', review.author_nickname)
          .eq('review_content', review.review_content);

        if (checkError) {
          logger.warn(`[WARN] 중복 체크 중 오류: ${checkError.message}`);
          // 오류 발생 시 해당 리뷰는 저장 대상에서 제외
          continue;
        }

        if (!existingReviews || existingReviews.length === 0) {
          uniqueReviews.push(review);
          logger.info(`[INFO] 새 리뷰 추가: ${review.author_nickname} - ${review.review_content.substring(0, 30)}...`);
        } else {
          logger.info(`[INFO] 중복 리뷰 발견: ${review.author_nickname} - ${review.review_content.substring(0, 30)}...`);
          logger.info(`[INFO] 기존 리뷰 ID: ${existingReviews[0].id}`);
        }
      }

      logger.info(`[INFO] 중복 체크 완료: ${newReviews.length}개 중 ${uniqueReviews.length}개 새로 저장`);
      return uniqueReviews;
    } catch (error) {
      logger.warn('[WARN] 중복 리뷰 체크 중 오류:', error.message);
      // 오류 발생 시 모든 리뷰를 저장 대상으로 처리
      return newReviews;
    }
  }

  /**
   * 리뷰 태그에서 평점 추출
   * @param {string} tag - 리뷰 태그
   * @returns {number|null} 평점 (1-5)
   */
  static extractRating(tag) {
    if (!tag) return null;
    
    // 평점 관련 키워드 매핑
    const ratingMap = {
      '매우 좋아요': 5,
      '좋아요': 4,
      '보통이에요': 3,
      '별로예요': 2,
      '싫어요': 1,
      '음식이 맛있어요': 5,
      '서비스가 좋아요': 5,
      '분위기가 좋아요': 4,
      '가격이 합리적이에요': 4,
      '깔끔해요': 4,
      '친절해요': 4
    };

    // 태그에서 평점 찾기
    for (const [keyword, rating] of Object.entries(ratingMap)) {
      if (tag.includes(keyword)) {
        return rating;
      }
    }

    // 기본값: 긍정적인 태그는 4점, 부정적인 태그는 2점
    if (tag.includes('좋') || tag.includes('맛있') || tag.includes('추천')) {
      return 4;
    } else if (tag.includes('별로') || tag.includes('싫') || tag.includes('나쁘')) {
      return 2;
    }

    return null;
  }

  /**
   * 저장된 리뷰 조회
   * @param {string} userStoreId - 사용자 스토어 ID
   * @param {number} limit - 조회할 리뷰 수
   * @param {number} offset - 오프셋
   * @returns {Array} 저장된 리뷰 배열
   */
  static async getStoredReviews(userStoreId, limit = 50, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('naver_reviews')
        .select('*')
        .eq('user_store_id', userStoreId)
        .order('review_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('[ERROR] 저장된 리뷰 조회 실패:', error);
        throw new Error(`리뷰 조회 실패: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('[ERROR] 저장된 리뷰 조회 중 오류:', error.message);
      throw error;
    }
  }

  /**
   * 특정 리뷰 조회
   * @param {string} reviewId - 리뷰 ID
   * @returns {Object|null} 리뷰 정보
   */
  static async getReviewById(reviewId) {
    try {
      const { data, error } = await supabase
        .from('naver_reviews')
        .select('*')
        .eq('id', reviewId)
        .single();

      if (error) {
        logger.error('[ERROR] 리뷰 조회 실패:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('[ERROR] 리뷰 조회 중 오류:', error.message);
      return null;
    }
  }
}
