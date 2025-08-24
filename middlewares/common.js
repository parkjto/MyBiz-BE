import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

/**
 * 공통 미들웨어 적용
 * @param {Express} app - Express 앱 인스턴스
 */
export function applyCommon(app) {
  // CORS 설정
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
  }));

  // 보안 헤더 설정
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // 압축 설정
  app.use(compression({
    level: 6,
    threshold: 1024
  }));

  // 레이트 리밋 설정
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1분
    max: 60, // 분당 60요청
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.'
    }
  });
  app.use(limiter);

  // API 전용 레이트 리밋 (더 엄격)
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1분
    max: 30, // 분당 30요청
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      message: 'API 요청 한도를 초과했습니다.'
    }
  });
  app.use('/api/', apiLimiter);
}
