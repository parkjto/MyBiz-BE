const ReviewCrawlerService = require('./reviewCrawlerService');

/**
 * 리뷰 크롤링 서비스
 */
class ReviewsService {
  constructor() {
    this.reviewCrawlerService = new ReviewCrawlerService();
  }

  /**
   * Place ID로 리뷰 크롤링
   * @param {string} placeId - 네이버 플레이스 ID
   * @param {number} maxReviews - 최대 크롤링할 리뷰 수
   * @param {string} level - 크롤링 레벨 (basic, intermediate, advanced)
   * @returns {Promise<Object>} 크롤링 결과
   */
  async crawlReviewsByPlaceId(placeId, maxReviews = 10, level = 'basic') {
    try {
      console.log(`[INFO] Place ID로 리뷰 크롤링 시작: ${placeId}, ${maxReviews}개, ${level} 레벨`);

      // 크롤링 가능 여부 확인
      const status = this.reviewCrawlerService.checkCrawlingAvailability(maxReviews);
      
      if (!status.canCrawl) {
        return {
          success: false,
          error: '크롤링 제한',
          message: '현재 크롤링이 제한되어 있습니다.',
          data: {
            status: status,
            nextBestTime: status.recommendations.nextBestTime
          }
        };
      }

      // 브라우저 초기화
      const initialized = await this.reviewCrawlerService.initializeBrowser();
      if (!initialized) {
        return {
          success: false,
          error: '브라우저 초기화 실패',
          message: '크롤링을 위한 브라우저를 초기화할 수 없습니다.'
        };
      }

      let reviews = [];
      let crawlingMethod = '';

      try {
        // 레벨에 따른 크롤링 실행
        switch (level) {
          case 'basic':
            reviews = await this.reviewCrawlerService.crawlBasicLevel(placeId);
            crawlingMethod = '기본 레벨';
            break;
          case 'intermediate':
            reviews = await this.reviewCrawlerService.crawlIntermediateLevel(placeId);
            crawlingMethod = '중급 레벨';
            break;
          case 'advanced':
            reviews = await this.reviewCrawlerService.crawlAdvancedLevel(placeId);
            crawlingMethod = '고급 레벨';
            break;
          default:
            reviews = await this.reviewCrawlerService.crawlBasicLevel(placeId);
            crawlingMethod = '기본 레벨';
        }

        // 크롤링 이력 업데이트
        this.reviewCrawlerService.updateCrawlingHistory(reviews.length);

        return {
          success: true,
          data: {
            placeId,
            reviews,
            totalCount: reviews.length,
            crawledAt: new Date().toISOString(),
            crawlingMethod,
            crawlingHistory: {
              dailyCount: this.reviewCrawlerService.crawlingHistory.dailyCount,
              sessionCount: this.reviewCrawlerService.crawlingHistory.sessionCount,
              lastSessionTime: this.reviewCrawlerService.crawlingHistory.lastSessionTime ? 
                this.reviewCrawlerService.crawlingHistory.lastSessionTime.toLocaleString('ko-KR') : '없음'
            }
          },
          message: `${reviews.length}개의 리뷰를 성공적으로 크롤링했습니다.`
        };

      } finally {
        // 브라우저 종료
        await this.reviewCrawlerService.closeBrowser();
      }

    } catch (error) {
      console.error('[ERROR] 리뷰 크롤링 실패:', error);
      
      // 브라우저 종료 시도
      try {
        await this.reviewCrawlerService.closeBrowser();
      } catch (closeError) {
        console.error('[ERROR] 브라우저 종료 실패:', closeError);
      }

      return {
        success: false,
        error: error.message,
        message: '리뷰 크롤링 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 리뷰 목록 조회 (예시)
   * @returns {Object} 리뷰 목록
   */
  getReviews() {
    return { message: '고객 감정 분석 기능 (예시)' };
  }
}

module.exports = new ReviewsService(); 