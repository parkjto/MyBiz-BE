import puppeteer from 'puppeteer';
import delay from 'delay';
import { getNaverSession } from './sessionService.js';
import { PopupHandlerService } from './popupHandlerService.js';
import { SmartClickWithAdAvoidance } from './smartClickWithAdAvoidance.js';
import { getNaverCredentials } from './naverCredentialService.js';
import { saveReviews } from './reviewService.js';
import { ReviewScrapingJobService } from './reviewScrapingJobService.js';
import { logger } from '../utils/logger.js';

// 우상단 '로그인' 텍스트가 보이면 안정적으로 클릭
async function clickLoginIfVisible(page) {
  try { await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); } catch (_) {}
  // 전략 1: XPath로 텍스트 정확 일치
  try {
    const handles = await page.$x('//*[normalize-space(text())="로그인"]');
    if (handles && handles.length > 0) {
      await handles[0].click({ delay: 10 });
      return true;
    }
  } catch (_) {}
  // 전략 2: 텍스트 탐색
  try {
    const rect = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('*'));
      const btn = nodes.find(el => (el.textContent || '').trim() === '로그인');
      if (!btn) return null;
      const r = (btn).getBoundingClientRect();
      // 클릭 전에 스크롤로 노출 보장
      try { (btn).scrollIntoView({ block: 'center', inline: 'center' }); } catch(_) {}
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    if (rect) {
      await page.mouse.click(rect.x + rect.w / 2, rect.y + rect.h / 2, { button: 'left' });
      return true;
    }
  } catch (_) {}
  // 전략 3: 화면 우상단 영역 대략 클릭 (fallback)
  try {
    const viewport = page.viewport() || { width: 1280, height: 800 };
    await page.mouse.click(viewport.width - 80, 60, { button: 'left' });
    return true;
  } catch (_) {}
  return false;
}

// 로그인 후 "등록 / 등록안함" 선택지가 뜨는 경우 자동으로 "등록"을 클릭
async function clickRegisterIfPrompt(page) {
  try {
    // 여러 번 재시도: 동적로딩/애니메이션 대비
    for (let i = 0; i < 8; i++) {
      const clicked = await page.evaluate(() => {
        const normalize = (s) => (s || '').replace(/\s+/g, '').trim();
        // 다이얼로그/모달 내 버튼 탐색
        const containers = Array.from(document.querySelectorAll('dialog, [role="dialog"], .modal, .layer, body'));
        for (const root of containers) {
          const btns = Array.from(root.querySelectorAll('button, a'));
          let registerBtn = null;
          let skipBtn = null;
          for (const b of btns) {
            const t = normalize(b.textContent || '');
            if (/^등록(하기)?$/.test(t)) registerBtn = b;
            if (/등록안함/.test(t) || /등록\s*안함/.test(t)) skipBtn = b;
          }
          // 둘 다 존재하거나, 등록 버튼만 있어도 등록 우선 클릭
          if (registerBtn) {
            try { (registerBtn).click(); } catch(_) {}
            return true;
          }
        }
        return false;
      });
      if (clicked) {
        logger.info('[INFO] 로그인 후 선택지에서 "등록" 버튼 클릭');
        return true;
      }
      await new Promise(r => setTimeout(r, 400));
    }
  } catch (e) {
    logger.warn('[WARN] 등록/등록안함 프롬프트 처리 중 예외:', e?.message || e);
  }
  return false;
}

// 메인 홈이 완전히 표시될 때까지 안정적으로 대기
async function waitForMainHomeStable(page) {
  try {
    // DOM 완전 로드 대기
    try {
      await page.waitForFunction('document.readyState === "complete"', { timeout: 15000 });
    } catch (_) {}

    // 스마트플레이스 호스트 및 메인 홈 요소(내 업체 텍스트) 감지 대기
    try {
      await Promise.race([
        page.waitForFunction('location.hostname.includes("new.smartplace.naver.com")', { timeout: 20000 }),
        page.waitForFunction('Array.from(document.querySelectorAll("*"))\n          .some(el => (el.textContent || "").replace(/\\s+/g, "").includes("내업체"))', { timeout: 20000 })
      ]);
    } catch (_) {}

    // 잔여 애니메이션/배너/네트워크 정리 시간
    await delay(1500);
  } catch (e) {
    logger.warn('[WARN] 메인 홈 안정화 대기 중 예외:', e?.message || e);
  }
}

// 안정적으로 입력값을 기록하는 헬퍼: 선택자 후보를 순회하며 값 세팅 → 검증
async function fillInputStable(page, selectors, text, label = 'field') {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (!el) continue;
      // 포커스 및 전체 선택/지우기
      await el.focus();
      try { await page.keyboard.down(process.platform === 'darwin' ? 'Meta' : 'Control'); await page.keyboard.press('KeyA'); await page.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control'); } catch(_) {}
      try { await page.keyboard.press('Backspace'); } catch(_) {}
      // 값 직접 세팅 (IME/자동완성 간섭 회피)
      await page.evaluate((e, v) => {
        const el = e; el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true }));
        el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, el, text);
      // 검증
      const ok = await page.evaluate(e => e && e.value && e.value.length > 0, el);
      if (ok) { logger.info(`[INFO] ${label} 입력 완료 (${sel})`); return true; }
    } catch (err) {
      logger.warn(`[WARN] ${label} 입력 실패: ${sel} - ${err?.message || err}`);
    }
  }
  return false;
}

