import express from 'express';
import { login, me, kakaoLogin, naverLogin } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: 기본 로그인
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 로그인 성공
 */
// 기본 인증
router.post('/login', login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: 내 정보 조회
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보
 */
router.get('/me', protect, me);

// 카카오 로그인 URL 생성 (프론트엔드용)
router.get('/kakao/auth-url', (req, res) => {
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
      success: true,
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
});

/**
 * @openapi
 * /api/auth/kakao/callback:
 *   get:
 *     summary: 카카오 OAuth 콜백 (프론트 처리용 코드 확인)
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 인가 코드 수신
 */
// 카카오 OAuth 콜백 처리 (프론트엔드에서 처리)
router.get('/kakao/callback', (req, res) => {
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
});

// 카카오 로그인 처리 (실제 API 연동)
/**
 * @openapi
 * /api/auth/kakao/login:
 *   post:
 *     summary: 카카오 로그인 처리 (code 교환)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: 애플리케이션 토큰 반환
 */
router.post('/kakao/login', kakaoLogin);

// 네이버 로그인 URL (프론트엔드용)
router.get('/naver/auth-url', (req, res) => {
  const clientId = process.env.NAVER_CLIENT_ID;
  const redirectUri = process.env.NAVER_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    return res.status(500).json({ 
      success: false, 
      error: '네이버 환경변수가 설정되지 않았습니다.' 
    });
  }
  
  const state = Math.random().toString(36).substring(7);
  const url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  res.json({ success: true, authUrl: url, redirectUri, state });
});

/**
 * @openapi
 * /api/auth/naver/callback:
 *   get:
 *     summary: 네이버 OAuth 콜백 (프론트 처리용 코드 확인)
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 인가 코드 수신
 */
// 네이버 콜백 (프론트엔드에서 처리)
router.get('/naver/callback', (req, res) => {
  const { code, state } = req.query;
  if (!code) {
    return res.status(400).json({ success: false, error: '인가 코드가 없습니다.' });
  }
  res.json({ success: true, message: '코드 수신', code, state });
});

// 네이버 로그인 처리 (실제 API 연동)
/**
 * @openapi
 * /api/auth/naver/login:
 *   post:
 *     summary: 네이버 로그인 처리 (code 교환)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: 애플리케이션 토큰 반환
 */
router.post('/naver/login', naverLogin);

// 로그아웃
/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: 로그아웃
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: '로그아웃 성공'
  });
});

export default router;

