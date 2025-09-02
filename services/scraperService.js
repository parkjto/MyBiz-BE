import puppeteer from 'puppeteer';
import delay from 'delay';
import { getNaverSession } from './sessionService.js';
import { saveReviews } from './reviewService.js';

// 네이버 스마트플레이스에서 place ID와 bookingbusinessid 추출
export const extractNaverPlaceInfo = async (userStoreId) => {
  console.log('🔍 네이버 스마트플레이스 정보 추출 시작');
  
  const session = await getNaverSession(userStoreId);
  if (!session) throw new Error('세션 없음');
  
  console.log('✅ 세션 확인됨, 브라우저 시작...');

  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // 쿠키 설정
    await page.setCookie(...session.cookies);
    console.log('🍪 쿠키 설정 완료');
    
    // 네이버 스마트플레이스 메인 페이지로 이동
    console.log('🌐 네이버 스마트플레이스 접속 중...');
    await page.goto('https://new.smartplace.naver.com', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // 로그인 상태 확인
    const isLoggedIn = await page.evaluate(() => {
      return !document.querySelector('.login_btn') && document.querySelector('.myplace');
    });
    
    if (!isLoggedIn) {
      throw new Error('네이버 스마트플레이스 로그인이 필요합니다');
    }
    
    console.log('✅ 로그인 상태 확인됨, 내 업체 페이지로 이동...');
    
    // 내 업체 페이지로 이동
    await page.goto('https://new.smartplace.naver.com/myplace', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // 페이지 로딩 대기
    await delay(3000);
    
    // place ID와 bookingbusinessid 추출
    console.log('🔍 place ID와 bookingbusinessid 추출 중...');
    const placeInfo = await page.evaluate(() => {
      // URL에서 place ID 추출 시도
      const urlParams = new URLSearchParams(window.location.search);
      let placeId = urlParams.get('placeId') || urlParams.get('id');
      
      // 페이지 내 요소에서 place ID 찾기
      if (!placeId) {
        const placeIdElements = [
          'input[name="placeId"]',
          'input[name="id"]',
          '[data-place-id]',
          '[data-id]',
          '.place-id',
          '#placeId'
        ];
        
        for (const selector of placeIdElements) {
          const element = document.querySelector(selector);
          if (element) {
            placeId = element.value || element.getAttribute('data-place-id') || element.getAttribute('data-id');
            if (placeId) break;
          }
        }
      }
      
      // bookingbusinessid 추출
      let bookingBusinessId = null;
      const bookingElements = [
        'input[name="bookingbusinessid"]',
        'input[name="businessId"]',
        '[data-booking-business-id]',
        '[data-business-id]',
        '.booking-business-id',
        '#bookingBusinessId'
      ];
      
      for (const selector of bookingElements) {
        const element = document.querySelector(selector);
        if (element) {
          bookingBusinessId = element.value || element.getAttribute('data-booking-business-id') || element.getAttribute('data-business-id');
          if (bookingBusinessId) break;
        }
      }
      
      // 네트워크 요청에서 정보 추출 시도
      const scripts = Array.from(document.querySelectorAll('script'));
      let scriptContent = '';
      scripts.forEach(script => {
        if (script.textContent) {
          scriptContent += script.textContent;
        }
      });
      
      // 정규식으로 place ID와 bookingbusinessid 찾기
      if (!placeId) {
        const placeIdMatch = scriptContent.match(/placeId["']?\s*[:=]\s*["']?([^"',}\s]+)/i);
        if (placeIdMatch) placeId = placeIdMatch[1];
      }
      
      if (!bookingBusinessId) {
        const bookingMatch = scriptContent.match(/bookingbusinessid["']?\s*[:=]\s*["']?([^"',}\s]+)/i);
        if (bookingMatch) bookingBusinessId = bookingMatch[1];
      }
      
      return {
        placeId,
        bookingBusinessId,
        currentUrl: window.location.href,
        pageTitle: document.title
      };
    });
    
    console.log('📊 추출된 정보:', placeInfo);
    
    if (!placeInfo.placeId && !placeInfo.bookingBusinessId) {
      // 추가 분석을 위해 페이지 소스 확인
      console.log('🔍 추가 분석을 위해 페이지 소스 확인 중...');
      const pageSource = await page.content();
      
      // 소스에서 직접 검색
      const placeIdMatch = pageSource.match(/placeId["']?\s*[:=]\s*["']?([^"',}\s]+)/i);
      const bookingMatch = pageSource.match(/bookingbusinessid["']?\s*[:=]\s*["']?([^"',}\s]+)/i);
      
      if (placeIdMatch) placeInfo.placeId = placeIdMatch[1];
      if (bookingMatch) placeInfo.bookingBusinessId = bookingMatch[1];
      
      console.log('🔍 소스 분석 결과:', { placeId: placeInfo.placeId, bookingBusinessId: placeInfo.bookingBusinessId });
    }
    
    return placeInfo;
    
  } finally {
    await browser.close();
    console.log('🔒 브라우저 종료');
  }
};

