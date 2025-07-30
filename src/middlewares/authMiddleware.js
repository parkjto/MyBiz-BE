const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * JWT 토큰 검증 미들웨어
 * @param {object} req - Express request 객체
 * @param {object} res - Express response 객체
 * @param {function} next - Express next 함수
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Bearer 토큰 형식이 올바르지 않습니다.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '토큰이 만료되었습니다.' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    } else {
      return res.status(401).json({ error: '토큰 검증에 실패했습니다.' });
    }
  }
};

/**
 * 선택적 토큰 검증 미들웨어 (토큰이 있으면 검증, 없으면 통과)
 * @param {object} req - Express request 객체
 * @param {object} res - Express response 객체
 * @param {function} next - Express next 함수
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
  } catch (err) {
    // 토큰 검증 실패해도 통과 (선택적 인증)
    next();
  }
};

module.exports = {
  verifyToken,
  optionalVerifyToken
}; 