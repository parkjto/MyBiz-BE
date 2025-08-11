// 네이버 소셜 로그인 컨트롤러

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
  }

  return res.send("DB에 저장하고 랜드페이지로 redirect ");
};
