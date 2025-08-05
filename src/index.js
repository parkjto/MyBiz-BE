require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

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

// Swagger API 문서
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MyBiz API Documentation'
}));

// API 라우트
const routes = require('./routes');
app.use('/api', routes);

// 루트 경로
app.get('/', (req, res) => {
  res.json({
    message: 'MyBiz Backend API',
    version: '2.0.0',
    status: 'running',
    description: '사용자 요청 플로우: 검색 → 리스트 → 선택 → DB 저장 → 리뷰 크롤링 → AI 분석',
    endpoints: {
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
        crawl: '/api/reviews/crawl'
      },
      sales: {
        list: '/api/sales',
        analyze: '/api/sales/analyze'
      }
    },
    flow: {
      step1: '매장 검색 (네이버 로컬 API)',
      step2: '매장 선택 및 DB 저장',
      step3: '리뷰 크롤링 (네이버 플레이스)',
      step4: 'AI 분석 (감성 분석, 키워드 추출)'
    }
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`[INFO] MyBiz Backend 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📚 API 문서: http://localhost:${PORT}/api-docs`);
  console.log(`🌐 서버 상태: http://localhost:${PORT}/`);
});

module.exports = app;