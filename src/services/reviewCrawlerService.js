const puppeteer = require('puppeteer');
const { CRAWLING_LEVELS, SENTIMENT_ANALYSIS_ACCURACY } = require('../config/crawlingLimits');

/**
 * 네이버 플레이스 리뷰 크롤링 서비스
 * 안전한 크롤링을 위한 rate limiting 포함
 * 
 * 네이버 리뷰 구조: 초기 10개 → 더보기 클릭 시 10개씩 추가
 * 소표본 감성분석 한계: 10-20개(60-75%), 30-50개(75-85%), 100개+(85-95%)
 */
class ReviewCrawlerService {
  constructor() {
    this.browser = null;
    this.page = null;
    
    // 안전한 크롤링을 위한 설정
    this.crawlingLimits = {
      maxReviewsPerSession: 20,    // 세션당 최대 리뷰 수
      maxClicksPerSession: 2,      // 세션당 최대 더보기 클릭 수
      delayBetweenClicks: 3000,    // 클릭 간 대기 시간 (ms)
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
  }

  /**
   * 브라우저 초기화
   */
  async initializeBrowser() {
    try {
      this.browser = await puppeteer.launch({
        headless: true, // 헤드리스 모드 (백그라운드 실행)
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // User-Agent 설정
      await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // 뷰포트 설정
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      console.log('[INFO] 브라우저 초기화 완료');
      return true;
    } catch (error) {
      console.error('[ERROR] 브라우저 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 브라우저 종료
   */
  async closeBrowser() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        console.log('[INFO] 브라우저 종료 완료');
      }
    } catch (error) {
      console.error('[ERROR] 브라우저 종료 실패:', error);
    }
  }

  /**
   * 대기 함수 (Puppeteer 버전 호환성을 위한 헬퍼)
   * @param {number} ms - 대기할 시간 (밀리초)
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 크롤링 제한 검증
   * @param {number} requestedReviews - 요청된 리뷰 수
   * @returns {Object} 검증 결과
   */
  validateCrawlingLimits(requestedReviews = 10) {
    console.log('[DEBUG] validateCrawlingLimits 호출됨');
    console.log('[DEBUG] requestedReviews:', requestedReviews, typeof requestedReviews);
    
    const now = new Date();
    const today = now.toDateString();
    
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
    const today = now.toDateString();
    
    // 일일 카운트 업데이트
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
    console.log('[DEBUG] checkCrawlingAvailability 호출됨');
    console.log('[DEBUG] requestedReviews:', requestedReviews, typeof requestedReviews);
    
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
      const isWeekend = currentDay === 0 || currentDay === 6;
      
      console.log('[DEBUG] validation 호출 전');
      // 기본 제한 검증
      const validation = this.validateCrawlingLimits(requestedReviews);
      console.log('[DEBUG] validation 완료:', validation);
      
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
      
      console.log('[DEBUG] requestedReviews 최종 사용:', requestedReviews);
      
      const result = {
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
          suggestedDelay: this.crawlingLimits.delayBetweenClicks,
          riskAssessment: overallStatus ? '안전' : '위험'
        }
      };
      
      console.log('[DEBUG] 결과 반환:', result);
      return result;
      
    } catch (error) {
      console.error('[ERROR] checkCrawlingAvailability 오류:', error);
      throw error;
    }
  }

  /**
   * 더보기 버튼 클릭하여 추가 리뷰 로드
   * @param {number} maxClicks - 최대 클릭 횟수 (기본값: 3)
   */
  async loadMoreReviews(maxClicks = 3) {
    try {
      console.log(`[INFO] 더보기 버튼 클릭 시작 (최대 ${maxClicks}회)`);
      
      // 안전한 클릭 수 제한 적용
      const safeMaxClicks = Math.min(maxClicks, this.crawlingLimits.maxClicksPerSession);
      console.log(`[INFO] 안전한 클릭 수로 조정: ${safeMaxClicks}회`);
      
      let clickCount = 0;
      let hasMoreButton = true;
      
      while (hasMoreButton && clickCount < safeMaxClicks) {
        // iframe 내에서 더보기 버튼 찾기 (모든 iframe 확인)
        const frames = this.page.frames();
        let frame = null;
        
        // entryIframe 또는 리뷰가 있는 iframe 찾기
        for (const f of frames) {
          const frameName = f.name();
          console.log(`[DEBUG] iframe 확인: ${frameName}`);
          if (frameName === 'entryIframe' || frameName === '') {
            frame = f;
            break;
          }
        }
        
        if (!frame) {
          console.log('[WARNING] 적절한 iframe을 찾을 수 없습니다.');
          break;
        }
        
        // 더보기 버튼 찾기
        const moreButton = await frame.$('button:has-text("더보기")');
        if (!moreButton) {
          console.log('[INFO] 더보기 버튼이 없습니다. 모든 리뷰를 로드했습니다.');
          break;
        }
        
        // 안전한 딜레이 적용
        await this.wait(this.crawlingLimits.delayBetweenClicks);
        
        // 더보기 버튼 클릭
        await moreButton.click();
        clickCount++;
        
        console.log(`[INFO] 더보기 버튼 클릭 완료 (${clickCount}/${safeMaxClicks})`);
        
        // 클릭 후 페이지 로딩 대기
        await this.wait(2000);
      }
      
      return clickCount;
      
    } catch (error) {
      console.error('[ERROR] 더보기 버튼 클릭 실패:', error);
      return 0;
    }
  }

  /**
   * coordinateId를 실제 네이버 플레이스 placeId로 변환
   * @param {string} coordinateId - 좌표 기반 ID (예: "1270520660_374984818")
   * @returns {Promise<string|null>} 실제 placeId 또는 null
   */
  async convertCoordinateIdToPlaceId(coordinateId) {
    try {
      console.log(`[INFO] coordinateId를 placeId로 변환 시도: ${coordinateId}`);
      
      if (!coordinateId || !coordinateId.includes('_')) {
        console.log('[WARNING] 유효하지 않은 coordinateId 형식');
        return null;
      }

      const [x, y] = coordinateId.split('_');
      console.log(`[DEBUG] 좌표: x=${x}, y=${y}`);

      // 네이버 지도에서 해당 좌표로 검색하여 실제 placeId 찾기
      const searchUrl = `https://map.naver.com/p/search?query=&c=${y},${x},15,0,0,0,dh`;
      console.log(`[INFO] 검색 URL: ${searchUrl}`);

      await this.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.wait(3000);

      // 페이지에서 placeId 추출 시도
      const placeId = await this.page.evaluate(() => {
        // URL에서 placeId 추출 시도
        const url = window.location.href;
        const placeMatch = url.match(/place\/(\d+)/);
        if (placeMatch) {
          return placeMatch[1];
        }

        // 페이지 내 요소에서 placeId 추출 시도
        const placeElements = document.querySelectorAll('[data-place-id], [data-id]');
        for (const element of placeElements) {
          const id = element.getAttribute('data-place-id') || element.getAttribute('data-id');
          if (id && /^\d+$/.test(id)) {
            return id;
          }
        }

        return null;
      });

      if (placeId) {
        console.log(`[SUCCESS] coordinateId 변환 성공: ${coordinateId} → ${placeId}`);
        return placeId;
      } else {
        console.log('[WARNING] coordinateId 변환 실패: placeId를 찾을 수 없습니다.');
        return null;
      }

    } catch (error) {
      console.error('[ERROR] coordinateId 변환 오류:', error);
      return null;
    }
  }

  /**
   * 리뷰 페이지로 이동
   */
  async navigateToReviewPage(placeId) {
    try {
      console.log(`[INFO] 리뷰 페이지 접속 시도: ${placeId}`);
      
      // coordinateId인지 확인
      let actualPlaceId = placeId;
      if (placeId.includes('_')) {
        console.log('[INFO] coordinateId 감지됨, 실제 placeId로 변환 시도...');
        actualPlaceId = await this.convertCoordinateIdToPlaceId(placeId);
        if (!actualPlaceId) {
          console.log('[WARNING] coordinateId 변환 실패, 원본 ID 사용');
          actualPlaceId = placeId;
        }
      }
      
      console.log(`[INFO] 실제 사용할 ID: ${actualPlaceId}`);
      
      // 여러 URL 패턴 시도
      const urlPatterns = [
        `https://pcmap.place.naver.com/place/${actualPlaceId}/review/visitor`,
        `https://m.place.naver.com/restaurant/${actualPlaceId}/review/visitor`,
        `https://map.naver.com/p/entry/place/${actualPlaceId}`,
        `https://m.place.naver.com/place/${actualPlaceId}/home`
      ];

      for (let i = 0; i < urlPatterns.length; i++) {
        try {
          console.log(`[INFO] URL 패턴 ${i + 1} 시도: ${urlPatterns[i]}`);
          await this.page.goto(urlPatterns[i], { waitUntil: 'networkidle2', timeout: 30000 });
          await this.wait(3000);
          
          // 현재 URL 확인
          const currentUrl = this.page.url();
          console.log(`[DEBUG] 현재 URL: ${currentUrl}`);
          
          // 페이지 제목 확인
          const title = await this.page.title();
          console.log(`[DEBUG] 페이지 제목: ${title}`);
          
          // 페이지가 로드되었는지 확인
          if (currentUrl !== 'about:blank' && !currentUrl.includes('error')) {
            console.log(`[SUCCESS] URL 패턴 ${i + 1}로 페이지 접속 성공`);
            return true;
          }
        } catch (error) {
          console.log(`[ERROR] URL 패턴 ${i + 1} 실패:`, error.message);
          continue;
        }
      }
      
      console.log('[ERROR] 모든 URL 패턴 실패');
      return false;
      
    } catch (error) {
      console.error('[ERROR] 리뷰 페이지 접속 실패:', error);
      return false;
    }
  }

  /**
   * 리뷰 데이터 추출 (더보기 버튼 클릭하여 추가 리뷰 로드 포함)
   */
  async extractReviews(maxReviews = 50) {
    try {
      console.log('[INFO] 리뷰 데이터 추출 시작...');
      await this.wait(3000);
      
      // 더보기 버튼 클릭하여 추가 리뷰 로드
      console.log('[INFO] 더보기 버튼을 클릭하여 추가 리뷰를 로드합니다...');
      const clickCount = await this.loadMoreReviews(3); // 최대 3회 클릭
      console.log(`[SUCCESS] 더보기 버튼 클릭 완료: ${clickCount}회 클릭`);
      
      // 추가 로딩 후 잠시 대기
      await this.wait(2000);
      // iframe 확인 및 처리
      console.log('[INFO] iframe 확인 중...');
      const iframeInfo = await this.page.evaluate(() => {
        const iframes = document.querySelectorAll('iframe');
        const iframeData = [];
        iframes.forEach((iframe, index) => {
          try {
            const src = iframe.src;
            const id = iframe.id;
            const name = iframe.name;
            const className = iframe.className;
            iframeData.push({
              index,
              src,
              id,
              name,
              className,
              width: iframe.offsetWidth,
              height: iframe.offsetHeight
            });
          } catch (e) {
            iframeData.push({
              index,
              error: e.message
            });
          }
        });
        return iframeData;
      });
      console.log('[DEBUG] iframe 정보:');
      iframeInfo.forEach((info, index) => {
        console.log(`  iframe ${index}:`, info);
      });
      // iframe이 있다면 iframe 내부 확인
      if (iframeInfo.length > 0) {
        console.log('[INFO] iframe 내부 확인 중...');
        for (let i = 0; i < iframeInfo.length; i++) {
          try {
            const frame = this.page.frames()[i];
            if (frame) {
              console.log(`[DEBUG] iframe ${i} 내부 확인...`);
              // iframe 내부에서 리뷰 리스트 DOM을 직접 탐색하여 각 리뷰를 파싱
              const frameReviews = await frame.evaluate(() => {
                const reviews = [];
                
                // 사용자가 제공한 정확한 HTML 구조를 바탕으로 리뷰 추출
                // 메인 리뷰 리스트: ul#_review_list > li.place_apply_pui.EjjAW
                const reviewItems = document.querySelectorAll('ul#_review_list > li.place_apply_pui.EjjAW');
                console.log(`발견된 리뷰 아이템 수: ${reviewItems.length}`);
                
                reviewItems.forEach((item, index) => {
                  try {
                    // 작성자: .pui__NMi-Dp
                    const authorEl = item.querySelector('.pui__NMi-Dp');
                    const author = authorEl ? authorEl.textContent.trim() : null;
                    
                    // 리뷰 내용: .pui__vn15t2 a
                    const contentEl = item.querySelector('.pui__vn15t2 a');
                    const content = contentEl ? contentEl.textContent.trim() : null;
                    
                    // 방문일: .pui__QKE5Pr .pui__gfuUIT:nth-child(1) time 또는 세 번째 span
                    let visitDate = null;
                    const visitDateContainer = item.querySelector('.pui__QKE5Pr');
                    if (visitDateContainer) {
                      const dateElements = visitDateContainer.querySelectorAll('.pui__gfuUIT');
                      if (dateElements.length >= 1) {
                        const timeEl = dateElements[0].querySelector('time');
                        if (timeEl) {
                          visitDate = timeEl.textContent.trim();
                        } else {
                          // time 태그가 없으면 첫 번째 요소의 텍스트에서 날짜 패턴 찾기
                          const dateText = dateElements[0].textContent;
                          const dateMatch = dateText.match(/\d{2,4}년\s*\d{1,2}월\s*\d{1,2}일/);
                          if (dateMatch) {
                            visitDate = dateMatch[0];
                          }
                        }
                      }
                    }
                    
                    // 방문횟수: .pui__QKE5Pr .pui__gfuUIT:nth-child(2)
                    let visitCount = null;
                    if (visitDateContainer) {
                      const visitElements = visitDateContainer.querySelectorAll('.pui__gfuUIT');
                      if (visitElements.length >= 2) {
                        const visitText = visitElements[1].textContent;
                        const visitMatch = visitText.match(/(\d+번째\s*방문)/);
                        if (visitMatch) {
                          visitCount = visitMatch[1];
                        }
                      }
                    }
                    
                    // 사진 개수: .pui__RuLAax .pui__WN-kAf:nth-child(2)
                    let photoCount = null;
                    const photoContainer = item.querySelector('.pui__RuLAax');
                    if (photoContainer) {
                      const photoElements = photoContainer.querySelectorAll('.pui__WN-kAf');
                      if (photoElements.length >= 2) {
                        const photoText = photoElements[1].textContent;
                        const photoMatch = photoText.match(/사진\s*(\d+)/);
                        if (photoMatch) {
                          photoCount = parseInt(photoMatch[1], 10);
                        }
                      }
                    }
                    
                    // 리뷰 유효성 체크 (작성자와 내용이 있어야 유효한 리뷰)
                    if (author && content && author.length > 0 && content.length > 0) {
                      const review = {
                        author,
                        content,
                        visitDate,
                        visitCount,
                        photoCount,
                      };
                      reviews.push(review);
                      console.log(`리뷰 ${index + 1} 추출 성공:`, review);
                    } else {
                      console.log(`리뷰 ${index + 1} 유효성 검사 실패:`, { author, content });
                    }
                  } catch (error) {
                    console.log(`리뷰 ${index + 1} 처리 중 오류:`, error.message);
                  }
                });
                
                console.log(`총 ${reviews.length}개 유효한 리뷰 추출 완료`);
                return reviews;
              });
              if (frameReviews.length > 0) {
                console.log(`[SUCCESS] iframe ${i}에서 ${frameReviews.length}개 리뷰 발견:`, frameReviews);
                return frameReviews;
              }
            }
          } catch (e) {
            console.log(`[ERROR] iframe ${i} 처리 중 오류:`, e.message);
          }
        }
      }
      // iframe이 없거나 실패 시 빈 배열 반환
      return [];
    } catch (error) {
      console.error('[ERROR] 리뷰 추출 중 오류:', error);
      return [];
    }
  }

  /**
   * 리뷰 크롤링 실행
   * @param {string} placeId - 네이버 플레이스 ID
   * @param {number} maxReviews - 최대 추출할 리뷰 수
   * @returns {Promise<Object>} 크롤링 결과
   */
  async crawlReviews(placeId, maxReviews = 10) {
    try {
      console.log(`[INFO] 리뷰 크롤링 시작: ${placeId}`);
      
      // 안전한 크롤링 제한 검증
      const validation = this.validateCrawlingLimits(maxReviews);
      if (!validation.allowed) {
        return {
          success: false,
          error: validation.reason,
          limit: validation.limit,
          current: validation.current,
          message: `크롤링 제한: ${validation.reason}`
        };
      }
      
      // 브라우저 초기화
      await this.initializeBrowser();
      
      // 리뷰 페이지로 이동
      await this.navigateToReviewPage(placeId);
      
      // 리뷰 데이터 추출
      const reviews = await this.extractReviews(maxReviews);
      
      // 브라우저 종료
      await this.closeBrowser();
      
      // 크롤링 이력 업데이트
      this.updateCrawlingHistory(reviews.length);
      
      return {
        success: true,
        data: {
          placeId,
          reviews,
          totalCount: reviews.length,
          crawledAt: new Date().toISOString(),
          dailyCount: this.crawlingHistory.dailyCount,
          sessionCount: this.crawlingHistory.sessionCount
        },
        message: `${reviews.length}개의 리뷰를 성공적으로 크롤링했습니다.`
      };
      
    } catch (error) {
      console.error('[ERROR] 리뷰 크롤링 실패:', error);
      
      // 브라우저가 열려있다면 종료
      try {
        await this.closeBrowser();
      } catch (closeError) {
        console.error('[ERROR] 브라우저 종료 중 오류:', closeError);
      }
      
      return {
        success: false,
        error: error.message,
        message: '리뷰 크롤링에 실패했습니다.'
      };
    }
  }

  /**
   * 크롤링 테스트 (실제 크롤링 없이 환경 확인)
   * @param {string} placeId - 네이버 플레이스 ID
   * @returns {Promise<object>} 테스트 결과
   */
  async testCrawling(placeId) {
    try {
      console.log(`[INFO] 크롤링 테스트 시작: ${placeId}`);
      
      // 브라우저 초기화
      const browserInitialized = await this.initializeBrowser();
      if (!browserInitialized) {
        return {
          success: false,
          message: '브라우저 초기화에 실패했습니다.'
        };
      }
      
      // 리뷰 페이지 접속
      const pageAccessed = await this.navigateToReviewPage(placeId);
      if (!pageAccessed) {
        await this.closeBrowser();
        return {
          success: false,
          message: '리뷰 페이지 접속에 실패했습니다.'
        };
      }
      
      // 페이지 제목 확인
      const pageTitle = await this.page.title();
      console.log(`📄 페이지 제목: ${pageTitle}`);
      
      // 브라우저 종료
      await this.closeBrowser();
      
      return {
        success: true,
        data: {
          placeId,
          pageTitle,
          testAt: new Date().toISOString()
        },
        message: '크롤링 환경 테스트가 성공했습니다.'
      };
      
    } catch (error) {
      console.error('[ERROR] 크롤링 테스트 실패:', error);
      await this.closeBrowser();
      
      return {
        success: false,
        message: '크롤링 테스트 중 오류가 발생했습니다.',
        error: error.message
      };
    }
  }

  /**
   * 기초 단계 크롤링 (초기 10개 리뷰)
   * - 기본 감성, 주요 키워드 3개
   * - 더보기 버튼 클릭 없음
   * - 정확도: 60-75%
   */
  async crawlBasicLevel(placeId) {
    try {
      console.log(`🔰 기초 단계 크롤링 시작: ${placeId}`);
      
      const browserInitialized = await this.initializeBrowser();
      if (!browserInitialized) {
        return { success: false, error: '브라우저 초기화 실패' };
      }

      const pageAccessed = await this.navigateToReviewPage(placeId);
      if (!pageAccessed) {
        await this.closeBrowser();
        return { success: false, error: '페이지 접속 실패' };
      }

      // 기초 단계: 더보기 버튼 클릭 없이 초기 10개만 (안전한 범위)
      const reviews = await this.extractReviewsBasic(10);
      await this.closeBrowser();

      const levelInfo = CRAWLING_LEVELS.basic;
      const accuracyInfo = SENTIMENT_ANALYSIS_ACCURACY.smallSample;

      return {
        success: true,
        data: { 
          reviews: reviews || [],
          level: 'basic',
          targetRange: '10개 (초기 페이지만)',
          analysis: levelInfo.analysis,
          accuracy: levelInfo.accuracy,
          reliability: levelInfo.reliability,
          warning: levelInfo.warning,
          recommendation: levelInfo.recommendation,
          accuracyInfo: accuracyInfo
        },
        message: `기초 단계 크롤링 완료: ${reviews ? reviews.length : 0}개 리뷰 (정확도: ${levelInfo.accuracy})`
      };

    } catch (error) {
      console.error('[ERROR] 기초 단계 크롤링 오류:', error);
      await this.closeBrowser();
      return { success: false, error: error.message };
    }
  }

  /**
   * 중급 단계 크롤링 (초기 10개 + 더보기 2회 = 총 30개)
   * - 감성분석, 키워드 분석, 만족도
   * - 더보기 버튼 2회 클릭
   * - 정확도: 75-85%
   */
  async crawlIntermediateLevel(placeId) {
    try {
      console.log(`[INFO] 중급 단계 크롤링 시작: ${placeId}`);
      
      const browserInitialized = await this.initializeBrowser();
      if (!browserInitialized) {
        return { success: false, error: '브라우저 초기화 실패' };
      }

      const pageAccessed = await this.navigateToReviewPage(placeId);
      if (!pageAccessed) {
        await this.closeBrowser();
        return { success: false, error: '페이지 접속 실패' };
      }

      // 중급 단계: 더보기 버튼 2회 클릭 (초기 10개 + 10개 + 10개 = 30개)
      const reviews = await this.extractReviewsIntermediate(30);
      await this.closeBrowser();

      const levelInfo = CRAWLING_LEVELS.intermediate;
      const accuracyInfo = SENTIMENT_ANALYSIS_ACCURACY.largeSample;

      return {
        success: true,
        data: { 
          reviews: reviews || [],
          level: 'intermediate',
          targetRange: '30개 (초기 10개 + 더보기 2회)',
          analysis: levelInfo.analysis,
          accuracy: levelInfo.accuracy,
          reliability: levelInfo.reliability,
          warning: levelInfo.warning,
          recommendation: levelInfo.recommendation,
          accuracyInfo: accuracyInfo
        },
        message: `중급 단계 크롤링 완료: ${reviews ? reviews.length : 0}개 리뷰 (정확도: ${levelInfo.accuracy})`
      };

    } catch (error) {
      console.error('[ERROR] 중급 단계 크롤링 오류:', error);
      await this.closeBrowser();
      return { success: false, error: error.message };
    }
  }

  /**
   * 고급 단계 크롤링 (초기 10개 + 더보기 9회 = 총 100개)
   * - 속성별 분석, 개선점 도출
   * - 더보기 버튼 9회 클릭
   * - 정확도: 85-95%
   */
  async crawlAdvancedLevel(placeId) {
    try {
      console.log(`🎯 고급 단계 크롤링 시작: ${placeId}`);
      
      const browserInitialized = await this.initializeBrowser();
      if (!browserInitialized) {
        return { success: false, error: '브라우저 초기화 실패' };
      }

      const pageAccessed = await this.navigateToReviewPage(placeId);
      if (!pageAccessed) {
        await this.closeBrowser();
        return { success: false, error: '페이지 접속 실패' };
      }

      // 고급 단계: 더보기 버튼 9회 클릭 (초기 10개 + 90개 = 100개)
      const reviews = await this.extractReviewsAdvanced(100);
      await this.closeBrowser();

      const levelInfo = CRAWLING_LEVELS.advanced;
      const accuracyInfo = SENTIMENT_ANALYSIS_ACCURACY.sufficientSample;

      return {
        success: true,
        data: { 
          reviews: reviews || [],
          level: 'advanced',
          targetRange: '100개 (초기 10개 + 더보기 9회)',
          analysis: levelInfo.analysis,
          accuracy: levelInfo.accuracy,
          reliability: levelInfo.reliability,
          warning: levelInfo.warning,
          recommendation: levelInfo.recommendation,
          accuracyInfo: accuracyInfo
        },
        message: `고급 단계 크롤링 완료: ${reviews ? reviews.length : 0}개 리뷰 (정확도: ${levelInfo.accuracy})`
      };

    } catch (error) {
      console.error('[ERROR] 고급 단계 크롤링 오류:', error);
      await this.closeBrowser();
      return { success: false, error: error.message };
    }
  }

  /**
   * 기초 단계용 리뷰 추출 (더보기 버튼 클릭 없음, 초기 10개만)
   */
  async extractReviewsBasic(maxReviews = 10) {
    try {
      console.log('[INFO] 기초 단계 리뷰 데이터 추출 시작...');
      console.log('[WARNING] 더보기 버튼 클릭 없이 초기 10개만 추출 (정확도: 60-75%)');
      await this.wait(3000);
      
      // 더보기 버튼 클릭 없이 초기 페이지만
      return await this.extractReviewsFromIframe(maxReviews);

    } catch (error) {
      console.error('[ERROR] 기초 단계 리뷰 추출 오류:', error);
      return [];
    }
  }

  /**
   * 중급 단계용 리뷰 추출 (더보기 버튼 2회 클릭, 총 30개)
   */
  async extractReviewsIntermediate(maxReviews = 30) {
    try {
      console.log('[INFO] 중급 단계 리뷰 데이터 추출 시작...');
      console.log('[INFO] 더보기 버튼 2회 클릭하여 총 30개 추출 (정확도: 75-85%)');
      await this.wait(3000);
      
      // 중급 단계: 더보기 버튼 2회 클릭 (초기 10개 + 10개 + 10개)
              console.log('[INFO] 더보기 버튼을 클릭하여 추가 리뷰를 로드합니다...');
        const clickCount = await this.loadMoreReviews(2); // 2회 클릭
        console.log(`[SUCCESS] 더보기 버튼 클릭 완료: ${clickCount}회 클릭`);
      
      // 추가 로딩 후 잠시 대기
      await this.wait(2000);
      
      // 기존 extractReviews 로직과 동일
      return await this.extractReviewsFromIframe(maxReviews);

    } catch (error) {
      console.error('[ERROR] 중급 단계 리뷰 추출 오류:', error);
      return [];
    }
  }

  /**
   * 고급 단계용 리뷰 추출 (더보기 버튼 9회 클릭, 총 100개)
   */
  async extractReviewsAdvanced(maxReviews = 100) {
    try {
      console.log('[INFO] 고급 단계 리뷰 데이터 추출 시작...');
      console.log('🎯 더보기 버튼 9회 클릭하여 총 100개 추출 (정확도: 85-95%)');
      await this.wait(3000);
      
      // 고급 단계: 더보기 버튼 9회 클릭 (초기 10개 + 90개)
              console.log('[INFO] 더보기 버튼을 클릭하여 추가 리뷰를 로드합니다...');
        const clickCount = await this.loadMoreReviews(9); // 9회 클릭
        console.log(`[SUCCESS] 더보기 버튼 클릭 완료: ${clickCount}회 클릭`);
      
      // 추가 로딩 후 잠시 대기
      await this.wait(3000);
      
      // 기존 extractReviews 로직과 동일
      return await this.extractReviewsFromIframe(maxReviews);

    } catch (error) {
      console.error('[ERROR] 고급 단계 리뷰 추출 오류:', error);
      return [];
    }
  }

  /**
   * iframe에서 리뷰 추출하는 공통 로직
   */
  async extractReviewsFromIframe(maxReviews = 50) {
    // iframe 확인 및 처리
          console.log('[INFO] iframe 확인 중...');
    const iframeInfo = await this.page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe');
      const iframeData = [];
      iframes.forEach((iframe, index) => {
        try {
          const src = iframe.src;
          const id = iframe.id;
          const name = iframe.name;
          const className = iframe.className;
          iframeData.push({
            index,
            src,
            id,
            name,
            className,
            width: iframe.offsetWidth,
            height: iframe.offsetHeight
          });
        } catch (e) {
          iframeData.push({
            index,
            error: e.message
          });
        }
      });
      return iframeData;
    });

