const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
<<<<<<< Updated upstream
=======
const { verifyToken } = require('../middlewares/authMiddleware');
const { validate, schemas } = require('../middlewares/validateMiddleware');
>>>>>>> Stashed changes

/**
 * @swagger
 * /api/auth/kakao/login:
 *   post:
 *     summary: 카카오 로그인 예시
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               access_token:
 *                 type: string
 *                 example: "카카오에서 받은 access_token"
 *     responses:
 *       200:
 *         description: 카카오 로그인 예시 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 카카오 로그인 예시 성공
 *                 access_token:
 *                   type: string
<<<<<<< Updated upstream
 *                   example: "카카오에서 받은 access_token"
 *
=======
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
 * /api/auth/profile/update:
 *   put:
 *     tags: [Authentication]
 *     summary: 사용자 프로필 업데이트
 *     description: JWT 토큰을 사용하여 현재 로그인한 사용자의 정보를 업데이트합니다.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: 프로필 업데이트 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: 인증 실패
 *       400:
 *         description: 잘못된 요청
 * 
 * /api/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: 토큰 갱신
 *     description: 리프레시 토큰을 사용하여 새로운 액세스 토큰을 발급받습니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 리프레시 토큰
 *     responses:
 *       200:
 *         description: 토큰 갱신 성공
 *       401:
 *         description: 토큰 갱신 실패
 * 
>>>>>>> Stashed changes
 * /api/auth/logout:
 *   post:
 *     summary: 로그아웃 예시
 *     responses:
 *       200:
 *         description: 로그아웃 예시 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 로그아웃 예시 성공
 */

<<<<<<< Updated upstream
// 카카오 로그인 예시
router.post('/kakao/login', authController.kakaoLogin);
=======
// 카카오 로그인 (인가 코드로 로그인 처리) - 입력 검증 적용
router.post('/kakao/login', validate(schemas.kakaoLogin), authController.kakaoLogin);
>>>>>>> Stashed changes

// 로그아웃 예시
router.post('/logout', authController.logout);

<<<<<<< Updated upstream
// 네이버 로그인
router.get('/naverlogin', authController.naverLogin);
router.get('/naver/callback', authController.naverLoginCallback);
=======
// 사용자 프로필 조회 (인증 필요)
router.get('/profile', verifyToken, authController.getProfile);

// 사용자 프로필 업데이트 (인증 필요)
router.put('/profile', verifyToken, validate(schemas.updateProfile), authController.updateProfile);

// 토큰 갱신
router.post('/refresh', authController.refreshToken);

// 회원가입 완료 관련 (인증 필요)
router.post('/complete-registration', verifyToken, authController.completeRegistration);
router.get('/registration-status', verifyToken, authController.getRegistrationStatus);

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
      updateProfile: 'PUT /api/auth/profile - 사용자 프로필 업데이트 (JWT 필요)',
      refresh: 'POST /api/auth/refresh - 토큰 갱신',
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
>>>>>>> Stashed changes

module.exports = router;
