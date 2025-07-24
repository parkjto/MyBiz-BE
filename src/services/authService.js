const axios = require('axios');
const jwt = require('jsonwebtoken');
const supabase = require('../config/db');

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET;

exports.kakaoLogin = async (code) => {
  if (!code) throw new Error('카카오 인가 코드가 필요합니다.');

  // 1. 인가 코드로 access_token 요청
  const tokenRes = await axios.post(
    'https://kauth.kakao.com/oauth/token',
    null,
    {
      params: {
        grant_type: 'authorization_code',
        client_id: KAKAO_CLIENT_ID,
        redirect_uri: KAKAO_REDIRECT_URI,
        code,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );
  const { access_token } = tokenRes.data;

  // 2. access_token으로 사용자 정보 조회
  const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const kakaoUser = userRes.data;

  // 3. DB에서 사용자 조회/생성 (예시: kakao_id 기준)
  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('kakao_id', kakaoUser.id)
    .single();

  if (!user) {
    // 신규 회원가입
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ kakao_id: kakaoUser.id, email: kakaoUser.kakao_account.email }])
      .select()
      .single();
    if (error) throw error;
    user = newUser;
  }

  // 4. JWT 발급
  const token = jwt.sign({ id: user.id, kakao_id: user.kakao_id }, JWT_SECRET, { expiresIn: '7d' });

  return {
    message: '카카오 로그인 성공',
    user,
    token,
  };
};

exports.logout = () => {
  // 실제 구현 시 세션/토큰 무효화 등 처리
  return { message: '로그아웃 예시 성공' };
}; 