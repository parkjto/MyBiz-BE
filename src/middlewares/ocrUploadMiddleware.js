const multer = require('multer');
const path = require('path');
const fs = require('fs');

const OCR_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'ocr');

// Ensure upload directory exists at startup
if (!fs.existsSync(OCR_UPLOAD_DIR)) {
  fs.mkdirSync(OCR_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, OCR_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9-_\.]/g, '_');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = ['.png', '.jpg', '.jpeg'];
  if (!allowed.includes(ext)) {
    const err = new Error('ERR_FILE_TYPE');
    err.code = 'ERR_FILE_TYPE';
    return cb(err);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 5 }, // 20MB, up to 5 files
  fileFilter
});

// Export array uploader middleware for field name 'files'
const uploadOcrImages = upload.array('files', 5);

/**
 * OCR 처리 후 1시간 자동 삭제 스케줄러
 */
const scheduleImageCleanup = (filePath) => {
  const ONE_HOUR = 60 * 60 * 1000; // 1시간 (밀리초)
  
  setTimeout(async () => {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`🔄 OCR 이미지 자동 삭제 완료: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.error(`❌ OCR 이미지 자동 삭제 실패: ${path.basename(filePath)}`, error.message);
    }
  }, ONE_HOUR);
};

/**
 * 업로드된 이미지들에 대해 자동 삭제 스케줄링
 */
const scheduleCleanupForUploadedFiles = (files) => {
  if (!files || files.length === 0) return;
  
  files.forEach(file => {
    scheduleImageCleanup(file.path);
  });
};

module.exports = {
  uploadOcrImages,
  OCR_UPLOAD_DIR,
  scheduleCleanupForUploadedFiles,
};


