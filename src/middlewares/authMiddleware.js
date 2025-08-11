// 인증 미들웨어

// 기본 인증 미들웨어 (예시)
const basicAuth = (req, res, next) => {
  // 실제 구현 시 토큰 검증 등 추가
  const authorized = true; // 예시
  if (!authorized) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }
  next();
};

// JWT 토큰 검증 미들웨어
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: '액세스 토큰이 필요합니다.' 
      });
    }

    const token = authHeader.substring(7); // 'Bearer ' 제거
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: '유효하지 않은 토큰입니다.' 
      });
    }

    // TODO: JWT 토큰 검증 로직 구현
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = decoded;
    
    // 임시로 사용자 정보 설정 (실제 구현 시 JWT 검증 결과 사용)
    req.user = {
      userId: 'temp_user_id',
      email: 'temp@example.com'
    };

    next();
  } catch (error) {
    console.error('토큰 검증 에러:', error);
    return res.status(401).json({ 
      success: false,
      error: '토큰 검증에 실패했습니다.' 
    });
  }
};

module.exports = {
  basicAuth,
  verifyToken
}; 