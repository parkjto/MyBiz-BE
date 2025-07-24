/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: 매출 분석 예시
 *     responses:
 *       200:
 *         description: 매출 분석 기능 (예시)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 매출 분석 기능 (예시)
 */

// 매출 관련 라우트
const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

router.get('/', salesController.getSales);

module.exports = router;
