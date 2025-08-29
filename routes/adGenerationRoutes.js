import express from 'express';
import multer from 'multer';
import {
  getAdPurposePresets,
  analyzeImageForAd,
  optimizeTextForAd,
  generateAdDesign,
  generateCompleteAd,
  downloadAd
} from '../controllers/adGenerationController.js';

const router = express.Router();

// 이미지 업로드 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 15 * 1024 * 1024, // 15MB
    files: 1 
  },
  fileFilter: (req, file, cb) => {
    if (!file) return cb(null, true);
    if (file.mimetype?.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
  }
});

// 광고 목적별 프리셋 조회
/**
 * @openapi
 * /api/ad-generation/purpose-presets:
 *   get:
 *     summary: 광고 목적별 프리셋 조회
 *     responses:
 *       200:
 *         description: 목적 프리셋 목록
 */
router.get('/purpose-presets', getAdPurposePresets);

// 1단계: 이미지 분석만 수행
/**
 * @openapi
 * /api/ad-generation/analyze-image:
 *   post:
 *     summary: 광고 1단계 - 이미지 분석
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
 *         description: 분석 결과
 */
router.post('/analyze-image', upload.single('image'), analyzeImageForAd);

// 2단계: 텍스트 최적화만 수행
/**
 * @openapi
 * /api/ad-generation/optimize-text:
 *   post:
 *     summary: 광고 2단계 - 텍스트 최적화
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: 최적화 결과
 */
router.post('/optimize-text', optimizeTextForAd);

// 3단계: 디자인 생성만 수행
/**
 * @openapi
 * /api/ad-generation/generate-design:
 *   post:
 *     summary: 광고 3단계 - 디자인 생성
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: 디자인 생성 결과
 */
router.post('/generate-design', generateAdDesign);

// 통합 광고 생성 (3단계 전체 프로세스)
/**
 * @openapi
 * /api/ad-generation/generate-complete:
 *   post:
 *     summary: 광고 통합 생성(이미지 업로드 포함)
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
 *         description: 통합 생성 결과
 */
router.post('/generate-complete', upload.single('image'), generateCompleteAd);

// 광고 다운로드 프록시
/**
 * @openapi
 * /api/ad-generation/download:
 *   get:
 *     summary: 광고 다운로드 프록시
 *     responses:
 *       200:
 *         description: 파일 스트림
 */
router.get('/download', downloadAd);

export default router;
