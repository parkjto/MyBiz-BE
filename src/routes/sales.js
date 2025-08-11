/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: 매출 분석 및 AI 예측 관련 API
 */

/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: 매출 데이터 조회
 *     description: 매장의 매출 데이터를 조회합니다.
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 매출 데이터 조회 성공
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
 *                     $ref: '#/components/schemas/SalesData'
 *                 message:
 *                   type: string
 *                   example: "매출 데이터를 성공적으로 조회했습니다."
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
 * /api/sales/forecast:
 *   post:
 *     summary: AI 매출 예측
 *     description: AI를 활용하여 7일 매출을 예측합니다.
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - businessType
 *               - region
 *               - recentSales
 *             properties:
 *               businessType:
 *                 type: string
 *                 description: 업종
 *                 example: "치킨집"
 *               region:
 *                 type: string
 *                 description: 지역
 *                 example: "서울시 양천구"
 *               recentSales:
 *                 type: array
 *                 description: 최근 매출 데이터
 *                 items:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2024-01-15"
 *                     amount:
 *                       type: number
 *                       example: 150000
 *               userQuery:
 *                 type: string
 *                 description: 사용자 질문
 *                 example: "이번 달 매출 예측해줘"
 *     responses:
 *       200:
 *         description: 매출 예측 성공
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
 *                     sales_forecast:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                             example: "2024-01-16"
 *                           amount:
 *                             type: number
 *                             example: 145000
 *                 message:
 *                   type: string
 *                   example: "7일 매출 예측이 완료되었습니다."
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

// 매출 관련 라우트
const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

router.get('/', salesController.getSales);
router.post('/forecast', salesController.forecastSales);

module.exports = router;
