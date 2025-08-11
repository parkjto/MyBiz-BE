const authService = require('../services/authService');
const jwt = require('jsonwebtoken');

// 테스트용 환경 확인
exports.testEnvironment = (req, res) => {
  try {
    const environment = {
      KAKAO_CLIENT_ID: process.env.KAKAO_CLIENT_ID ? '설정됨' : '설정되지 않음',
      KAKAO_REDIRECT_URI: process.env.KAKAO_REDIRECT_URI || '설정되지 않음',
      JWT_SECRET: process.env.JWT_SECRET ? '설정됨' : '설정되지 않음'
    };

    const endpoints = {
      authUrl: 'GET /api/auth/kakao/auth-url - 카카오 로그인 URL 생성',
      callback: 'GET /api/auth/kakao/callback - 카카오 콜백 처리',
      login: 'POST /api/auth/kakao/login - 인가 코드로 로그인',
      profile: 'GET /api/auth/profile - 사용자 프로필 조회 (JWT 필요)',
      logout: 'POST /api/auth/logout - 로그아웃'
    };

    res.json({
      message: '카카오 로그인 API 테스트',
      environment,
      endpoints
    });
  } catch (err) {
    console.error('환경 확인 에러:', err);
    res.status(500).json({ 
      success: false,
      error: '환경 확인 중 오류가 발생했습니다.' 
    });
  }
};

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

// 사용자 프로필 조회
exports.getProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Bearer 토큰이 필요합니다.'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await authService.getUserById(decoded.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          kakao_id: user.kakao_id,
          email: user.email,
          nickname: user.nickname,
          profile_image_url: user.profile_image_url,
          created_at: user.created_at,
          last_login_at: user.last_login_at
        }
      });
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: '유효하지 않은 토큰입니다.'
      });
    }
  } catch (err) {
    console.error('프로필 조회 에러:', err);
    res.status(500).json({
      success: false,
      error: '프로필 조회 중 오류가 발생했습니다.'
    });
  }
};

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

exports.logout = (req, res) => {
  try {
    const result = authService.logout();
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('로그아웃 에러:', err);
    res.status(500).json({ 
      success: false,
      error: '로그아웃 처리 중 오류가 발생했습니다.' 
    });
  }
};


// 네이버 소셜 로그인

const fetch = require("node-fetch");

// var express = require("express");
// var app = express();
// var client_id = "wlkin7a6M6k6rfUAZElO";
// var client_secret = "aoEobEfnGW";
var state = "RAMDOM_STATE-anyword";
// var redirectURI = encodeURI("http://localhost:3000/auth/naver/callback");
var api_url = "";

// 사용자에게 인증 요청 (네이버 아이디로 로그인)
// 정상적으로 동작 시 임의의 코드(승인코드)를 네이버가 발급해줌
// ex) localhost:3000/auth/naver/callback?code=heFqflKodqQyJzDMJj
exports.naverLogin = function (req, res) {
  api_url =
    "https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=" +
    process.env.NAVER_CLIENT_ID +
    "&redirect_uri=" +
    process.env.NAVER_REDIRECT_URI +
    "&state=" +
    state;
  res.writeHead(200, { "Content-Type": "text/html;charset=utf-8" });
  res.end(
    "<a href='" +
      api_url +
      "'><img height='50' src='http://static.nid.naver.com/oauth/small_g_in.PNG'/></a>"
  );
};

//  access_token을 발급 받기 위해 받아온 승인코드를 네이버에 다시 요청
exports.naverLoginCallback = async function (req, res) {
  const code = req.query.code;
  const state = req.query.state;
  const api_url =
    "https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=" +
    process.env.NAVER_CLIENT_ID +
    "&client_secret=" +
    process.env.NAVER_CLIENT_SECRET +
    "&redirect_uri=" +
    process.env.NAVER_REDIRECT_URI +
    "&code=" +
    code +
    "&state=" +
    state;
  // var request = require("request");
  // var options = {
  //   url: api_url,
  //   headers: {
  //     "X-Naver-Client-Id": client_id,
  //     "X-Naver-Client-Secret": client_secret,
  //   },
  // };
  // request.get(options, function (error, response, body) {
  //   if (!error && response.statusCode == 200) {
  //     res.writeHead(200, { "Content-Type": "text/json;charset=utf-8" });

  //     res.end(body);
  //     console.log("body", body);
  //   } else {
  //     res.status(response.statusCode).end();
  //     console.log("error = " + response.statusCode);
  //   }
  // });


  // access_token을 발급받아 다시 네이버에게 요청해 최종적으로 사용자 정보를 받아옴
  const response = await fetch(api_url, {
    headers: {
      "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
    },
  });

  const tokenRequest = await response.json();

  // access_token으로 사용자 정보 요청 후 data에 받아옴
  if ("access_token" in tokenRequest) {
    const { access_token } = tokenRequest;
    const apiUrl = "https://openapi.naver.com/v1/nid/me";

    const data = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const userData = await data.json();

    // 사용자 정보 콘솔로 출력
    // 추후 DB에 저장하는 기능 추가
    console.log("userData:", userData);
  }

  return res.send("DB에 저장하고 랜드페이지로 redirect ");
};