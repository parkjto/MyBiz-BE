import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadCsv, monthlySummary, categorySummary, bestsellers, highlights, profitability, salesByHour, salesByWeekday, weeklyByMonth, monthSummary } from '../controllers/salesController.js';
import { z } from 'zod';

const router = express.Router();
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({
  dest: uploadDir + '/',
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

const querySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

/**
 * @openapi
 * /api/sales/upload:
 *   post:
 *     summary: 매출 CSV 업로드
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 업로드 결과
 */
router.post('/upload', protect, upload.single('file'), uploadCsv);

/**
 * @openapi
 * /api/sales/monthly:
 *   get:
 *     summary: 월별 매출 합계
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 월별 합계 목록
 */
router.get('/monthly', protect, (req, res, next) => {
  try { querySchema.parse(req.query); next(); } catch (e) { return res.status(400).json({ success: false, message: '유효하지 않은 쿼리', errors: e?.issues }); }
}, monthlySummary);

/**
 * @openapi
 * /api/sales/category:
 *   get:
 *     summary: 카테고리 매출 비중
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 카테고리 합계 및 비중
 */
router.get('/category', protect, (req, res, next) => {
  try { querySchema.parse(req.query); next(); } catch (e) { return res.status(400).json({ success: false, message: '유효하지 않은 쿼리', errors: e?.issues }); }
}, categorySummary);

/**
 * @openapi
 * /api/sales/bestsellers:
 *   get:
 *     summary: 베스트셀러 상위 N
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 베스트셀러 목록
 */
router.get('/bestsellers', protect, (req, res, next) => {
  try { querySchema.parse(req.query); next(); } catch (e) { return res.status(400).json({ success: false, message: '유효하지 않은 쿼리', errors: e?.issues }); }
}, bestsellers);

/**
 * @openapi
 * /api/sales/highlights:
 *   get:
 *     summary: 하이라이트 인사이트
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 총매출/최대성장/Top3/시즌항목 등
 */
router.get('/highlights', protect, (req, res, next) => {
  try { querySchema.parse(req.query); next(); } catch (e) { return res.status(400).json({ success: false, message: '유효하지 않은 쿼리', errors: e?.issues }); }
}, highlights);

/**
 * @openapi
 * /api/sales/profitability:
 *   get:
 *     summary: 수익성(ROI) 분석
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *       - in: query
 *         name: rate
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: 메뉴별 매출/추정이익/기여도
 */
router.get('/profitability', protect, (req, res, next) => {
  try { querySchema.parse(req.query); next(); } catch (e) { return res.status(400).json({ success: false, message: '유효하지 않은 쿼리', errors: e?.issues }); }
}, profitability);

/**
 * @openapi
 * /api/sales/time-of-day:
 *   get:
 *     summary: 시간대별 매출
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 0~23시 매출 합계
 */
router.get('/time-of-day', protect, (req, res, next) => {
  try { querySchema.parse(req.query); next(); } catch (e) { return res.status(400).json({ success: false, message: '유효하지 않은 쿼리', errors: e?.issues }); }
}, salesByHour);

/**
 * @openapi
 * /api/sales/weekday:
 *   get:
 *     summary: 요일별 매출
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sun~Sat 매출 합계
 */
router.get('/weekday', protect, (req, res, next) => {
  try { querySchema.parse(req.query); next(); } catch (e) { return res.status(400).json({ success: false, message: '유효하지 않은 쿼리', errors: e?.issues }); }
}, salesByWeekday);

/**
 * @openapi
 * /api/sales/weekly-by-month:
 *   get:
 *     summary: 특정 연/월의 1~6주차 매출 합계
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 주차별 합계와 전월 대비 증감률 포함
 */
router.get('/weekly-by-month', protect, weeklyByMonth);

/**
 * @openapi
 * /api/sales/month-summary:
 *   get:
 *     summary: 특정 연/월의 총매출 및 전월 대비 증감률
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 총매출과 MoM 증감률
 */
router.get('/month-summary', protect, monthSummary);

export default router;


