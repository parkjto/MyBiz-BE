import express from 'express';
import { 
  testMockProcessing, 
  testMockBatchProcessing, 
  getMockServiceStatus, 
  testMockOcrService, 
  testMockGptService 
} from '../controllers/mockTestController.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     MockTestRequest:
 *       type: object
 *       properties:
 *         testType:
 *           type: string
 *           enum: [positive, negative, mixed, default]
 *           description: 테스트할 리뷰 타입
 *         testText:
 *           type: string
 *           description: GPT 서비스 테스트용 텍스트
 */

/**
 * @swagger
 * /api/mock-test/single:
 *   post:
 *     summary: 모킹 모드 단일 이미지 처리 테스트
 *     tags: [Mock Test]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               testType:
 *                 type: string
 *                 enum: [positive, negative, mixed, default]
 *                 description: 테스트할 리뷰 타입
 *     responses:
 *       200:
 *         description: 모킹 테스트 성공
 *       500:
 *         description: 서버 오류
 */
router.post('/single', testMockProcessing);

/**
 * @swagger
 * /api/mock-test/batch:
 *   post:
 *     summary: 모킹 모드 배치 이미지 처리 테스트
 *     tags: [Mock Test]
 *     responses:
 *       200:
 *         description: 모킹 배치 테스트 성공
 *       500:
 *         description: 서버 오류
 */
router.post('/batch', testMockBatchProcessing);

/**
 * @swagger
 * /api/mock-test/status:
 *   get:
 *     summary: 모킹 서비스 상태 확인
 *     tags: [Mock Test]
 *     responses:
 *       200:
 *         description: 서비스 상태 확인 성공
 *       500:
 *         description: 서버 오류
 */
router.get('/status', getMockServiceStatus);

/**
 * @swagger
 * /api/mock-test/ocr:
 *   post:
 *     summary: 모킹 OCR 서비스 직접 테스트
 *     tags: [Mock Test]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testType
 *             properties:
 *               testType:
 *                 type: string
 *                 enum: [positive, negative, mixed, default]
 *                 description: 테스트할 리뷰 타입
 *     responses:
 *       200:
 *         description: OCR 서비스 테스트 성공
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */
router.post('/ocr', testMockOcrService);

/**
 * @swagger
 * /api/mock-test/gpt:
 *   post:
 *     summary: 모킹 GPT 서비스 직접 테스트
 *     tags: [Mock Test]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testText
 *             properties:
 *               testText:
 *                 type: string
 *                 description: GPT 서비스 테스트용 텍스트
 *     responses:
 *       200:
 *         description: GPT 서비스 테스트 성공
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */
router.post('/gpt', testMockGptService);

export default router;
