import puppeteer from 'puppeteer';
import delay from 'delay';
import { getNaverSession } from './sessionService.js';
import { logger } from '../utils/logger.js';
import { SmartClickService } from './smartClickService.js';

export const navigateToReviewPage = async (userStoreId) => {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // 1. 저장된 세션 정보 로드
    const sessionData = await getNaverSession(userStoreId);
    if (!sessionData) {
      throw new Error('저장된 네이버 세션이 없습니다');
    }

    // 2. 세션 쿠키 복원
    await page.setCookie(...sessionData.cookies);
    logger.info('🍪 세션 쿠키 복원 완료');

    // 3. User-Agent 설정
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 4. 네이버 스마트플레이스 메인으로 이동
    logger.info('🌐 네이버 스마트플레이스 메인 접속 중...');
    await page.goto('https://new.smartplace.naver.com/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // 5. 로그인 상태 확인
    logger.info('�� 로그인 상태 확인 중...');
    
    // 페이지 로딩 대기
    await delay(3000);
    
    const loginStatus = await page.evaluate(() => {
      // 페이지 구조 분석
      const pageAnalysis = {
        title: document.title,
        url: window.location.href,
        bodyClasses: document.body.className,
        hasLoginBtn: false,
        hasUserInfo: false,
        hasBusinessMenu: false,
        allLinks: [],
        allButtons: []
      };
      
      // 로그인 버튼 확인
      const loginSelectors = [
        '.login_btn', '.login-btn', '[class*="login"]', 
        'button:contains("로그인")', 'a:contains("로그인")'
      ];
      
      for (const selector of loginSelectors) {
        try {
          if (document.querySelector(selector)) {
            pageAnalysis.hasLoginBtn = true;
            break;
          }
        } catch (e) {
          // 선택자 오류 무시
        }
      }
      
      // 사용자 정보 확인
      const userSelectors = [
        '[class*="사용자"]', '[class*="로그인"]', '.user-info',
        '[class*="업체변경"]', '[class*="내업체"]', 'a[href*="myplace"]',
        '[class*="user"]', '[class*="profile"]', '[class*="account"]'
      ];
      
      for (const selector of userSelectors) {
        try {
          if (document.querySelector(selector)) {
            pageAnalysis.hasUserInfo = true;
            break;
          }
        } catch (e) {
          // 선택자 오류 무시
        }
      }
      
      // 비즈니스 메뉴 확인
      const businessSelectors = [
        'a[href*="myplace"]', 'a[href*="business"]', '[class*="업체"]',
        '[class*="business"]', '[class*="store"]'
      ];
      
      for (const selector of businessSelectors) {
        try {
          if (document.querySelector(selector)) {
            pageAnalysis.hasBusinessMenu = true;
            break;
          }
        } catch (e) {
          // 선택자 오류 무시
        }
      }
      
      // 모든 링크와 버튼 수집 (디버깅용)
      const allLinks = Array.from(document.querySelectorAll('a')).slice(0, 20);
      const allButtons = Array.from(document.querySelectorAll('button')).slice(0, 20);
      
      pageAnalysis.allLinks = allLinks.map(link => ({
        href: link.href,
        text: link.textContent?.trim(),
        class: link.className
      }));
      
      pageAnalysis.allButtons = allButtons.map(btn => ({
        text: btn.textContent?.trim(),
        class: btn.className
      }));
      
      return pageAnalysis;
    });
    
    logger.info('📊 페이지 분석 결과:', loginStatus);
    
    // 로그인 상태 판단
    const isLoggedIn = !loginStatus.hasLoginBtn && (loginStatus.hasUserInfo || loginStatus.hasBusinessMenu);
    
    if (!isLoggedIn) {
      // 더 자세한 분석을 위해 페이지 소스 확인
      logger.warn('⚠️ 로그인 상태를 확실히 확인할 수 없음, 추가 분석 진행');
      
      // 로그인 페이지인지 확인
      if (loginStatus.title.includes('로그인') || loginStatus.url.includes('login')) {
        throw new Error('세션이 만료되었습니다. 재로그인이 필요합니다.');
      }
      
      // 다른 페이지 구조일 수 있으므로 계속 진행
      logger.info('⚠️ 로그인 상태를 확실히 확인할 수 없지만 계속 진행합니다...');
    } else {
      logger.info('✅ 로그인 상태 확인됨');
    }

    // 6. 업체 정보 추출 (여러 업체 관리시 선택 필요)
    logger.info('🏢 업체 정보 확인 중...');
    
    // 현재 페이지에서 실제 메뉴 구조 분석
    const menuAnalysis = await page.evaluate(() => {
      const analysis = {
        title: document.title,
        url: window.location.href,
        bodyClasses: document.body.className,
        navigation: [],
        mainContent: [],
        sideMenu: []
      };
      
      // 네비게이션 메뉴 찾기
      const navSelectors = [
        'nav', '.navigation', '.nav', '.menu', '.gnb', '.lnb',
        '[class*="nav"]', '[class*="menu"]', '[class*="gnb"]'
      ];
      
      for (const selector of navSelectors) {
        try {
          const nav = document.querySelector(selector);
          if (nav) {
            const navLinks = Array.from(nav.querySelectorAll('a, button')).map(el => ({
              tag: el.tagName.toLowerCase(),
              text: el.textContent?.trim(),
              href: el.href || '',
              class: el.className
            }));
            analysis.navigation.push({ selector, links: navLinks });
          }
        } catch (e) {
          // 선택자 오류 무시
        }
      }
      
      // 메인 콘텐츠 영역 찾기
      const mainSelectors = [
        'main', '.main', '#main', '.content', '.container',
        '[class*="main"]', '[class*="content"]', '[class*="container"]'
      ];
      
      for (const selector of mainSelectors) {
        try {
          const main = document.querySelector(selector);
          if (main) {
            const mainLinks = Array.from(main.querySelectorAll('a, button')).map(el => ({
              tag: el.tagName.toLowerCase(),
              text: el.textContent?.trim(),
              href: el.href || '',
              class: el.className
            }));
            analysis.mainContent.push({ selector, links: mainLinks });
          }
        } catch (e) {
          // 선택자 오류 무시
        }
      }
      
      // 모든 링크에서 리뷰 관련 찾기
      const allLinks = Array.from(document.querySelectorAll('a, button'));
      const reviewRelated = allLinks.filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        const href = el.href?.toLowerCase() || '';
        return text.includes('리뷰') || text.includes('review') || 
               href.includes('리뷰') || href.includes('review');
      }).map(el => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim(),
        href: el.href || '',
        class: el.className
      }));
      
      analysis.reviewRelated = reviewRelated;
      
      return analysis;
    });
    
    logger.info('📋 메뉴 구조 분석:', menuAnalysis);
    
    // 리뷰 관련 메뉴가 있는지 확인
    if (menuAnalysis.reviewRelated.length > 0) {
      logger.info('✅ 리뷰 관련 메뉴 발견:', menuAnalysis.reviewRelated);
      
      // 첫 번째 리뷰 메뉴 클릭 시도
      const reviewMenuClicked = await page.evaluate((reviewMenus) => {
        if (reviewMenus.length > 0) {
          const firstMenu = reviewMenus[0];
          // 해당 요소 찾기
          const elements = document.querySelectorAll('a, button');
          for (const el of elements) {
            if (el.textContent?.trim() === firstMenu.text) {
              el.click();
              return true;
            }
          }
        }
        return false;
      }, menuAnalysis.reviewRelated);
      
      if (reviewMenuClicked) {
        logger.info('✅ 리뷰 메뉴 클릭 성공');
        await delay(3000); // 페이지 전환 대기
        
        // 리뷰 페이지인지 확인
        const isReviewPage = await page.evaluate(() => {
          const reviewSelectors = [
            '[class*="review"]', '[data-review]', '[class*="리뷰"]',
            '.review-container', '.review-list', '.review-item'
          ];
          
          return reviewSelectors.some(selector => {
            try {
              return document.querySelector(selector) !== null;
            } catch (e) {
              return false;
            }
          });
        });
        
        if (isReviewPage) {
          logger.info('✅ 리뷰 페이지 도달 성공');
          // 성공적으로 리뷰 페이지에 도달했으므로 계속 진행
        } else {
          logger.warn('⚠️ 리뷰 메뉴 클릭 후에도 리뷰 페이지가 아닙니다');
        }
      }
    }
    
    const businessList = await page.evaluate(() => {
      const businesses = [];
      // 업체 목록이 있는 경우 추출
      const businessElements = document.querySelectorAll('[data-business-id], .business-item, [class*="업체"], a[href*="myplace"]');
      businessElements.forEach((element, index) => {
        businesses.push({
          name: element.textContent?.trim() || `업체${index + 1}`,
          id: element.getAttribute('data-business-id') || index,
          href: element.href || '',
          element: element.tagName.toLowerCase()
        });
      });
      return businesses;
    });

    logger.info(`📋 발견된 업체: ${businessList.length}개`, businessList);

    // 7. "내 업체" 링크 클릭으로 /bizes 페이지 이동
    logger.info('🏪 "내 업체" 링크 클릭 중...');
    
    try {
      const myBusinessTarget = {
        text: '내 업체',
        href: '/bizes',
        className: 'Main_title__P_c6n Main_link__fofNg',
        selector: 'a[href*="/bizes"]'
      };
      
      const clickResult = await SmartClickService.safeClick(page, myBusinessTarget);
      
      if (clickResult.success) {
        logger.info('✅ "내 업체" 링크 클릭 성공');
        // 페이지 이동 대기
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
      }
      
    } catch (error) {
      logger.warn('⚠️ "내 업체" 링크 클릭 실패, 직접 /bizes로 이동:', error.message);
      await page.goto('https://new.smartplace.naver.com/bizes', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
    }

    // 8. 페이지 로딩 대기
    await delay(3000);

    // 9. 업체 선택 (필요한 경우)
    logger.info('🏢 업체 선택 확인 중...');
    
    const businessSelected = await page.evaluate(() => {
      // 업체 목록이 있는지 확인
      const businessElements = document.querySelectorAll(
        '[data-place-id], .business-item, [class*="업체"], .business-card'
      );
      
      if (businessElements.length > 0) {
        // 첫 번째 업체 클릭
        businessElements[0].click();
        return true;
      }
      return false;
    });
    
    if (businessSelected) {
      logger.info('✅ 업체 선택 완료');
      await delay(3000); // 업체 선택 후 페이지 로딩 대기
    }
    
    // 10. "우리 가게리뷰" 메뉴 찾기 및 클릭
    logger.info('🔍 "우리 가게리뷰" 메뉴 찾는 중...');
    
    const reviewMenuClicked = await page.evaluate(() => {
      // 모든 클릭 가능한 요소에서 "우리 가게리뷰" 텍스트 찾기
      const allClickableElements = [
        ...document.querySelectorAll('a'),
        ...document.querySelectorAll('button'),
        ...document.querySelectorAll('[onclick]'),
        ...document.querySelectorAll('[role="button"]'),
        ...document.querySelectorAll('div[class*="menu"]'),
        ...document.querySelectorAll('li[class*="menu"]'),
        ...document.querySelectorAll('[class*="tab"]'),
        ...document.querySelectorAll('[class*="nav"]')
      ];
      
      for (const element of allClickableElements) {
        const text = element.textContent?.trim() || '';
        
        // "우리 가게리뷰" 관련 텍스트 찾기
        if (text.includes('우리 가게리뷰') || 
            text.includes('가게리뷰') || 
            text.includes('방문자리뷰') ||
            text.includes('리뷰관리') ||
            (text.includes('리뷰') && text.length < 20)) { // 짧은 리뷰 텍스트
          
          console.log('🎯 발견된 리뷰 메뉴:', text);
          
          // 요소가 보이는지 확인
          const rect = element.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            element.click();
            return { success: true, text: text };
          }
        }
      }
      
      return { success: false, text: null };
    });

    if (reviewMenuClicked.success) {
      logger.info(`✅ "우리 가게리뷰" 메뉴 클릭 성공: ${reviewMenuClicked.text}`);
      await delay(3000); // 리뷰 페이지 로딩 대기
    } else {
      logger.warn('⚠️ "우리 가게리뷰" 메뉴를 찾을 수 없어 직접 URL 접근 시도');
      
      // 직접 URL 접근 시도
      const directUrls = [
        'https://new.smartplace.naver.com/myplace/reviews',
        'https://new.smartplace.naver.com/myplace/review',
        'https://new.smartplace.naver.com/bizes/reviews',
        'https://new.smartplace.naver.com/bizes/review',
        'https://new.smartplace.naver.com/places/reviews',
        'https://new.smartplace.naver.com/places/review'
      ];
      
      let success = false;
      for (const url of directUrls) {
        try {
          logger.info(`🔗 URL 접근 시도: ${url}`);
          await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
          
          // 페이지 로딩 대기
          await delay(2000);
          
          // 리뷰 페이지 로딩 확인
          const isReviewPage = await page.evaluate(() => {
            const reviewSelectors = [
              '[class*="review"]', '[data-review]', '[class*="리뷰"]',
              '.review-container', '.review-list', '.review-item'
            ];
            
            return reviewSelectors.some(selector => {
              try {
                return document.querySelector(selector) !== null;
              } catch (e) {
                return false;
              }
            });
          });
          
          if (isReviewPage) {
            logger.info(`✅ 직접 URL 접근 성공: ${url}`);
            success = true;
            break;
          } else {
            logger.warn(`⚠️ ${url}는 리뷰 페이지가 아닙니다`);
            
            // 페이지 구조 분석
            const pageAnalysis = await page.evaluate(() => {
              return {
                title: document.title,
                url: window.location.href,
                bodyClasses: document.body.className,
                hasReviewElements: document.querySelectorAll('[class*="review"], [data-review], [class*="리뷰"]').length,
                allElements: Array.from(document.querySelectorAll('*')).slice(0, 30).map(el => ({
                  tag: el.tagName.toLowerCase(),
                  class: el.className,
                  id: el.id,
                  text: el.textContent?.substring(0, 100)
                }))
              };
            });
            
            logger.info(`📊 ${url} 페이지 분석:`, pageAnalysis);
          }
        } catch (error) {
          logger.warn(`URL 접근 실패: ${url}`, error.message);
        }
      }
      
      if (!success) {
        // 마지막 시도: 현재 페이지에서 리뷰 관련 요소 찾기
        logger.info('🔍 현재 페이지에서 리뷰 요소 찾기 시도');
        
        const currentPageAnalysis = await page.evaluate(() => {
          return {
            title: document.title,
            url: window.location.href,
            bodyClasses: document.body.className,
            allLinks: Array.from(document.querySelectorAll('a')).map(a => ({
              href: a.href,
              text: a.textContent?.trim(),
              class: a.className
            })),
            allButtons: Array.from(document.querySelectorAll('button')).map(b => ({
              text: b.textContent?.trim(),
              class: b.className
            })),
            reviewElements: Array.from(document.querySelectorAll('[class*="review"], [data-review], [class*="리뷰"]')).map(el => ({
              tag: el.tagName.toLowerCase(),
              class: el.className,
              text: el.textContent?.substring(0, 100)
            }))
          };
        });
        
        logger.info('📊 현재 페이지 분석:', currentPageAnalysis);
        
        throw new Error('리뷰 페이지 접근에 실패했습니다. 페이지 구조를 확인해주세요.');
      }
    }

    // 10. 리뷰 페이지 로딩 대기
    logger.info('⏳ 리뷰 페이지 로딩 대기 중...');
    await page.waitForSelector('[class*="review"], [data-review], [class*="리뷰"], .review-container', {
      timeout: 15000
    });

    // 11. 리뷰 데이터가 로딩될 때까지 대기
    await page.waitForFunction(() => {
      const reviewElements = document.querySelectorAll('[class*="review"], [data-review-id], [class*="리뷰"]');
      return reviewElements.length > 0;
    }, { timeout: 10000 });

    // 12. 페이지 정보 수집
    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        reviewCount: document.querySelectorAll('[class*="review"], [data-review-id], [class*="리뷰"]').length
      };
    });

    logger.info(`✅ 리뷰 페이지 도달 완료: ${pageInfo.url}`);
    logger.info(`📊 발견된 리뷰: ${pageInfo.reviewCount}개`);

    return {
      browser,
      page,
      reviewPageUrl: pageInfo.url,
      reviewCount: pageInfo.reviewCount,
      businessInfo: {
        count: businessList.length,
        list: businessList
      }
    };

  } catch (error) {
    logger.error('❌ 리뷰 페이지 네비게이션 실패:', error.message);
    await browser.close();
    throw error;
  }
};

// 헬퍼 함수들
export const verifyLoginStatus = async (page) => {
  try {
    await page.waitForSelector('[class*="사용자"], [class*="로그인"], .user-info', { 
      timeout: 5000 
    });
    return true;
  } catch {
    return false;
  }
};

export const waitForReviewsToLoad = async (page) => {
  await page.waitForFunction(() => {
    return document.querySelectorAll('[class*="review-item"], [data-review-id]').length > 0;
  }, { timeout: 15000 });
  
  logger.info('✅ 리뷰 데이터 로딩 완료');
};
