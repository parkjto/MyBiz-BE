/**
 * @swagger
<<<<<<< Updated upstream
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
=======
 * tags:
 *   name: Reviews
 *   description: 리뷰 관련 API
>>>>>>> Stashed changes
 */

// 리뷰 관련 라우트
const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');

<<<<<<< Updated upstream
router.get('/', reviewsController.getReviews);

=======
// 기본 리뷰 CRUD 라우트
/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: 리뷰 목록 조회
 *     tags: [Reviews]
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
 *                   type: object
 *                   properties:
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                     totalCount:
 *                       type: integer
 *                       example: 0
 *                 message:
 *                   type: string
 *                   example: "리뷰 목록이 조회되었습니다."
 */
router.get('/', reviewsController.getReviews);

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: 리뷰 생성
 *     tags: [Reviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - rating
 *               - storeId
 *             properties:
 *               content:
 *                 type: string
 *                 description: 리뷰 내용
 *                 example: "맛있고 서비스가 좋았습니다."
 *               rating:
 *                 type: number
 *                 description: 평점 (1-5)
 *                 example: 5
 *               storeId:
 *                 type: string
 *                 description: 매장 ID
 *                 example: "store_123"
 *     responses:
 *       201:
 *         description: 리뷰 생성 성공
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
 *                     id:
 *                       type: string
 *                       example: "1705312345678"
 *                     content:
 *                       type: string
 *                       example: "맛있고 서비스가 좋았습니다."
 *                     rating:
 *                       type: number
 *                       example: 5
 *                     storeId:
 *                       type: string
 *                       example: "store_123"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T22:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "리뷰가 성공적으로 생성되었습니다."
 */
router.post('/', reviewsController.createReview);

/**
 * @swagger
 * /api/reviews/{id}:
 *   put:
 *     summary: 리뷰 수정
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 리뷰 ID
 *         example: "1705312345678"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: 수정할 리뷰 내용
 *                 example: "수정된 리뷰 내용입니다."
 *               rating:
 *                 type: number
 *                 description: 수정할 평점 (1-5)
 *                 example: 4
 *     responses:
 *       200:
 *         description: 리뷰 수정 성공
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
 *                     id:
 *                       type: string
 *                       example: "1705312345678"
 *                     content:
 *                       type: string
 *                       example: "수정된 리뷰 내용입니다."
 *                     rating:
 *                       type: number
 *                       example: 4
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T22:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "리뷰가 성공적으로 수정되었습니다."
 */
router.put('/:id', reviewsController.updateReview);

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: 리뷰 삭제
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 리뷰 ID
 *         example: "1705312345678"
 *     responses:
 *       200:
 *         description: 리뷰 삭제 성공
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
 *                     id:
 *                       type: string
 *                       example: "1705312345678"
 *                     deleted:
 *                       type: boolean
 *                       example: true
 *                     deletedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T22:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "리뷰가 성공적으로 삭제되었습니다."
 */
router.delete('/:id', reviewsController.deleteReview);

>>>>>>> Stashed changes
module.exports = router;
