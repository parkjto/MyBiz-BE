import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { assertRequiredEnv } from './utils/checkEnv.js';
import swaggerUi from 'swagger-ui-express';

import authRoutes from './routes/authRoutes.js';
import scraperRoutes from './routes/scraperRoutes.js';
import reviewAnalysisRoutes from './routes/reviewAnalysisRoutes.js';
import storesRoutes from './routes/storesRoutes.js';
import naverLocalRoutes from './routes/naverLocalRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import adRoutes from './routes/adRoutes.js';

import { errorHandler } from './middlewares/errorHandler.js';
import { rateLimiter } from './middlewares/rateLimiter.js';
import swaggerSpec from './swagger/swagger.js';
import { logger } from './utils/logger.js';

dotenv.config();
assertRequiredEnv();

const app = express();

// Security & CORS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
// 정적 파일 서빙 (프로덕션용 - 필요한 경우에만)
// app.use(express.static('public'));

// Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Rate Limiter
app.use(rateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/reviews/analysis', reviewAnalysisRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/naver', naverLocalRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/ad', adRoutes);

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`🚀 [서버] http://localhost:${PORT}에서 실행 중`);
  logger.info(`📝 [API] 텍스트 기반 광고: POST /api/ad/generate`);
  logger.info(`🖼️ [API] 이미지 보정 전용: POST /api/ad/enhance-image`);
  logger.info(`🖼️ [API] 이미지 기반 광고: POST /api/ad/generate-from-image`);
  logger.info(`🖼️ [API] 이미지 업로드 + 보정 + 광고: POST /api/ad/generate-with-image`);
  logger.info(`💚 [API] 헬스체크: GET /health`);
  logger.info(`⚠️ [주의] 모든 데이터는 서버에 저장되지 않습니다!`);
  logger.info(`🔐 [API] 인증: /api/auth`);
  logger.info(`📊 [API] 스크래핑: /api/scraper`);
  logger.info(`📈 [API] 리뷰 분석: /api/reviews/analysis`);
  logger.info(`🏪 [API] 매장 관리: /api/stores`);
  logger.info(`🗺️ [API] 네이버 로컬: /api/naver`);
  logger.info(`💰 [API] 매출 관리: /api/sales`);
  logger.info(`📚 [API] API 문서: /api-docs`);
});
export default app;

