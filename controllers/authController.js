import jwt from 'jsonwebtoken';
import { supabase } from '../utils/supabaseClient.js';
import { logger } from '../utils/logger.js';

// 실제 사용자 로그인 (프로덕션용)
export const login = async (req, res, next) => {
  try {
    const { userId, provider } = req.body;
    if (!userId || !provider) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId와 provider(카카오/네이버)가 필요합니다' 
      });
    }

    // 기존 사용자 확인 또는 새 사용자 생성
    let user = await getUserOrCreate(userId, provider);
    
    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        id: user.id, 
        provider: user.provider,
        email: user.email 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // 마지막 로그인 시간 업데이트
    await updateLastLogin(user.id);

    res.json({ 
      success: true, 
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        provider: user.provider,
        profile_image_url: user.profile_image_url
      }
    });
  } catch (e) { 
    logger.error('로그인 에러:', e);
    next(e); 
  }
};

// 사용자 조회 또는 생성
async function getUserOrCreate(userId, provider) {
  try {
    // 기존 사용자 확인
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq(`${provider}_id`, userId)
      .single();

    if (existingUser) {
      return existingUser;
    }

    // 새 사용자 생성
    const newUser = {
      [`${provider}_id`]: userId,
      email: `${userId}@${provider}.com`, // 임시 이메일
      nickname: `${provider} 사용자`,
      provider: provider,
      created_at: new Date().toISOString()
    };

    const { data: createdUser, error: insertError } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (insertError) throw insertError;

    logger.info(`새 사용자 생성: ${createdUser.id} (${provider})`);
    return createdUser;

  } catch (error) {
    logger.error('사용자 조회/생성 에러:', error);
    throw new Error(`사용자 처리 실패: ${error.message}`);
  }
}

// 마지막 로그인 시간 업데이트
async function updateLastLogin(userId) {
  try {
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);
  } catch (error) {
    logger.warn('마지막 로그인 시간 업데이트 실패:', error.message);
  }
}

// 사용자 프로필 조회
export const me = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다' 
      });
    }

    res.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        provider: user.provider,
        profile_image_url: user.profile_image_url,
        last_login_at: user.last_login_at
      }
    });
  } catch (e) { 
    logger.error('프로필 조회 에러:', e);
    next(e); 
  }
};

// 카카오 로그인 처리 (실제 API 연동)
export const kakaoLogin = async (req, res, next) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: '카카오 인가 코드가 필요합니다' 
      });
    }

    // 카카오 API로 액세스 토큰 획득
    const accessToken = await getKakaoAccessToken(code);
    
    // 카카오 API로 사용자 정보 획득
    const kakaoUser = await getKakaoUserInfo(accessToken);
    
    // 사용자 생성 또는 조회
    const user = await getUserOrCreate(kakaoUser.id, 'kakao');
    
    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        id: user.id, 
        provider: 'kakao',
        email: user.email 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    // 마지막 로그인 시간 업데이트
    await updateLastLogin(user.id);

    res.json({
      success: true,
      message: '카카오 로그인 성공',
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        provider: 'kakao',
        profile_image_url: user.profile_image_url
      }
    });

  } catch (err) {
    logger.error('카카오 로그인 에러:', err);
    res.status(500).json({ 
      success: false, 
      error: '카카오 로그인 처리 중 오류가 발생했습니다' 
    });
  }
};

// 카카오 액세스 토큰 획득
async function getKakaoAccessToken(code) {
  try {
    const response = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code: code,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`카카오 토큰 에러: ${data.error_description || data.error}`);
    }

    return data.access_token;
  } catch (error) {
    throw new Error(`카카오 액세스 토큰 획득 실패: ${error.message}`);
  }
}

// 카카오 사용자 정보 획득
async function getKakaoUserInfo(accessToken) {
  try {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`카카오 사용자 정보 에러: ${data.error_description || data.error}`);
    }

    return {
      id: data.id.toString(),
      email: data.kakao_account?.email,
      nickname: data.properties?.nickname,
      profile_image_url: data.properties?.profile_image
    };
  } catch (error) {
    throw new Error(`카카오 사용자 정보 획득 실패: ${error.message}`);
  }
}

// 네이버 로그인 처리 (실제 API 연동)
export const naverLogin = async (req, res, next) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: '네이버 인가 코드가 필요합니다' 
      });
    }

    // 네이버 API로 액세스 토큰 획득
    const accessToken = await getNaverAccessToken(code);
    
    // 네이버 API로 사용자 정보 획득
    const naverUser = await getNaverUserInfo(accessToken);
    
    // 사용자 생성 또는 조회
    const user = await getUserOrCreate(naverUser.id, 'naver');
    
    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        id: user.id, 
        provider: 'naver',
        email: user.email 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    // 마지막 로그인 시간 업데이트
    await updateLastLogin(user.id);

    res.json({
      success: true,
      message: '네이버 로그인 성공',
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        provider: 'naver',
        profile_image_url: user.profile_image_url
      }
    });

  } catch (err) {
    logger.error('네이버 로그인 에러:', err);
    res.status(500).json({ 
      success: false, 
      error: '네이버 로그인 처리 중 오류가 발생했습니다' 
    });
  }
};

// 네이버 액세스 토큰 획득
async function getNaverAccessToken(code) {
  try {
    const response = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NAVER_CLIENT_ID,
        client_secret: process.env.NAVER_CLIENT_SECRET,
        redirect_uri: process.env.NAVER_REDIRECT_URI,
        code: code,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`네이버 토큰 에러: ${data.error_description || data.error}`);
    }

    return data.access_token;
  } catch (error) {
    throw new Error(`네이버 액세스 토큰 획득 실패: ${error.message}`);
  }
}

// 네이버 사용자 정보 획득
async function getNaverUserInfo(accessToken) {
  try {
    const response = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    
    if (data.resultcode !== '00') {
      throw new Error(`네이버 사용자 정보 에러: ${data.message}`);
    }

    return {
      id: data.response.id,
      email: data.response.email,
      nickname: data.response.nickname,
      profile_image_url: data.response.profile_image
    };
  } catch (error) {
    throw new Error(`네이버 사용자 정보 획득 실패: ${error.message}`);
  }
}
