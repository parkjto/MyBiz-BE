import dotenv from 'dotenv';
dotenv.config();

// 파일 업로드 설정
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 20 * 1024 * 1024,
  MAX_FILES: parseInt(process.env.MAX_FILES) || 10
};

// OCR 서비스 설정
export const OCR_CONFIG = {
  THRESHOLD_VALUE: parseInt(process.env.OCR_THRESHOLD_VALUE) || 128,
  RESIZE_WIDTH: parseInt(process.env.OCR_RESIZE_WIDTH) || 1200,
  MAX_CHUNK_HEIGHT: parseInt(process.env.OCR_MAX_CHUNK_HEIGHT) || 1000,
  DELAY_BASE: parseInt(process.env.OCR_DELAY_BASE) || 1000
};

// 서버 설정
export const SERVER_CONFIG = {
  PORT: parseInt(process.env.PORT) || 3000,
  HOST: process.env.HOST || 'localhost'
};

console.log('[INFO] 상수 설정 로드 완료:', {
  upload: UPLOAD_CONFIG,
  ocr: OCR_CONFIG,
  server: SERVER_CONFIG
});
