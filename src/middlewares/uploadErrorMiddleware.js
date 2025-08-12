const multer = require('multer');

/**
 * 이미지 업로드 에러 처리 미들웨어
 * multer 에러와 일반 업로드 에러를 구분하여 처리
 */
const uploadErrorHandler = (err, req, res, next) => {
  // Multer 에러 처리
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: '파일 크기 제한(10MB)을 초과했습니다.',
          code: 'FILE_SIZE_LIMIT_EXCEEDED',
          details: {
            maxSize: '10MB',
            actualSize: err.message
          }
        });

      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: '파일 개수 제한(10장)을 초과했습니다.',
          code: 'FILE_COUNT_LIMIT_EXCEEDED',
          details: {
            maxCount: 10,
            actualCount: err.message
          }
        });

      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: '예상하지 못한 파일 필드가 감지되었습니다.',
          code: 'UNEXPECTED_FILE_FIELD',
          details: {
            field: err.field
          }
        });

      default:
        return res.status(400).json({
          success: false,
          error: '파일 업로드 중 오류가 발생했습니다.',
          code: 'MULTER_ERROR',
          details: err.message
        });
    }
  }

  // 파일 형식 에러 처리
  if (err.message && err.message.includes('지원하지 않는 파일 형식')) {
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'UNSUPPORTED_FILE_FORMAT',
      details: {
        allowedFormats: ['.jpg', '.jpeg', '.png'],
        message: 'JPG, JPEG, PNG 형식만 지원됩니다.'
      }
    });
  }

  // 기타 업로드 관련 에러
  if (err.message && err.message.includes('업로드')) {
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'UPLOAD_ERROR',
      details: {
        message: err.message
      }
    });
  }

  // 알 수 없는 에러는 다음 미들웨어로 전달
  next(err);
};

module.exports = uploadErrorHandler;
