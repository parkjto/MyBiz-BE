#!/usr/bin/env node

// 서버 시작 스크립트
const app = require('./index');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`MyBiz 백엔드 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  console.log(`Swagger 문서: http://localhost:${PORT}/api-docs`);
  console.log(`네이버 인증: /api/auth/naver/*`);
  console.log(`카카오 인증: /api/auth/kakao/*`);
});
