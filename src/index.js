require('dotenv').config();
const testSupabase = require('./testSupabase');
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// 기본 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// 라우트 분리
const routes = require('./routes');
app.use('/api', routes);

const storesRoutes = require('./routes/stores');
const adsRoutes = require('./routes/ads');
const salesRoutes = require('./routes/sales');
const reviewsRoutes = require('./routes/reviews');
const ocrRoutes = require('./routes/ocr');

// 분리된 인증 라우터 사용
const naverAuthRoutes = require('./routes/naverAuth');
const kakaoAuthRoutes = require('./routes/kakaoAuth');

// 기존 auth 라우터 (하위 호환성을 위해 유지)
const authRoutes = require('./routes/auth');

// 라우터 연결
app.use('/api/stores', storesRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/ocr', ocrRoutes);

// 분리된 인증 라우터 연결
app.use('/api/auth/naver', naverAuthRoutes);  // 네이버 인증: /api/auth/naver/*
app.use('/api/auth/kakao', kakaoAuthRoutes);  // 카카오 인증: /api/auth/kakao/*

// 기존 auth 라우터 (하위 호환성)
app.use('/api/auth', authRoutes);

// 헬스 체크 라우트
app.get('/', (req, res) => {
  res.send('MyBiz 백엔드 서버가 정상적으로 동작 중입니다!');
});

// Swagger API 문서화 설정 - config 파일 사용
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 공통 에러 처리 미들웨어
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

// ...추가 라우트 및 기능 구현 예정...

// Express 앱을 export (테스트용)
module.exports = app;

// 서버 시작은 직접 실행 시에만
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MyBiz 백엔드 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`Swagger 문서: http://localhost:${PORT}/api-docs`);
    console.log(`네이버 인증: /api/auth/naver/*`);
    console.log(`카카오 인증: /api/auth/kakao/*`);
  });
}