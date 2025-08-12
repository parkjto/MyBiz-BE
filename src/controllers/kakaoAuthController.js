// 카카오 소셜 로그인 컨트롤러

const jwt = require('jsonwebtoken');
const authService = require('../services/authService');

// 환경 변수
const JWT_SECRET = process.env.JWT_SECRET || 'mybiz_jwt_secret_key_2024';

// 카카오 로그인 URL 생성
exports.getKakaoAuthUrl = (req, res) => {
  try {
    const clientId = process.env.KAKAO_CLIENT_ID;
    const redirectUri = process.env.KAKAO_REDIRECT_URI || 'http://localhost:3000/api/auth/kakao/callback';
    
    if (!clientId) {
      return res.status(500).json({
        success: false,
        error: '카카오 클라이언트 ID가 설정되지 않았습니다.'
      });
    }

    const authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

    res.json({
      authUrl,
      clientId,
      redirectUri,
      message: '프론트엔드에서 이 authUrl로 리다이렉트하여 카카오 로그인을 시작하세요.'
    });
  } catch (err) {
    console.error('카카오 로그인 URL 생성 에러:', err);
    res.status(500).json({
      success: false,
      error: '카카오 로그인 URL 생성 중 오류가 발생했습니다.'
    });
  }
};

// 카카오 OAuth 콜백 처리
exports.handleKakaoCallback = (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: '인가 코드가 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '카카오 인가 코드를 성공적으로 받았습니다.',
      code,
      instructions: {
        step1: '이 인가 코드를 복사하세요',
        step2: 'POST /api/auth/kakao/login API를 호출하세요',
        step3: 'Request Body에 {"code": "위의_인가_코드"}를 입력하세요'
      }
    });
  } catch (err) {
    console.error('카카오 콜백 처리 에러:', err);
    res.status(500).json({
      success: false,
      error: '콜백 처리 중 오류가 발생했습니다.'
    });
  }
};

// 카카오 로그인
exports.kakaoLogin = async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ 
      success: false,
      error: '카카오 인가 코드가 필요합니다.' 
    });
  }

  try {
    const result = await authService.kakaoLogin(code);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('카카오 로그인 에러:', err);
    
    // 카카오 API 관련 에러인지 확인
    if (err.message.includes('카카오')) {
      return res.status(400).json({ 
        success: false,
        error: err.message 
      });
    }
    
    // 기타 에러는 500으로 처리
    res.status(500).json({ 
      success: false,
      error: '로그인 처리 중 오류가 발생했습니다.' 
    });
  }
};

// 사용자 프로필 조회
exports.getProfile = async (req, res) => {
  try {
    const result = await authService.getProfile(req.user);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('프로필 조회 에러:', err);
    res.status(500).json({ 
      success: false,
      error: '프로필 조회 중 오류가 발생했습니다.' 
    });
  }
};

// 로그아웃
exports.logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    if (token) {
      // 간단한 토큰 매니저를 사용하여 토큰을 블랙리스트에 추가
      const loginTokenManager = require('../utils/loginTokenManager');
      loginTokenManager.addToBlacklist(token);
    }
    
    res.json({
      success: true,
      message: '로그아웃 성공',
      instructions: {
        step1: '클라이언트에서 저장된 JWT 토큰을 제거하세요',
        step2: 'Authorization 헤더에서 Bearer 토큰을 제거하세요',
        step3: '로그인 페이지로 리다이렉트하세요'
      }
    });
  } catch (err) {
    console.error('로그아웃 에러:', err);
    res.status(500).json({ success: false, error: '로그아웃 처리 중 오류가 발생했습니다.' });
  }
};

// 테스트용 환경 확인
exports.testEnvironment = (req, res) => {
  try {
    const loginTokenManager = require('../utils/loginTokenManager');
    
    const env = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      JWT_SECRET: process.env.JWT_SECRET ? '설정됨' : '설정되지 않음',
      KAKAO_CLIENT_ID: process.env.KAKAO_CLIENT_ID ? '설정됨' : '설정되지 않음',
      KAKAO_REDIRECT_URI: process.env.KAKAO_REDIRECT_URI || '설정되지 않음',
      NAVER_CLIENT_ID: process.env.NAVER_CLIENT_ID ? '설정됨' : '설정되지 않음',
      NAVER_REDIRECT_URI: process.env.NAVER_REDIRECT_URI || '설정되지 않음',
      SUPABASE_URL: process.env.SUPABASE_URL ? '설정됨' : '설정되지 않음',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '설정됨' : '설정되지 않음'
    };

    res.json({
      success: true,
      message: '환경 설정 확인 완료',
      environment: env,
      tokenManager: loginTokenManager.getBlacklistStatus(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('환경 확인 에러:', err);
    res.status(500).json({
      success: false,
      error: '환경 확인 중 오류가 발생했습니다.'
    });
  }
};
