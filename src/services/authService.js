const axios = require('axios');
const jwt = require('jsonwebtoken');
const supabase = require('../config/db');

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// 사용자 ID로 사용자 정보 조회
exports.getUserById = async (userId) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('사용자 조회 에러:', error);
      throw new Error('사용자 정보 조회 중 오류가 발생했습니다.');
    }
    
    return user;
  } catch (err) {
    console.error('getUserById 에러:', err);
    throw err;
  }
};

// JWT 토큰 검증
exports.verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    throw new Error('유효하지 않은 토큰입니다.');
  }
};

exports.kakaoLogin = async (code) => {
  if (!code) throw new Error('카카오 인가 코드가 필요합니다.');

  // 환경 변수 확인
  console.log('환경 변수 확인:', {
    KAKAO_CLIENT_ID: KAKAO_CLIENT_ID ? '설정됨' : '설정되지 않음',
    KAKAO_REDIRECT_URI: KAKAO_REDIRECT_URI || '설정되지 않음',
    SUPABASE_URL: process.env.SUPABASE_URL ? '설정됨' : '설정되지 않음',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '설정됨' : '설정되지 않음'
  });

  // 1. 인가 코드로 access_token 요청
  let tokenRes;
  try {
    console.log('카카오 토큰 요청 시작:', { code, client_id: KAKAO_CLIENT_ID, redirect_uri: KAKAO_REDIRECT_URI });
    
    tokenRes = await axios.post(
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
    
    console.log('카카오 토큰 응답:', tokenRes.data);
  } catch (err) {
    console.error('카카오 토큰 요청 에러 상세:', {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message
    });
    
    if (err.response?.status === 400) {
      throw new Error('유효하지 않은 인가 코드입니다.');
    }
    throw new Error('카카오 토큰 요청 실패: ' + (err.response?.data?.error_description || err.message));
  }

  const { access_token } = tokenRes.data;
  console.log('액세스 토큰 획득:', access_token ? '성공' : '실패');

  // 2. access_token으로 사용자 정보 조회
  let kakaoUser;
  try {
    console.log('카카오 사용자 정보 조회 시작');
    const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    kakaoUser = userRes.data;
    console.log('카카오 사용자 정보:', { id: kakaoUser.id, nickname: kakaoUser.properties?.nickname });
  } catch (err) {
    console.error('카카오 사용자 정보 조회 에러:', err.response?.data || err.message);
    throw new Error('카카오 사용자 정보 조회 실패: ' + (err.response?.data?.msg || err.message));
  }

  // 3. DB에서 사용자 조회/생성
  console.log('Supabase 사용자 조회 시작');
  let { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('kakao_id', kakaoUser.id)
    .maybeSingle();
  
  if (userError) {
    console.error('사용자 조회 에러:', userError);
    throw new Error('사용자 정보 조회 중 오류가 발생했습니다.');
  }

  if (!user) {
    console.log('신규 사용자 생성 시작');
    // 신규 회원가입 - 더 많은 정보 저장
    const userData = {
      kakao_id: kakaoUser.id,
      email: kakaoUser.kakao_account?.email || `kakao_${kakaoUser.id}@noemail.com`,
      nickname: kakaoUser.properties?.nickname || `사용자${kakaoUser.id}`,
      profile_image_url: kakaoUser.properties?.profile_image || null,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString()
    };

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (createError) {
      console.error('사용자 생성 에러:', createError);
      throw new Error('사용자 계정 생성 중 오류가 발생했습니다.');
    }
    user = newUser;
    console.log('신규 사용자 생성 완료:', user.id);
  } else {
    console.log('기존 사용자 로그인 시간 업데이트');
    // 기존 사용자 로그인 시간 업데이트
    const { error: updateError } = await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('로그인 시간 업데이트 에러:', updateError);
      // 에러가 있어도 로그인은 계속 진행
    }
  }

  // 4. JWT 발급
  console.log('JWT 토큰 발급 시작');
  const token = jwt.sign(
    { 
      userId: user.id, 
      kakao_id: user.kakao_id,
      email: user.email 
    }, 
    JWT_SECRET, 
    { expiresIn: '7d' }
  );

  console.log('카카오 로그인 완료');
  return {
    message: '카카오 로그인 성공',
    isNewUser: !user.created_at || user.created_at === user.last_login_at,
    user: {
      id: user.id,
      kakao_id: user.kakao_id,
      email: user.email,
      nickname: user.nickname,
      profile_image_url: user.profile_image_url,
      created_at: user.created_at,
      last_login_at: user.last_login_at
    },
    token,
  };
};

exports.logout = () => {
  // 실제 구현 시 세션/토큰 무효화 등 처리
  return { message: '로그아웃 성공' };
}; 