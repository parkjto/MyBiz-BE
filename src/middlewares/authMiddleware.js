// 인증 미들웨어

const jwt = require('jsonwebtoken');
const loginTokenManager = require('../utils/loginTokenManager');

// 환경 변수
const JWT_SECRET = process.env.JWT_SECRET || 'mybiz_jwt_secret_key_2024';

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
const verifyToken = async (req, res, next) => {
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

    // 토큰이 블랙리스트에 있는지 확인 (로그아웃된 토큰)
    if (loginTokenManager.isBlacklisted(token)) {
      return res.status(401).json({ 
        success: false,
        error: '로그아웃된 토큰입니다. 다시 로그인해주세요.' 
      });
    }

    // JWT 토큰 검증
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    next();
  } catch (error) {
    console.error('토큰 검증 에러:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: '토큰이 만료되었습니다. 다시 로그인해주세요.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        error: '유효하지 않은 토큰입니다.' 
      });
    }
    
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