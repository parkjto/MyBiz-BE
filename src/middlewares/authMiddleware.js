// 인증 미들웨어 예시
module.exports = (req, res, next) => {
  // 실제 구현 시 토큰 검증 등 추가
  const authorized = true; // 예시
  if (!authorized) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }
  next();
}; 