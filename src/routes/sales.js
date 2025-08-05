/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: 매출 분석 관련 API
 */

/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: 매출 데이터 목록 조회
 *     description: 저장된 매출 데이터 목록을 조회합니다.
 *     tags: [Sales]
 *     parameters:
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: integer
 *         description: 매장 ID로 필터링
 *         example: 1
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 시작 날짜 (YYYY-MM-DD)
 *         example: "2024-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 종료 날짜 (YYYY-MM-DD)
 *         example: "2024-01-31"
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
 *                 total:
 *                   type: integer
 *                   example: 10
 *                 message:
 *                   type: string
 *                   example: "10개의 매출 데이터를 조회했습니다."
 *       400:
 *         description: 잘못된 요청
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

module.exports = router;
