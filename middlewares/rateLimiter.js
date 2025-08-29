import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 15*60*1000,
  max: 100,
  message: { success: false, message: '너무 많은 요청입니다' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.ip,
  keyGenerator: (req) => req.ip || 'unknown'
});

export const strictRateLimiter = rateLimit({
  windowMs: 60*1000,
  max: 5,
  message: { success: false, message: '스크래핑 요청 한도 초과' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.ip,
  keyGenerator: (req) => req.ip || 'unknown'
});

