import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { analyzeReview } from '../controllers/reviewAnalysisController.js';

const router = express.Router();

// 리뷰 하나를 분석하여 review_analysis에 upsert
/**
 * @openapi
 * /api/reviews/analysis/analyze:
 *   post:
 *     summary: 리뷰 분석 및 upsert
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: 분석 결과
 */
router.post('/analyze', protect, analyzeReview);

export default router;

