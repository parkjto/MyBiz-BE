// Jest 테스트 환경 설정
require('dotenv').config();

// 테스트용 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.KAKAO_CLIENT_ID = 'test_kakao_client_id';
process.env.KAKAO_REDIRECT_URI = 'http://localhost:3000/api/auth/kakao/callback';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test_supabase_anon_key';

// Express 앱 import (서버 시작 없이)
const app = require('../index');

// 테스트 환경에서 필요한 전역 설정
global.console = {
  ...console,
  // 테스트 중 불필요한 로그 출력 방지
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// 테스트 타임아웃 설정
jest.setTimeout(10000);

// Express 앱을 전역으로 export
module.exports = app;
