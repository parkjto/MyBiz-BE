const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: 카카오 OAuth 로그인 관련 API
 * 
 * /api/auth/kakao/login:
 *   post:
 *     tags: [Authentication]
 *     summary: 카카오 OAuth 로그인
 *     description: 카카오 인가 코드를 받아 사용자 로그인을 처리하고 JWT 토큰을 발급합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KakaoLoginRequest'
 *     responses:
 *       200:
 *         description: 카카오 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KakaoLoginResponse'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/auth/kakao/auth-url:
 *   get:
 *     tags: [Authentication]
 *     summary: 카카오 로그인 URL 생성
 *     description: 프론트엔드에서 카카오 로그인을 시작하기 위한 인증 URL을 반환합니다.
 *     responses:
 *       200:
 *         description: 카카오 인증 URL 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authUrl:
 *                   type: string
 *                   description: 카카오 인증 URL
 *                   example: "https://kauth.kakao.com/oauth/authorize?client_id=...&redirect_uri=...&response_type=code"
 *                 clientId:
 *                   type: string
 *                   description: 카카오 클라이언트 ID
 *                 redirectUri:
 *                   type: string
 *                   description: 리다이렉트 URI
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/auth/kakao/callback:
 *   get:
 *     tags: [Authentication]
 *     summary: 카카오 로그인 콜백
 *     description: 카카오 OAuth 인증 후 리다이렉트되는 콜백 URL입니다. 프론트엔드에서 인가 코드를 받아 처리합니다.
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: 카카오에서 받은 인가 코드
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: 오류 발생 시 오류 코드
 *     responses:
 *       200:
 *         description: 인가 코드 수신 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "카카오 인가 코드를 성공적으로 받았습니다."
 *                 code:
 *                   type: string
 *                   description: 인가 코드
 *                 instructions:
 *                   type: object
 *                   properties:
 *                     step1:
 *                       type: string
 *                       example: "이 인가 코드를 복사하세요"
 *                     step2:
 *                       type: string
 *                       example: "POST /api/auth/kakao/login API를 호출하세요"
 *                     step3:
 *                       type: string
 *                       example: "Request Body에 {\"code\": \"위의_인가_코드\"}를 입력하세요"
 *       400:
 *         description: 인가 코드 없음 또는 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/auth/profile:
 *   get:
 *     tags: [Authentication]
 *     summary: 사용자 프로필 조회
 *     description: JWT 토큰을 사용하여 현재 로그인한 사용자의 정보를 조회합니다.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: 로그아웃
 *     description: 사용자 로그아웃을 처리합니다.
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogoutResponse'
 */

// 카카오 로그인 (인가 코드로 로그인 처리)
router.post('/kakao/login', authController.kakaoLogin);

// 카카오 로그인 인증 URL 생성 (프론트엔드용)
router.get('/kakao/auth-url', (req, res) => {
  const clientId = process.env.KAKAO_CLIENT_ID;
  const redirectUri = process.env.KAKAO_REDIRECT_URI;
  
  if (!clientId) {
    return res.status(500).json({
      error: 'KAKAO_CLIENT_ID 환경변수가 설정되지 않았습니다.',
      message: '.env 파일에 KAKAO_CLIENT_ID를 추가해주세요.'
    });
  }
  
  const authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  
  res.json({
    authUrl,
    clientId,
    redirectUri,
    message: '프론트엔드에서 이 authUrl로 리다이렉트하여 카카오 로그인을 시작하세요.'
  });
});

// 카카오 로그인 콜백 (JSON 응답)
router.get('/kakao/callback', (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.status(400).json({ 
      error: '카카오 로그인에 실패했습니다.',
      details: error 
    });
  }
  
  if (!code) {
    return res.status(400).json({ 
      error: '인가 코드가 없습니다.' 
    });
  }
  
  res.json({
    success: true,
    message: '카카오 인가 코드를 성공적으로 받았습니다.',
    code: code,
    instructions: {
      step1: '이 인가 코드를 복사하세요',
      step2: 'POST /api/auth/kakao/login API를 호출하세요',
      step3: 'Request Body에 {"code": "위의_인가_코드"}를 입력하세요'
    }
  });
});

// 로그아웃
router.post('/logout', authController.logout);

// 사용자 프로필 조회 (인증 필요)
router.get('/profile', verifyToken, authController.getProfile);

// 디버깅용 테스트 엔드포인트
router.get('/test', (req, res) => {
  res.json({
    message: '카카오 로그인 API 테스트',
    environment: {
      KAKAO_CLIENT_ID: process.env.KAKAO_CLIENT_ID ? '설정됨' : '설정되지 않음',
      KAKAO_REDIRECT_URI: process.env.KAKAO_REDIRECT_URI,
      JWT_SECRET: process.env.JWT_SECRET ? '설정됨' : '설정되지 않음'
    },
    endpoints: {
      authUrl: 'GET /api/auth/kakao/auth-url - 카카오 로그인 URL 생성',
      callback: 'GET /api/auth/kakao/callback - 카카오 콜백 처리',
      login: 'POST /api/auth/kakao/login - 인가 코드로 로그인',
      profile: 'GET /api/auth/profile - 사용자 프로필 조회 (JWT 필요)',
      logout: 'POST /api/auth/logout - 로그아웃'
    },
    instructions: {
      step1: '카카오 개발자 콘솔에서 앱 설정 확인',
      step2: 'Redirect URI가 http://localhost:3000/api/auth/kakao/callback인지 확인',
      step3: '카카오 로그인 활성화 확인',
      step4: 'GET /api/auth/kakao/auth-url에서 로그인 URL 받기',
      step5: '프론트엔드에서 해당 URL로 리다이렉트',
      step6: '콜백에서 인가 코드 받기',
      step7: 'POST /api/auth/kakao/login으로 로그인 처리'
    }
  });
});

module.exports = router;
