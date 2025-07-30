const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/auth/kakao/login:
 *   post:
 *     summary: 카카오 로그인
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: "카카오에서 받은 인가 코드"
 *               storeName:
 *                 type: string
 *                 example: "매장명"
 *               phoneNumber:
 *                 type: string
 *                 example: "010-1234-5678"
 *     responses:
 *       200:
 *         description: 카카오 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 카카오 로그인 성공
 *                 user:
 *                   type: object
 *                   description: "유저 정보 객체"
 *                 token:
 *                   type: string
 *                   example: "JWT 토큰"
 *                 isNewUser:
 *                   type: boolean
 *                   example: true
 *
 * /api/auth/naver/login:
 *   post:
 *     summary: 네이버 로그인
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: "네이버에서 받은 인가 코드"
 *               state:
 *                 type: string
 *                 example: "네이버에서 받은 state"
 *               storeName:
 *                 type: string
 *                 example: "매장명"
 *               phoneNumber:
 *                 type: string
 *                 example: "010-1234-5678"
 *     responses:
 *       200:
 *         description: 네이버 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 네이버 로그인 성공
 *                 user:
 *                   type: object
 *                   description: "유저 정보 객체"
 *                 token:
 *                   type: string
 *                   example: "JWT 토큰"
 *                 isNewUser:
 *                   type: boolean
 *                   example: true
 *
 * /api/auth/store/search:
 *   post:
 *     summary: 매장 정보 검색
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeName:
 *                 type: string
 *                 example: "매장명"
 *               phoneNumber:
 *                 type: string
 *                 example: "010-1234-5678"
 *     responses:
 *       200:
 *         description: 매장 정보 검색 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "매장명"
 *                     address:
 *                       type: string
 *                       example: "서울시 강남구..."
 *                     phone:
 *                       type: string
 *                       example: "010-1234-5678"
 *                     placeId:
 *                       type: string
 *                       example: "12345678"
 *                 message:
 *                   type: string
 *                   example: "매장 정보를 찾았습니다."
 *
 * /api/auth/store/confirm:
 *   post:
 *     summary: 매장 정보 확인 및 저장
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeInfo:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "매장명"
 *                   address:
 *                     type: string
 *                     example: "서울시 강남구..."
 *                   phone:
 *                     type: string
 *                     example: "010-1234-5678"
 *                   placeId:
 *                     type: string
 *                     example: "12345678"
 *     responses:
 *       200:
 *         description: 매장 정보 저장 성공
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
 *                   example: "매장 정보가 저장되었습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     placeId:
 *                       type: string
 *                       example: "12345678"
 *
 * /api/auth/store/info:
 *   get:
 *     summary: 사용자 매장 정보 조회
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 매장 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "매장명"
 *                     address:
 *                       type: string
 *                       example: "서울시 강남구..."
 *                     phone:
 *                       type: string
 *                       example: "010-1234-5678"
 *                     placeId:
 *                       type: string
 *                       example: "12345678"
 *                     verified:
 *                       type: boolean
 *                       example: true
 *
 * /api/auth/logout:
 *   post:
 *     summary: 로그아웃
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 로그아웃 성공
 */

// 소셜 로그인
router.post('/kakao/login', authController.kakaoLogin);
router.post('/naver/login', authController.naverLogin);

// 매장 정보 관련 API
router.post('/store/search', authController.searchStoreInfo);
router.post('/store/confirm', authMiddleware.verifyToken, authController.confirmStoreInfo);
router.get('/store/info', authMiddleware.verifyToken, authController.getStoreInfo);

// 로그아웃
router.post('/logout', authController.logout);

module.exports = router;
