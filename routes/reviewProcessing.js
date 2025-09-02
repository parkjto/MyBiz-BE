import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  integratedReviewFlow,
  batchReviewProcessing,
  getProcessedReviews,
  getProcessingStatus,
  getProcessingStats
} from '../controllers/reviewProcessingController.js';

// 🎯 상수 설정 import 추가
import { UPLOAD_CONFIG } from '../config/constants.js';

const router = Router();

// 🎯 Multer 설정 (파일 업로드)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/reviews/';
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
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('허용되지 않는 파일 형식입니다. PNG, JPG, JPEG, WebP만 허용됩니다.'), false);
  }
};

// 🎯 Multer 인스턴스 생성
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
    files: UPLOAD_CONFIG.MAX_FILES
  }
});

// 🎯 단일 파일 업로드 (통합 플로우용)
const singleUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE
  }
});

// 🎯 통합 리뷰 처리 플로우 (이미지 업로드 → GPT → DB 저장)
router.post('/integrated-flow', singleUpload.single('image'), integratedReviewFlow);

// 🎯 배치 리뷰 처리 (여러 이미지 동시 처리)
router.post('/batch', upload.array('images', UPLOAD_CONFIG.MAX_FILES), batchReviewProcessing);

// 🎯 처리된 리뷰 조회
router.get('/reviews/:storeId', getProcessedReviews);

// 🎯 리뷰 처리 상태 확인
router.get('/status', getProcessingStatus);

// 🎯 리뷰 처리 통계 조회
router.get('/stats/:storeId', getProcessingStats);

export default router;
