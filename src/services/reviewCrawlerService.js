/**
 * HTTP 기반 네이버 플레이스 리뷰 크롤링 서비스
 * Puppeteer 없이 HTTP 요청만으로 리뷰 데이터 추출
 */

const axios = require('axios');
const { CRAWLING_LEVELS, SENTIMENT_ANALYSIS_ACCURACY } = require('../config/crawlingLimits');

/**
 * 네이버 플레이스 리뷰 크롤링 서비스 (HTTP 기반)
 * 안전한 크롤링을 위한 rate limiting 포함
 */
class ReviewCrawlerService {
  constructor() {
    // 안전한 크롤링을 위한 설정
    this.crawlingLimits = {
      maxReviewsPerSession: 20,    // 세션당 최대 리뷰 수
      delayBetweenRequests: 2000,  // 요청 간 대기 시간 (ms)
      delayBetweenSessions: 3600000, // 세션 간 대기 시간 (1시간)
      dailyLimit: 50,              // 일일 최대 크롤링 수
      maxSessionsPerDay: 10        // 일일 최대 세션 수
    };
    
    // 크롤링 이력 추적
    this.crawlingHistory = {
      dailyCount: 0,
      lastSessionTime: null,
      sessionCount: 0
    };

    // User-Agent 목록 (로테이션용)
    this.userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
  }

  /**
   * 랜덤 User-Agent 반환
   * @returns {string} User-Agent
   */
  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * 지연 함수
   * @param {number} ms - 지연 시간 (밀리초)
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 크롤링 제한 검증
   * @param {number} requestedReviews - 요청된 리뷰 수
   * @returns {Object} 검증 결과
   */
  validateCrawlingLimits(requestedReviews = 10) {
    console.log('[DEBUG] validateCrawlingLimits 호출됨');
    
    const now = new Date();
    
    // 일일 제한 확인
    if (this.crawlingHistory.dailyCount >= this.crawlingLimits.dailyLimit) {
      return {
        allowed: false,
        reason: '일일 크롤링 제한에 도달했습니다.',
        limit: this.crawlingLimits.dailyLimit,
        current: this.crawlingHistory.dailyCount
      };
    }
    
    // 세션 간격 확인
    if (this.crawlingHistory.lastSessionTime) {
      const timeSinceLastSession = now - this.crawlingHistory.lastSessionTime;
      if (timeSinceLastSession < this.crawlingLimits.delayBetweenSessions) {
        const remainingTime = this.crawlingLimits.delayBetweenSessions - timeSinceLastSession;
        return {
          allowed: false,
          reason: '세션 간 대기 시간이 필요합니다.',
          remainingTime: Math.ceil(remainingTime / 60000), // 분 단위
          current: Math.ceil(timeSinceLastSession / 60000)
        };
      }
    }
    
    // 세션당 리뷰 수 제한 확인
    if (requestedReviews > this.crawlingLimits.maxReviewsPerSession) {
      return {
        allowed: false,
        reason: '세션당 최대 리뷰 수를 초과했습니다.',
        limit: this.crawlingLimits.maxReviewsPerSession,
        requested: requestedReviews
      };
    }
    
    return { allowed: true };
  }

  /**
   * 크롤링 이력 업데이트
   * @param {number} crawledCount - 크롤링된 리뷰 수
   */
  updateCrawlingHistory(crawledCount) {
    const now = new Date();
    
    this.crawlingHistory.dailyCount += crawledCount;
    this.crawlingHistory.lastSessionTime = now;
    this.crawlingHistory.sessionCount += 1;
    
    console.log(`[INFO] 크롤링 이력 업데이트: ${crawledCount}개 추가 (일일 총 ${this.crawlingHistory.dailyCount}개)`);
  }

