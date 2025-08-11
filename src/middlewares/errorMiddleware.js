/**
 * 전역 에러 처리 미들웨어
 * 모든 라우트에서 발생하는 에러를 중앙에서 처리
 */
const errorHandler = (err, req, res, next) => {
  // 에러 로깅
  console.error('[ERROR]', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      name: err.name
    }
  });

  // JWT 관련 에러
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: '유효하지 않은 토큰입니다.',
      code: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: '토큰이 만료되었습니다.',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Supabase 관련 에러
  if (err.code === 'PGRST116') {
    return res.status(400).json({
      error: '데이터베이스 제약 조건 위반',
      code: 'DB_CONSTRAINT_VIOLATION'
    });
  }

  // Axios 에러 (외부 API 호출 실패)
  if (err.isAxiosError) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.msg || err.message || '외부 API 호출 실패';
    
    return res.status(status).json({
      error: message,
      code: 'EXTERNAL_API_ERROR',
      details: process.env.NODE_ENV === 'development' ? {
        url: err.config?.url,
        method: err.config?.method,
        status: err.response?.status
      } : undefined
    });
  }

  // Joi 검증 에러
  if (err.isJoi) {
    return res.status(400).json({
      error: '입력 데이터 검증 실패',
      details: err.details.map(detail => detail.message),
      code: 'VALIDATION_ERROR'
    });
  }

  // 기본 에러 응답
  const statusCode = err.statusCode || 500;
  const message = err.message || '서버 내부 오류가 발생했습니다.';

  res.status(statusCode).json({
    error: message,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  });
};

/**
 * 404 에러 처리 미들웨어
 * 정의되지 않은 라우트에 대한 처리
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: '요청한 리소스를 찾을 수 없습니다.',
    code: 'NOT_FOUND',
    path: req.path,
    method: req.method
  });
};

/**
 * 비동기 에러 래퍼
 * async/await 함수에서 발생하는 에러를 자동으로 next()로 전달
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
}; 