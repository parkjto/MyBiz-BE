const ReviewCrawlerService = require('../services/reviewCrawlerService');
const NaverLocalService = require('../services/naverLocalService');

class ReviewsController {
  constructor() {
    console.log('🔧 ReviewsController 생성자 호출');
    console.log('📦 ReviewCrawlerService:', typeof ReviewCrawlerService);
    this.reviewCrawlerService = new ReviewCrawlerService();
    this.naverLocalService = new NaverLocalService();
    console.log('[INFO] reviewCrawlerService 인스턴스 생성 완료:', typeof this.reviewCrawlerService);
    
    // 메서드들을 this에 바인딩
    this.checkCrawlingStatus = this.checkCrawlingStatus.bind(this);
    this.getCrawlingHistory = this.getCrawlingHistory.bind(this);
    this.executeSafeCrawling = this.executeSafeCrawling.bind(this);
    this.getReviews = this.getReviews.bind(this);
    this.searchStores = this.searchStores.bind(this);
    this.crawlReviewsByStoreName = this.crawlReviewsByStoreName.bind(this);
  }

  /**
   * 현재 크롤링 가능 여부 확인 (사용자 친화적)
   * @param {Object} req - Express 요청 객체
   * @param {Object} res - Express 응답 객체
   */
  async checkCrawlingStatus(req, res) {
    try {
      console.log('[INFO] checkCrawlingStatus 호출');
      console.log('📦 this.reviewCrawlerService:', typeof this.reviewCrawlerService);
      console.log('📦 this.reviewCrawlerService.checkCrawlingAvailability:', typeof this.reviewCrawlerService?.checkCrawlingAvailability);
      
      const { requestedReviews = 10 } = req.query;
      
      console.log('🔍 크롤링 상태 확인 요청');
      console.log('📊 requestedReviews:', requestedReviews, typeof requestedReviews);
      console.log('📊 parseInt(requestedReviews):', parseInt(requestedReviews), typeof parseInt(requestedReviews));
      
      // 크롤링 가능 여부 확인
      const status = this.reviewCrawlerService.checkCrawlingAvailability(parseInt(requestedReviews));
      
      // 사용자 친화적인 상태 메시지 생성
      const userFriendlyStatus = this.generateUserFriendlyStatus(status, parseInt(requestedReviews));
      
      // 응답 데이터 구성
      const response = {
        success: true,
        data: {
          // 기본 상태 정보
          status: userFriendlyStatus.status,
          statusCode: userFriendlyStatus.statusCode,
          canCrawl: status.canCrawl,
          
          // 현재 시간 정보
          currentTime: status.timeInfo.currentTime,
          timeRecommendation: status.timeInfo.recommendation,
          dayRecommendation: status.dayInfo.recommendation,
          
          // 크롤링 제한 정보
          limits: {
            dailyCount: status.limits.dailyCount,
            dailyLimit: status.limits.dailyLimit,
            remainingDaily: status.limits.remainingDaily,
            usagePercentage: Math.round((status.limits.dailyCount / status.limits.dailyLimit) * 100),
            maxReviewsPerSession: status.limits.maxReviewsPerSession
          },
          
          // 세션 정보
          session: {
            status: status.sessionInfo.status,
            lastSessionTime: status.sessionInfo.lastSessionTime,
            sessionCount: status.sessionInfo.sessionCount
          },
          
          // 권장사항
          recommendations: {
            suggestedReviews: status.recommendations.suggestedReviews,
            suggestedDelay: status.recommendations.suggestedDelay,
            riskAssessment: status.recommendations.riskAssessment,
            nextBestTime: userFriendlyStatus.nextBestTime,
            tips: userFriendlyStatus.tips
          },
          
          // 상세 정보 (개발자용)
          details: {
            validation: status.validation,
            timeInfo: status.timeInfo,
            dayInfo: status.dayInfo
          }
        },
        message: userFriendlyStatus.message
      };
      
      // 상태에 따른 HTTP 상태 코드 설정
      const statusCode = status.canCrawl ? 200 : 429; // 429: Too Many Requests
      
      res.status(statusCode).json(response);
      
    } catch (error) {
      console.error('❌ 크롤링 상태 확인 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: '크롤링 상태 확인 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 사용자 친화적인 상태 메시지 생성
   * @param {Object} status - 크롤링 상태 정보
   * @param {number} requestedReviews - 요청 리뷰 수
   * @returns {Object} 사용자 친화적인 상태 정보
   */
  generateUserFriendlyStatus(status, requestedReviews) {
    const now = new Date();
    const currentHour = now.getHours();
    
    // 상태 코드 결정
    let statusCode = 'success';
    let statusText = '크롤링 가능';
    let message = '크롤링을 시작할 수 있습니다.';
    let nextBestTime = '현재 시간이 최적입니다.';
    let tips = ['새벽 시간대(02:00-05:00)에 크롤링하면 가장 안전합니다.'];
    
    if (!status.canCrawl) {
      statusCode = 'time_restricted';
      statusText = '크롤링 제한됨';
      message = '크롤링이 제한되어 있습니다: 현재는 업무 시간대입니다. 오후 10시 이후에 크롤링하세요.';
      nextBestTime = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()} 오후 10:00:00`;
      tips = ['업무 시간대에는 크롤링을 최소화하여 안전하게 사용하세요.'];
    }
    
    // requestedReviews를 활용한 추가 안내 등 필요시 여기에 작성
    // 예: if (requestedReviews > status.limits.maxReviewsPerSession) { ... }
    
    return {
      status: statusText,
      statusCode,
      message,
      nextBestTime,
      tips
    };
  }

  /**
   * 크롤링 이력 조회
   * @param {Object} req - Express 요청 객체
   * @param {Object} res - Express 응답 객체
   */
  async getCrawlingHistory(req, res) {
    try {
      console.log('📊 크롤링 이력 조회 요청');
      
      const history = this.reviewCrawlerService.crawlingHistory;
      const limits = this.reviewCrawlerService.crawlingLimits;
      
      const response = {
        success: true,
        data: {
          dailyCount: history.dailyCount,
          dailyLimit: limits.dailyLimit,
          remainingDaily: limits.dailyLimit - history.dailyCount,
          sessionCount: history.sessionCount,
          maxSessionsPerDay: limits.maxSessionsPerDay,
          lastSessionTime: history.lastSessionTime ? 
            history.lastSessionTime.toLocaleString('ko-KR') : '없음',
          usagePercentage: Math.round((history.dailyCount / limits.dailyLimit) * 100),
          // 사용자 친화적인 정보 추가
          status: this.getUsageStatus(history.dailyCount, limits.dailyLimit),
          nextResetTime: this.getNextResetTime()
        },
        message: '크롤링 이력이 조회되었습니다.'
      };
      
      res.status(200).json(response);
      
    } catch (error) {
      console.error('❌ 크롤링 이력 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: '크롤링 이력 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 사용량 상태 판단
   * @param {number} dailyCount - 일일 사용량
   * @param {number} dailyLimit - 일일 제한
   * @returns {string} 사용량 상태
   */
  getUsageStatus(dailyCount, dailyLimit) {
    const percentage = (dailyCount / dailyLimit) * 100;
    
    if (percentage >= 90) return '위험';
    if (percentage >= 70) return '주의';
    if (percentage >= 50) return '보통';
    return '안전';
  }

  /**
   * 다음 리셋 시간 계산
   * @returns {string} 다음 리셋 시간
   */
  getNextResetTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeDiff = tomorrow - now;
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}시간 ${minutes}분 후`;
  }

  /**
   * 안전한 크롤링 실행
   * @param {Object} req - Express 요청 객체
   * @param {Object} res - Express 응답 객체
   */
  async executeSafeCrawling(req, res) {
    try {
      const { placeId, maxReviews = 10, level = 'basic' } = req.body;
      
      console.log('🚀 안전한 크롤링 실행 요청:', { placeId, maxReviews, level });
      
      // 필수 파라미터 검증
      if (!placeId) {
        return res.status(400).json({
          success: false,
          error: 'placeId가 필요합니다.',
          message: '매장 ID를 입력해주세요.'
        });
      }
      
      // 크롤링 가능 여부 확인
      const status = this.reviewCrawlerService.checkCrawlingAvailability(maxReviews);
      
      if (!status.canCrawl) {
        return res.status(429).json({
          success: false,
          error: '크롤링 제한',
          message: '현재 크롤링이 제한되어 있습니다.',
          data: {
            status: status,
            nextBestTime: status.recommendations.nextBestTime
          }
        });
      }
      
      // 크롤링 실행
      let reviews = [];
      let crawlingMethod = '';
      
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
      
      const response = {
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
      
      res.status(200).json(response);
      
    } catch (error) {
      console.error('❌ 크롤링 실행 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: '크롤링 실행 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 리뷰 목록 조회
   * @param {Object} req - Express 요청 객체
   * @param {Object} res - Express 응답 객체
   */
  async getReviews(req, res) {
    try {
      console.log('📝 리뷰 목록 조회 요청');
      res.json({
        success: true,
        message: '리뷰 목록 조회 기능',
        data: []
      });
    } catch (error) {
      console.error('❌ 리뷰 목록 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: '리뷰 목록 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 매장 검색 API
   * 프론트엔드에서 매장명/주소를 입력받아 검색
   * @param {Object} req - Express 요청 객체
   * @param {Object} res - Express 응답 객체
   */
  async searchStores(req, res) {
    try {
      const { query, display = 5 } = req.query;
      
      console.log('🔍 매장 검색 요청:', { query, display });
      
      // 필수 파라미터 검증
      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: '검색어가 필요합니다.',
          message: '매장명이나 주소를 입력해주세요.'
        });
      }

      // 검색어 정제
      const cleanQuery = query.trim();
      console.log('🔍 정제된 검색어:', cleanQuery);

      // 매장 검색 실행
      const searchResult = await this.naverLocalService.findStoreByQuery(cleanQuery, true);
      
      if (!searchResult.success) {
        return res.status(500).json({
          success: false,
          error: searchResult.error,
          message: searchResult.message
        });
      }

      // 검색 결과 포맷팅
      const formattedStores = searchResult.data.map((store, index) => ({
        id: index,
        name: store.name,
        address: store.address,
        phone: store.phone,
        category: store.category,
        placeId: store.placeId,
        coordinateId: store.coordinateId,
        mapUrl: store.mapUrl,
        coordinates: store.coordinates,
        extractedAt: store.extractedAt,
        hasPlaceId: !!(store.placeId || store.coordinateId)
      }));

      const response = {
        success: true,
        data: {
          query: cleanQuery,  // 정제된 검색어 반환
          stores: formattedStores,
          total: formattedStores.length,
          hasResults: formattedStores.length > 0,
          placeIdAvailable: formattedStores.some(store => store.hasPlaceId)
        },
        message: `${formattedStores.length}개의 매장을 찾았습니다.`
      };

      res.status(200).json(response);
      
    } catch (error) {
      console.error('❌ 매장 검색 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: '매장 검색 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 매장명으로 리뷰 크롤링 (통합 API)
   * 프론트엔드에서 매장명을 입력받아 검색 후 리뷰 크롤링
   * @param {Object} req - Express 요청 객체
   * @param {Object} res - Express 응답 객체
   */
  async crawlReviewsByStoreName(req, res) {
    try {
      const { 
        storeName, 
        storeIndex = 0, 
        level = 'basic',
        maxReviews = null 
      } = req.body;
      
      console.log('🚀 매장명 기반 리뷰 크롤링 요청:', { 
        storeName, 
        storeIndex, 
        level, 
        maxReviews 
      });
      
      // 필수 파라미터 검증
      if (!storeName || storeName.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: '매장명이 필요합니다.',
          message: '매장명을 입력해주세요.'
        });
      }

      // 1단계: 매장 검색
      console.log('🔍 1단계: 매장 검색 시작...');
      const searchResult = await this.naverLocalService.findStoreByQuery(storeName.trim(), true);
      
      if (!searchResult.success) {
        return res.status(500).json({
          success: false,
          error: searchResult.error,
          message: searchResult.message
        });
      }

      if (searchResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          error: '매장을 찾을 수 없습니다.',
          message: `"${storeName}" 매장을 찾을 수 없습니다. 매장명을 다시 확인해주세요.`
        });
      }

      // 2단계: 선택된 매장 정보 확인
      const selectedStore = searchResult.data[storeIndex];
      if (!selectedStore) {
        return res.status(400).json({
          success: false,
          error: '잘못된 매장 인덱스입니다.',
          message: `매장 인덱스 ${storeIndex}가 유효하지 않습니다. (총 ${searchResult.data.length}개 매장)`
        });
      }

      console.log('✅ 선택된 매장:', {
        name: selectedStore.name,
        address: selectedStore.address,
        placeId: selectedStore.placeId,
        coordinateId: selectedStore.coordinateId
      });

      // 3단계: Place ID 확인
      const placeId = selectedStore.placeId || selectedStore.coordinateId;
      if (!placeId) {
        return res.status(400).json({
          success: false,
          error: 'Place ID를 찾을 수 없습니다.',
          message: '해당 매장의 Place ID를 추출할 수 없습니다. 다른 매장을 선택하거나 나중에 다시 시도해주세요.',
          data: {
            availableStores: searchResult.data.map((store, index) => ({
              index,
              name: store.name,
              address: store.address,
              hasPlaceId: !!(store.placeId || store.coordinateId)
            }))
          }
        });
      }

      // 4단계: 크롤링 가능 여부 확인
      const levelConfig = {
        basic: { maxReviews: 10 },
        intermediate: { maxReviews: 30 },
        advanced: { maxReviews: 100 }
      };

      const targetReviews = maxReviews || levelConfig[level].maxReviews;
      const status = this.reviewCrawlerService.checkCrawlingAvailability(targetReviews);
      
      if (!status.canCrawl) {
        return res.status(429).json({
          success: false,
          error: '크롤링 제한',
          message: '현재 크롤링이 제한되어 있습니다.',
          data: {
            status: status,
            nextBestTime: status.recommendations.nextBestTime,
            selectedStore: {
              name: selectedStore.name,
              address: selectedStore.address,
              placeId: placeId
            }
          }
        });
      }

      // 5단계: 리뷰 크롤링 실행
      console.log('🔍 5단계: 리뷰 크롤링 시작...');
      let reviews = [];
      let crawlingMethod = '';
      
      switch (level) {
        case 'basic':
          reviews = await this.reviewCrawlerService.crawlBasicLevel(placeId);
          crawlingMethod = '기초 레벨';
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
          crawlingMethod = '기초 레벨';
      }

      // 6단계: 크롤링 결과 확인
      if (!reviews.success) {
        return res.status(500).json({
          success: false,
          error: reviews.error,
          message: '리뷰 크롤링 중 오류가 발생했습니다.',
          data: {
            selectedStore: {
              name: selectedStore.name,
              address: selectedStore.address,
              placeId: placeId
            }
          }
        });
      }

      // 7단계: 크롤링 이력 업데이트
      const reviewCount = reviews.data.reviews ? reviews.data.reviews.length : 0;
      this.reviewCrawlerService.updateCrawlingHistory(reviewCount);

      // 8단계: 응답 데이터 구성
      const response = {
        success: true,
        data: {
          // 매장 정보
          store: {
            name: selectedStore.name,
            address: selectedStore.address,
            phone: selectedStore.phone,
            category: selectedStore.category,
            placeId: placeId,
            mapUrl: selectedStore.mapUrl
          },
          
          // 크롤링 결과
          reviews: reviews.data.reviews || [],
          totalCount: reviewCount,
          crawledAt: new Date().toISOString(),
          crawlingMethod,
          
          // 분석 정보
          analysis: {
            level: level,
            accuracy: reviews.data.accuracy,
            reliability: reviews.data.reliability,
            warning: reviews.data.warning,
            recommendation: reviews.data.recommendation
          },
          
          // 크롤링 이력
          crawlingHistory: {
            dailyCount: this.reviewCrawlerService.crawlingHistory.dailyCount,
            sessionCount: this.reviewCrawlerService.crawlingHistory.sessionCount,
            lastSessionTime: this.reviewCrawlerService.crawlingHistory.lastSessionTime ? 
              this.reviewCrawlerService.crawlingHistory.lastSessionTime.toLocaleString('ko-KR') : '없음'
          },
          
          // 검색 정보
          searchInfo: {
            originalQuery: storeName.trim(),
            totalStoresFound: searchResult.data.length,
            selectedStoreIndex: storeIndex
          }
        },
        message: `${selectedStore.name}에서 ${reviewCount}개의 리뷰를 성공적으로 크롤링했습니다. (${reviews.data.accuracy} 정확도)`
      };
      
      res.status(200).json(response);
      
    } catch (error) {
      console.error('❌ 매장명 기반 리뷰 크롤링 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: '리뷰 크롤링 중 오류가 발생했습니다.'
      });
    }
  }
}

module.exports = new ReviewsController();
