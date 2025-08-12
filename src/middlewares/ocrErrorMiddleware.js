const multer = require('multer');

/**
 * /api/ocr 전용 에러 처리 미들웨어
 * 명세에 따른 에러 코드/HTTP 상태 매핑
 */
module.exports = function ocrErrorMiddleware(err, _req, res, next) {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ code: 'ERR_FILE_SIZE', error: '5MB 초과', message: '파일 크기 제한(5MB)을 초과했습니다.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ code: 'ERR_FILE_COUNT', error: '파일 개수 초과', message: '파일 개수 제한(10장)을 초과했습니다.' });
    }
    return res.status(400).json({ code: 'MULTER_ERROR', error: err.message });
  }

  if (err.code === 'ERR_FILE_TYPE') {
    return res.status(400).json({ code: 'ERR_FILE_TYPE', error: '허용되지 않는 확장자', message: 'png, jpg, jpeg만 허용됩니다.' });
  }

  if (err.code === 'ERR_OCR_FAIL') {
    return res.status(500).json({ code: 'ERR_OCR_FAIL', error: 'OCR 실패', message: err.message });
  }

  if (err.code === 'ERR_NLP_FAIL') {
    return res.status(502).json({ code: 'ERR_NLP_FAIL', error: '감정 분석 실패', message: err.message });
  }

  if (err.code === 'ERR_NO_FILES') {
    return res.status(400).json({ code: 'ERR_NO_FILES', error: '파일 미첨부', message: '최소 1개 이상의 파일이 필요합니다.' });
  }

  return next(err);
};


