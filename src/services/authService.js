const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { supabase, supabaseAdmin } = db;

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// 환경변수 검증
if (!KAKAO_CLIENT_ID) throw new Error('KAKAO_CLIENT_ID 환경변수가 설정되지 않았습니다.');
if (!KAKAO_REDIRECT_URI) throw new Error('KAKAO_REDIRECT_URI 환경변수가 설정되지 않았습니다.');
if (!JWT_SECRET) throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');

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

  // 2. access_token으로 사용자 정보 조회 (에러 핸들링 추가)
  let kakaoUser;
  try {
    const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    kakaoUser = userRes.data;
  } catch (err) {
    throw new Error('카카오 사용자 정보 조회 실패: ' + (err.response?.data?.msg || err.message));
  }

  // 3. DB에서 사용자 조회/생성 (예시: kakao_id 기준)
  // .maybeSingle() 사용: 없으면 null 반환, 있으면 객체 반환
  let { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('kakao_id', kakaoUser.id)
    .maybeSingle();
  if (userError) throw userError;

  let isNewUser = false;

  if (!user) {
    // 신규 회원가입 - created_at, updated_at은 Supabase가 자동 생성
    isNewUser = true;
    const userData = {
      kakao_id: kakaoUser.id.toString(),
      email: kakaoUser.kakao_account?.email || `kakao_${kakaoUser.id}@noemail.com`,
      nickname: kakaoUser.properties?.nickname || `카카오사용자_${kakaoUser.id}`,
      profile_image_url: kakaoUser.properties?.profile_image || null,
      last_login_at: new Date().toISOString()
    };
    
    try {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();
      
      if (error) {
        console.error('[ERROR] 사용자 생성 실패:', error);
        throw new Error('사용자 생성에 실패했습니다. Supabase RLS 정책을 확인해주세요.');
      }
      
      user = newUser;
    } catch (error) {
      console.error('[ERROR] 사용자 생성 중 오류:', error);
      throw new Error('사용자 생성 중 오류가 발생했습니다: ' + error.message);
    }
  } else {
    // 기존 사용자의 마지막 로그인 시간 업데이트
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          last_login_at: new Date().toISOString()
          // updated_at은 Supabase가 자동으로 처리
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('[ERROR] 사용자 업데이트 실패:', updateError);
        // 업데이트 실패는 치명적이지 않으므로 로그만 남기고 계속 진행
      }
    } catch (error) {
      console.error('[ERROR] 사용자 업데이트 중 오류:', error);
      // 업데이트 실패는 치명적이지 않으므로 로그만 남기고 계속 진행
    }
  }

  // 4. JWT 발급
  const token = jwt.sign({ id: user.id, kakao_id: user.kakao_id }, JWT_SECRET, { expiresIn: '7d' });

  return {
    message: isNewUser ? '카카오 회원가입 및 로그인 성공' : '카카오 로그인 성공',
    isNewUser,
    user,
    token,
  };
};

exports.logout = () => {
  // 실제 구현 시 세션/토큰 무효화 등 처리
  return { message: '로그아웃 예시 성공' };
}; 