          console.log('[DEBUG] iframe 정보:');
    iframeInfo.forEach((iframe, index) => {
      console.log(`  iframe ${index}:`, iframe);
    });

    // iframe 내부에서 리뷰 추출
          console.log('[INFO] iframe 내부 확인 중...');
    let reviews = [];
    
    for (let i = 0; i < iframeInfo.length; i++) {
      console.log(`iframe ${i} 내부 확인...`);
      try {
        const frame = this.page.frames()[i];
        if (frame) {
          const frameReviews = await frame.evaluate((maxReviews) => {
            const reviewElements = document.querySelectorAll('ul#_review_list > li.place_apply_pui.EjjAW');
            const reviews = [];
            
            for (let j = 0; j < Math.min(reviewElements.length, maxReviews); j++) {
              const element = reviewElements[j];
              try {
                const author = element.querySelector('.pui__NMi-Dp')?.textContent?.trim() || '';
                const content = element.querySelector('.pui__vn15t2 a')?.textContent?.trim() || '';
                const visitDate = element.querySelector('.pui__QKE5Pr')?.textContent?.trim() || '';
                const visitCount = element.querySelector('.pui__RuLAax')?.textContent?.trim() || '';
                
                // 사진 개수 추출
                const photoElement = element.querySelector('.pui__RuLAax');
                let photoCount = 0;
                if (photoElement) {
                  const photoText = photoElement.textContent;
                  const photoMatch = photoText.match(/(\d+)장/);
                  photoCount = photoMatch ? parseInt(photoMatch[1]) : 0;
                }
                
                if (author && content) {
                  reviews.push({
                    author,
                    content,
                    visitDate,
                    visitCount,
                    photoCount
                  });
                }
              } catch (e) {
                console.error('리뷰 요소 파싱 오류:', e);
              }
            }
            
            return reviews;
          }, maxReviews);
          
          if (frameReviews && frameReviews.length > 0) {
            console.log(`[SUCCESS] iframe ${i}에서 ${frameReviews.length}개 리뷰 발견:`, frameReviews);
            reviews = frameReviews;
            break;
          }
        }
      } catch (e) {
        console.error(`iframe ${i} 처리 오류:`, e);
      }
    }

          console.log(`[SUCCESS] 크롤링 완료: ${reviews.length}개 리뷰 추출`);
    return reviews;
  }
}

module.exports = ReviewCrawlerService; 