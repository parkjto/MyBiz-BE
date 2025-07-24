const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

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
 *                   example: "카카오에서 받은 access_token"
 *
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

// 카카오 로그인 예시
router.post('/kakao/login', authController.kakaoLogin);

// 로그아웃 예시
router.post('/logout', authController.logout);

module.exports = router;
