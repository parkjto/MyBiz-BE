// 카카오 인증 라우터

const express = require('express');
const router = express.Router();
const kakaoAuthController = require('../controllers/kakaoAuthController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/auth/kakao/auth-url:
 *   get:
 *     summary: 카카오 로그인 URL 생성
 *     tags: [카카오 인증]
 *     description: 카카오 OAuth 인증 URL을 생성합니다.
 *     responses:
 *       200:
 *         description: 카카오 로그인 URL 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 authUrl:
 *                   type: string
 *                   description: 카카오 OAuth 인증 URL
 *                   example: "https://kauth.kakao.com/oauth/authorize?..."
 *                 clientId:
 *                   type: string
 *                   description: 카카오 클라이언트 ID
 *                 redirectUri:
 *                   type: string
 *                   description: 리다이렉트 URI
 *                 message:
 *                   type: string
 *                   description: 안내 메시지
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
 *                   example: "카카오 클라이언트 ID가 설정되지 않았습니다."
 */

// 카카오 로그인 URL 생성
router.get('/auth-url', kakaoAuthController.getKakaoAuthUrl);

/**
 * @swagger
 * /api/auth/kakao/callback:
 *   get:
 *     summary: 카카오 OAuth 콜백 처리
 *     tags: [카카오 인증]
 *     description: 카카오 OAuth 인증 후 콜백을 처리합니다.
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: 카카오에서 발급한 인가 코드
 *     responses:
 *       200:
 *         description: 콜백 처리 성공
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
 *                   description: 다음 단계 안내
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 내부 오류
 */

// 카카오 OAuth 콜백 처리
router.get('/callback', kakaoAuthController.handleKakaoCallback);

/**
 * @swagger
 * /api/auth/kakao/login:
 *   post:
 *     summary: 카카오 로그인
 *     tags: [카카오 인증]
 *     description: 카카오 인가 코드를 사용하여 로그인을 처리합니다.
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
 *                 description: 카카오 인가 코드
 *                 example: "authorization_code_here"
 *     responses:
 *       200:
 *         description: 로그인 성공
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
 *                 token:
 *                   type: string
 *                   description: JWT 토큰
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 isNewUser:
 *                   type: boolean
 *                   description: 신규 사용자 여부
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 내부 오류
 */

// 카카오 로그인
router.post('/login', kakaoAuthController.kakaoLogin);

/**
 * @swagger
 * /api/auth/kakao/profile:
 *   get:
 *     summary: 사용자 프로필 조회
 *     tags: [카카오 인증]
 *     description: 인증된 사용자의 프로필 정보를 조회합니다.
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
 *       500:
 *         description: 서버 내부 오류
 */

// 사용자 프로필 조회 (인증 필요)
router.get('/profile', authMiddleware.verifyToken, kakaoAuthController.getProfile);

/**
 * @swagger
 * /api/auth/kakao/logout:
 *   post:
 *     summary: 로그아웃
 *     tags: [카카오 인증]
 *     description: 사용자 로그아웃을 처리합니다.
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
 */

// 로그아웃
router.post('/logout', kakaoAuthController.logout);

/**
 * @swagger
 * /api/auth/kakao/test:
 *   get:
 *     summary: 환경 설정 테스트
 *     tags: [카카오 인증]
 *     description: 카카오 인증 관련 환경 설정을 확인합니다.
 *     responses:
 *       200:
 *         description: 환경 설정 확인 완료
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
 *                   example: "환경 설정 확인 완료"
 *                 environment:
 *                   type: object
 *                   description: 환경 변수 상태
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: 서버 내부 오류
 */

// 테스트용 환경 확인
router.get('/test', kakaoAuthController.testEnvironment);

module.exports = router;
