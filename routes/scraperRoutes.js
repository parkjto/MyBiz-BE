import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { strictRateLimiter } from '../middlewares/rateLimiter.js';
import { scrapeReviews, setSession } from '../controllers/scraperController.js';

const router = express.Router();

router.post('/reviews', protect, strictRateLimiter, scrapeReviews);
router.post('/session', protect, setSession);

export default router;

