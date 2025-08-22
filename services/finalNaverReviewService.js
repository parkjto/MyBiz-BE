import puppeteer from 'puppeteer';
import delay from 'delay';
import { getNaverSession } from './sessionService.js';
import { PopupHandlerService } from './popupHandlerService.js';
import { SmartClickWithAdAvoidance } from './smartClickWithAdAvoidance.js';
import { logger } from '../utils/logger.js';

export const scrapeNaverReviewsComplete = async (userStoreId) => {
  let browser;
  let page;
  
  try {
    logger.info('[INFO] 네이버 스마트플레이스 완전한 리뷰 스크래핑 시작');
    
    // 1. 브라우저 시작
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // 2. 세션 복원
    const session = await getNaverSession(userStoreId);
    if (!session) {
      throw new Error('저장된 네이버 세션이 없습니다');
    }
    
    await page.setCookie(...session.cookies);
    logger.info('[INFO] 세션 복원 완료');
    
    // 3. 팝업 인터셉터 설정
    await PopupHandlerService.setupPopupInterceptor(page);
    
    // 4. 네이버 스마트플레이스 메인 접속
    await page.goto('https://new.smartplace.naver.com/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    logger.info('[INFO] 메인 페이지 접속 완료');
    
    await delay(3000);
    
    // 5. 초기 광고/팝업 정리
    await PopupHandlerService.handleUnexpectedPopups(page);
    
    // 6. "내 업체" 클릭 (광고 회피)
    logger.info('[INFO] "내 업체" 클릭 중...');
    await SmartClickWithAdAvoidance.clickWithAdHandling(page, {
      text: '내 업체',
      href: '/bizes',
      className: 'Main_title__P_c6n Main_link__fofNg'
    });
    
    // 페이지 이동 대기 (더 유연한 방식)
    try {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
      logger.info('[INFO] /bizes 페이지 이동 완료 (domcontentloaded)');
    } catch (timeoutError) {
      logger.warn('[WARN] 네비게이션 타임아웃, 현재 상태 확인...');
      // 현재 URL 확인
      const currentUrl = page.url();
      if (currentUrl.includes('/bizes')) {
        logger.info('[INFO] URL 확인으로 /bizes 페이지 도달 확인');
      } else {
        throw new Error('페이지 이동 실패');
      }
    }
    
    await delay(3000);
    
    // 7. 업체 선택 (칼포니치킨)
    logger.info('[INFO] 업체 선택 중...');
    const businessSelected = await page.evaluate(() => {
      // 업체 이름이 포함된 요소들 찾기
      const allElements = Array.from(document.querySelectorAll('*'));
      const businessElements = allElements.filter(el => 
        el.textContent?.includes('칼포니치킨') && 
        (el.tagName === 'A' || el.tagName === 'BUTTON' || el.onclick || el.getAttribute('onclick'))
      );
      
      if (businessElements.length > 0) {
        businessElements[0].click();
        return {
          success: true,
          clickedElement: {
            tag: businessElements[0].tagName,
            className: businessElements[0].className,
            text: businessElements[0].textContent?.substring(0, 50)
          }
        };
      }
      
      return { success: false };
    });
    
    if (businessSelected.success) {
      logger.info('[INFO] 업체 선택 성공:', businessSelected.clickedElement);
      
      // 업체 선택 후 페이지 변화 대기
      await delay(8000);
      
      const currentUrl = page.url();
      logger.info('[INFO] 현재 URL:', currentUrl);
      
      // 8. "미답변 리뷰" 클릭 (실제 리뷰 페이지로 이동)
      logger.info('[INFO] "미답변 리뷰" 메뉴 찾기...');
      
      const reviewMenuClicked = await page.evaluate(() => {
        // "미답변 리뷰" 텍스트가 포함된 클릭 가능한 요소 찾기
        const allElements = Array.from(document.querySelectorAll('*'));
        const reviewElements = allElements.filter(el => {
          const text = el.textContent?.trim();
          return text?.includes('미답변 리뷰') && 
                 (el.tagName === 'A' || el.tagName === 'BUTTON' || !!el.onclick);
        });
        
        if (reviewElements.length > 0) {
          reviewElements[0].click();
          return {
            success: true,
            text: reviewElements[0].textContent?.trim()
          };
        }
        
        return { success: false };
      });
      
              if (reviewMenuClicked.success) {
          logger.info(`[INFO] "${reviewMenuClicked.text}" 클릭 성공`);
          
          // 리뷰 페이지 로딩 대기
          await delay(5000);
          
          let reviewPageUrl = page.url();
          logger.info('[INFO] 현재 URL:', reviewPageUrl);
          
          // 리뷰 페이지가 아닌 경우 직접 리뷰 URL로 이동
          if (!reviewPageUrl.includes('/reviews')) {
            const placeId = extractPlaceIdFromUrl(reviewPageUrl);
            const bookingBusinessId = extractBookingBusinessIdFromUrl(reviewPageUrl);
            
            if (placeId && bookingBusinessId) {
              const directReviewUrl = `https://new.smartplace.naver.com/bizes/place/${placeId}/reviews?bookingBusinessId=${bookingBusinessId}&menu=visitor`;
              logger.info(`[INFO] 직접 리뷰 URL 접근: ${directReviewUrl}`);
              
              await page.goto(directReviewUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 15000
              });
              
              await delay(3000);
              reviewPageUrl = page.url();
              logger.info('[INFO] 리뷰 페이지 URL:', reviewPageUrl);
            }
          }
          
                  // 9. 리뷰 데이터 추출 (무한 스크롤 포함)
        logger.info('[INFO] 리뷰 데이터 추출 중...');
        
        // 초기 리뷰 수집
        let allReviews = await extractReviewData(page);
        logger.info(`[INFO] 초기 리뷰 수집: ${allReviews.length}개`);
        
        // 무한 스크롤로 추가 리뷰 로딩
        const additionalReviews = await loadMoreReviewsWithScroll(page);
        if (additionalReviews.length > 0) {
          allReviews = [...allReviews, ...additionalReviews];
          logger.info(`[INFO] 추가 리뷰 로딩: ${additionalReviews.length}개`);
        }
        
        logger.info(`[INFO] 최종 리뷰 스크래핑 완료: 총 ${allReviews.length}개 수집`);
        
        return {
          success: true,
          totalReviews: allReviews.length,
          reviews: allReviews,
          reviewPageUrl: reviewPageUrl,
          businessInfo: {
            placeId: extractPlaceIdFromUrl(reviewPageUrl),
            bookingBusinessId: extractBookingBusinessIdFromUrl(reviewPageUrl)
          }
        };
          
        } else {
          throw new Error('리뷰 메뉴를 찾을 수 없습니다');
        }
      
    } else {
      throw new Error('업체 선택에 실패했습니다');
    }
    
  } catch (error) {
    logger.error('[ERROR] 리뷰 스크래핑 실패:', error.message);
    
    // 오류 시 현재 페이지 상태 분석
    if (page) {
      try {
        const currentAds = await page.evaluate(() => {
          return {
            url: window.location.href,
            title: document.title,
            hasAds: document.querySelectorAll('.ad, .popup, .modal, [class*="광고"]').length > 0,
            adCount: document.querySelectorAll('.ad, .popup, .modal, [class*="광고"]').length
          };
        });
        
        logger.info('[INFO] 오류 시 페이지 상태:', currentAds);
      } catch (e) {
        logger.warn('페이지 상태 분석 실패:', e.message);
      }
    }
    
    throw error;
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// 리뷰 데이터 추출 함수 (최적화된 버전)
async function extractReviewData(page) {
  return await page.evaluate(() => {
    const reviews = [];
    
    // 실제 HTML 구조에 맞는 정확한 선택자 사용
    const reviewElements = document.querySelectorAll('li.pui__X35jYm.Review_pui_review__zhZdn');
    
    console.log(`[INFO] 발견된 리뷰 요소: ${reviewElements.length}개`);
    
    reviewElements.forEach((reviewEl, index) => {
      try {
        // 1. 사용자 정보 추출
        const userInfo = reviewEl.querySelector('.pui__JiVbY3');
        const userName = userInfo?.querySelector('.pui__NMi-Dp')?.textContent?.trim() || '';
        const userStats = userInfo?.querySelector('.pui__WN-kAf')?.textContent?.trim() || '';
        
        // 2. 방문/작성일 추출
        const dateInfo = reviewEl.querySelector('.pui__Py6QlM');
        const visitDate = dateInfo?.querySelector('time')?.textContent?.trim() || '';
        const writeDate = dateInfo?.querySelectorAll('time')[1]?.textContent?.trim() || '';
        
        // 3. 리뷰 내용 추출
        const contentEl = reviewEl.querySelector('.pui__vn15t2 a[data-pui-click-code="text"]');
        const content = contentEl?.textContent?.trim() || '';
        
        // 4. 이미지 추출
        const images = [];
        const imgElements = reviewEl.querySelectorAll('.Review_img__n9UPw');
        imgElements.forEach(img => {
          if (img.src && !img.src.includes('data:image')) {
            images.push(img.src);
          }
        });
        
        // 5. 태그 추출
        const tagEl = reviewEl.querySelector('.pui__jhpEyP');
        const tag = tagEl?.textContent?.trim() || '';
        
        // 6. 리뷰 ID 생성 (고유 식별자)
        const reviewId = `review_${Date.now()}_${index}`;
        
        const reviewData = {
          id: reviewId,
          author: {
            name: userName,
            stats: userStats
          },
          dates: {
            visit: visitDate,
            write: writeDate
          },
          content: content,
          images: images,
          tag: tag,
          extractedAt: new Date().toISOString()
        };
        
        // 내용이 있는 리뷰만 추가
        if (content && content.length > 0) {
          reviews.push(reviewData);
          console.log(`[INFO] 리뷰 ${index + 1} 추출 성공: ${content.substring(0, 50)}...`);
        }
        
      } catch (error) {
        console.warn(`❌ 리뷰 ${index + 1} 추출 실패:`, error.message);
      }
    });
    
    console.log(`[INFO] 총 ${reviews.length}개 리뷰 추출 완료`);
    return reviews;
  });
}

// 무한 스크롤로 추가 리뷰 로딩
async function loadMoreReviewsWithScroll(page) {
  logger.info('[INFO] 무한 스크롤로 추가 리뷰 로딩 시작...');
  
  const maxScrollAttempts = 5; // 최대 5번 스크롤 시도
  const scrollDelay = 3000; // 스크롤 후 3초 대기
  let previousReviewCount = 0;
  let scrollAttempts = 0;
  let newReviews = [];
  
  while (scrollAttempts < maxScrollAttempts) {
    try {
      // 현재 리뷰 개수 확인
      const currentReviewCount = await page.evaluate(() => {
        return document.querySelectorAll('li.pui__X35jYm.Review_pui_review__zhZdn').length;
      });
      
      logger.info(`[INFO] 스크롤 시도 ${scrollAttempts + 1}: 현재 ${currentReviewCount}개 리뷰`);
      
      // 새로운 리뷰가 로드되었는지 확인
      if (currentReviewCount > previousReviewCount) {
        logger.info(`[INFO] 새로운 리뷰 ${currentReviewCount - previousReviewCount}개 발견!`);
        
        // 새로 로드된 리뷰만 추출
        const additionalReviews = await extractReviewData(page);
        const newReviewsThisTime = additionalReviews.slice(previousReviewCount);
        
        if (newReviewsThisTime.length > 0) {
          newReviews = [...newReviews, ...newReviewsThisTime];
          logger.info(`[INFO] 추가 리뷰 ${newReviewsThisTime.length}개 수집 완료`);
        }
        
        previousReviewCount = currentReviewCount;
      }
      
      // 페이지 하단으로 스크롤
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      logger.info(`[INFO] 페이지 하단으로 스크롤 완료 (시도 ${scrollAttempts + 1})`);
      
      // 스크롤 후 로딩 대기
      await delay(scrollDelay);
      
      // 더보기 버튼이 있는지 확인하고 클릭
      const hasMoreButton = await page.evaluate(() => {
        const moreButtons = Array.from(document.querySelectorAll('button, a')).filter(el => {
          const text = el.textContent?.toLowerCase();
          return text?.includes('더보기') || text?.includes('더 보기') || text?.includes('더보기');
        });
        
        if (moreButtons.length > 0) {
          moreButtons[0].click();
          return true;
        }
        return false;
      });
      
      if (hasMoreButton) {
        logger.info('[INFO] 더보기 버튼 클릭 완료');
        await delay(2000); // 버튼 클릭 후 추가 대기
      }
      
      // 추가 대기 후 새로운 리뷰 확인
      await delay(2000);
      
      scrollAttempts++;
      
      // 새로운 리뷰가 더 이상 로드되지 않으면 중단
      const finalReviewCount = await page.evaluate(() => {
        return document.querySelectorAll('li.pui__X35jYm.Review_pui_review__zhZdn').length;
      });
      
      if (finalReviewCount === currentReviewCount) {
        logger.info('[INFO] 더 이상 새로운 리뷰가 로드되지 않음, 스크롤 중단');
        break;
      }
      
    } catch (error) {
      logger.warn(`[WARN] 스크롤 시도 ${scrollAttempts + 1} 실패:`, error.message);
      scrollAttempts++;
    }
  }
  
  logger.info(`[INFO] 무한 스크롤 완료: 총 ${newReviews.length}개 추가 리뷰 수집`);
  return newReviews;
}

// 헬퍼 함수들 (필요한 것만 유지)
function extractPlaceIdFromUrl(url) {
  const match = url.match(/place\/([^/?]+)/);
  return match ? match[1] : null;
}

function extractBookingBusinessIdFromUrl(url) {
  const match = url.match(/bookingBusinessId=([^&]+)/);
  return match ? match[1] : null;
}
