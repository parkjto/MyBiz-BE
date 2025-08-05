const authService = require('../services/authService');

exports.kakaoLogin = async (req, res) => {
  const { code } = req.body;
  
  // 입력 검증
  if (!code) {
    return res.status(400).json({ error: '카카오 인가 코드가 필요합니다.' });
  }
  
  try {
    const result = await authService.kakaoLogin(code);
    res.json(result);
  } catch (err) {
    console.error('[ERROR] 카카오 로그인 실패:', err.message);
    res.status(400).json({ error: err.message });
  }
};

exports.logout = (req, res) => {
  const result = authService.logout();
  res.json(result);
};

exports.getProfile = (req, res) => {
  try {
    // verifyToken 미들웨어에서 검증된 사용자 정보
    const user = req.user;
    res.json({
      message: '사용자 정보 조회 성공',
      user: {
        id: user.id,
        kakao_id: user.kakao_id
      }
    });
  } catch (err) {
    console.error('[ERROR] 사용자 정보 조회 실패:', err.message);
    res.status(400).json({ error: err.message });
  }
};
