import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import {
  searchStores,
  findStoreWithPlaceId,
  findStoreByCoordinates,
  extractPlaceId,
  getApiStatus
} from '../controllers/naverLocalController.js';

const router = express.Router();

// 네이버 API 상태 확인 (인증 불필요)
router.get('/status', getApiStatus);

// 매장 검색 (인증 필요)
router.post('/search', protect, rateLimiter, searchStores);

// 매장 검색 및 Place ID 추출 (인증 필요)
router.post('/find-with-placeid', protect, rateLimiter, findStoreWithPlaceId);

// 좌표 기반 매장 검색 (인증 필요)
router.post('/find-by-coordinates', protect, rateLimiter, findStoreByCoordinates);

// Place ID 추출 (인증 필요)
router.post('/extract-placeid', protect, rateLimiter, extractPlaceId);

export default router;
