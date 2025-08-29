import express from 'express';
import multer from 'multer';
import { analyzeAndAsk, downloadPoster, getPresets, getPurposePresets, generateSinglePoster, generateSingleComposite } from '../controllers/posterController.js';

const router = express.Router();

// 이미지 업로드(옵션) 설정: 토큰 절약 플로우에선 없어도 동작
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!file) return cb(null, true);
    if (file.mimetype?.startsWith('image/')) cb(null, true);
    else cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
  }
});

// Step 1: 분석(Optional) + 질문 반환
/**
 * @openapi
 * /api/posters/analyze-and-generate-posters:
 *   post:
 *     summary: 이미지 분석(선택) 후 질문/분석 반환
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 분석/질문 결과
 */
router.post('/analyze-and-generate-posters', upload.single('image'), analyzeAndAsk);

// Step 2: 4종 최종 생성
// 다운로드 프록시 (파일 저장 없이 바로 다운로드)
/**
 * @openapi
 * /api/posters/download:
 *   get:
 *     summary: 포스터 다운로드 프록시
 *     responses:
 *       200:
 *         description: 파일 스트림
 */
router.get('/download', downloadPoster);

// 프리셋 조회 (기존 호환성)
/**
 * @openapi
 * /api/posters/presets:
 *   get:
 *     summary: 포스터 프리셋 조회
 *     responses:
 *       200:
 *         description: 프리셋 목록
 */
router.get('/presets', getPresets);

// 포스터 용도별 프리셋 조회 (새로운 시스템)
/**
 * @openapi
 * /api/posters/purpose-presets:
 *   get:
 *     summary: 포스터 용도별 프리셋 조회
 *     responses:
 *       200:
 *         description: 용도별 프리셋 목록
 */
router.get('/purpose-presets', getPurposePresets);

// 단일 포스터(선택 무드/컬러 반영)
/**
 * @openapi
 * /api/posters/generate-single:
 *   post:
 *     summary: 단일 포스터 생성
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: 생성 결과
 */
router.post('/generate-single', generateSinglePoster);

// 단일 포스터 합성(원본 위 텍스트 오버레이) - Before/After 반환
const uploadComposite = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => file?.mimetype?.startsWith('image/') ? cb(null, true) : cb(new Error('이미지 파일만 업로드 가능합니다.'), false)
});
/**
 * @openapi
 * /api/posters/generate-single-composite:
 *   post:
 *     summary: 단일 합성 포스터 생성
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Before/After 및 결과
 */
router.post('/generate-single-composite', uploadComposite.single('image'), generateSingleComposite);

export default router;


