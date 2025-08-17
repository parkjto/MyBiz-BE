// 광고 관련 라우트
import express from 'express';
const router = express.Router();
import adsController from '../controllers/adsController.js';

/**
 * @swagger
 * /api/ads:
 *   get:
 *     summary: 광고 자동 생성 예시
 *     responses:
 *       200:
 *         description: 광고 자동 생성 기능 (예시)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 광고 자동 생성 기능 (예시)
 */

router.get('/', adsController.getAds);

export default router;
