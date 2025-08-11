/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: 리뷰 분석 및 감정 분석 관련 API
 */

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: 리뷰 목록 조회
 *     description: 매장의 리뷰 목록을 조회합니다.
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: 매장 ID
 *         example: "store-uuid-here"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 조회할 리뷰 수
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 건너뛸 리뷰 수
 *     responses:
 *       200:
 *         description: 리뷰 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Review'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     offset:
 *                       type: integer
 *                       example: 0
 *                     hasMore:
 *                       type: boolean
 *                       example: true
 *                 message:
 *                   type: string
 *                   example: "리뷰를 성공적으로 조회했습니다."
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/reviews/analyze:
 *   post:
 *     summary: 리뷰 감정 분석
 *     description: AI를 활용하여 리뷰의 감정과 키워드를 분석합니다.
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: 분석할 리뷰 내용
 *                 example: "음식이 맛있고 서비스도 친절해요!"
 *               language:
 *                 type: string
 *                 default: "ko"
 *                 description: "리뷰 언어 (ko: 한국어, en: 영어, ja: 일본어, zh: 중국어)"
 *     responses:
 *       200:
 *         description: 감정 분석 성공
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
 *                     sentiment:
 *                       type: string
 *                       description: 감정 분석 결과
 *                       example: "positive"
 *                     confidence:
 *                       type: number
 *                       description: 분석 신뢰도 (0-1)
 *                       example: 0.95
 *                     keywords:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 추출된 키워드
 *                       example: ["맛있음", "친절", "서비스"]
 *                     summary:
 *                       type: string
 *                       description: 분석 요약
 *                       example: "전반적으로 긍정적인 리뷰입니다."
 *                 message:
 *                   type: string
 *                   example: "감정 분석이 완료되었습니다."
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/reviews/batch-analyze:
 *   post:
 *     summary: 리뷰 일괄 감정 분석
 *     description: 여러 리뷰를 일괄적으로 감정 분석합니다.
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reviews
 *             properties:
 *               reviews:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 리뷰 ID
 *                       example: "review-uuid-here"
 *                     content:
 *                       type: string
 *                       description: 리뷰 내용
 *                       example: "음식이 맛있고 서비스도 친절해요!"
 *     responses:
 *       200:
 *         description: 일괄 분석 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "review-uuid-here"
 *                       sentiment:
 *                         type: string
 *                         example: "positive"
 *                       confidence:
 *                         type: number
 *                         example: 0.95
 *                       keywords:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["맛있음", "친절", "서비스"]
 *                 message:
 *                   type: string
 *                   example: "일괄 감정 분석이 완료되었습니다."
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// 리뷰 관련 라우트
const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');

router.get('/', reviewsController.getReviews);
router.post('/analyze', reviewsController.analyzeReview);
router.post('/batch-analyze', reviewsController.batchAnalyzeReviews);

module.exports = router;
