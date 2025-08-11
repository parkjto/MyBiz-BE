#!/usr/bin/env node

/**
 * 카카오 로그인 API 테스트 스크립트
 * 
 * 사용법:
 * 1. 환경변수 설정 후 실행
 * 2. node test-kakao-login.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/auth';

// 색상 출력을 위한 유틸리티
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// API 테스트 함수들
async function testEnvironment() {
  try {
    logInfo('1. 환경 설정 확인 중...');
    const response = await axios.get(`${BASE_URL}/test`);
    
    if (response.data.environment) {
      logSuccess('환경 설정 확인 완료');
      log(`   KAKAO_CLIENT_ID: ${response.data.environment.KAKAO_CLIENT_ID}`, 'cyan');
      log(`   KAKAO_REDIRECT_URI: ${response.data.environment.KAKAO_REDIRECT_URI}`, 'cyan');
      log(`   JWT_SECRET: ${response.data.environment.JWT_SECRET}`, 'cyan');
    }
    
    return true;
  } catch (error) {
    logError(`환경 설정 확인 실패: ${error.message}`);
    return false;
  }
}

async function getKakaoAuthUrl() {
  try {
    logInfo('2. 카카오 로그인 URL 생성 중...');
    const response = await axios.get(`${BASE_URL}/kakao/auth-url`);
    
    if (response.data.authUrl) {
      logSuccess('카카오 로그인 URL 생성 완료');
      log(`   URL: ${response.data.authUrl}`, 'cyan');
      logWarning('이 URL을 브라우저에서 열어 카카오 로그인을 진행하세요');
      logWarning('로그인 후 받은 인가 코드를 복사하여 다음 단계에서 사용하세요');
      
      return response.data.authUrl;
    }
    
    return null;
  } catch (error) {
    logError(`카카오 로그인 URL 생성 실패: ${error.message}`);
    return null;
  }
}

async function testKakaoCallback(code) {
  try {
    logInfo('3. 카카오 콜백 처리 테스트 중...');
    const response = await axios.get(`${BASE_URL}/kakao/callback?code=${code}`);
    
    if (response.data.success) {
      logSuccess('카카오 콜백 처리 성공');
      log(`   인가 코드: ${response.data.code}`, 'cyan');
      return true;
    }
    
    return false;
  } catch (error) {
    logError(`카카오 콜백 처리 실패: ${error.message}`);
    return false;
  }
}

async function testKakaoLogin(code) {
  try {
    logInfo('4. 카카오 로그인 API 테스트 중...');
    const response = await axios.post(`${BASE_URL}/kakao/login`, { code });
    
    if (response.data.success && response.data.token) {
      logSuccess('카카오 로그인 성공');
      log(`   사용자: ${response.data.user.nickname}`, 'cyan');
      log(`   이메일: ${response.data.user.email}`, 'cyan');
      log(`   신규 사용자: ${response.data.isNewUser}`, 'cyan');
      
      return response.data.token;
    }
    
    return null;
  } catch (error) {
    logError(`카카오 로그인 실패: ${error.message}`);
    if (error.response?.data?.error) {
      logError(`   상세 오류: ${error.response.data.error}`);
    }
    return null;
  }
}

async function testProfile(token) {
  try {
    logInfo('5. 사용자 프로필 조회 테스트 중...');
    const response = await axios.get(`${BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      logSuccess('프로필 조회 성공');
      log(`   사용자 ID: ${response.data.user.id}`, 'cyan');
      log(`   닉네임: ${response.data.user.nickname}`, 'cyan');
      log(`   마지막 로그인: ${response.data.user.last_login_at}`, 'cyan');
      return true;
    }
    
    return false;
  } catch (error) {
    logError(`프로필 조회 실패: ${error.message}`);
    if (error.response?.data?.error) {
      logError(`   상세 오류: ${error.response.data.error}`);
    }
    return false;
  }
}

async function testLogout() {
  try {
    logInfo('6. 로그아웃 테스트 중...');
    const response = await axios.post(`${BASE_URL}/logout`);
    
    if (response.data.success) {
      logSuccess('로그아웃 성공');
      return true;
    }
    
    return false;
  } catch (error) {
    logError(`로그아웃 실패: ${error.message}`);
    return false;
  }
}

// 메인 테스트 함수
async function runTests() {
  log('🚀 카카오 로그인 API 테스트 시작', 'bright');
  log('=' * 50, 'cyan');
  
  // 1. 환경 설정 확인
  const envOk = await testEnvironment();
  if (!envOk) {
    logError('환경 설정 확인 실패. 테스트를 중단합니다.');
    return;
  }
  
  // 2. 카카오 로그인 URL 생성
  const authUrl = await getKakaoAuthUrl();
  if (!authUrl) {
    logError('카카오 로그인 URL 생성 실패. 테스트를 중단합니다.');
    return;
  }
  
  // 3. 사용자 입력 대기
  logWarning('\n📝 다음 단계를 진행하려면:');
  logWarning('1. 위의 카카오 로그인 URL을 브라우저에서 열기');
  logWarning('2. 카카오 로그인 및 권한 동의');
  logWarning('3. 콜백 페이지에서 인가 코드 복사');
  logWarning('4. 아래에 인가 코드 입력');
  
  // 실제 테스트에서는 사용자 입력을 받아야 하지만,
  // 여기서는 예시 코드만 표시
  logInfo('\n💡 예시 인가 코드로 테스트 진행 (실제로는 사용자 입력 필요)');
  const exampleCode = 'example_authorization_code';
  
  // 4. 콜백 테스트
  const callbackOk = await testKakaoCallback(exampleCode);
  if (!callbackOk) {
    logError('콜백 처리 테스트 실패');
    return;
  }
  
  // 5. 로그인 테스트 (실제 코드가 필요)
  logWarning('\n⚠️  실제 인가 코드가 필요합니다. 위의 단계를 완료한 후 다시 실행하세요.');
  
  log('\n📋 테스트 완료 요약:', 'bright');
  log('✅ 환경 설정 확인', 'green');
  log('✅ 카카오 로그인 URL 생성', 'green');
  log('⚠️  실제 카카오 로그인 필요 (사용자 수동 진행)', 'yellow');
  log('⚠️  인가 코드 입력 필요', 'yellow');
  
  log('\n🔗 다음 단계:', 'bright');
  log('1. 브라우저에서 카카오 로그인 URL 열기');
  log('2. 카카오 로그인 및 권한 동의');
  log('3. 인가 코드 복사');
  log('4. 이 스크립트를 다시 실행하여 실제 로그인 테스트');
}

// 스크립트 실행
if (require.main === module) {
  runTests().catch(error => {
    logError(`테스트 실행 중 오류 발생: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testEnvironment,
  getKakaoAuthUrl,
  testKakaoCallback,
  testKakaoLogin,
  testProfile,
  testLogout
};
