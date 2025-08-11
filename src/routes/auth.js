const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @swagger
 * /api/auth/test:
 *   get:
 *     summary: 카카오 로그인 API 테스트 환경 확인
 *     tags: [인증]
 *     responses:
 *       200:
 *         description: 환경 설정 및 사용 가능한 엔드포인트 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "카카오 로그인 API 테스트"
 *                 environment:
 *                   type: object
 *                   properties:
 *                     KAKAO_CLIENT_ID:
 *                       type: string
 *                       description: 카카오 클라이언트 ID 설정 상태
 *                     KAKAO_REDIRECT_URI:
 *                       type: string
 *                       description: 카카오 리다이렉트 URI
 *                     JWT_SECRET:
 *                       type: string
 *                       description: JWT 시크릿 설정 상태
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     authUrl:
 *                       type: string
 *                       description: 카카오 로그인 URL 생성 엔드포인트
 *                     callback:
 *                       type: string
 *                       description: 카카오 콜백 처리 엔드포인트
 *                     login:
 *                       type: string
 *                       description: 인가 코드로 로그인 엔드포인트
 *                     profile:
 *                       type: string
 *                       description: 사용자 프로필 조회 엔드포인트
 *                     logout:
 *                       type: string
 *                       description: 로그아웃 엔드포인트
 *
 * /api/auth/kakao/auth-url:
 *   get:
 *     summary: 카카오 로그인 URL 생성
 *     tags: [인증]
 *     responses:
 *       200:
 *         description: 카카오 로그인 URL 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authUrl:
 *                   type: string
 *                   description: 카카오 로그인 URL
 *                 clientId:
 *                   type: string
 *                   description: 카카오 클라이언트 ID
 *                 redirectUri:
 *                   type: string
 *                   description: 리다이렉트 URI
 *                 message:
 *                   type: string
 *                   description: 사용 방법 안내
 *
 * /api/auth/kakao/callback:
 *   get:
 *     summary: 카카오 OAuth 콜백 처리
 *     tags: [인증]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: 카카오 인가 코드
 *         required: true
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
 *                   description: 받은 인가 코드
 *                 instructions:
 *                   type: object
 *                   properties:
 *                     step1:
 *                       type: string
 *                       description: 다음 단계 안내
 *                     step2:
 *                       type: string
 *                       description: API 호출 방법
 *                     step3:
 *                       type: string
 *                       description: 요청 본문 예시
 *
 * /api/auth/profile:
 *   get:
 *     summary: 사용자 프로필 조회
 *     tags: [인증]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "유효하지 않은 토큰입니다."
 *
 * /api/auth/kakao/login:
 *   post:
 *     summary: 카카오 로그인
 *     tags: [인증]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: 카카오 OAuth 인가 코드
 *                 example: "YOUR_KAKAO_AUTHORIZATION_CODE"
 *     responses:
 *       200:
 *         description: 카카오 로그인 성공
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
 *                   example: "카카오 로그인 성공"
 *                 isNewUser:
 *                   type: boolean
 *                   description: 신규 사용자 여부
 *                   example: false
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT 토큰
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "카카오 인가 코드가 필요합니다."
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "로그인 처리 중 오류가 발생했습니다."
 *
 * /api/auth/logout:
 *   post:
 *     summary: 로그아웃
 *     tags: [인증]
 *     responses:
 *       200:
 *         description: 로그아웃 성공
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
 *                   example: "로그아웃 성공"
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "로그아웃 처리 중 오류가 발생했습니다."
 */

// 테스트용 환경 확인 엔드포인트
router.get('/test', authController.testEnvironment);

// 디버깅용 간단한 테스트
router.get('/ping', (req, res) => {
  res.json({ 
    message: 'Auth route is working!', 
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
});

// 카카오 로그인 URL 생성
router.get('/kakao/auth-url', authController.getKakaoAuthUrl);

// 카카오 OAuth 콜백 처리
router.get('/kakao/callback', authController.handleKakaoCallback);

// 카카오 로그인
router.post('/kakao/login', authController.kakaoLogin);

// 사용자 프로필 조회
router.get('/profile', authController.getProfile);

// 로그아웃
router.post('/logout', authController.logout);

// 네이버 로그인
router.get('/naverlogin', authController.naverLogin);
router.get('/naver/callback', authController.naverLoginCallback);

module.exports = router;