// place_id 없이 직접 '우리 가게 리뷰' 페이지로 이동
export const scrapeReviewsWithSession = async (userStoreId) => {
  console.log('🚀 스크래핑 시작 - 업데이트된 버전 실행됨');
  console.log('📋 userStoreId:', userStoreId);
  
  const session = await getNaverSession(userStoreId);
  if (!session) throw new Error('세션 없음');
  
  console.log('✅ 세션 확인됨, 브라우저 시작...');

  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // 쿠키 설정
    await page.setCookie(...session.cookies);
    console.log('🍪 쿠키 설정 완료');
    
    // 네이버 스마트플레이스 메인 페이지로 이동
    console.log('🌐 네이버 스마트플레이스 접속 중...');
    await page.goto('https://new.smartplace.naver.com', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // 로그인 상태 확인
    const isLoggedIn = await page.evaluate(() => {
      return !document.querySelector('.login_btn') && document.querySelector('.myplace');
    });
    
    if (!isLoggedIn) {
      throw new Error('네이버 스마트플레이스 로그인이 필요합니다');
    }
    
    console.log('✅ 로그인 상태 확인됨, 내 업체 페이지로 이동...');
    
    // 내 업체 페이지로 이동
    await page.goto('https://new.smartplace.naver.com/myplace', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // 페이지 로딩 대기
    await delay(3000);
    
    // place ID와 bookingbusinessid 추출
    console.log('🔍 place ID와 bookingbusinessid 추출 중...');
    const placeInfo = await page.evaluate(() => {
      // URL에서 place ID 추출 시도
      const urlParams = new URLSearchParams(window.location.search);
      let placeId = urlParams.get('placeId') || urlParams.get('id');
      
      // 페이지 내 요소에서 place ID 찾기
      if (!placeId) {
        const placeIdElements = [
          'input[name="placeId"]',
          'input[name="id"]',
          '[data-place-id]',
          '[data-id]',
          '.place-id',
          '#placeId'
        ];
        
        for (const selector of placeIdElements) {
          const element = document.querySelector(selector);
          if (element) {
            placeId = element.value || element.getAttribute('data-place-id') || element.getAttribute('data-id');
            if (placeId) break;
          }
        }
      }
      
      // bookingbusinessid 추출
      let bookingBusinessId = null;
      const bookingElements = [
        'input[name="bookingbusinessid"]',
        'input[name="businessId"]',
        '[data-booking-business-id]',
        '[data-business-id]',
        '.booking-business-id',
        '#bookingBusinessId'
      ];
      
      for (const selector of bookingElements) {
        const element = document.querySelector(selector);
        if (element) {
          bookingBusinessId = element.value || element.getAttribute('data-booking-business-id') || element.getAttribute('data-business-id');
          if (bookingBusinessId) break;
        }
      }
      
      // 네트워크 요청에서 정보 추출 시도
      const scripts = Array.from(document.querySelectorAll('script'));
      let scriptContent = '';
      scripts.forEach(script => {
        if (script.textContent) {
          scriptContent += script.textContent;
        }
      });
      
      // 정규식으로 place ID와 bookingbusinessid 찾기
      if (!placeId) {
        const placeIdMatch = scriptContent.match(/placeId["']?\s*[:=]\s*["']?([^"',}\s]+)/i);
        if (placeIdMatch) placeId = placeIdMatch[1];
      }
      
      if (!bookingBusinessId) {
        const bookingMatch = scriptContent.match(/bookingbusinessid["']?\s*[:=]\s*["']?([^"',}\s]+)/i);
        if (bookingMatch) bookingBusinessId = bookingMatch[1];
      }
      
      return {
        placeId,
        bookingBusinessId,
        currentUrl: window.location.href,
        pageTitle: document.title
      };
    });
    
    console.log('📊 추출된 정보:', placeInfo);
    
    // 리뷰 탭 클릭 (여러 방법 시도)
    console.log('🔍 리뷰 탭 찾는 중...');
    const reviewTabSelectors = [
      'a[href*="reviews"]',
      'a[href*="review"]',
      '.tab_review',
      '.review_tab',
      'button:contains("리뷰")',
      'a:contains("리뷰")'
    ];
    
    let reviewTabClicked = false;
    for (const selector of reviewTabSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        reviewTabClicked = true;
        console.log(`✅ 리뷰 탭 클릭 성공: ${selector}`);
        break;
      } catch (e) {
        console.log(`❌ 리뷰 탭 클릭 실패: ${selector}`);
      }
    }
    
    if (!reviewTabClicked) {
      // 직접 리뷰 페이지로 이동
      console.log('🔗 직접 리뷰 페이지로 이동...');
      await page.goto('https://new.smartplace.naver.com/myplace/reviews', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
    }
    
    // 페이지 로딩 대기
    console.log('⏳ 페이지 로딩 대기 중...');
    await delay(5000);
    
    // 다양한 리뷰 셀렉터 시도
    console.log('🔍 리뷰 셀렉터 찾는 중...');
    const reviewSelectors = [
      '.review_item',
      '.review-list .item',
      '.review-container .review',
      '[data-testid*="review"]',
      '.review',
      '.item'
    ];
    
    let reviews = [];
    for (const selector of reviewSelectors) {
      try {
        console.log(`🔍 리뷰 셀렉터 시도: ${selector}`);
        reviews = await page.evaluate((sel) => {
          const elements = document.querySelectorAll(sel);
          if (elements.length === 0) return [];
          
          return Array.from(elements).map(node => ({
            content: node.querySelector('.review_text, .content, .text, .review-content')?.innerText || '',
            nickname: node.querySelector('.review_nickname, .nickname, .author, .user-name')?.innerText || '',
            rating: parseInt(node.querySelector('.review_rating, .rating, .score, .star')?.innerText) || 0,
            date: node.querySelector('.review_date, .date, .time, .created')?.innerText || ''
          }));
        }, selector);
        
        if (reviews.length > 0) {
          console.log(`✅ ${selector}로 ${reviews.length}개 리뷰 발견`);
          break;
        }
      } catch (e) {
        console.log(`❌ ${selector} 셀렉터 실패`);
      }
    }
    
    if (reviews.length === 0) {
      // 페이지 구조 분석
      console.log('🔍 페이지 구조 분석 중...');
      const pageStructure = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          bodyClasses: document.body.className,
          mainContent: document.querySelector('main, .main, #main')?.innerHTML?.substring(0, 200) || '없음'
        };
      });
      
      console.log('📊 페이지 구조:', pageStructure);
      throw new Error('리뷰를 찾을 수 없습니다. 페이지 구조를 확인해주세요.');
    }
    
    // 리뷰 저장
    console.log('💾 리뷰 저장 중...');
    const savedReviews = await saveReviews(userStoreId, reviews);
    
    console.log('🎉 스크래핑 완료!');
    return { 
      reviewCount: reviews.length, 
      newReviews: reviews,
      savedReviews: savedReviews,
      scrapedAt: new Date(),
      placeInfo
    };
    
  } finally {
    await browser.close();
    console.log('🔒 브라우저 종료');
  }
};

