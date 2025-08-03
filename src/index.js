require('dotenv').config();
const express = require('express');
const cors = require('cors');

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

// API 라우트
const routes = require('./routes');
app.use('/api', routes);

// 루트 경로
app.get('/', (req, res) => {
  res.json({
    message: 'MyBiz Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      stores: {
        search: '/api/stores/search',
        extractPlaceId: '/api/stores/extract-place-id',
        extractPlaceIdStatus: '/api/stores/extract-place-id/status',
        validatePlaceId: '/api/stores/validate-place-id'
      },
      reviews: {
        list: '/api/reviews',
        crawl: '/api/reviews/crawl'
      },
      sales: {
        list: '/api/sales',
        analyze: '/api/sales/analyze'
      }
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