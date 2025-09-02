import { navigateToReviewPage } from './naverNavigationService.js';
import { saveReviews } from './reviewService.js';
import { logger } from '../utils/logger.js';

export const scrapeNaverReviews = async (userStoreId) => {
  let browser;
  let page;
  
  try {
    logger.info('🚀 네이버 스마트플레이스 리뷰 스크래핑 시작');
    
    // 1. 세션으로 리뷰 페이지 접근
    const navigationResult = await navigateToReviewPage(userStoreId);
    browser = navigationResult.browser;
    page = navigationResult.page;
    
    logger.info(`✅ 리뷰 페이지 접근 성공: ${navigationResult.reviewPageUrl}`);
    logger.info(`🏢 업체 정보: ${navigationResult.businessInfo.count}개 업체`);
    
    // 2. 리뷰 데이터 추출
    logger.info('🔍 리뷰 데이터 추출 중...');
    const reviews = await extractReviewData(page);
    
    logger.info(`📊 추출된 리뷰: ${reviews.length}개`);
    
    // 3. DB 저장
    if (reviews.length > 0) {
      logger.info('💾 리뷰 데이터 저장 중...');
      await saveReviews(userStoreId, reviews);
      logger.info('✅ 리뷰 데이터 저장 완료');
    }
    
    return {
      success: true,
      message: '리뷰 스크래핑 완료',
      data: {
        reviewCount: reviews.length,
        savedCount: reviews.length,
        reviewPageUrl: navigationResult.reviewPageUrl,
        businessInfo: navigationResult.businessInfo,
        scrapedAt: new Date()
      }
    };
    
  } catch (error) {
    logger.error('❌ 리뷰 스크래핑 실패:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      logger.info('🔒 브라우저 종료');
    }
  }
};

// 리뷰 데이터 추출 함수
const extractReviewData = async (page) => {
  // 페이지가 완전히 로딩될 때까지 대기
  await page.waitForTimeout(2000);
  
  // 다양한 리뷰 셀렉터로 리뷰 추출 시도
  const reviewSelectors = [
    '.review_item',
    '.review-list .item',
    '.review-container .review',
    '[data-testid*="review"]',
    '.review',
    '.item',
    '[class*="review"]',
    '[data-review]'
  ];
  
  let reviews = [];
  
  for (const selector of reviewSelectors) {
    try {
      logger.info(`🔍 리뷰 셀렉터 시도: ${selector}`);
      
      const extractedReviews = await page.evaluate((sel) => {
        const elements = document.querySelectorAll(sel);
        if (elements.length === 0) return [];
        
        return Array.from(elements).map((node, index) => {
          // 다양한 리뷰 정보 셀렉터 시도
          const contentSelectors = [
            '.review_text', '.content', '.text', '.review-content',
            '.review-body', '.review-message', '[class*="content"]'
          ];
          
          const nicknameSelectors = [
            '.review_nickname', '.nickname', '.author', '.user-name',
            '.reviewer', '.user', '[class*="name"]'
          ];
          
          const ratingSelectors = [
            '.review_rating', '.rating', '.score', '.star',
            '.stars', '[class*="rating"]', '[class*="score"]'
          ];
          
          const dateSelectors = [
            '.review_date', '.date', '.time', '.created',
            '.timestamp', '[class*="date"]', '[class*="time"]'
          ];
          
          // 내용 추출
          let content = '';
          for (const contentSel of contentSelectors) {
            const contentEl = node.querySelector(contentSel);
            if (contentEl && contentEl.textContent?.trim()) {
              content = contentEl.textContent.trim();
              break;
            }
          }
          
          // 닉네임 추출
          let nickname = '';
          for (const nameSel of nicknameSelectors) {
            const nameEl = node.querySelector(nameSel);
            if (nameEl && nameEl.textContent?.trim()) {
              nickname = nameEl.textContent.trim();
              break;
            }
          }
          
          // 평점 추출
          let rating = 0;
          for (const ratingSel of ratingSelectors) {
            const ratingEl = node.querySelector(ratingSel);
            if (ratingEl) {
              const ratingText = ratingEl.textContent?.trim() || '';
              const ratingMatch = ratingText.match(/(\d+)/);
              if (ratingMatch) {
                rating = parseInt(ratingMatch[1]);
                break;
              }
            }
          }
          
          // 날짜 추출
          let date = '';
          for (const dateSel of dateSelectors) {
            const dateEl = node.querySelector(dateSel);
            if (dateEl && dateEl.textContent?.trim()) {
              date = dateEl.textContent.trim();
              break;
            }
          }
          
          return {
            content: content || `리뷰 ${index + 1}`,
            nickname: nickname || `사용자${index + 1}`,
            rating: rating || 0,
            date: date || new Date().toISOString(),
            rawHtml: node.outerHTML.substring(0, 200) // 디버깅용
          };
        });
      }, selector);
      
      if (extractedReviews.length > 0) {
        logger.info(`✅ ${selector}로 ${extractedReviews.length}개 리뷰 발견`);
        reviews = extractedReviews;
        break;
      }
    } catch (e) {
      logger.warn(`❌ ${selector} 셀렉터 실패:`, e.message);
    }
  }
  
  if (reviews.length === 0) {
    // 페이지 구조 분석
    logger.warn('⚠️ 리뷰를 찾을 수 없어 페이지 구조 분석');
    const pageStructure = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyClasses: document.body.className,
        allElements: Array.from(document.querySelectorAll('*')).slice(0, 50).map(el => ({
          tag: el.tagName.toLowerCase(),
          class: el.className,
          id: el.id,
          text: el.textContent?.substring(0, 100)
        }))
      };
    });
    
    logger.info('📊 페이지 구조:', pageStructure);
    throw new Error('리뷰를 찾을 수 없습니다. 페이지 구조를 확인해주세요.');
  }
  
  return reviews;
};

// 특정 업체의 리뷰만 스크래핑
export const scrapeReviewsForBusiness = async (userStoreId, businessName) => {
  // TODO: 특정 업체 선택 로직 구현
  return await scrapeNaverReviews(userStoreId);
};
