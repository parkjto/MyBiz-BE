// 네이버 소셜 로그인 컨트롤러

const fetch = require("node-fetch");
const jwt = require('jsonwebtoken');
const supabase = require('../config/db');

// var express = require("express");
// var app = express();
// var client_id = "wlkin7a6M6k6rfUAZElO";
// var client_secret = "aoEobEfnGW";
var state = "RAMDOM_STATE-anyword";
// var redirectURI = encodeURI("http://localhost:3000/auth/naver/callback");
var api_url = "";

// 환경 변수
const JWT_SECRET = process.env.JWT_SECRET || 'mybiz_jwt_secret_key_2024';

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
  //     "X-Naver-Client-Secret": client_id,
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

    try {
      // DB에서 사용자 조회/생성
      let { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('naver_id', userData.response.id)
        .maybeSingle();
      
      if (userError) {
        console.error('사용자 조회 에러:', userError);
        return res.status(500).json({ success: false, error: '사용자 정보 조회 중 오류가 발생했습니다.' });
      }

      if (!user) {
        // 신규 회원가입
        const userDataForDB = {
          naver_id: userData.response.id,
          email: userData.response.email || `naver_${userData.response.id}@noemail.com`,
          nickname: userData.response.nickname || `사용자${userData.response.id}`,
          profile_image_url: userData.response.profile_image || null,
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString()
        };

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([userDataForDB])
          .select()
          .single();
        
        if (createError) {
          console.error('사용자 생성 에러:', createError);
          return res.status(500).json({ success: false, error: '사용자 계정 생성 중 오류가 발생했습니다.' });
        }
        user = newUser;
      } else {
        // 기존 사용자 로그인 시간 업데이트
        const { error: updateError } = await supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id);
        
        if (updateError) {
          console.error('로그인 시간 업데이트 에러:', updateError);
        }
      }

      // JWT 토큰 발급
      const token = jwt.sign(
        { 
          userId: user.id, 
          naver_id: user.naver_id,
          email: user.email 
        }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        message: '네이버 로그인 성공',
        isNewUser: !user.created_at || user.created_at === user.last_login_at,
        user: {
          id: user.id,
          naver_id: user.naver_id,
          email: user.email,
          nickname: user.nickname,
          profile_image_url: user.profile_image_url,
          created_at: user.created_at,
          last_login_at: user.last_login_at
        },
        token,
      });

    } catch (err) {
      console.error('네이버 로그인 처리 에러:', err);
      return res.status(500).json({ success: false, error: '로그인 처리 중 오류가 발생했습니다.' });
    }
  } else {
    return res.status(400).json({ success: false, error: '네이버 토큰 발급 실패' });
  }
};

// 사용자 프로필 조회
exports.getProfile = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.userId)
      .maybeSingle();
    
    if (error) {
      console.error('프로필 조회 에러:', error);
      return res.status(500).json({ success: false, error: '프로필 조회 중 오류가 발생했습니다.' });
    }
    
    if (!user) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        naver_id: user.naver_id,
        email: user.email,
        nickname: user.nickname,
        profile_image_url: user.profile_image_url,
        created_at: user.created_at,
        last_login_at: user.last_login_at
      }
    });
  } catch (err) {
    console.error('프로필 조회 에러:', err);
    res.status(500).json({ success: false, error: '프로필 조회 중 오류가 발생했습니다.' });
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
