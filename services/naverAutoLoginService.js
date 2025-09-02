import puppeteer from 'puppeteer';
import delay from 'delay';
import { getNaverCredentials } from './naverCredentialService.js';
import { saveNaverSession } from './sessionService.js';
import { logger } from '../utils/logger.js';
import { supabase } from './supabaseService.js';

// 간단한 클릭 시도 유틸
async function tryClick(page, selectors = []) {
  for (const selector of selectors) {
    try {
      const el = await page.$(selector);
      if (el) {
        await el.click();
        return true;
      }
    } catch (e) {
      // ignore and continue
    }
  }
  return false;
}

// 텍스트로 요소 찾기(XPath)
async function findByText(page, tag, texts = []) {
  for (const text of texts) {
    try {
      const [el] = await page.$x(`//${tag}[contains(., '${text}')]`);
      if (el) return el;
    } catch (e) {
      // ignore
    }
  }
  return null;
}

/**
 * 네이버 자동 로그인 실행
 * @param {string} userStoreId - 사용자 스토어 ID
 * @returns {Promise<Object>} 로그인 결과
 */
export const autoLoginToNaver = async (userStoreId, overrideCredentials) => {
  let browser;
  
  try {
    logger.info(`네이버 자동 로그인 시작: ${userStoreId}`);
    
    // 1. 저장된 로그인 정보 조회
    const credentials = overrideCredentials && overrideCredentials.username && overrideCredentials.password
      ? overrideCredentials
      : await getNaverCredentials(userStoreId);
    if (!credentials) {
      throw new Error('네이버 로그인 정보가 없습니다. 먼저 연동 설정을 완료해주세요.');
    }
    
    logger.info(`로그인 정보 확인됨: ${credentials.username}`);
    
    // 2. Puppeteer 브라우저 시작
    browser = await puppeteer.launch({ 
      headless: true,
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
    
    const page = await browser.newPage();
    
    // 3. User-Agent 설정 (실제 브라우저처럼 보이게)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 4. 뷰포트 설정
    await page.setViewport({ width: 1920, height: 1080 });
    
    // 5. 네이버 로그인 페이지 접속
    logger.info('네이버 로그인 페이지 접속 중...');
    await page.goto('https://new.smartplace.naver.com/login', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // 6. 페이지 로딩 대기
    await delay(2000);
    
    // 7. 로그인 폼 요소 확인 및 입력
    logger.info('로그인 정보 입력 중...');
    
    // 다양한 로그인 폼 셀렉터 시도
    const usernameSelectors = [
      '#id',
      'input[name="id"]',
      'input[name="username"]',
      'input[type="text"]',
      'input[placeholder*="아이디"]',
      'input[placeholder*="ID"]'
    ];
    
    const passwordSelectors = [
      '#pw',
      'input[name="pw"]',
      'input[name="password"]',
      'input[type="password"]',
      'input[placeholder*="비밀번호"]',
      'input[placeholder*="Password"]'
    ];
    
    const loginButtonSelectors = [
      '.btn_login',
      'button[type="submit"]',
      'input[type="submit"]',
      'button:contains("로그인")',
      'button:contains("Login")',
      '.login-btn',
      '.btn-submit'
    ];
    
    // 사용자명 입력 전, QR/다른 로그인 화면일 경우 ID/PW 폼으로 전환 시도
    await tryClick(page, ['#goOtherLogin', 'a#goOtherLogin', 'button#goOtherLogin']);
    await delay(500);
    
    // 사용자명 입력
    let usernameInput = null;
    for (const selector of usernameSelectors) {
      try {
        usernameInput = await page.$(selector);
        if (usernameInput) {
          logger.info(`사용자명 입력 필드 발견: ${selector}`);
          break;
        }
      } catch (e) {
        // 선택자 오류 무시하고 다음 시도
      }
    }
    
    // 그래도 없으면 공식 로그인 페이지로 이동 후 재시도
    if (!usernameInput) {
      logger.warn('사용자명 입력 필드 미발견, 네이버 계정 로그인 페이지로 이동합니다.');
      const redirectUrl = encodeURIComponent('https://new.smartplace.naver.com/');
      await page.goto(`https://nid.naver.com/nidlogin.login?mode=form&url=${redirectUrl}` , {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      await delay(1000);
      await tryClick(page, ['#goOtherLogin', 'a#goOtherLogin', 'button#goOtherLogin']);
      for (const selector of usernameSelectors) {
        try {
          usernameInput = await page.$(selector);
          if (usernameInput) {
            logger.info(`사용자명 입력 필드 발견(redirect): ${selector}`);
            break;
          }
        } catch {}
      }
    }

    if (!usernameInput) {
      throw new Error('사용자명 입력 필드를 찾을 수 없습니다');
    }
    
    // 비밀번호 입력
    let passwordInput = null;
    for (const selector of passwordSelectors) {
      try {
        passwordInput = await page.$(selector);
        if (passwordInput) {
          logger.info(`비밀번호 입력 필드 발견: ${selector}`);
          break;
        }
      } catch (e) {
        // 선택자 오류 무시하고 다음 시도
      }
    }
    
    if (!passwordInput) {
      throw new Error('비밀번호 입력 필드를 찾을 수 없습니다');
    }
    
    // 로그인 버튼
    let loginButton = null;
    for (const selector of loginButtonSelectors) {
      try {
        loginButton = await page.$(selector);
        if (loginButton) {
          logger.info(`로그인 버튼 발견: ${selector}`);
          break;
        }
      } catch (e) {
        // 선택자 오류 무시하고 다음 시도
      }
    }
    if (!loginButton) {
      loginButton = await findByText(page, 'button', ['로그인', 'Login']);
      if (loginButton) logger.info('로그인 버튼 발견(text 검색)');
    }
    
    if (!loginButton) {
      throw new Error('로그인 버튼을 찾을 수 없습니다');
    }
    
    // 8. 로그인 정보 입력
    await usernameInput.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.type(credentials.username);
    
    await passwordInput.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.type(credentials.password);
    
    logger.info('로그인 정보 입력 완료');
    
    // 9. 로그인 버튼 클릭
    logger.info('로그인 버튼 클릭 중...');
    await loginButton.click();
    
    // 10. 로그인 완료 대기
    logger.info('로그인 완료 대기 중...');
    
    try {
      // 네비게이션 완료 대기
      await page.waitForNavigation({ 
        waitUntil: 'networkidle0', 
        timeout: 15000 
      });
    } catch (timeoutError) {
      logger.warn('네비게이션 타임아웃, 현재 상태 확인...');
      // 타임아웃이어도 현재 페이지 상태 확인
    }
    
    // 11. 로그인 성공 여부 확인
    logger.info('로그인 상태 확인 중...');
    await delay(3000); // 페이지 로딩 대기
    
    const isLoggedIn = await page.evaluate(() => {
      // 로그인 성공 여부를 판단하는 다양한 방법
      const indicators = [
        // 로그인 버튼이 사라짐
        !document.querySelector('.login_btn'),
        !document.querySelector('.btn_login'),
        !document.querySelector('[class*="login"]'),
        
        // 사용자 정보 표시
        !!document.querySelector('.myplace'),
        !!document.querySelector('[class*="사용자"]'),
        !!document.querySelector('[class*="user"]'),
        !!document.querySelector('[class*="profile"]'),
        
        // URL 변경
        window.location.href.includes('/myplace'),
        window.location.href.includes('/bizes'),
        window.location.href.includes('/dashboard'),
        
        // 로그아웃 버튼 존재
        !!document.querySelector('.logout'),
        !!document.querySelector('[class*="logout"]'),
        !!document.querySelector('[class*="로그아웃"]')
      ];
      
      return indicators.some(indicator => indicator);
    });
    
    if (!isLoggedIn) {
      // 로그인 실패 시 에러 메시지 확인
      const errorMessage = await page.evaluate(() => {
        const errorSelectors = [
          '.error_msg',
          '.error-message',
          '[class*="error"]',
          '[class*="alert"]',
          '.alert-danger',
          '.login-error'
        ];
        
        for (const selector of errorSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            return element.textContent.trim();
          }
        }
        
        return '로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해주세요.';
      });
      
      throw new Error(`로그인 실패: ${errorMessage}`);
    }
    
    // 12. 쿠키 추출 및 세션 저장
    logger.info('로그인 성공, 쿠키 추출 중...');
    const cookies = await page.cookies();
    
    if (!cookies || cookies.length === 0) {
      throw new Error('로그인은 성공했지만 쿠키를 가져올 수 없습니다');
    }
    
    // 13. 세션 저장
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간 후 만료
    await saveNaverSession(userStoreId, { cookies, expiresAt });
    
    // 14. 로그인 성공 정보 업데이트
    await updateLoginSuccess(userStoreId);
    
    logger.info('네이버 자동 로그인 완료');
    
    return { 
      success: true, 
      message: '네이버 자동 로그인 성공',
      cookies: cookies.length,
      expiresAt
    };
    
  } catch (error) {
    logger.error('네이버 자동 로그인 실패:', error.message);
    
    // 로그인 실패 기록
    await recordLoginFailure(userStoreId, error.message);
    
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      logger.info('브라우저 종료');
    }
  }
};

/**
 * 로그인 실패 기록
 * @param {string} userStoreId - 사용자 스토어 ID
 * @param {string} errorMessage - 에러 메시지
 */
const recordLoginFailure = async (userStoreId, errorMessage) => {
  try {
    // 로그인 실패 횟수 증가
    await incrementLoginFailCount(userStoreId);
    
    // 로그인 히스토리에 실패 기록
    const { error } = await supabase
      .from('naver_login_history')
      .insert({
        user_store_id: userStoreId,
        success: false,
        error_message: errorMessage
      });
    
    if (error) {
      logger.error('로그인 실패 기록 저장 실패:', error);
    }
    
  } catch (error) {
    logger.error('로그인 실패 기록 처리 에러:', error);
  }
};

/**
 * 로그인 성공 시 정보 업데이트
 * @param {string} userStoreId - 사용자 스토어 ID
 */
const updateLoginSuccess = async (userStoreId) => {
  try {
    const { error } = await supabase
      .from('naver_credentials')
      .update({ 
        last_login_at: new Date().toISOString(),
        login_fail_count: 0, // 로그인 성공 시 실패 횟수 초기화
        updated_at: new Date().toISOString()
      })
      .eq('user_store_id', userStoreId);
    
    if (error) {
      logger.error('로그인 성공 정보 업데이트 실패:', error);
    }
    
    // 로그인 히스토리에 성공 기록
    await supabase
      .from('naver_login_history')
      .insert({
        user_store_id: userStoreId,
        success: true
      });
    
  } catch (error) {
    logger.error('로그인 성공 정보 업데이트 에러:', error);
  }
};

/**
 * 로그인 실패 횟수 증가
 * @param {string} userStoreId - 사용자 스토어 ID
 */
const incrementLoginFailCount = async (userStoreId) => {
  try {
    const { error } = await supabase
      .from('naver_credentials')
      .update({ 
        login_fail_count: supabase.sql`login_fail_count + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('user_store_id', userStoreId);
    
    if (error) {
      logger.error('로그인 실패 횟수 증가 실패:', error);
    }
    
  } catch (error) {
    logger.error('로그인 실패 횟수 증가 에러:', error);
  }
};
