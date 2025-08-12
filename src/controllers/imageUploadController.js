const imageUploadService = require('../services/imageUploadService');

class ImageUploadController {
  /**
   * 스크롤 캡처 이미지 업로드 처리
   * POST /api/upload/scroll-captures
   */
  async uploadScrollCaptures(req, res) {
    try {
      // 파일 업로드 검증
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: '최소 1장 이상의 이미지 파일이 필요합니다.',
          code: 'NO_FILES_UPLOADED'
        });
      }

      // 업로드된 파일 정보 처리
      const uploadedFiles = imageUploadService.processUploadedFiles(req.files);

      // 성공 응답
      res.status(200).json({
        success: true,
        message: '이미지 업로드가 완료되었습니다.',
        data: {
          uploadedFiles,
          totalCount: uploadedFiles.length,
          uploadDate: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('이미지 업로드 처리 중 오류:', error);
      
      res.status(500).json({
        success: false,
        error: '이미지 업로드 처리 중 오류가 발생했습니다.',
        code: 'UPLOAD_PROCESSING_ERROR',
        details: error.message
      });
    }
  }

  /**
   * 업로드된 이미지 목록 조회
   * GET /api/upload/scroll-captures
   */
  async getUploadedImages(req, res) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const uploadDir = './uploads/scroll_captures';
      const files = await fs.readdir(uploadDir);
      
      const imageFiles = [];
      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        const stats = await fs.stat(filePath);
        
        imageFiles.push({
          filename: file,
          path: filePath,
          size: stats.size,
          uploadDate: stats.mtime.toISOString()
        });
      }

      res.status(200).json({
        success: true,
        data: {
          images: imageFiles,
          totalCount: imageFiles.length
        }
      });

    } catch (error) {
      console.error('이미지 목록 조회 중 오류:', error);
      
      res.status(500).json({
        success: false,
        error: '이미지 목록 조회 중 오류가 발생했습니다.',
        code: 'LIST_FETCH_ERROR'
      });
    }
  }

  /**
   * 특정 이미지 삭제
   * DELETE /api/upload/scroll-captures/:filename
   */
  async deleteImage(req, res) {
    try {
      const { filename } = req.params;
      const filePath = `./uploads/scroll_captures/${filename}`;
      
      const deleted = await imageUploadService.deleteFile(filePath);
      
      if (deleted) {
        res.status(200).json({
          success: true,
          message: '이미지가 성공적으로 삭제되었습니다.',
          data: { deletedFilename: filename }
        });
      } else {
        res.status(404).json({
          success: false,
          error: '파일을 찾을 수 없거나 삭제할 수 없습니다.',
          code: 'FILE_NOT_FOUND_OR_DELETE_FAILED'
        });
      }

    } catch (error) {
      console.error('이미지 삭제 중 오류:', error);
      
      res.status(500).json({
        success: false,
        error: '이미지 삭제 중 오류가 발생했습니다.',
        code: 'DELETE_ERROR'
      });
    }
  }

  /**
   * 업로드 통계 정보
   * GET /api/upload/scroll-captures/stats
   */
  async getUploadStats(req, res) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const uploadDir = './uploads/scroll_captures';
      const files = await fs.readdir(uploadDir);
      
      let totalSize = 0;
      const fileTypes = {};
      
      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        const stats = await fs.stat(filePath);
        const ext = path.extname(file).toLowerCase();
        
        totalSize += stats.size;
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
      }

      res.status(200).json({
        success: true,
        data: {
          totalFiles: files.length,
          totalSize: totalSize,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
          fileTypes,
          uploadDirectory: uploadDir
        }
      });

    } catch (error) {
      console.error('업로드 통계 조회 중 오류:', error);
      
      res.status(500).json({
        success: false,
        error: '업로드 통계 조회 중 오류가 발생했습니다.',
        code: 'STATS_FETCH_ERROR'
      });
    }
  }
}

module.exports = new ImageUploadController();
