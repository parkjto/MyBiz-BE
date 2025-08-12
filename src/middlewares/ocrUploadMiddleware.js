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
  limits: { fileSize: 5 * 1024 * 1024, files: 10 }, // 5MB, up to 10 files
  fileFilter
});

// Export array uploader middleware for field name 'files'
const uploadOcrImages = upload.array('files', 10);

module.exports = {
  uploadOcrImages,
  OCR_UPLOAD_DIR,
};


