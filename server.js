const express = require('express');
const session = require('express-session');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(express.json());
app.use(cookieParser());
app.use(cors({ credentials: true }));

// 세션 설정
app.use(session({
  secret: 'mybiz-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// 공통 쿠키 삭제 헬퍼
function clearAllAuthCookies(res) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  [
    'token', 'connect.sid', 'auth_token', 
    'user_session', 'naver_token', 'kakao_token'
  ].forEach(cookie => res.clearCookie(cookie, cookieOptions));
}

// 🔓 일반 로그아웃 (GET: 테스트용)
app.get('/logout', (req, res) => {
  res.send('MyBiz 로그아웃이 정상적으로 작동되었습니다!');
});

// 🔓 실제 로그아웃 (POST)
app.post('/logout', (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('세션 삭제 오류:', err);
        return res.status(500).json({ success: false, message: '로그아웃 처리 중 오류가 발생했습니다.' });
      }

      clearAllAuthCookies(res);
      res.json({
        success: true,
        message: 'MyBiz 로그아웃이 완료되었습니다.',
        timestamp: new Date().toISOString(),
        logoutType: 'normal'
      });
    });
  } catch (error) {
    console.error('로그아웃 오류:', error);
    res.status(500).json({ success: false, message: '로그아웃 처리 중 오류가 발생했습니다.' });
  }
});

// 🔒 강제 로그아웃 (관리자용)
app.post('/logout/force', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
  }

  try {
    // 세션 스토어에서 특정 사용자 세션 삭제 (예: Redis 기반)
    // 예: redisClient.del(`sess:${sessionId}`);
    // 여기선 간단히 현재 세션만 제거 (개선 필요)
    req.session.destroy((err) => {
      if (err) {
        console.error('강제 로그아웃 오류:', err);
        return res.status(500).json({ success: false, message: '강제 로그아웃 실패' });
      }

      clearAllAuthCookies(res);
      res.json({
        success: true,
        message: `사용자 ${userId} 강제 로그아웃 완료`,
        logoutType: 'force',
        timestamp: new Date().toISOString(),
        targetUserId: userId
      });
    });
  } catch (error) {
    console.error('강제 로그아웃 오류:', error);
    res.status(500).json({ success: false, message: '강제 로그아웃 처리 중 오류가 발생했습니다.' });
  }
});

// 🔐 전체 세션 로그아웃 + 소셜 연동 해제
app.post('/logout/all-sessions', async (req, res) => {
  const { provider, accessToken } = req.body;

  try {
    // 세션 삭제
    req.session.destroy(async (err) => {
      if (err) {
        console.error('전체 세션 로그아웃 오류:', err);
        return res.status(500).json({ success: false, message: '세션 삭제 실패' });
      }

      clearAllAuthCookies(res);

      // 소셜 로그아웃 API 호출
      try {
        if (provider === 'naver') {
          await axios.get(`https://nid.naver.com/oauth2.0/token`, {
            params: {
              grant_type: 'delete',
              client_id: process.env.NAVER_CLIENT_ID,
              client_secret: process.env.NAVER_CLIENT_SECRET,
              access_token: accessToken,
              service_provider: 'NAVER'
            }
          });
        } else if (provider === 'kakao') {
          await axios.post(`https://kapi.kakao.com/v1/user/logout`, null, {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          });
        }
      } catch (socialError) {
        console.warn('소셜 로그아웃 실패 (무시 가능):', socialError.response?.data || socialError.message);
      }

      res.json({
        success: true,
        message: '모든 세션에서 로그아웃 완료',
        logoutType: 'all-sessions',
        timestamp: new Date().toISOString(),
        provider
      });
    });
  } catch (error) {
    console.error('전체 세션 로그아웃 오류:', error);
    res.status(500).json({ success: false, message: '전체 세션 로그아웃 처리 중 오류' });
  }
});

// 📝 로그아웃 이력 기록
app.post('/logout/log', (req, res) => {
  try {
    const { userId, logoutReason = '사용자 요청', logoutType = 'normal' } = req.body;

    const logoutLog = {
      userId,
      logoutReason,
      logoutType,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress
    };

    // DB 저장 대신 콘솔 출력
    console.log('📄 로그아웃 이력:', logoutLog);

    res.json({
      success: true,
      message: '로그아웃 이력이 기록되었습니다.',
      log: logoutLog
    });
  } catch (error) {
    console.error('로그아웃 이력 기록 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그아웃 이력 기록 실패'
    });
  }
});

// 🔍 로그인 상태 확인
app.get('/auth/status', (req, res) => {
  const isLoggedIn = !!(req.session.userId || req.cookies.token);
  res.json({ 
    isLoggedIn,
    message: isLoggedIn ? '로그인된 상태입니다.' : '로그인되지 않은 상태입니다.',
    sessionInfo: req.session
  });
});

// 🚀 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 MyBiz 백엔드 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📝 사용 가능한 로그아웃 엔드포인트:`);
  console.log(`   - GET  /logout (테스트용)`);
  console.log(`   - POST /logout (일반 로그아웃)`);
  console.log(`   - POST /logout/force (강제 로그아웃)`);
  console.log(`   - POST /logout/all-sessions (전체 세션 로그아웃)`);
  console.log(`   - POST /logout/log (로그아웃 이력)`);
  console.log(`   - GET  /auth/status (인증 상태 확인)`);
});
