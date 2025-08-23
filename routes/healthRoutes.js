import { Router } from 'express';

const router = Router();

/**
 * 서버 상태 확인
 * GET /health
 */
router.get('/health', (_req, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * API 상태 확인
 * GET /api/health
 */
router.get('/api/health', (_req, res) => {
  res.json({ 
    ok: true, 
    message: 'API 서버 정상 동작 중',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;
