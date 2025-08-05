const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * JWT 토큰 검증 미들웨어
 * Authorization 헤더에서 Bearer 토큰을 추출하여 검증
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
  }
  
  const token = authHeader.split(' ')[1]; // Bearer TOKEN 형식에서 토큰 추출
  
  if (!token) {
    return res.status(401).json({ error: '유효하지 않은 토큰 형식입니다.' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // 검증된 사용자 정보를 요청 객체에 추가
    next();
  } catch (error) {
    console.error('[ERROR] 토큰 검증 실패:', error.message);
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

/**
 * 선택적 토큰 검증 미들웨어 (토큰이 있으면 검증, 없으면 통과)
 */
const optionalVerifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return next(); // 토큰이 없어도 통과
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return next(); // 토큰 형식이 잘못되어도 통과
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('[WARNING] 선택적 토큰 검증 실패:', error.message);
    next(); // 토큰이 유효하지 않아도 통과
  }
};

module.exports = {
  verifyToken,
  optionalVerifyToken
}; 