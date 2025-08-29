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
import naverCredentialRoutes from './routes/naverCredentialRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import adRoutes from './routes/adRoutes.js';
import posterRoutes from './routes/posterRoutes.js';
import adGenerationRoutes from './routes/adGenerationRoutes.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

import { errorHandler } from './middlewares/errorHandler.js';
import { rateLimiter } from './middlewares/rateLimiter.js';
import swaggerSpec from './swagger/swagger.js';
import { logger } from './utils/logger.js';
import naverSchedulerService from './services/naverSchedulerService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { attachRealtimeSpeechServer } from './services/realtimeSpeechServer.js';

dotenv.config();
assertRequiredEnv();

const app = express();

// Static assets (public)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

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

// CORS 설정 - 프론트엔드 연동을 위한 개선
const corsOptions = {
  origin: function (origin, callback) {
    // 개발 환경에서는 모든 origin 허용
    if (process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      // 프로덕션 환경에서는 특정 도메인만 허용
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS 정책에 의해 차단되었습니다.'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Total-Count']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // 이미지 업로드를 위한 용량 증가
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - Origin: ${req.get('Origin') || 'Unknown'}`);
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
app.use('/api/naver-credentials', naverCredentialRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/ad', adRoutes);
app.use('/api/posters', posterRoutes);
app.use('/api/ad-generation', adGenerationRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api', healthRoutes); // 헬스체크 및 이미지 분석 API

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  logger.info(`[서버] http://localhost:${PORT} 에서 실행 중`);
  logger.info(`[API] 텍스트 기반 광고: POST /api/ad/generate`);
  logger.info(`[API] 이미지 보정 전용: POST /api/ad/enhance-image`);
  logger.info(`[API] 이미지 기반 광고: POST /api/ad/generate-from-image`);
  logger.info(`[API] 이미지 업로드 + 보정 + 광고: POST /api/ad/generate-with-image`);
  logger.info(`[API] 이미지 분석: POST /api/analyze-image`);
  logger.info(`[API] 이미지 보정: POST /api/enhance-image`);
  logger.info(`[API] 이미지 진단: POST /api/diagnose-image`);
  logger.info(`[API] 헬스체크: GET /health`);
  logger.info(`[주의] 모든 데이터는 서버에 저장되지 않습니다!`);
  logger.info(`[API] 인증: /api/auth`);
  logger.info(`[API] 스크래핑: /api/scraper`);
  logger.info(`[API] 리뷰 분석: /api/reviews/analysis`);
  logger.info(`[API] 매장 관리: /api/stores`);
  logger.info(`[API] 네이버 로컬: /api/naver`);
  logger.info(`[API] 네이버 연동: /api/naver-credentials`);
  logger.info(`[API] 매출 관리: /api/sales`);
  logger.info(`[API] API 문서: /api-docs`);
  logger.info(`[API] 챗봇: /api/chatbot`);
  logger.info(`[CORS] 개발환경: 모든 origin 허용, 프로덕션: ${process.env.ALLOWED_ORIGINS || '설정 필요'}`);
  
  // 네이버 야간 자동 실행 스케줄러 시작
  try {
    naverSchedulerService.start();
    logger.info('네이버 야간 자동 실행 스케줄러 시작됨');
    logger.info('야간 자동 실행: 매일 새벽 2시');
    logger.info('연결 상태 확인: 매시간 정각');
  } catch (error) {
    logger.error('네이버 스케줄러 시작 실패:', error);
  }
  // WebSocket Speech server attach
  try {
    attachRealtimeSpeechServer(server);
  } catch (e) {
    logger.error('WebSocket Speech 서버 시작 실패:', e?.message);
  }
});
export default app;