export const scrapeNaverReviewsComplete = async (userStoreId, storeName, jobId = null) => {
  let browser;
  let page;
  
  try {
    logger.info('[INFO] 네이버 스마트플레이스 완전한 리뷰 스크래핑 시작');
    
    // 작업 진행 상황 업데이트
    if (jobId) {
      await ReviewScrapingJobService.updateJobStatus(jobId, 'running', 5, '브라우저 초기화 중...');
    }
    
    // 1. 브라우저 시작
    browser = await puppeteer.launch({ 
      headless: false, // 진행 상황 확인용
      slowMo: 120,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    // UA/뷰포트 랜덤화로 탐지 회피 (간단 버전)
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1366, height: 850 });
    
    // 2. 세션 복원 (없으면 이후 로그인 플로우 수행)
    let session = await getNaverSession(userStoreId);
    if (session && session.cookies && session.cookies.length > 0) {
      await page.setCookie(...session.cookies);
      logger.info('[INFO] 세션 복원 완료');
    } else {
      logger.warn('[WARN] 저장된 세션이 없음 → 로그인 플로우로 진행');
    }
    
    // 3. 팝업 인터셉터 설정
    await PopupHandlerService.setupPopupInterceptor(page);
    
    // 4. 네이버 스마트플레이스 메인 접속
    await page.goto('https://new.smartplace.naver.com/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    logger.info('[INFO] 메인 페이지 접속 완료');
    
    // 작업 진행 상황 업데이트
    if (jobId) {
      await ReviewScrapingJobService.updateJobStatus(jobId, 'running', 15, '네이버 스마트플레이스 접속 완료');
    }
    
    await delay(3000);
    
    // 5. 초기 광고/팝업 정리 (스마트플레이스 전용 배너 우선 차단)
    await PopupHandlerService.closeSmartPlaceEntryPopups(page, 5, 350);
    
    // 5.1 우측 상단 "로그인" 버튼을 통한 로그인 (링크 직접 이동 금지)
    await PopupHandlerService.handleUnexpectedPopups(page);
    const loginState = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('*'));
      const hasLogin = nodes.some(el => (el.textContent || '').trim() === '로그인');
      const hasLogout = nodes.some(el => (el.textContent || '').trim() === '로그아웃');
      return { hasLogin, hasLogout };
    });
    const needLogin = loginState.hasLogin && !loginState.hasLogout;
    if (needLogin || !session) {
      logger.info('[INFO] 로그인 플로우 시작');
      await PopupHandlerService.handleUnexpectedPopups(page);
      // ‘로그인’이 보이면 클릭해서 이동 (강건 클릭 유틸)
      const clickedLoginBtn = await clickLoginIfVisible(page);
      if (!clickedLoginBtn) throw new Error('로그인 버튼 클릭 실패');
      // 로그인 페이지(입력 폼) 또는 로그인 호스트 대기 (타임아웃 확대)
      await Promise.race([
        page.waitForFunction('location.hostname.includes("nid.") || location.hostname.includes("auth.")', { timeout: 40000 }),
        page.waitForSelector('input#id, input#pw, input[name="id"], input[name="pw"], input[type="password"]', { timeout: 40000 })
      ]);
      await PopupHandlerService.handleUnexpectedPopups(page);
      await PopupHandlerService.handleUnexpectedPopups(page);
      // 자격증명 조회
      const cred = await getNaverCredentials(userStoreId);
      if (!cred || !cred.username || !cred.password) {
        throw new Error('네이버 로그인 정보가 없습니다. 마이페이지에서 먼저 연동하세요.');
      }
      // 아이디/비밀번호 입력 (직접 value 세팅 + 이벤트 디스패치로 안정화)
      const idSelectors = ['#id', 'input[name="id"]', '#loginId', 'input[type="text"]'];
      const pwSelectors = ['#pw', 'input[name="pw"]', '#loginPw', 'input[type="password"]'];
      const idOk = await fillInputStable(page, idSelectors, cred.username, '아이디');
      const pwOk = await fillInputStable(page, pwSelectors, cred.password, '비밀번호');
      if (!idOk || !pwOk) {
        throw new Error('아이디 또는 비밀번호 입력에 실패했습니다');
      }
      await PopupHandlerService.handleUnexpectedPopups(page);
      // 로그인 제출 (버튼 우선, 없으면 엔터)
      const submitSelectors = ['button[type="submit"]', '#log\\.login', '#login', '.btn_login', 'button#login'];
      let clicked = false;
      for (const sel of submitSelectors) {
        const el = await page.$(sel);
        if (el) { await el.click(); clicked = true; break; }
      }
      if (!clicked) { await page.keyboard.press('Enter'); }
      // 스마트플레이스로 복귀 대기
      await Promise.race([
        page.waitForFunction('location.hostname.includes("new.smartplace.naver.com")', { timeout: 40000 }),
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => null)
      ]);
      await PopupHandlerService.handleUnexpectedPopups(page);
    }
    // 로그인 이후 등록/등록안함 선택지가 있다면 "등록"을 자동 선택
    try { await PopupHandlerService.handleUnexpectedPopups(page); } catch(_) {}
    const didRegister = await clickRegisterIfPrompt(page);
    if (didRegister) {
      await waitForMainHomeStable(page);
      try { await PopupHandlerService.handleUnexpectedPopups(page); } catch(_) {}
    }
    
    // 6. 메인 홈에서 "내업체" 섹션 탐색 → 하단 상호가 대상과 같으면 직접 클릭, 아니면 내업체 클릭해 목록으로 이동
    await PopupHandlerService.handleUnexpectedPopups(page);
    logger.info('[INFO] 메인 홈에서 "내업체" 섹션 탐색 및 하위 상호 매칭 시도...');
    
    // 먼저 페이지의 모든 텍스트를 수집하여 분석
    let pageTexts = [];
    try {
      pageTexts = await page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll('*'));
        const texts = [];
        for (const el of allElements) {
          const text = el.textContent?.trim();
          if (text && text.length > 0 && text.length < 100) {
            texts.push({
              text: text,
              tagName: el.tagName,
              isClickable: el.tagName === 'A' || el.tagName === 'BUTTON' || el.onclick || el.closest('a') || el.closest('button')
            });
          }
        }
        return texts.slice(0, 100); // 처음 100개만
      });
    } catch (error) {
      logger.warn(`[WARN] 페이지 텍스트 수집 실패: ${error.message}`);
      pageTexts = [];
    }
    
    if (pageTexts && pageTexts.length > 0) {
      logger.info(`[DEBUG] 페이지 내 텍스트 샘플 (${pageTexts.length}개):`);
      pageTexts.forEach((item, index) => {
        if (item.text.includes('내') || item.text.includes('업체') || item.text.includes('칼포니')) {
          logger.info(`[DEBUG] ${index + 1}. "${item.text}" (${item.tagName}, 클릭가능: ${item.isClickable})`);
        }
      });
    } else {
      logger.info('[DEBUG] 페이지 텍스트를 수집할 수 없음');
    }
    
    let selectedFromHome = false;
    const homeMatch = await page.evaluate(async (targetName) => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const normalize = (s) => (s || '').replace(/\\s+/g, '').trim();
      const target = normalize(targetName);

      let heading = null;
      for (let i = 0; i < 5; i++) {
        console.log(`[DEBUG] 홈 스크롤 시도 ${i + 1}/5 - "내 업체" 찾는 중...`);
        
        // 1순위: '/bizes' 링크 직접 탐색 (실제 DOM 구조 기반)
        // 1-1: 정확한 클래스명으로 탐색
        const specificBizesLink = document.querySelector('a.Main_title__P_c6n.Main_link__fofNg[href="/bizes"]');
        if (specificBizesLink && specificBizesLink.offsetParent !== null) {
            console.log(`[DEBUG] 홈에서 정확한 클래스명으로 '/bizes' 링크 발견: "${specificBizesLink.textContent?.trim()}" (href: ${specificBizesLink.href})`);
            specificBizesLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(1000);
            specificBizesLink.click();
            return { success: false, navigated: true, method: 'home-specific-class-bizes-link', text: specificBizesLink.textContent?.trim(), href: specificBizesLink.href };
        }
        
        // 1-2: 일반적인 '/bizes' 링크 탐색 (fallback)
        const bizesLink = Array.from(document.querySelectorAll('a')).find(a => 
            a.href && a.href.includes('/bizes') && a.offsetParent !== null
        );
        if (bizesLink) {
            console.log(`[DEBUG] 홈에서 일반적인 '/bizes' 링크 발견: "${bizesLink.textContent?.trim()}" (href: ${bizesLink.href})`);
            bizesLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(1000);
            bizesLink.click();
            return { success: false, navigated: true, method: 'home-general-bizes-link', text: bizesLink.textContent?.trim(), href: bizesLink.href };
        }
        
        const all = Array.from(document.querySelectorAll('*'));
        // 2순위: 구체적인 "내 업체" 패턴 매칭
        heading = all.find(el => {
          const text = (el.textContent || '').trim();
          const isVisible = el.offsetParent !== null;
          const isSpecificPattern = /^내 업체\s*\d*\s*>?$/.test(text);
          
          if (isSpecificPattern && isVisible) {
            console.log(`[DEBUG] 홈에서 구체적인 "내 업체" 패턴 발견: "${text}" (태그: ${el.tagName})`);
          }
          
          return isSpecificPattern && isVisible;
        });
        if (heading) {
          console.log(`[DEBUG] 홈에서 "내 업체" 요소 발견: "${heading.textContent?.trim()}" (태그: ${heading.tagName})`);
          
          // 요소가 화면에 보이도록 스크롤
          console.log(`[DEBUG] 홈에서 "내 업체" 요소를 화면 중앙으로 스크롤...`);
          heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(1000); // 스크롤 애니메이션 대기
          break;
        }
        
        // 못 찾았으면 아래로 스크롤
        console.log(`[DEBUG] 홈에서 "내 업체"를 찾지 못해 아래로 스크롤...`);
        window.scrollBy(0, window.innerHeight * 0.5);
        await sleep(1000); // 스크롤 후 콘텐츠 로딩 대기
      }
      // 보조: XPath로 텍스트 기반 탐색 (숫자와 > 포함)
      if (!heading) {
        try {
          const it = document.evaluate('//*[contains(normalize-space(.), "내 업체") or contains(normalize-space(.), "내 업체") or contains(normalize-space(.), "내업체1") or contains(normalize-space(.), "내업체2") or contains(normalize-space(.), "내업체3") or contains(normalize-space(.), "내업체1 >") or contains(normalize-space(.), "내업체2 >")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          if (it.snapshotLength > 0) {
            heading = it.snapshotItem(0);
            console.log(`[DEBUG] XPath로 "내 업체" 요소 발견: "${heading.textContent?.trim()}"`);
          }
        } catch (_) {}
      }
      if (!heading) return { success: false, navigated: false, reason: 'heading-not-found' };

      // 하위 상호 매칭하지 않고 바로 "내 업체" 클릭
      console.log(`[DEBUG] "내 업체" 바로 클릭: "${heading.textContent?.trim()}"`);
      const anchor = heading.closest('a') || heading.querySelector('a');
      if (anchor) { 
        console.log(`[DEBUG] 홈에서 "내 업체" 링크 클릭: "${anchor.textContent?.trim()}" (href: ${anchor.href || 'href 없음'})`);
        (anchor).click(); 
        return { success: false, navigated: true, method: 'heading-anchor', text: heading.textContent?.trim(), href: anchor.href }; 
      }
      try { 
        console.log(`[DEBUG] 홈에서 "내 업체" 요소 직접 클릭: "${heading.textContent?.trim()}"`);
        (heading).click(); 
      } catch(_) {}
      return { success: false, navigated: true, method: 'heading-click', text: heading.textContent?.trim() };
    }, storeName);
    if (homeMatch && homeMatch.success) {
      selectedFromHome = true;
      logger.info(`[INFO] 홈에서 상호 직접 선택 성공: ${homeMatch.method}`);
      await delay(6000);
    } else {
      logger.info('[INFO] 홈에서 일치 상호 없음 → 내업체 목록 진입 계속');
    }
    logger.info('[INFO] 메인에서 "내 업체" 섹션 찾는 중...');
    let navigatedToBizes = false;
    const clickMyBusinesses = await page.evaluate(async () => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const normalize = (s) => (s || '').replace(/\s+/g, '').trim();

      // 스크롤하며 요소를 찾는 로직
      for (let i = 0; i < 5; i++) {
        console.log(`[DEBUG] 스크롤 시도 ${i + 1}/5 - '내 업체' 링크 찾는 중...`);
        
        // --- 수정 포인트 1: '/bizes' 링크를 최우선으로 탐색 (실제 DOM 구조 기반) ---
        // 1-1: 정확한 클래스명으로 탐색
        const specificBizesLink = document.querySelector('a.Main_title__P_c6n.Main_link__fofNg[href="/bizes"]');
        if (specificBizesLink && specificBizesLink.offsetParent !== null) {
            console.log(`[DEBUG] 정확한 클래스명으로 '/bizes' 링크 발견: "${specificBizesLink.textContent?.trim()}" (href: ${specificBizesLink.href})`);
            specificBizesLink.scrollIntoView({ block: 'center' });
            await sleep(500);
            specificBizesLink.click();
            return { success: true, method: 'specific-class-bizes-link', text: specificBizesLink.textContent?.trim(), href: specificBizesLink.href };
        }
        
        // 1-2: 일반적인 '/bizes' 링크 탐색 (fallback)
        const bizesLink = Array.from(document.querySelectorAll('a')).find(a => 
            a.href && a.href.includes('/bizes') && a.offsetParent !== null
        );
        if (bizesLink) {
            console.log(`[DEBUG] 일반적인 '/bizes' 링크 발견: "${bizesLink.textContent?.trim()}" (href: ${bizesLink.href})`);
            bizesLink.scrollIntoView({ block: 'center' });
            await sleep(500);
            bizesLink.click();
            return { success: true, method: 'general-bizes-link', text: bizesLink.textContent?.trim(), href: bizesLink.href };
        }

        // --- 수정 포인트 2: 더 구체적인 텍스트 패턴으로 탐색 ---
        const all = Array.from(document.querySelectorAll('*'));
        const heading = all.find(el => {
          // '내 업체' 바로 뒤에 숫자나 '>'가 오는 더 구체적인 패턴을 찾음
          const text = (el.textContent || '').trim();
          const isVisible = el.offsetParent !== null;
          const isSpecificPattern = /^내 업체\s*\d*\s*>?$/.test(text);
          
          if (isSpecificPattern && isVisible) {
            console.log(`[DEBUG] 구체적인 '내 업체' 패턴 발견: "${text}" (태그: ${el.tagName})`);
          }
          
          return isSpecificPattern && isVisible;
        });
        
        if (heading) {
          console.log(`[DEBUG] 구체적인 '내 업체' 요소 발견: "${heading.textContent?.trim()}"`);
          heading.scrollIntoView({ block: 'center' });
          await sleep(500);
          
          const anchor = heading.closest('a'); // heading을 감싸는 가장 가까운 링크
          if (anchor) {
            console.log(`[DEBUG] '내 업체'를 감싸는 링크 클릭: "${anchor.textContent?.trim()}" (href: ${anchor.href || 'href 없음'})`);
            anchor.click();
            return { success: true, method: 'specific-heading-anchor', text: heading.textContent?.trim(), href: anchor.href };
          } else {
            // 링크가 없다면 요소 자체를 클릭 (기존 로직 유지)
            console.log(`[DEBUG] '내 업체' 요소 직접 클릭: "${heading.textContent?.trim()}"`);
            heading.click();
            return { success: true, method: 'specific-heading-click', text: heading.textContent?.trim() };
          }
        }
        
        // --- 수정 포인트 3: 기존 광범위한 매칭을 fallback으로 유지하되 더 엄격하게 ---
        const fallbackHeading = all.find(el => {
          const text = normalize(el.textContent || '');
          const isVisible = el.offsetParent !== null;
          const isClickable = el.tagName === 'A' || el.tagName === 'BUTTON' || el.onclick || el.closest('a') || el.closest('button');
          const hasText = text.includes('내업체') || text.includes('내 업체');
          
          if (hasText && isVisible && isClickable) {
            console.log(`[DEBUG] Fallback '내 업체' 매칭: "${text}" (태그: ${el.tagName}, 클릭가능: ${isClickable})`);
          }
          
          return hasText && isVisible && isClickable;
        });
        
        if (fallbackHeading) {
          console.log(`[DEBUG] Fallback '내 업체' 요소 발견: "${fallbackHeading.textContent?.trim()}"`);
          fallbackHeading.scrollIntoView({ block: 'center' });
          await sleep(500);
          
          const anchor = fallbackHeading.closest('a') || fallbackHeading.querySelector('a');
          if (anchor) {
            console.log(`[DEBUG] Fallback 링크 클릭: "${anchor.textContent?.trim()}" (href: ${anchor.href || 'href 없음'})`);
            anchor.click();
            return { success: true, method: 'fallback-anchor', text: fallbackHeading.textContent?.trim(), href: anchor.href };
          } else {
            fallbackHeading.click();
            return { success: true, method: 'fallback-click', text: fallbackHeading.textContent?.trim() };
          }
        }
        
        // 못 찾았으면 스크롤
        console.log(`[DEBUG] '내 업체'를 찾지 못해 아래로 스크롤...`);
        window.scrollBy(0, window.innerHeight * 0.7);
        await sleep(1000);
      }

      return { success: false, reason: '모든 시도 후에도 내 업체 링크를 찾지 못함' };
    });
    if (clickMyBusinesses && clickMyBusinesses.success) {
      logger.info(`[INFO] "내 업체" 이동 클릭 성공: ${clickMyBusinesses.method} - "${clickMyBusinesses.text || '텍스트 없음'}"`);
      navigatedToBizes = true;
    } else {
      logger.error('[ERROR] "내 업체" 섹션 클릭 실패 (URL 직접 이동 금지 정책)');
      throw new Error('내 업체 섹션을 클릭해 이동하지 못했습니다');
    }
    
    // 페이지 이동 대기 (홈에서 바로 선택한 경우 생략)
    if (!selectedFromHome && navigatedToBizes) {
      try {
        await Promise.race([
          page.waitForFunction('location.pathname.includes("/bizes")', { timeout: 15000 }),
          page.waitForSelector('input[placeholder*="업체명"], input[type="search"]', { timeout: 15000 })
        ]);
        logger.info('[INFO] /bizes 페이지 이동 감지 완료');
    } catch (timeoutError) {
        logger.error('[ERROR] /bizes 페이지 감지 실패 (URL 직접 이동 금지 정책)');
        throw new Error('내 업체 페이지 감지 실패');
      }
    }
    
    // 로그인/차단 감지
    const urlAfterBizes = page.url();
    if (/nid\.|login|captcha|blocked|deny/.test(urlAfterBizes)) {
      throw new Error('네이버 로그인/차단 감지(세션 만료 또는 빈번 요청)');
    }
    
    await delay(3000);
    
    // 6.1 내 업체 화면의 상호 텍스트 후보 수집 및 로깅 (홈에서 바로 선택한 경우 생략)
    if (!selectedFromHome) try {
      const foundNames = await page.evaluate(() => {
        const normalize = (s) => (s || '').replace(/\s+/g, '').trim();
        const raw = new Set();
        
        // 실제 DOM 구조 기반 업체명 수집
        // 1) BusinessList_desc_title__3S7xM 클래스로 업체명 수집 (/bizes 페이지용, 가장 정확)
        const businessTitleLinks = Array.from(document.querySelectorAll('a.BusinessList_desc_title__3S7xM'));
        businessTitleLinks.forEach(el => {
          const t = (el.textContent || '').trim();
          if (t && t.length >= 2 && t.length <= 30) {
            raw.add(normalize(t));
          }
        });
        
        // 2) Main_title__P_c6n 클래스로 업체명 수집 (홈 페이지용 fallback)
        const businessTitles = Array.from(document.querySelectorAll('strong.Main_title__P_c6n, .Main_title__P_c6n'));
        businessTitles.forEach(el => {
          const t = (el.textContent || '').trim();
          if (t && t.length >= 2 && t.length <= 30) {
            raw.add(normalize(t));
          }
        });
        
        // 2) 일반적인 헤더/강조 텍스트 수집 (fallback)
        const nodes = Array.from(document.querySelectorAll('h1, h2, h3, strong, b, .tit, .title, a, .name, span'));
        for (const el of nodes) {
          const t = (el.textContent || '').trim();
          if (!t) continue;
          if (t.length < 2 || t.length > 30) continue; // 과도한 길이 제외
          // 잡텍스트 제외
          if (/내플레이스보기|정보수정|업체등록|예약|주문|검색|내업체|내 업체/.test(t)) continue;
          raw.add(normalize(t));
        }
        return Array.from(raw).slice(0, 50);
      });
      if (Array.isArray(foundNames) && foundNames.length) {
        logger.info(`[INFO] 내 업체 화면에서 감지된 상호 후보: ${foundNames.join(', ')}`);
      } else {
        logger.info('[INFO] 내 업체 화면에서 상호 후보를 찾지 못함');
      }
    } catch (_) { logger.warn('[WARN] 상호 후보 수집 중 예외 발생'); }
    
    // 7. 업체 선택 (가게명 일치 + "내 플레이스 보기" 우선 클릭)
    logger.info(`[INFO] 업체 선택 중... 대상: ${storeName}`);
    await delay(3000);
    
    let businessSelected;
    if (selectedFromHome) {
      businessSelected = { success: true, method: 'home-direct' };
    } else {
      // 페이지 상태 확인 및 안정화
      try {
        await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
        await delay(2000); // 추가 안정화 시간
        
        businessSelected = await page.evaluate((name) => {
          const normalize = (s) => (s || '').replace(/\s+/g, '').trim();
          const target = normalize(name);
          
          console.log(`[DEBUG] 업체 선택 시작 - 대상: "${name}", 정규화: "${target}"`);
          
          // 0) 실제 DOM 구조 기반 정확한 업체명 탐색 (/bizes 페이지)
          // 0-1: BusinessList_desc_title__3S7xM 클래스로 업체명 링크 탐색 (가장 정확)
          const businessTitleLinks = Array.from(document.querySelectorAll('a.BusinessList_desc_title__3S7xM'));
          const exactBusinessLink = businessTitleLinks.find(el => {
            const text = normalize(el.textContent || '');
            const matches = text === target;
            if (matches) {
              console.log(`[DEBUG] 정확한 업체명 링크 매칭 (BusinessList_desc_title__3S7xM): "${el.textContent?.trim()}" (href: ${el.href})`);
            }
            return matches;
          });
          
          if (exactBusinessLink) {
            console.log(`[DEBUG] 정확한 업체명 링크 발견: "${exactBusinessLink.textContent?.trim()}" (href: ${exactBusinessLink.href})`);
            exactBusinessLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
            exactBusinessLink.click();
            return { success: true, method: 'exact-business-link', text: exactBusinessLink.textContent?.trim(), href: exactBusinessLink.href };
          }
          
          // 0-2: Main_title__P_c6n 클래스로 업체명 탐색 (홈 페이지용 fallback)
          const businessTitleElements = Array.from(document.querySelectorAll('strong.Main_title__P_c6n, .Main_title__P_c6n'));
          const exactBusinessTitle = businessTitleElements.find(el => {
            const text = normalize(el.textContent || '');
            const matches = text === target;
            if (matches) {
              console.log(`[DEBUG] 정확한 업체명 매칭 (Main_title__P_c6n): "${el.textContent?.trim()}" (태그: ${el.tagName})`);
            }
            return matches;
          });
          
          if (exactBusinessTitle) {
            console.log(`[DEBUG] 정확한 업체명 발견: "${exactBusinessTitle.textContent?.trim()}"`);
            // 업체 카드 링크 찾기
            const businessCard = exactBusinessTitle.closest('a.Main_business_card__Q8DjV') || exactBusinessTitle.closest('a');
            if (businessCard) {
              console.log(`[DEBUG] 업체 카드 링크 클릭: "${businessCard.textContent?.trim()}" (href: ${businessCard.href || 'href 없음'})`);
              businessCard.click();
              return { success: true, method: 'exact-business-title-card', text: exactBusinessTitle.textContent?.trim(), href: businessCard.href };
            } else {
              console.log(`[DEBUG] 업체명 요소 직접 클릭: "${exactBusinessTitle.textContent?.trim()}"`);
              exactBusinessTitle.click();
              return { success: true, method: 'exact-business-title-direct', text: exactBusinessTitle.textContent?.trim() };
            }
          }
          
          // 0-2: 일반적인 정확 일치 탐색 (fallback)
          const all = Array.from(document.querySelectorAll('*'));
          console.log(`[DEBUG] 페이지 내 총 요소 수: ${all.length}`);
          
          const exact = all.find(el => {
            const text = normalize(el.textContent || '');
            const matches = text === target;
            if (matches) {
              console.log(`[DEBUG] 정확 일치 발견: "${el.textContent?.trim()}" (태그: ${el.tagName})`);
            }
            return matches;
          });
          
          // 보조: XPath contains 기반 후보
          let xpathHit = null;
          if (!exact) {
            try {
              const xp = `//*[contains(normalize-space(.), "${name.replace(/"/g, '\\"')}")]`;
              const it = document.evaluate(xp, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
              if (it.snapshotLength > 0) {
                xpathHit = it.snapshotItem(0);
                console.log(`[DEBUG] XPath 매칭 발견: "${xpathHit.textContent?.trim()}" (태그: ${xpathHit.tagName})`);
              }
            } catch (_) {}
          }
          
          if (exact) {
            console.log(`[DEBUG] 정확한 업체명 매칭: "${exact.textContent?.trim()}"`);
            // 주변에서 "내 플레이스 보기" 우선 클릭 (실제 DOM 구조 기반)
            const within = exact.closest('*') || exact;
            // 1) BusinessList_btn__nHKJs 클래스로 "내 플레이스 보기" 버튼 탐색
            const myPlaceBtn = within.querySelector('button.BusinessList_btn__nHKJs');
            if (myPlaceBtn && /내\s*플레이스\s*보기/.test((myPlaceBtn.textContent || '').replace(/\s+/g, ''))) {
              console.log(`[DEBUG] "내 플레이스 보기" 버튼 클릭 (BusinessList_btn__nHKJs): "${myPlaceBtn.textContent?.trim()}"`);
              myPlaceBtn.click();
              return { success: true, method: 'exact-name-my-place-button' };
            }
            // 2) 일반적인 버튼 탐색 (fallback)
            const myBtn = within.querySelector('a,button');
            if (myBtn && /내\s*플레이스\s*보기/.test((myBtn.textContent || '').replace(/\s+/g, ''))) {
              console.log(`[DEBUG] "내 플레이스 보기" 버튼 클릭: "${myBtn.textContent?.trim()}"`);
              (myBtn).click();
              return { success: true, method: 'exact-name-my-place' };
            }
            console.log(`[DEBUG] 업체명 요소 직접 클릭: "${exact.textContent?.trim()}"`);
            (exact).click();
            return { success: true, method: 'exact-name' };
          }
          
          if (xpathHit) {
            const within = xpathHit.closest('*') || xpathHit;
            const myBtn = within.querySelector('a,button');
            if (myBtn && /내\s*플레이스\s*보기/.test((myBtn.textContent || '').replace(/\s+/g, ''))) {
              console.log(`[DEBUG] XPath로 "내 플레이스 보기" 버튼 클릭: "${myBtn.textContent?.trim()}"`);
              (myBtn).click();
              return { success: true, method: 'xpath-my-place' };
            }
            console.log(`[DEBUG] XPath 요소 직접 클릭: "${xpathHit.textContent?.trim()}"`);
            (xpathHit).click();
            return { success: true, method: 'xpath-hit' };
          }

          // 1) 컨테이너 단위 매칭: 포함/역포함(유사 일치)
          console.log(`[DEBUG] 컨테이너 매칭 시도...`);
          const allContainers = Array.from(document.querySelectorAll('*')).filter(el => (el).offsetParent !== null);
          for (const container of allContainers) {
            const text = normalize(container.textContent || '');
            if (!(text.includes(target) || target.includes(text))) continue;

            console.log(`[DEBUG] 컨테이너 매칭: "${text}"`);

            // "내 플레이스 보기" 버튼/링크 (실제 DOM 구조 기반)
            // 1) BusinessList_btn__nHKJs 클래스로 "내 플레이스 보기" 버튼 탐색
            const myPlaceBtn = container.querySelector('button.BusinessList_btn__nHKJs');
            if (myPlaceBtn && /내\s*플레이스\s*보기/.test((myPlaceBtn.textContent || '').replace(/\s+/g, ''))) {
              console.log(`[DEBUG] 컨테이너 내 "내 플레이스 보기" 버튼 클릭 (BusinessList_btn__nHKJs): "${myPlaceBtn.textContent?.trim()}"`);
              myPlaceBtn.click();
              return { success: true, method: 'container-my-place-button' };
            }
            // 2) 일반적인 버튼 탐색 (fallback)
            const btn = Array.from(container.querySelectorAll('a,button')).find(el => /내\s*플레이스\s*보기/.test((el.textContent || '').replace(/\s+/g, '')));
            if (btn) {
              console.log(`[DEBUG] 컨테이너 내 "내 플레이스 보기" 버튼 클릭: "${btn.textContent?.trim()}"`);
              (btn).click();
              return { success: true, method: 'my-place-button' };
            }

            // 가게 상세로 이동하는 링크 추정
            const link = container.querySelector('a[href*="/bizes/"], a[href*="place"], a[href*="biz"]');
            if (link) {
              console.log(`[DEBUG] 컨테이너 내 상세 링크 클릭: "${link.textContent?.trim()}"`);
              (link).click();
              return { success: true, method: 'detail-link' };
            }

            // 컨테이너 자체 클릭
            console.log(`[DEBUG] 컨테이너 직접 클릭: "${text}"`);
            (container).click();
            return { success: true, method: 'container-click' };
          }

          // 2) "내 플레이스 보기"가 하나만 있으면 그것을 클릭 (실제 DOM 구조 기반)
          // 2-1: BusinessList_btn__nHKJs 클래스로 "내 플레이스 보기" 버튼 탐색
          const specificMyPlaceButtons = Array.from(document.querySelectorAll('button.BusinessList_btn__nHKJs')).filter(el => /내\s*플레이스\s*보기/.test((el.textContent || '').replace(/\s+/g, '')));
          if (specificMyPlaceButtons.length === 1) {
            console.log(`[DEBUG] 단일 "내 플레이스 보기" 버튼 클릭 (BusinessList_btn__nHKJs): "${specificMyPlaceButtons[0].textContent?.trim()}"`);
            specificMyPlaceButtons[0].click();
            return { success: true, method: 'single-my-place-button' };
          }
          // 2-2: 일반적인 "내 플레이스 보기" 버튼 탐색 (fallback)
          const myPlaceButtons = Array.from(document.querySelectorAll('a,button')).filter(el => /내\s*플레이스\s*보기/.test((el.textContent || '').replace(/\s+/g, '')));
          if (myPlaceButtons.length === 1) {
            console.log(`[DEBUG] 단일 "내 플레이스 보기" 버튼 클릭: "${myPlaceButtons[0].textContent?.trim()}"`);
            (myPlaceButtons[0]).click();
            return { success: true, method: 'single-my-place' };
          }

          // 3) 최후의 수단: 첫 번째 업체 링크
          const firstLink = document.querySelector('a[href*="/bizes/"], a[href*="biz"], a');
          if (firstLink) {
            console.log(`[DEBUG] 첫 번째 링크 클릭: "${firstLink.textContent?.trim()}"`);
            (firstLink).click();
            return { success: true, method: 'first-link' };
          }
          
          console.log(`[DEBUG] 업체 선택 실패 - 모든 방법 시도 완료`);
      return { success: false };
        }, storeName);
      } catch (error) {
        logger.error(`[ERROR] 업체 선택 중 오류 발생: ${error.message}`);
        throw new Error(`업체 선택 실패: ${error.message}`);
      }
    }
    
    if (businessSelected.success) {
      logger.info(`[INFO] 업체 선택 성공 (${businessSelected.method || 'unknown'})`);
      
      // 작업 진행 상황 업데이트
      if (jobId) {
        await ReviewScrapingJobService.updateJobStatus(jobId, 'running', 50, '업체 선택 완료, 리뷰 페이지 이동 중...');
      }
      
      // 업체 선택 후 페이지 변화 대기
      await delay(8000);
      
      const currentUrl = page.url();
      logger.info('[INFO] 현재 URL:', currentUrl);
      
      // 8. "우리 가게 리뷰" 클릭 (스크롤 포함)
      logger.info('[INFO] 우리 가게 리뷰 페이지로 이동 중... (스크롤 포함)');
      
      // 먼저 화면을 아래로 스크롤하며 타이틀을 노출시킴
      await page.evaluate(async () => {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        for (let i = 0; i < 3; i++) {
          window.scrollBy(0, window.innerHeight * 0.55);
          await sleep(350);
        }
      });
      
      // 클릭 시도
      const reviewClicked = await page.evaluate(() => {
        // 여러 방법으로 "우리 가게 리뷰" 요소 찾기
        const selectors = [
          'a[href*="reviews"]',
          'a[href*="review"]',
          '.Review_tab__n9UPw'
        ];
        
        for (const selector of selectors) {
          try {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              if (element.textContent?.includes('우리 가게 리뷰') || element.textContent?.includes('우리가게 리뷰')) {
                console.log(`[DEBUG] "우리 가게 리뷰" 요소 발견 (${selector}): "${element.textContent?.trim()}"`);
                element.click();
                return { success: true, method: selector, text: element.textContent?.trim() };
              }
            }
          } catch (e) {
            // selector가 유효하지 않은 경우 무시
          }
        }
        
        // 텍스트 기반으로 모든 요소 검색 (더 유연한 매칭)
        const allElements = Array.from(document.querySelectorAll('*'));
        for (const element of allElements) {
          const txt = element.textContent || '';
          // "우리 가게 리뷰", "우리가게 리뷰", "가게 리뷰", "리뷰" 등 다양한 형태 인식
          if ((txt.includes('우리 가게 리뷰') || txt.includes('우리가게 리뷰') || 
               txt.includes('가게 리뷰') || txt.includes('리뷰')) && 
              (element.tagName === 'A' || element.tagName === 'BUTTON' || element.onclick || 
               element.closest('a') || element.closest('button'))) {
            console.log(`[DEBUG] "우리 가게 리뷰" 텍스트 매칭: "${txt.trim()}"`);
            // 클릭 가능한 요소 찾기
            const clickable = element.tagName === 'A' || element.tagName === 'BUTTON' ? element : 
                             element.closest('a') || element.closest('button');
            if (clickable) {
              clickable.click();
              return { success: true, method: 'text-search', text: txt.trim() };
            }
          }
        }
        
        return { success: false, reason: '우리 가게 리뷰 요소를 찾을 수 없음' };
      });
      
      if (!reviewClicked.success) {
        logger.error('[ERROR] "우리 가게 리뷰" 클릭 실패 (URL 직접 이동 금지 정책)');
        throw new Error('우리 가게 리뷰 탭을 클릭하지 못했습니다');
    } else {
        logger.info(`[INFO] "우리 가게 리뷰" 클릭 성공: ${reviewClicked.method} - "${reviewClicked.text || '텍스트 없음'}"`);
      }
      
      // 리뷰 페이지 도달 보강 감지
      try {
        await Promise.race([
          page.waitForFunction('location.pathname.includes("/reviews")', { timeout: 12000 }),
          page.waitForSelector('li[class*="Review_"], .Review_tab__n9UPw', { timeout: 12000 })
        ]);
      } catch (_) {}
      
      // 로그인/차단 감지(리뷰 페이지)
      const urlAfterReviews = page.url();
      if (/nid\.|login|captcha|blocked|deny/.test(urlAfterReviews)) {
        throw new Error('네이버 로그인/차단 감지(리뷰 페이지 접근 실패)');
      }
      
      // 리뷰 페이지 이동 대기
      try {
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
        logger.info('[INFO] 리뷰 페이지 이동 완료');
      } catch (timeoutError) {
        logger.warn('[WARN] 리뷰 페이지 이동 타임아웃');
      }
      
      await delay(5000);
      
      // 8.5. 무한 스크롤을 통한 모든 리뷰 로드
      logger.info('[INFO] 무한 스크롤을 통한 모든 리뷰 로드 시작...');
      
      const scrollResult = await page.evaluate(async () => {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        let previousReviewCount = 0;
        let currentReviewCount = 0;
        let scrollAttempts = 0;
        const maxScrollAttempts = 20; // 최대 스크롤 시도 횟수
        const scrollDelay = 2000; // 스크롤 간 대기 시간
        
        console.log('[DEBUG] 무한 스크롤 시작...');
        
        while (scrollAttempts < maxScrollAttempts) {
          // 현재 리뷰 개수 확인
          currentReviewCount = document.querySelectorAll('li.pui__X35jYm.Review_pui_review__zhZdn').length;
          console.log(`[DEBUG] 스크롤 시도 ${scrollAttempts + 1}/${maxScrollAttempts} - 현재 리뷰 개수: ${currentReviewCount}`);
          
          // 리뷰 개수가 증가하지 않았으면 더 이상 로드할 리뷰가 없음
          if (currentReviewCount === previousReviewCount && scrollAttempts > 2) {
            console.log('[DEBUG] 리뷰 개수 증가 없음 - 스크롤 완료');
            break;
          }
          
          // 페이지 하단으로 스크롤
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
          });
          
          // 스크롤 애니메이션 및 새 리뷰 로딩 대기
          await sleep(scrollDelay);
          
          // 로딩 인디케이터가 있는지 확인 (있다면 추가 대기)
          const loadingIndicator = document.querySelector('[class*="loading"], [class*="spinner"], .loading');
          if (loadingIndicator) {
            console.log('[DEBUG] 로딩 인디케이터 감지 - 추가 대기');
            await sleep(1000);
          }
          
          previousReviewCount = currentReviewCount;
          scrollAttempts++;
        }
        
        const finalReviewCount = document.querySelectorAll('li.pui__X35jYm.Review_pui_review__zhZdn').length;
        console.log(`[DEBUG] 스크롤 완료 - 최종 리뷰 개수: ${finalReviewCount}`);
        
        return {
          success: true,
          totalReviews: finalReviewCount,
          scrollAttempts: scrollAttempts,
          message: `총 ${finalReviewCount}개 리뷰 로드 완료`
        };
      });
      
      logger.info(`[INFO] 스크롤 완료: ${scrollResult.message} (${scrollResult.scrollAttempts}번 시도)`);
      
      // 작업 진행 상황 업데이트
      if (jobId) {
        await ReviewScrapingJobService.updateJobStatus(jobId, 'running', 80, `리뷰 로드 완료: ${scrollResult.totalReviews}개 리뷰 발견`);
      }
      
      // 스크롤 완료 후 추가 안정화 시간
      await delay(3000);
      
      // 9. 리뷰 데이터 추출 (실제 DOM 구조 기반)
      logger.info('[INFO] 리뷰 페이지 DOM 구조 분석 중...');
       
       // 먼저 페이지의 모든 리뷰 관련 요소를 찾아보기
       const pageAnalysis = await page.evaluate(() => {
         const analysis = {
           totalElements: document.querySelectorAll('*').length,
           reviewRelatedElements: [],
           possibleReviewSelectors: [],
           pageText: document.body.textContent?.substring(0, 1000) || ''
         };
         
         // 다양한 리뷰 관련 선택자 시도
         const selectors = [
           'li.pui__X35jYm.Review_pui_review__zhZdn',
           'li[class*="Review"]',
           'li[class*="review"]',
           '.review-item',
           '.Review_item',
           '[class*="review"]',
           'li[class*="pui"]',
           '.pui__X35jYm',
           'li'
         ];
         
         selectors.forEach(selector => {
           const elements = document.querySelectorAll(selector);
           if (elements.length > 0) {
             analysis.possibleReviewSelectors.push({
               selector: selector,
               count: elements.length,
               sampleText: elements[0]?.textContent?.substring(0, 100) || ''
             });
           }
         });
         
         // 리뷰 관련 텍스트가 포함된 요소 찾기
         const allElements = Array.from(document.querySelectorAll('*'));
         allElements.forEach((el, index) => {
           const text = el.textContent?.trim();
           if (text && (text.includes('리뷰') || text.includes('review') || text.includes('평점') || text.includes('별점'))) {
             analysis.reviewRelatedElements.push({
               tagName: el.tagName,
               className: el.className,
               text: text.substring(0, 100),
               index: index
             });
           }
         });
         
         return analysis;
       });
       
       logger.info(`[DEBUG] 페이지 분석 결과:`, JSON.stringify(pageAnalysis, null, 2));
       
       // 리뷰 추출 시도 (실제 DOM 구조 기반, 중복 방지)
       const reviews = await page.evaluate(() => {
         const reviews = [];
         const seenReviews = new Set(); // 중복 방지를 위한 Set
         
         // 실제 DOM 구조 기반 리뷰 요소 찾기
         const reviewElements = document.querySelectorAll('li.pui__X35jYm.Review_pui_review__zhZdn');
         console.log(`[DEBUG] 리뷰 요소 개수: ${reviewElements.length}`);
         
         reviewElements.forEach((reviewEl, index) => {
           try {
             // 사용자 정보 추출 (실제 구조: pui__NMi-Dp)
             const userNameEl = reviewEl.querySelector('.pui__NMi-Dp');
             const userName = userNameEl?.textContent?.trim() || '익명';
             
             // 날짜 정보 추출 (실제 구조: time 태그)
             const dateEl = reviewEl.querySelector('time[aria-hidden="true"]');
             const dateText = dateEl?.textContent?.trim() || '';
             
             // 리뷰 내용 추출 (실제 구조: pui__xtsQN-)
             const contentEl = reviewEl.querySelector('.pui__xtsQN-');
             const content = contentEl?.textContent?.trim() || '';
             
             // 태그 추출 (실제 구조: pui__jhpEyP)
             const tagEl = reviewEl.querySelector('.pui__jhpEyP');
             const tag = tagEl?.textContent?.trim() || '';
             
             // 평점 추출 (별점이 있는 경우)
             let rating = 0;
             const ratingEl = reviewEl.querySelector('[class*="star"], [class*="rating"]');
             if (ratingEl) {
               const ratingText = ratingEl.textContent?.trim();
               const ratingMatch = ratingText?.match(/(\d+)/);
               if (ratingMatch) {
                 rating = parseInt(ratingMatch[1]);
               }
             }
             
             // 중복 방지를 위한 고유 키 생성 (사용자명 + 내용 + 날짜)
             const uniqueKey = `${userName}_${content.substring(0, 50)}_${dateText}`;
             
             // 내용이 있고 중복이 아닌 리뷰만 추가
             if (content && content.length > 0 && !seenReviews.has(uniqueKey)) {
               const reviewData = {
                 content: content,
                 nickname: userName,
                 rating: rating,
                 date: dateText,
                 tag: tag,
                 rawText: reviewEl.textContent?.substring(0, 200) // 디버깅용
               };
               
               reviews.push(reviewData);
               seenReviews.add(uniqueKey);
               
               // 진행 상황 로깅 (10개마다)
               if (reviews.length % 10 === 0) {
                 console.log(`[DEBUG] 리뷰 추출 진행: ${reviews.length}개 완료`);
               }
             }
             
           } catch (error) {
             console.warn(`리뷰 ${index + 1} 추출 실패:`, error.message);
           }
         });
         
         console.log(`[DEBUG] 총 ${reviews.length}개 리뷰 추출 완료 (중복 제거 후)`);
         return reviews;
       });
      
      logger.info(`[INFO] 총 ${reviews.length}개 리뷰 추출 완료`);
      
      // 작업 진행 상황 업데이트
      if (jobId) {
        await ReviewScrapingJobService.updateJobStatus(jobId, 'running', 90, `리뷰 추출 완료: ${reviews.length}개 리뷰, DB 저장 중...`);
      }
      
      // 10. 리뷰를 DB에 저장 (naver_reviews 테이블 스키마에 맞게)
      if (reviews && reviews.length > 0) {
        try {
          logger.info(`[INFO] ${reviews.length}개 리뷰를 naver_reviews 테이블에 저장 중...`);
          
          // 리뷰 데이터를 DB 스키마에 맞게 변환
          const dbReviews = reviews.map(review => ({
            user_store_id: userStoreId,
            review_content: review.content,
            author_nickname: review.nickname,
            review_date: review.date ? new Date(review.date) : null,
            rating: review.rating,
            extra_metadata: {
              tag: review.tag,
              rawText: review.rawText,
              scrapedAt: new Date().toISOString()
            }
          }));
          
          const savedReviews = await saveReviews(userStoreId, dbReviews);
          logger.info(`[INFO] 리뷰 DB 저장 완료: ${savedReviews.length}개`);
          
          // 저장된 리뷰 정보 로깅
          savedReviews.forEach((review, index) => {
            logger.info(`[INFO] 저장된 리뷰 ${index + 1}: "${review.review_content?.substring(0, 50)}..." (작성자: ${review.author_nickname})`);
          });
          
        } catch (error) {
          logger.error('[ERROR] 리뷰 DB 저장 실패:', error);
          // DB 저장 실패해도 스크래핑 결과는 반환
        }
      } else {
        logger.warn('[WARN] 추출된 리뷰가 없어 DB 저장을 건너뜁니다.');
      }
      
      return {
        success: true,
        totalReviews: reviews ? reviews.length : 0,
        reviews: reviews || [],
        scrapedAt: new Date()
      };
      
    } else {
      throw new Error('업체 선택 실패');
    }
    
  } catch (error) {
    logger.error('[ERROR] 리뷰 스크래핑 실패:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      logger.info('[INFO] 브라우저 종료');
    }
  }
};

