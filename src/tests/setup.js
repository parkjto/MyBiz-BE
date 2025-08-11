// Jest 테스트 환경 설정
require('dotenv').config();

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
