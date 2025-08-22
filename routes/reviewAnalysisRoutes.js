import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { analyzeReview } from '../controllers/reviewAnalysisController.js';

const router = express.Router();

// 리뷰 하나를 분석하여 review_analysis에 upsert
router.post('/analyze', protect, analyzeReview);

export default router;