// 로그인만 수행하는 경량 플로우
export const loginToSmartPlace = async (userStoreId) => {
  let browser;
  let page;
  try {
    logger.info('[INFO] 네이버 스마트플레이스 로그인-only 시작');
    browser = await puppeteer.launch({ headless: false, slowMo: 120, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 850 });

    await PopupHandlerService.setupPopupInterceptor(page);

    await page.goto('https://new.smartplace.naver.com/', { waitUntil: 'networkidle0', timeout: 30000 });
    await PopupHandlerService.handleUnexpectedPopups(page);

    // 로그인 버튼 클릭 (우상단 텍스트 기반)
    await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('*'));
      const btn = nodes.find(el => (el.textContent || '').trim() === '로그인');
      if (btn) (btn).click();
    });

    await Promise.race([
      page.waitForFunction('location.hostname.includes("nid.") || location.hostname.includes("auth.")', { timeout: 20000 }),
      page.waitForSelector('input', { timeout: 20000 })
    ]);
    await PopupHandlerService.handleUnexpectedPopups(page);

    const cred = await getNaverCredentials(userStoreId);
    if (!cred || !cred.username || !cred.password) {
      throw new Error('네이버 로그인 정보가 없습니다. 마이페이지에서 연동을 먼저 완료하세요.');
    }

    const idSelectors = ['#id', 'input[name="id"]', '#loginId', 'input[type="text"]'];
    for (const sel of idSelectors) { const el = await page.$(sel); if (el) { await el.click({ clickCount: 3 }); await el.type(cred.username, { delay: 40 }); break; } }
    const pwSelectors = ['#pw', 'input[name="pw"]', '#loginPw', 'input[type="password"]'];
    for (const sel of pwSelectors) { const el = await page.$(sel); if (el) { await el.click({ clickCount: 3 }); await el.type(cred.password, { delay: 50 }); break; } }

    await PopupHandlerService.handleUnexpectedPopups(page);
    const submitSelectors = ['button[type="submit"]', '#log\\.login', '#login', '.btn_login', 'button#login'];
    let submitted = false;
    for (const sel of submitSelectors) { const el = await page.$(sel); if (el) { await el.click(); submitted = true; break; } }
    if (!submitted) { await page.keyboard.press('Enter'); }

    await Promise.race([
      page.waitForFunction('location.hostname.includes("new.smartplace.naver.com")', { timeout: 25000 }),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => null)
    ]);
    await PopupHandlerService.handleUnexpectedPopups(page);

    logger.info('[INFO] 네이버 로그인 완료');
    return { success: true, loggedIn: true };
    } catch (error) {
    logger.error('[ERROR] 로그인-only 실패:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      logger.info('[INFO] 브라우저 종료');
    }
  }
};
