/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: 고객 감정 분석 예시
 *     responses:
 *       200:
 *         description: 고객 감정 분석 기능 (예시)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 고객 감정 분석 기능 (예시)
 */

// 리뷰 관련 라우트
import express from 'express';
const router = express.Router();
import reviewsController from '../controllers/reviewsController.js';

router.get('/', reviewsController.getReviews);

export default router;
