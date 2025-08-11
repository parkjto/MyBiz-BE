require('dotenv').config();
const testSupabase = require('./testSupabase');
const express = require('express');
const cors = require('cors');
<<<<<<< Updated upstream
const app = express();
const PORT = process.env.PORT || 3000;

// 환경설정
require('./config');

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
=======
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// 보안 미들웨어
app.use(helmet());

// Rate limiting 설정
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // IP당 최대 요청 수
  message: {
    error: '너무 많은 요청이 발생했습니다. 15분 후에 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 인증 관련 엔드포인트에 더 엄격한 rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 1000, // IP당 최대 1000회 로그인 시도
  message: {
    error: '로그인 시도가 너무 많습니다. 15분 후에 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api', limiter);

// 미들웨어
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  credentials: true
}));

// URL 인코딩 처리 미들웨어 추가
app.use((req, res, next) => {
  // 쿼리 파라미터 URL 디코딩
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        try {
          req.query[key] = decodeURIComponent(req.query[key]);
        } catch (error) {
          console.log(`[WARNING] URL 디코딩 실패 (${key}):`, error.message);
        }
      }
    });
  }
  next();
});

// Swagger JSON 스펙 제공
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpecs);
});

// Swagger API 문서 - 기본 설정으로 단순화
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MyBiz API Documentation'
}));

// API 라우트
const routes = require('./routes');
app.use('/api', routes);

// 404 에러 핸들러 (라우트 정의 후에 배치)
const { notFoundHandler } = require('./middlewares/errorMiddleware');
app.use(notFoundHandler);

// 전역 에러 핸들러 (마지막에 배치)
const { errorHandler } = require('./middlewares/errorMiddleware');
app.use(errorHandler);

// 루트 경로
app.get('/', (req, res) => {
  res.json({
    message: 'MyBiz Backend API',
    version: '2.0.0',
    status: 'running',
    description: '사용자 요청 플로우: 검색 → 리스트 → 선택 → DB 저장 → 리뷰 관리',
    endpoints: {
      auth: {
        kakaoAuthUrl: '/api/auth/kakao/auth-url',
        kakaoLogin: '/api/auth/kakao/login',
        kakaoCallback: '/api/auth/kakao/callback',
        profile: '/api/auth/profile',
        refresh: '/api/auth/refresh',
        logout: '/api/auth/logout'
      },
      stores: {
        // 전체 플로우 (통합 API)
        fullFlow: '/api/stores/full-flow',
        // 단계별 API
        searchStores: '/api/stores/search-stores',
        saveStore: '/api/stores/save-store',
        requestReviewAnalysis: '/api/stores/request-review-analysis',
        analyzeReviews: '/api/stores/analyze-reviews',
        // 기존 API
        search: '/api/stores/search',
        extractPlaceId: '/api/stores/extract-place-id',
        extractPlaceIdStatus: '/api/stores/extract-place-id/status',
        validatePlaceId: '/api/stores/validate-place-id',
        findWithSelection: '/api/stores/find-with-selection',
        manualPlaceIdCheck: '/api/stores/manual-place-id-check'
      },
      reviews: {
        list: '/api/reviews',
        create: '/api/reviews',
        update: '/api/reviews/:id',
        delete: '/api/reviews/:id'
      },
      sales: {
        list: '/api/sales',
        analyze: '/api/sales/analyze'
      }
    },
    flow: {
      step1: '매장 검색 (네이버 로컬 API)',
      step2: '매장 선택 및 DB 저장',
      step3: '리뷰 관리 (CRUD)',
      step4: '향후 새로운 기능 추가 예정'
    }
  });
>>>>>>> Stashed changes
});

// ...추가 라우트 및 기능 구현 예정...

app.listen(PORT, () => {
  console.log(`MyBiz 백엔드 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});