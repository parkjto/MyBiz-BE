const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;

class ImageUploadService {
  constructor() {
    this.uploadDir = './uploads/scroll_captures';
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.maxFiles = 10;
    this.allowedExtensions = ['.jpg', '.jpeg', '.png'];
    
    this.initializeUploadDirectory();
    this.configureMulter();
  }

  /**
   * 업로드 디렉토리 초기화
   */
  async initializeUploadDirectory() {
    try {
      await fs.access(this.uploadDir);
    } catch (error) {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Multer 설정 구성
   */
  configureMulter() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${Date.now()}-${uuidv4()}${ext}`;
        cb(null, uniqueName);
      }
    });

    this.upload = multer({
      storage,
      limits: {
        fileSize: this.maxFileSize,
        files: this.maxFiles
      },
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (!this.allowedExtensions.includes(ext)) {
          return cb(new Error(`지원하지 않는 파일 형식입니다. 허용된 형식: ${this.allowedExtensions.join(', ')}`));
        }
        
        cb(null, true);
      }
    });
  }

  /**
   * 다중 이미지 업로드 처리
   */
  getUploadMiddleware() {
    return this.upload.array('images', this.maxFiles);
  }

  /**
   * 업로드된 파일 정보 정리
   */
  processUploadedFiles(files) {
    if (!files || files.length === 0) {
      throw new Error('업로드된 파일이 없습니다.');
    }

    return files.map(file => ({
      originalName: file.originalname,
      savedName: file.filename,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      uploadDate: new Date().toISOString()
    }));
  }

  /**
   * 파일 삭제
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('파일 삭제 실패:', error);
      return false;
    }
  }

  /**
   * 업로드 디렉토리 정리 (오래된 파일 삭제)
   */
  async cleanupOldFiles(maxAge = 24 * 60 * 60 * 1000) { // 기본 24시간
    try {
      const files = await fs.readdir(this.uploadDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await this.deleteFile(filePath);
        }
      }
    } catch (error) {
      console.error('파일 정리 중 오류:', error);
    }
  }
}

module.exports = new ImageUploadService();
