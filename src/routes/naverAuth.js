// 네이버 인증 라우터

const express = require('express');
const router = express.Router();
const naverAuthController = require('../controllers/naverAuthController');

/**
 * @swagger
 * /api/auth/naver/naverlogin:
 *   get:
 *     summary: 네이버 로그인 시작
 *     tags: [네이버 인증]
 *     description: 네이버 OAuth 인증 URL을 생성하고 HTML 링크를 반환합니다.
 *     responses:
 *       200:
 *         description: 네이버 로그인 HTML 링크
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "<a href='https://nid.naver.com/oauth2.0/authorize?...'><img height='50' src='http://static.nid.naver.com/oauth/small_g_in.PNG'/></a>"
 *       500:
 *         description: 서버 내부 오류
 */

// 네이버 로그인 시작
router.get('/naverlogin', naverAuthController.naverLogin);

/**
 * @swagger
 * /api/auth/naver/callback:
 *   get:
 *     summary: 네이버 OAuth 콜백 처리
 *     tags: [네이버 인증]
 *     description: 네이버 OAuth 인증 후 콜백을 처리하고 사용자 정보를 조회합니다.
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: 네이버에서 발급한 인가 코드
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: OAuth state 값
 *     responses:
 *       200:
 *         description: 콜백 처리 완료
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "DB에 저장하고 랜드페이지로 redirect"
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 내부 오류
 */

// 네이버 OAuth 콜백 처리
router.get('/callback', naverAuthController.naverLoginCallback);

module.exports = router;
