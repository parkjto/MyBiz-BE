import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { strictRateLimiter } from '../middlewares/rateLimiter.js';
import { scrapeReviews, setSession, getScrapingJobStatus, getUserScrapingJobs } from '../controllers/scraperController.js';

const router = express.Router();

/**
 * @openapi
 * /api/scraper/reviews:
 *   post:
 *     summary: 리뷰 스크래핑 실행
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 스크래핑 결과
 */
router.post('/reviews', protect, strictRateLimiter, scrapeReviews);

/**
 * @openapi
 * /api/scraper/session:
 *   post:
 *     summary: 스크래핑 세션 설정
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
 *         description: 세션 설정 결과
 */
router.post('/session', protect, setSession);

/**
 * @openapi
 * /api/scraper/jobs/{jobId}:
 *   get:
 *     summary: 스크래핑 작업 상태 조회
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 작업 상태 조회 결과
 */
router.get('/jobs/:jobId', protect, getScrapingJobStatus);

/**
 * @openapi
 * /api/scraper/jobs/user/{userStoreId}:
 *   get:
 *     summary: 사용자의 스크래핑 작업 목록 조회
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userStoreId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 작업 목록 조회 결과
 */
router.get('/jobs/user/:userStoreId', protect, getUserScrapingJobs);

export default router;

