const puppeteer = require('puppeteer');

/**
 * 네이버 플레이스 리뷰 크롤링 서비스
 */
class ReviewCrawlerService {
  constructor() {
    this.browser = null;
    this.page = null;
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
      
      console.log('✅ 브라우저 초기화 완료');
      return true;
    } catch (error) {
      console.error('❌ 브라우저 초기화 실패:', error);
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
        console.log('✅ 브라우저 종료 완료');
      }
    } catch (error) {
      console.error('❌ 브라우저 종료 실패:', error);
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
   * 리뷰 페이지로 이동
   */
  async navigateToReviewPage(placeId) {
    try {
      console.log(`🔍 리뷰 페이지 접속: https://map.naver.com/p/entry/place/${placeId}`);
      
      // 직접 리뷰 URL로 이동 (더 안정적)
      const reviewUrl = `https://pcmap.place.naver.com/place/${placeId}/review/visitor`;
      await this.page.goto(reviewUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // 페이지 로딩 대기
      await this.wait(3000);
      
      // 현재 URL 확인
      const currentUrl = this.page.url();
      console.log(`현재 URL: ${currentUrl}`);
      
      // 페이지 제목 확인
      const title = await this.page.title();
      console.log(`페이지 제목: ${title}`);
      
      // 리뷰 페이지인지 확인
      if (currentUrl.includes('/review/') || title.includes('리뷰') || title.includes('네이버 플레이스')) {
        console.log('✅ 리뷰 페이지 접속 성공');
        return true;
      } else {
        console.log('⚠️ 리뷰 페이지가 아닙니다. 다시 시도합니다.');
        
        // 대안 URL 시도
        const alternativeUrl = `https://m.place.naver.com/restaurant/${placeId}/review/visitor`;
        console.log(`🔍 대안 URL 시도: ${alternativeUrl}`);
        await this.page.goto(alternativeUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await this.wait(3000);
        
        const altCurrentUrl = this.page.url();
        const altTitle = await this.page.title();
        console.log(`대안 URL 결과: ${altCurrentUrl}`);
        console.log(`대안 제목: ${altTitle}`);
        
        if (altCurrentUrl.includes('/review/') || altTitle.includes('리뷰') || altTitle.includes('네이버 플레이스')) {
          console.log('✅ 대안 URL로 리뷰 페이지 접속 성공');
          return true;
        }
        
        return false;
      }
      
    } catch (error) {
      console.error('❌ 리뷰 페이지 접속 실패:', error);
      return false;
    }
  }

  /**
   * 리뷰 데이터 추출 (더보기 없이 현재 페이지에 노출된 모든 리뷰)
   */
  async extractReviews(maxReviews = 50) {
    try {
      console.log('📜 리뷰 데이터 추출 시작...');
      await this.wait(3000);
      // iframe 확인 및 처리
      console.log('🔍 iframe 확인 중...');
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
      console.log('📊 iframe 정보:');
      iframeInfo.forEach((info, index) => {
        console.log(`  iframe ${index}:`, info);
      });
      // iframe이 있다면 iframe 내부 확인
      if (iframeInfo.length > 0) {
        console.log('🔍 iframe 내부 확인 중...');
        for (let i = 0; i < iframeInfo.length; i++) {
          try {
            const frame = this.page.frames()[i];
            if (frame) {
              console.log(`iframe ${i} 내부 확인...`);
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
                console.log(`✅ iframe ${i}에서 ${frameReviews.length}개 리뷰 발견:`, frameReviews);
                return frameReviews;
              }
            }
          } catch (e) {
            console.log(`iframe ${i} 처리 중 오류:`, e.message);
          }
        }
      }
      // iframe이 없거나 실패 시 빈 배열 반환
      return [];
    } catch (error) {
      console.error('❌ 리뷰 추출 중 오류:', error);
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
      console.log(`🚀 리뷰 크롤링 시작: ${placeId}`);
      
      // 브라우저 초기화
      await this.initializeBrowser();
      
      // 리뷰 페이지로 이동
      await this.navigateToReviewPage(placeId);
      
      // 리뷰 데이터 추출
      const reviews = await this.extractReviews(maxReviews);
      
      // 브라우저 종료
      await this.closeBrowser();
      
      return {
        success: true,
        data: {
          placeId,
          reviews,
          totalCount: reviews.length,
          crawledAt: new Date().toISOString()
        },
        message: `${reviews.length}개의 리뷰를 성공적으로 크롤링했습니다.`
      };
      
    } catch (error) {
      console.error('❌ 리뷰 크롤링 실패:', error);
      
      // 브라우저가 열려있다면 종료
      try {
        await this.closeBrowser();
      } catch (closeError) {
        console.error('브라우저 종료 중 오류:', closeError);
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
      console.log(`🧪 크롤링 테스트 시작: ${placeId}`);
      
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
      console.error('❌ 크롤링 테스트 실패:', error);
      await this.closeBrowser();
      
      return {
        success: false,
        message: '크롤링 테스트 중 오류가 발생했습니다.',
        error: error.message
      };
    }
  }
}

module.exports = new ReviewCrawlerService(); 