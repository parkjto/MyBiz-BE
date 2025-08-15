const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// 🎯 OCR 컨트롤러 import
const {
  processReviewImages,
  getOcrResult,
  getOcrConfig,
  optimizeGrayText,
  testGrayTextOptimization,
  getOcrStatus
} = require('../controllers/ocrController');

// 🎯 Multer 설정 (파일 업로드)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    // 🎯 업로드 디렉토리가 없으면 생성
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 🎯 안전한 파일명 생성 (UUID + 원본 확장자)
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// 🎯 파일 필터링 (이미지 파일만 허용)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('허용되지 않는 파일 형식입니다. PNG, JPG, JPEG만 허용됩니다.'), false);
  }
};

// 🎯 Multer 인스턴스 생성
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 🎯 20MB 제한
    files: 10 // 🎯 최대 10개 파일
  }
});

// 🎯 단일 파일 업로드 (테스트용)
const singleUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 🎯 20MB 제한
  }
});

/**
 * 🎯 OCR 메인 엔드포인트
 * POST /api/ocr/reviews
 * 여러 이미지 파일을 받아서 OCR 처리
 */
router.post('/reviews', upload.array('images', 10), async (req, res, next) => {
  try {
    await processReviewImages(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * 🎯 OCR 결과 조회
 * GET /api/ocr/reviews/:id
 * 특정 OCR 결과 조회
 */
router.get('/reviews/:id', async (req, res, next) => {
  try {
    await getOcrResult(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * 🎯 OCR 설정 조회
 * GET /api/ocr/config
 * 현재 OCR 설정값들 조회
 */
router.get('/config', async (req, res, next) => {
  try {
    await getOcrConfig(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * 🎯 회색 글씨 최적화 설정
 * POST /api/ocr/optimize-gray-text
 * 회색 연한 글씨 인식을 위한 전처리 설정 업데이트
 */
router.post('/optimize-gray-text', async (req, res, next) => {
  try {
    await optimizeGrayText(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * 🎯 회색 글씨 최적화 테스트
 * POST /api/ocr/test-gray-text
 * 회색 글씨 최적화 설정을 테스트
 */
router.post('/test-gray-text', singleUpload.single('image'), async (req, res, next) => {
  try {
    await testGrayTextOptimization(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * 🎯 OCR 서비스 상태 확인
 * GET /api/ocr/status
 * OCR 서비스 상태 및 워커 풀 정보 확인
 */
router.get('/status', async (req, res, next) => {
  try {
    await getOcrStatus(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * 🎯 OCR 테스트 엔드포인트
 * GET /api/ocr/test
 * OCR 서비스가 정상 작동하는지 확인
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'OCR 서비스가 정상 작동 중입니다',
    timestamp: new Date().toISOString(),
    service: 'Tesseract.js OCR',
    version: '2.0.0'
  });
});

module.exports = router;


