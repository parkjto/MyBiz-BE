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
const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');

router.get('/', reviewsController.getReviews);

module.exports = router;
