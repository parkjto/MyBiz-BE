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
import express from 'express';
const router = express.Router();
import salesController from '../controllers/salesController.js';

router.get('/', salesController.getSales);

export default router;
