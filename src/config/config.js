require('dotenv').config();

module.exports = {
  // 네이버 로컬 API 설정
  naver: {
    clientId: process.env.NAVER_CLIENT_ID,
    clientSecret: process.env.NAVER_CLIENT_SECRET,
    redirectUri: process.env.NAVER_REDIRECT_URI,
    // 네이버 로컬 API는 OAuth 클라이언트 ID와 동일
    localApiClientId: process.env.NAVER_CLIENT_ID,
    localApiClientSecret: process.env.NAVER_CLIENT_SECRET
  },
  
  // JWT 설정
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d'
  }
};

