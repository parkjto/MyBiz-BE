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
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/reviews/crawling/ready:
 *   get:
 *     summary: 리뷰 크롤링 준비 상태 확인
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 크롤링 준비 상태 확인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     ready:
 *                       type: boolean
 *                       example: true
 *                     placeId:
 *                       type: string
 *                       example: "12345678"
 *                     storeName:
 *                       type: string
 *                       example: "매장명"
 *                     reviewUrl:
 *                       type: string
 *                       example: "https://pcmap.place.naver.com/place/12345678/review/visitor"
 *                     message:
 *                       type: string
 *                       example: "리뷰 크롤링 준비 완료"
 *
 * /api/reviews/crawling/start:
 *   post:
 *     summary: 리뷰 크롤링 시작
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 크롤링 시작 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "리뷰 크롤링이 시작되었습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     placeId:
 *                       type: string
 *                       example: "12345678"
 *                     storeName:
 *                       type: string
 *                       example: "매장명"
 *                     reviewUrl:
 *                       type: string
 *                       example: "https://pcmap.place.naver.com/place/12345678/review/visitor"
 *                     status:
 *                       type: string
 *                       example: "crawling_started"
 *
 * /api/reviews/crawled:
 *   get:
 *     summary: 크롤링된 리뷰 데이터 조회
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 크롤링된 리뷰 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     placeId:
 *                       type: string
 *                       example: "12345678"
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                     totalCount:
 *                       type: number
 *                       example: 0
 *                     lastCrawledAt:
 *                       type: string
 *                       example: null
 */

// 리뷰 크롤링 관련 API
router.get('/crawling/ready', authMiddleware.verifyToken, reviewsController.checkCrawlingReady);
router.post('/crawling/start', authMiddleware.verifyToken, reviewsController.startCrawling);
router.get('/crawled', authMiddleware.verifyToken, reviewsController.getCrawledReviews);

module.exports = router;
