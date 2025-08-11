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

  if (!user) {
    // 신규 회원가입
    // 이메일이 없을 경우 fallback 처리
    const email = kakaoUser.kakao_account?.email || `kakao_${kakaoUser.id}@noemail.com`;
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ kakao_id: kakaoUser.id, email }])
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

/**
 * 매장 선택 후 사용자 정보 업데이트 (회원가입 완료)
 * @param {string} userId - 사용자 ID
 * @param {string} storeId - 선택된 매장 ID
 */
exports.completeRegistration = async (userId, storeId) => {
  // 1. 매장 정보 조회
  const { data: store, error: storeError } = await supabase
    .from('user_stores')
    .select('*')
    .eq('id', storeId)
    .eq('user_id', userId)
    .single();
  
  if (storeError || !store) {
    throw new Error('매장을 찾을 수 없습니다.');
  }
  
  // 2. 사용자 정보 업데이트
  const updateData = {
    phone_number: store.phone,
    business_type: store.category,
    updated_at: new Date().toISOString()
  };
  
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();
  
  if (updateError) {
    console.error('[ERROR] 사용자 정보 업데이트 실패:', updateError);
    throw new Error('사용자 정보 업데이트에 실패했습니다.');
  }
  
  // 3. 매장을 주 매장으로 설정
  const { error: primaryError } = await supabase
    .from('user_stores')
    .update({ is_primary: true })
    .eq('id', storeId);
  
  if (primaryError) {
    console.error('[ERROR] 주 매장 설정 실패:', primaryError);
    // 주 매장 설정 실패는 치명적이지 않으므로 로그만 남김
  }
  
  return {
    user: updatedUser,
    store: store
  };
};

/**
 * 회원가입 상태 확인
 * @param {string} userId - 사용자 ID
 */
exports.getRegistrationStatus = async (userId) => {
  // 1. 사용자 정보 조회
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('phone_number, business_type')
    .eq('id', userId)
    .single();
  
  if (userError) {
    throw new Error('사용자 정보 조회에 실패했습니다.');
  }
  
  // 2. 주 매장 정보 조회
  const { data: primaryStore, error: storeError } = await supabase
    .from('user_stores')
    .select('*')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .maybeSingle();
  
  if (storeError) {
    throw new Error('매장 정보 조회에 실패했습니다.');
  }
  
  // 3. 회원가입 완료 여부 판단
  const isCompleted = !!(user.phone_number && user.business_type);
  
  return {
    isCompleted,
    hasStore: !!primaryStore,
    store: primaryStore
  };
}; 