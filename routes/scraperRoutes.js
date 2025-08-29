import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { strictRateLimiter } from '../middlewares/rateLimiter.js';
import { scrapeReviews, setSession } from '../controllers/scraperController.js';

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

export default router;

