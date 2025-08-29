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
/**
 * @openapi
 * /api/naver/status:
 *   get:
 *     summary: 네이버 API 상태 확인
 *     responses:
 *       200:
 *         description: 상태 정보
 */
router.get('/status', getApiStatus);

// 매장 검색 (인증 필요)
/**
 * @openapi
 * /api/naver/search:
 *   post:
 *     summary: 매장 검색
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
 *         description: 검색 결과
 */
router.post('/search', protect, rateLimiter, searchStores);

// 매장 검색 및 Place ID 추출 (인증 필요)
/**
 * @openapi
 * /api/naver/find-with-placeid:
 *   post:
 *     summary: 매장 검색 및 Place ID 추출
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
 *         description: 검색 + PlaceID 결과
 */
router.post('/find-with-placeid', protect, rateLimiter, findStoreWithPlaceId);

// 좌표 기반 매장 검색 (인증 필요)
/**
 * @openapi
 * /api/naver/find-by-coordinates:
 *   post:
 *     summary: 좌표 기반 매장 검색
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
 *         description: 좌표 기반 검색 결과
 */
router.post('/find-by-coordinates', protect, rateLimiter, findStoreByCoordinates);

// Place ID 추출 (인증 필요)
/**
 * @openapi
 * /api/naver/extract-placeid:
 *   post:
 *     summary: Place ID 추출
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
 *         description: Place ID 정보
 */
router.post('/extract-placeid', protect, rateLimiter, extractPlaceId);

export default router;