  /**
   * 현재 크롤링 가능 여부 확인
   * @param {number} requestedReviews - 요청할 리뷰 수
   * @returns {Object} 크롤링 가능 여부 및 상세 정보
   */
  checkCrawlingAvailability(requestedReviews = 10) {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();
      const isWeekend = currentDay === 0 || currentDay === 6;
      
      // 기본 제한 검증
      const validation = this.validateCrawlingLimits(requestedReviews);
      
      // 시간대별 권장사항 확인
      let timeRecommendation = '';
      let timeRiskLevel = '낮음';
      
      if (currentHour >= 9 && currentHour <= 18) {
        timeRecommendation = '[WARNING] 업무 시간대입니다. 크롤링을 최소화하세요.';
        timeRiskLevel = '높음';
      } else if (currentHour >= 22 || currentHour <= 6) {
        timeRecommendation = '[INFO] 오프피크 시간대입니다. 크롤링에 적합합니다.';
        timeRiskLevel = '낮음';
      } else {
        timeRecommendation = '[WARNING] 일반 시간대입니다. 주의해서 크롤링하세요.';
        timeRiskLevel = '보통';
      }
      
      // 요일별 권장사항
      let dayRecommendation = '';
      if (isWeekend) {
        dayRecommendation = '[INFO] 주말입니다. 더 많은 크롤링이 가능합니다.';
      } else {
        dayRecommendation = '[WARNING] 평일입니다. 업무 시간대를 피해 크롤링하세요.';
      }
      
      // 세션 간격 확인
      let sessionStatus = '';
      let remainingTime = 0;
      if (this.crawlingHistory.lastSessionTime) {
        const timeSinceLastSession = now - this.crawlingHistory.lastSessionTime;
        remainingTime = this.crawlingLimits.delayBetweenSessions - timeSinceLastSession;
        
        if (remainingTime > 0) {
          const remainingMinutes = Math.ceil(remainingTime / 60000);
          sessionStatus = `[WAIT] 마지막 세션으로부터 ${remainingMinutes}분 더 대기해야 합니다.`;
        } else {
          sessionStatus = '[INFO] 세션 간격 조건을 만족합니다.';
        }
      } else {
        sessionStatus = '[INFO] 첫 번째 크롤링 세션입니다.';
      }
      
      // 전체 상태 종합
      const overallStatus = validation.allowed && 
                           (timeRiskLevel === '낮음' || timeRiskLevel === '보통') &&
                           remainingTime <= 0;
      
      return {
        canCrawl: overallStatus,
        validation: validation,
        timeInfo: {
          currentTime: now.toLocaleString('ko-KR'),
          currentHour: currentHour,
          isWeekend: isWeekend,
          recommendation: timeRecommendation,
          riskLevel: timeRiskLevel
        },
        dayInfo: {
          recommendation: dayRecommendation,
          isWeekend: isWeekend
        },
        sessionInfo: {
          status: sessionStatus,
          lastSessionTime: this.crawlingHistory.lastSessionTime ? 
            this.crawlingHistory.lastSessionTime.toLocaleString('ko-KR') : '없음',
          sessionCount: this.crawlingHistory.sessionCount
        },
        limits: {
          dailyCount: this.crawlingHistory.dailyCount,
          dailyLimit: this.crawlingLimits.dailyLimit,
          remainingDaily: this.crawlingLimits.dailyLimit - this.crawlingHistory.dailyCount,
          maxReviewsPerSession: this.crawlingLimits.maxReviewsPerSession
        },
        recommendations: {
          suggestedReviews: Math.min(requestedReviews, this.crawlingLimits.maxReviewsPerSession),
          suggestedDelay: this.crawlingLimits.delayBetweenRequests,
          riskAssessment: overallStatus ? '안전' : '위험'
        }
      };
      
    } catch (error) {
      console.error('[ERROR] checkCrawlingAvailability 오류:', error);
      throw error;
    }
  }

  /**
   * HTTP 요청으로 리뷰 페이지 가져오기
   * @param {string} placeId - 네이버 플레이스 ID
   * @returns {Promise<string|null>} HTML 내용 또는 null
   */
  async fetchReviewPage(placeId) {
    try {
      console.log(`[INFO] HTTP 요청으로 리뷰 페이지 가져오기: ${placeId}`);
      
      const url = `https://m.place.naver.com/place/${placeId}/review/visitor`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none'
        },
        timeout: 15000
      });
      
      if (response.status === 200) {
        console.log(`[SUCCESS] 리뷰 페이지 가져오기 성공: ${placeId}`);
        return response.data;
      } else {
        console.log(`[WARNING] 리뷰 페이지 응답 상태: ${response.status}`);
        return null;
      }
      
    } catch (error) {
      console.error(`[ERROR] 리뷰 페이지 가져오기 실패: ${error.message}`);
      return null;
    }
  }

  /**
   * HTML에서 리뷰 데이터 추출
   * @param {string} html - HTML 내용
   * @param {number} maxReviews - 최대 추출할 리뷰 수
   * @returns {Array} 리뷰 배열
   */
  extractReviewsFromHTML(html, maxReviews = 10) {
    try {
      console.log(`[INFO] HTML에서 리뷰 추출 시작 (최대 ${maxReviews}개)`);
      
      const reviews = [];
      
      // 리뷰 패턴 매칭 (정규식 기반)
      const reviewPatterns = [
        // 패턴 1: 기본 리뷰 구조
        /<li[^>]*class="[^"]*place_apply_pui[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
        // 패턴 2: 리뷰 내용
        /<a[^>]*class="[^"]*pui__vn15t2[^"]*"[^>]*>([^<]+)<\/a>/gi,
        // 패턴 3: 작성자
        /<span[^>]*class="[^"]*pui__NMi-Dp[^"]*"[^>]*>([^<]+)<\/span>/gi
      ];
      
      // 간단한 텍스트 기반 추출 (실제 구현에서는 더 정교한 파싱 필요)
      const lines = html.split('\n');
      let currentReview = {};
      let reviewCount = 0;
      
      for (const line of lines) {
        if (reviewCount >= maxReviews) break;
        
        // 작성자 추출
        const authorMatch = line.match(/pui__NMi-Dp[^>]*>([^<]+)</);
        if (authorMatch) {
          if (currentReview.author) {
            // 이전 리뷰 완료
            if (currentReview.content) {
              reviews.push(currentReview);
              reviewCount++;
            }
            currentReview = {};
          }
          currentReview.author = authorMatch[1].trim();
        }
        
        // 리뷰 내용 추출
        const contentMatch = line.match(/pui__vn15t2[^>]*>([^<]+)</);
        if (contentMatch && currentReview.author) {
          currentReview.content = contentMatch[1].trim();
        }
        
        // 방문일 추출
        const dateMatch = line.match(/(\d{2,4}년\s*\d{1,2}월\s*\d{1,2}일)/);
        if (dateMatch && currentReview.author) {
          currentReview.visitDate = dateMatch[1];
        }
        
        // 방문횟수 추출
        const visitMatch = line.match(/(\d+번째\s*방문)/);
        if (visitMatch && currentReview.author) {
          currentReview.visitCount = visitMatch[1];
        }
        
        // 사진 개수 추출
        const photoMatch = line.match(/사진\s*(\d+)/);
        if (photoMatch && currentReview.author) {
          currentReview.photoCount = parseInt(photoMatch[1], 10);
        }
      }
      
      // 마지막 리뷰 처리
      if (currentReview.author && currentReview.content && reviewCount < maxReviews) {
        reviews.push(currentReview);
      }
      
      console.log(`[SUCCESS] HTML에서 ${reviews.length}개 리뷰 추출 완료`);
      return reviews;
      
    } catch (error) {
      console.error('[ERROR] HTML에서 리뷰 추출 실패:', error);
      return [];
    }
  }

  /**
   * 기초 단계 크롤링 (초기 10개 리뷰)
   * @param {string} placeId - 네이버 플레이스 ID
   * @returns {Promise<Object>} 크롤링 결과
   */
  async crawlBasicLevel(placeId) {
    try {
      console.log(`🔰 기초 단계 크롤링 시작: ${placeId}`);
      
      // 크롤링 제한 검증
      const validation = this.validateCrawlingLimits(10);
      if (!validation.allowed) {
        return {
          success: false,
          error: validation.reason,
          message: `크롤링 제한: ${validation.reason}`
        };
      }
      
      // 리뷰 페이지 가져오기
      const html = await this.fetchReviewPage(placeId);
      if (!html) {
        return {
          success: false,
          error: '리뷰 페이지를 가져올 수 없습니다.',
          message: '페이지 접속에 실패했습니다.'
        };
      }
      
      // 리뷰 추출
      const reviews = this.extractReviewsFromHTML(html, 10);
      
      // 크롤링 이력 업데이트
      this.updateCrawlingHistory(reviews.length);
      
      const levelInfo = CRAWLING_LEVELS.basic;
      const accuracyInfo = SENTIMENT_ANALYSIS_ACCURACY.smallSample;

      return {
        success: true,
        data: { 
          reviews: reviews,
          level: 'basic',
          targetRange: '10개 (초기 페이지만)',
          analysis: levelInfo.analysis,
          accuracy: levelInfo.accuracy,
          reliability: levelInfo.reliability,
          warning: levelInfo.warning,
          recommendation: levelInfo.recommendation,
          accuracyInfo: accuracyInfo,
          crawledAt: new Date().toISOString()
        },
        message: `기초 단계 크롤링 완료: ${reviews.length}개 리뷰 (정확도: ${levelInfo.accuracy})`
      };

    } catch (error) {
      console.error('[ERROR] 기초 단계 크롤링 오류:', error);
      return { 
        success: false, 
        error: error.message,
        message: '기초 단계 크롤링에 실패했습니다.'
      };
    }
  }

  /**
   * 중급 단계 크롤링 (20개 리뷰)
   * @param {string} placeId - 네이버 플레이스 ID
   * @returns {Promise<Object>} 크롤링 결과
   */
  async crawlIntermediateLevel(placeId) {
    try {
      console.log(`📊 중급 단계 크롤링 시작: ${placeId}`);
      
      // 크롤링 제한 검증
      const validation = this.validateCrawlingLimits(20);
      if (!validation.allowed) {
        return {
          success: false,
          error: validation.reason,
          message: `크롤링 제한: ${validation.reason}`
        };
      }
      
      // 여러 페이지에서 리뷰 수집
      const allReviews = [];
      
      // 첫 번째 페이지
      const html1 = await this.fetchReviewPage(placeId);
      if (html1) {
        const reviews1 = this.extractReviewsFromHTML(html1, 10);
        allReviews.push(...reviews1);
        await this.delay(this.crawlingLimits.delayBetweenRequests);
      }
      
      // 두 번째 페이지 (페이지네이션 시뮬레이션)
      if (allReviews.length < 20) {
        const html2 = await this.fetchReviewPage(placeId);
        if (html2) {
          const reviews2 = this.extractReviewsFromHTML(html2, 10);
          allReviews.push(...reviews2);
        }
      }
      
      // 중복 제거 및 최대 개수 제한
      const uniqueReviews = this.removeDuplicateReviews(allReviews).slice(0, 20);
      
      // 크롤링 이력 업데이트
      this.updateCrawlingHistory(uniqueReviews.length);
      
      const levelInfo = CRAWLING_LEVELS.intermediate;
      const accuracyInfo = SENTIMENT_ANALYSIS_ACCURACY.largeSample;

      return {
        success: true,
        data: { 
          reviews: uniqueReviews,
          level: 'intermediate',
          targetRange: '20개 (여러 페이지)',
          analysis: levelInfo.analysis,
          accuracy: levelInfo.accuracy,
          reliability: levelInfo.reliability,
          warning: levelInfo.warning,
          recommendation: levelInfo.recommendation,
          accuracyInfo: accuracyInfo,
          crawledAt: new Date().toISOString()
        },
        message: `중급 단계 크롤링 완료: ${uniqueReviews.length}개 리뷰 (정확도: ${levelInfo.accuracy})`
      };

    } catch (error) {
      console.error('[ERROR] 중급 단계 크롤링 오류:', error);
      return { 
        success: false, 
        error: error.message,
        message: '중급 단계 크롤링에 실패했습니다.'
      };
    }
  }

  /**
   * 고급 단계 크롤링 (50개 리뷰)
   * @param {string} placeId - 네이버 플레이스 ID
   * @returns {Promise<Object>} 크롤링 결과
   */
  async crawlAdvancedLevel(placeId) {
    try {
      console.log(`🎯 고급 단계 크롤링 시작: ${placeId}`);
      
      // 크롤링 제한 검증
      const validation = this.validateCrawlingLimits(50);
      if (!validation.allowed) {
        return {
          success: false,
          error: validation.reason,
          message: `크롤링 제한: ${validation.reason}`
        };
      }
      
      // 여러 페이지에서 리뷰 수집
      const allReviews = [];
      
      // 여러 페이지 시뮬레이션
      for (let page = 1; page <= 5; page++) {
        const html = await this.fetchReviewPage(placeId);
        if (html) {
          const reviews = this.extractReviewsFromHTML(html, 10);
          allReviews.push(...reviews);
          
          if (allReviews.length >= 50) break;
          
          await this.delay(this.crawlingLimits.delayBetweenRequests);
        }
      }
      
      // 중복 제거 및 최대 개수 제한
      const uniqueReviews = this.removeDuplicateReviews(allReviews).slice(0, 50);
      
      // 크롤링 이력 업데이트
      this.updateCrawlingHistory(uniqueReviews.length);
      
      const levelInfo = CRAWLING_LEVELS.advanced;
      const accuracyInfo = SENTIMENT_ANALYSIS_ACCURACY.sufficientSample;

      return {
        success: true,
        data: { 
          reviews: uniqueReviews,
          level: 'advanced',
          targetRange: '50개 (여러 페이지)',
          analysis: levelInfo.analysis,
          accuracy: levelInfo.accuracy,
          reliability: levelInfo.reliability,
          warning: levelInfo.warning,
          recommendation: levelInfo.recommendation,
          accuracyInfo: accuracyInfo,
          crawledAt: new Date().toISOString()
        },
        message: `고급 단계 크롤링 완료: ${uniqueReviews.length}개 리뷰 (정확도: ${levelInfo.accuracy})`
      };

    } catch (error) {
      console.error('[ERROR] 고급 단계 크롤링 오류:', error);
      return { 
        success: false, 
        error: error.message,
        message: '고급 단계 크롤링에 실패했습니다.'
      };
    }
  }

  /**
   * 중복 리뷰 제거
   * @param {Array} reviews - 리뷰 배열
   * @returns {Array} 중복 제거된 리뷰 배열
   */
  removeDuplicateReviews(reviews) {
    const seen = new Set();
    return reviews.filter(review => {
      const key = `${review.author}-${review.content}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 크롤링 테스트 (실제 크롤링 없이 환경 확인)
   * @param {string} placeId - 네이버 플레이스 ID
   * @returns {Promise<object>} 테스트 결과
   */
  async testCrawling(placeId) {
    try {
      console.log(`[INFO] HTTP 기반 크롤링 테스트 시작: ${placeId}`);
      
      // 리뷰 페이지 접속 테스트
      const html = await this.fetchReviewPage(placeId);
      if (!html) {
        return {
          success: false,
          message: '리뷰 페이지 접속에 실패했습니다.'
        };
      }
      
      // 간단한 리뷰 추출 테스트
      const reviews = this.extractReviewsFromHTML(html, 5);
      
      return {
        success: true,
        data: {
          placeId,
          pageSize: html.length,
          testReviews: reviews.length,
          testAt: new Date().toISOString()
        },
        message: 'HTTP 기반 크롤링 환경 테스트가 성공했습니다.'
      };
      
    } catch (error) {
      console.error('[ERROR] 크롤링 테스트 실패:', error);
      
      return {
        success: false,
        message: '크롤링 테스트 중 오류가 발생했습니다.',
        error: error.message
      };
    }
  }

  /**
   * 크롤링 상태 확인
   * @returns {Object} 크롤링 상태 정보
   */
  getCrawlingStatus() {
    return {
      limits: this.crawlingLimits,
      history: this.crawlingHistory,
      availability: this.checkCrawlingAvailability(10),
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = ReviewCrawlerService; 