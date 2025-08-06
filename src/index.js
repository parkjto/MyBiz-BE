require('dotenv').config();
const testSupabase = require('./testSupabase');
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// 환경설정
require('./config');

const logger = require('./middlewares/loggerMiddleware');
const auth = require('./middlewares/authMiddleware');

// 기본 미들웨어 설정
app.use(logger); // 요청 로깅
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// 라우트 분리
const routes = require('./routes');
app.use('/api', routes);

const adsRoutes = require('./routes/ads');
const salesRoutes = require('./routes/sales');
const reviewsRoutes = require('./routes/reviews');
const authRoutes = require('./routes/auth'); // auth 라우트 추가

// 인증 미들웨어는 예시로 /api/sales에만 적용
app.use('/api/ads', adsRoutes);
app.use('/api/sales', auth, salesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/auth', authRoutes); // auth 라우트 연결

// 헬스 체크 라우트
app.get('/', (req, res) => {
  res.send('MyBiz 백엔드 서버가 정상적으로 동작 중입니다!');
});

// Swagger API 문서화 설정
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MyBiz API',
      version: '1.0.0',
      description: 'MyBiz 소상공인 AI 백엔드 API 문서'
    },
    servers: [
      { url: 'http://localhost:' + PORT }
    ]
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 공통 에러 처리 미들웨어
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

// ...추가 라우트 및 기능 구현 예정...

app.listen(PORT, () => {
  console.log(`MyBiz 백엔드 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});

app.get('/logout', (req, res) => {
  res.send('MyBiz 로그아웃이 정상적으로 작동되었습니다!');
});