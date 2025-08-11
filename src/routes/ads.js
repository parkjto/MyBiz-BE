/**
 * @swagger
 * tags:
 *   name: Ads
 *   description: AI 기반 광고 생성 및 관리 관련 API
 */

// 광고 관련 라우트
const express = require('express');
const router = express.Router();
const adsController = require('../controllers/adsController');

/**
 * @swagger
 * /api/ads:
 *   get:
 *     summary: 광고 목록 조회
 *     description: 매장의 광고 목록을 조회합니다.
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: 매장 ID
 *         example: "store-uuid-here"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, draft]
 *         description: 광고 상태
 *         example: "active"
 *     responses:
 *       200:
 *         description: 광고 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "ad-uuid-here"
 *                       title:
 *                         type: string
 *                         example: "맛있는 치킨을 만나보세요!"
 *                       content:
 *                         type: string
 *                         example: "신선한 재료로 만드는 특제 치킨"
 *                       status:
 *                         type: string
 *                         example: "active"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T22:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "광고 목록을 성공적으로 조회했습니다."
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/ads/generate:
 *   post:
 *     summary: AI 광고 자동 생성
 *     description: AI를 활용하여 매장 정보를 바탕으로 광고를 자동 생성합니다.
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storeId
 *               - adType
 *             properties:
 *               storeId:
 *                 type: string
 *                 description: 매장 ID
 *                 example: "store-uuid-here"
 *               adType:
 *                 type: string
 *                 enum: [slogan, description, social, banner]
 *                 description: 광고 유형
 *                 example: "slogan"
 *               targetAudience:
 *                 type: string
 *                 description: 타겟 고객층
 *                 example: "20-30대 직장인"
 *               tone:
 *                 type: string
 *                 enum: [friendly, professional, casual, formal]
 *                 description: 광고 톤
 *                 example: "friendly"
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 포함할 키워드
 *                 example: ["맛있음", "신선", "특제"]
 *     responses:
 *       200:
 *         description: 광고 생성 성공
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
 *                     id:
 *                       type: string
 *                       example: "ad-uuid-here"
 *                     title:
 *                       type: string
 *                       example: "맛있는 치킨을 만나보세요!"
 *                     content:
 *                       type: string
 *                       example: "신선한 재료로 만드는 특제 치킨, 지금 주문하세요!"
 *                     adType:
 *                       type: string
 *                       example: "slogan"
 *                     status:
 *                       type: string
 *                       example: "draft"
 *                     aiGenerated:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T22:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "AI 광고가 성공적으로 생성되었습니다."
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/ads/{id}:
 *   put:
 *     summary: 광고 수정
 *     description: 생성된 광고를 수정합니다.
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 광고 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: 광고 제목
 *                 example: "수정된 광고 제목"
 *               content:
 *                 type: string
 *                 description: 광고 내용
 *                 example: "수정된 광고 내용"
 *               status:
 *                 type: string
 *                 enum: [active, inactive, draft]
 *                 description: 광고 상태
 *     responses:
 *       200:
 *         description: 광고 수정 성공
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
 *                   example: "광고가 성공적으로 수정되었습니다."
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: 광고를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 *   delete:
 *     summary: 광고 삭제
 *     description: 광고를 삭제합니다.
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 광고 ID
 *     responses:
 *       200:
 *         description: 광고 삭제 성공
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
 *                   example: "광고가 성공적으로 삭제되었습니다."
 *       404:
 *         description: 광고를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/', adsController.getAds);
router.post('/generate', adsController.generateAd);
router.put('/:id', adsController.updateAd);
router.delete('/:id', adsController.deleteAd);

module.exports = router;
