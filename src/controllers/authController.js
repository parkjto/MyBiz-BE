const authService = require('../services/authService');
const { asyncHandler } = require('../middlewares/errorMiddleware');

/**
 * 카카오 OAuth 로그인 처리
 * 인가 코드를 받아 사용자 정보를 조회하고 JWT 토큰을 발급
 */
exports.kakaoLogin = asyncHandler(async (req, res) => {
  const { code } = req.body;
<<<<<<< Updated upstream
=======
  
  // 입력 검증
  if (!code) {
    return res.status(400).json({ 
      error: '카카오 인가 코드가 필요합니다.',
      code: 'MISSING_AUTH_CODE'
    });
  }
  
>>>>>>> Stashed changes
  try {
    const result = await authService.kakaoLogin(code);
    
    // 회원가입 완료 상태 확인
    const registrationStatus = await authService.getRegistrationStatus(result.user.id);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        token: result.token,
        isNewUser: result.isNewUser,
        registrationStatus: {
          isCompleted: registrationStatus.isCompleted,
          hasStore: registrationStatus.hasStore,
          requiresStoreSelection: !registrationStatus.isCompleted
        }
      }
    });
  } catch (err) {
<<<<<<< Updated upstream
    res.status(400).json({ error: err.message });
=======
    console.error('[ERROR] 카카오 로그인 실패:', err.message);
    
    // 카카오 API 관련 에러 처리
    if (err.message.includes('카카오')) {
      return res.status(400).json({ 
        error: err.message,
        code: 'KAKAO_API_ERROR'
      });
    }
    
    // 토큰 만료 에러
    if (err.message.includes('만료')) {
      return res.status(401).json({ 
        error: err.message,
        code: 'TOKEN_EXPIRED'
      });
    }
    
    res.status(500).json({ 
      error: '로그인 처리 중 오류가 발생했습니다.',
      code: 'LOGIN_ERROR'
    });
>>>>>>> Stashed changes
  }
});

/**
 * 사용자 로그아웃 처리
 */
exports.logout = asyncHandler(async (req, res) => {
  // 실제 구현 시 토큰 블랙리스트 처리 등 추가
  res.json({
    success: true,
    message: '로그아웃이 완료되었습니다.'
  });
});

<<<<<<< Updated upstream

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
=======
/**
 * 사용자 프로필 조회
 * JWT 토큰을 통해 인증된 사용자 정보 반환
 */
exports.getProfile = asyncHandler(async (req, res) => {
  try {
    // verifyToken 미들웨어에서 검증된 사용자 정보
    const user = req.user;
    
    // DB에서 최신 사용자 정보 조회
    const userService = require('../services/userService');
    const userProfile = await userService.getUserById(user.id);
    
    if (!userProfile) {
      return res.status(404).json({
        error: '사용자 정보를 찾을 수 없습니다.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      message: '사용자 정보 조회 성공',
      data: {
        user: {
          id: userProfile.id,
          kakao_id: userProfile.kakao_id,
          email: userProfile.email,
          nickname: userProfile.nickname,
          profile_image_url: userProfile.profile_image_url,
          last_login_at: userProfile.last_login_at,
          created_at: userProfile.created_at
        }
      }
    });
  } catch (err) {
    console.error('[ERROR] 사용자 정보 조회 실패:', err.message);
    res.status(500).json({ 
      error: '사용자 정보 조회 중 오류가 발생했습니다.',
      code: 'PROFILE_ERROR'
    });
  }
});

/**
 * 사용자 프로필 업데이트
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const { nickname, email } = req.body;
  const userId = req.user.id;
  
  try {
    const userService = require('../services/userService');
    const updatedUser = await userService.updateUser(userId, { nickname, email });
    
    res.json({
      success: true,
      message: '프로필이 성공적으로 업데이트되었습니다.',
      data: {
        user: updatedUser
      }
    });
  } catch (err) {
    console.error('[ERROR] 프로필 업데이트 실패:', err.message);
    res.status(500).json({ 
      error: '프로필 업데이트 중 오류가 발생했습니다.',
      code: 'UPDATE_ERROR'
    });
  }
});

/**
 * 토큰 갱신
 */
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      error: '리프레시 토큰이 필요합니다.',
      code: 'MISSING_REFRESH_TOKEN'
    });
  }
  
  try {
    const authService = require('../services/authService');
    const newToken = await authService.refreshToken(refreshToken);
    
    res.json({
      success: true,
      message: '토큰이 성공적으로 갱신되었습니다.',
      data: {
        token: newToken
      }
    });
  } catch (err) {
    console.error('[ERROR] 토큰 갱신 실패:', err.message);
    res.status(401).json({
      error: '토큰 갱신에 실패했습니다.',
      code: 'REFRESH_ERROR'
    });
  }
});

/**
 * 매장 선택 후 사용자 정보 업데이트 (회원가입 완료)
 * 매장 정보를 바탕으로 사용자의 전화번호와 업종을 자동 설정
 */
exports.completeRegistration = asyncHandler(async (req, res) => {
  const { storeId } = req.body;
  const userId = req.user.id; // JWT 토큰에서 사용자 ID
  
  if (!storeId) {
    return res.status(400).json({
      error: '매장 ID가 필요합니다.',
      code: 'MISSING_STORE_ID'
    });
  }
  
  try {
    const result = await authService.completeRegistration(userId, storeId);
    
    res.json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      data: {
        user: result.user,
        store: result.store
      }
    });
  } catch (err) {
    console.error('[ERROR] 회원가입 완료 실패:', err.message);
    
    if (err.message.includes('매장을 찾을 수 없습니다')) {
      return res.status(404).json({
        error: err.message,
        code: 'STORE_NOT_FOUND'
      });
    }
    
    if (err.message.includes('이미 완료된 회원가입')) {
      return res.status(400).json({
        error: err.message,
        code: 'ALREADY_COMPLETED'
      });
    }
    
    res.status(500).json({
      error: '회원가입 완료 중 오류가 발생했습니다.',
      code: 'REGISTRATION_ERROR'
    });
  }
});

/**
 * 회원가입 상태 확인
 * 사용자가 매장 선택을 완료했는지 확인
 */
exports.getRegistrationStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  try {
    const status = await authService.getRegistrationStatus(userId);
    
    res.json({
      success: true,
      data: {
        isCompleted: status.isCompleted,
        hasStore: status.hasStore,
        store: status.store
      }
    });
  } catch (err) {
    console.error('[ERROR] 회원가입 상태 확인 실패:', err.message);
    res.status(500).json({
      error: '회원가입 상태 확인 중 오류가 발생했습니다.',
      code: 'STATUS_CHECK_ERROR'
    });
  }
});
>>>>>>> Stashed changes
