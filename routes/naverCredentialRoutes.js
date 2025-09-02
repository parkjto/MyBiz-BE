import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { strictRateLimiter } from '../middlewares/rateLimiter.js';
import { 
  setupNaverIntegration, 
  testNaverConnection, 
  getNaverIntegrationStatus,
  removeNaverIntegration
} from '../controllers/naverCredentialController.js';

const router = express.Router();

/**
 * 🚀 네이버 플레이스 연동 API 엔드포인트
 * 
 * 모든 엔드포인트는 인증이 필요하며, 속도 제한이 적용됩니다.
 */

// 네이버 플레이스 연동 설정 (로그인 정보 저장)
/**
 * @openapi
 * /api/naver-credentials/setup:
 *   post:
 *     summary: 네이버 플레이스 연동 설정(로그인 정보 저장)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: 설정 결과
 */
router.post('/setup', protect, strictRateLimiter, setupNaverIntegration);

// 네이버 연결 테스트 (저장된 정보로 로그인 테스트)
/**
 * @openapi
 * /api/naver-credentials/test/{userStoreId}:
 *   post:
 *     summary: 네이버 연결 테스트
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userStoreId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 연결 테스트 결과
 */
router.post('/test/:userStoreId', protect, strictRateLimiter, testNaverConnection);

// 네이버 플레이스 연동 상태 조회
/**
 * @openapi
 * /api/naver-credentials/status/{userStoreId}:
 *   get:
 *     summary: 네이버 플레이스 연동 상태 조회
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userStoreId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 연동 상태
 */
router.get('/status/:userStoreId', protect, strictRateLimiter, getNaverIntegrationStatus);

// 네이버 플레이스 연동 해제 (로그인 정보 삭제)
/**
 * @openapi
 * /api/naver-credentials/{userStoreId}:
 *   delete:
 *     summary: 네이버 플레이스 연동 해제
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userStoreId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 해제 결과
 */
router.delete('/:userStoreId', protect, strictRateLimiter, removeNaverIntegration);

export default router;
