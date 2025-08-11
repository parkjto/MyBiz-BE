/**
 * @swagger
 * tags:
 *   name: Stores
 *   description: 매장 검색 및 Place ID 추출 관련 API (6단계 플로우)
 */

const express = require('express');
const router = express.Router();
const StoresController = require('../controllers/storesController');

// 컨트롤러 인스턴스 생성
const storesController = new StoresController();

// ===== 1단계: 매장 검색 =====
/**
 * @swagger
 * /api/stores/search:
 *   post:
 *     summary: 1단계 - 매장 검색
 *     description: 사용자가 매장명/주소로 매장을 검색합니다.
 *     tags: [Stores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: 검색어 (상호명 또는 주소)
 *                 example: "신월3동 칼포니치킨"
 *               display:
 *                 type: integer
 *                 default: 10
 *                 description: 검색 결과 수
 *                 example: 10
 *     responses:
 *       200:
 *         description: 매장 검색 성공
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
 *                     query:
 *                       type: string
 *                       example: "신월3동 칼포니치킨"
 *                     totalCount:
 *                       type: integer
 *                       example: 5
 *                     stores:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                             example: "칼포니치킨"
 *                           address:
 *                             type: string
 *                             example: "서울특별시 양천구 신월로 128"
 *                           roadAddress:
 *                             type: string
 *                             example: "서울특별시 양천구 신월로 128"
 *                           telephone:
 *                             type: string
 *                             example: "02-1234-5678"
 *                           category:
 *                             type: string
 *                             example: "음식점>치킨"
 *                           mapx:
 *                             type: string
 *                             example: "1269780493"
 *                           mapy:
 *                             type: string
 *                             example: "375672475"
 *                     searchedAt:
 *                       type: string
 *                       example: "2024-01-15T22:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "5개의 매장을 찾았습니다."
 */
router.post('/search', storesController.searchStores.bind(storesController));

// ===== 2단계: 사용자 매장 선택 =====
/**
 * @swagger
 * /api/stores/select:
 *   post:
 *     summary: 2단계 - 사용자 매장 선택
 *     description: 검색된 매장 리스트에서 사용자가 매장을 선택하여 저장합니다.
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             oneOf:
 *               - type: object
 *                 required:
 *                   - selectedIndex
 *                 properties:
 *                   selectedIndex:
 *                     type: integer
 *                     description: 검색 결과에서 선택한 매장의 인덱스 (세션 기반)
 *                     example: 0
 *               - type: object
 *                 required:
 *                   - storeData
 *                 properties:
 *                   storeData:
 *                     type: object
 *                     description: 선택한 매장의 전체 정보 (권장 방식)
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "칼포니치킨"
 *                       address:
 *                         type: string
 *                         example: "서울특별시 양천구 신월로 128"
 *                       roadAddress:
 *                         type: string
 *                         example: "서울특별시 양천구 신월로 128"
 *                       telephone:
 *                         type: string
 *                         example: "02-1234-5678"
 *                       category:
 *                         type: string
 *                         example: "음식점>치킨"
 *                       mapx:
 *                         type: string
 *                         example: "1269780493"
 *                       mapy:
 *                         type: string
 *                         example: "375672475"
 *     responses:
 *       200:
 *         description: 매장 선택 성공
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
 *                   example: "매장이 성공적으로 선택되었습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     store:
 *                       type: object
 *                       description: 저장된 매장 정보
 *                     selectedIndex:
 *                       type: integer
 *                       example: 0
 *                     selectedAt:
 *                       type: string
 *                       example: "2024-01-15T22:30:00.000Z"
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 인증 실패
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
 */
router.post('/select', storesController.selectStore.bind(storesController));

// ===== 3단계: Place ID 추출 (다단계 시도) =====
/**
 * @swagger
 * /api/stores/extract-place-id:
 *   post:
 *     summary: 3단계 - Place ID 추출 (다단계 시도)
 *     description: 선택된 매장의 Place ID를 여러 방법으로 추출합니다. 2-1 스크래핑, 2-2 allSearch API, 2-3 수동 확인
 *     tags: [Stores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storeData
 *             properties:
 *               storeData:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                     example: "칼포니치킨"
 *                   address:
 *                     type: string
 *                     example: "서울특별시 양천구 신월동 1002-4"
 *                   roadAddress:
 *                     type: string
 *                     example: "서울특별시 양천구 신월로 128"
 *                   category:
 *                     type: string
 *                     example: "음식점>치킨"
 *                   mapx:
 *                     type: string
 *                     example: "1268381536"
 *                   mapy:
 *                     type: string
 *                     example: "375164998"
 *     responses:
 *       200:
 *         description: Place ID 추출 성공
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
 *                     placeId:
 *                       type: string
 *                       example: "1234567890"
 *                     placeUrl:
 *                       type: string
 *                       example: "https://m.place.naver.com/place/1234567890/home"
 *                     reviewUrl:
 *                       type: string
 *                       example: "https://m.place.naver.com/place/1234567890/review"
 *                     extractionMethod:
 *                       type: string
 *                       example: "scraping"
 *                     extractionSteps:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           step:
 *                             type: string
 *                             example: "2-1"
 *                           method:
 *                             type: string
 *                             example: "스크래핑"
 *                           success:
 *                             type: boolean
 *                             example: true
 *                           placeId:
 *                             type: string
 *                             example: "1234567890"
 *                     successRate:
 *                       type: number
 *                       example: 0.85
 *                     confidence:
 *                       type: number
 *                       example: 0.85
 *                     extractedAt:
 *                       type: string
 *                       example: "2024-01-15T22:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "Place ID를 성공적으로 추출했습니다: 1234567890 (스크래핑 방식)"
 */
router.post('/extract-place-id', storesController.extractPlaceId.bind(storesController));

// ===== 4단계: Place ID 추출 상태 확인 =====
/**
 * @swagger
 * /api/stores/extract-place-id/status:
 *   get:
 *     summary: 4단계 - Place ID 추출 상태 확인
 *     description: 각 추출 방법별 성공률과 시스템 상태를 확인합니다.
 *     tags: [Stores]
 *     responses:
 *       200:
 *         description: 상태 확인 성공
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
 *                     methods:
 *                       type: object
 *                       properties:
 *                         "2-1":
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               example: "스크래핑"
 *                             successRate:
 *                               type: number
 *                               example: 0.85
 *                             description:
 *                               type: string
 *                               example: "네이버 검색 스크래핑"
 *                         "2-2":
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               example: "allSearch API"
 *                             successRate:
 *                               type: number
 *                               example: 0.4
 *                             description:
 *                               type: string
 *                               example: "네이버 지도 allSearch API"
 *                         "2-3":
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               example: "수동 확인"
 *                             successRate:
 *                               type: number
 *                               example: 1.0
 *                             description:
 *                               type: string
 *                               example: "수동 확인 안내"
 *                     overallSuccessRate:
 *                       type: number
 *                       example: 0.85
 *                     lastUpdated:
 *                       type: string
 *                       example: "2024-01-15T22:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "Place ID 추출 시스템 상태 확인 완료"
 */
router.get('/extract-place-id/status', storesController.getPlaceIdExtractionStatus.bind(storesController));

// ===== 5단계: 매장 정보 저장 =====
/**
 * @swagger
 * /api/stores/save:
 *   post:
 *     summary: 5단계 - 매장 정보 저장
 *     description: Place ID가 추출된 매장 정보를 데이터베이스에 저장합니다.
 *     tags: [Stores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storeData
 *             properties:
 *               storeData:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                     example: "칼포니치킨"
 *                   address:
 *                     type: string
 *                     example: "서울특별시 양천구 신월로 128"
 *                   roadAddress:
 *                     type: string
 *                     example: "서울특별시 양천구 신월로 128"
 *                   telephone:
 *                     type: string
 *                     example: "02-1234-5678"
 *                   category:
 *                     type: string
 *                     example: "음식점>치킨"
 *                   placeId:
 *                     type: string
 *                     example: "1234567890"
 *                   placeUrl:
 *                     type: string
 *                     example: "https://m.place.naver.com/place/1234567890/home"
 *                   reviewUrl:
 *                     type: string
 *                     example: "https://m.place.naver.com/place/1234567890/review"
 *     responses:
 *       200:
 *         description: 매장 저장 성공
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
 *                     storeId:
 *                       type: integer
 *                       example: 1
 *                     store:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "칼포니치킨"
 *                         place_id:
 *                           type: string
 *                           example: "1234567890"
 *                     savedAt:
 *                       type: string
 *                       example: "2024-01-15T22:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "매장 정보가 성공적으로 저장되었습니다."
 */
router.post('/save', storesController.saveStore.bind(storesController));

// ===== 6단계: AI 분석 =====
/**
 * @swagger
 * /api/stores/analyze-reviews:
 *   post:
 *     summary: 6단계 - AI 분석
 *     description: 수집된 리뷰를 AI로 분석하여 감성 분석, 키워드 추출 등을 수행합니다.
 *     tags: [Stores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reviewId
 *             properties:
 *               reviewId:
 *                 type: integer
 *                 description: 리뷰 ID
 *                 example: 1
 *     responses:
 *       200:
 *         description: AI 분석 성공
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
 *                     analysisId:
 *                       type: integer
 *                       example: 1
 *                     reviewId:
 *                       type: integer
 *                       example: 1
 *                     storeId:
 *                       type: integer
 *                       example: 1
 *                     sentiment:
 *                       type: object
 *                       properties:
 *                         overall:
 *                           type: string
 *                           example: "긍정적"
 *                         positive:
 *                           type: integer
 *                           example: 15
 *                         negative:
 *                           type: integer
 *                           example: 3
 *                     keywords:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["맛", "서비스", "친절"]
 *                     satisfactionScore:
 *                       type: integer
 *                       example: 85
 *                     improvementPoints:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["느리다"]
 *                     summary:
 *                       type: string
 *                       example: "10개 리뷰 분석 결과, 전반적으로 긍정적인 평가를 받고 있습니다."
 *                     analyzedAt:
 *                       type: string
 *                       example: "2024-01-15T22:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "리뷰 AI 분석이 완료되었습니다."
 */
router.post('/analyze-reviews', storesController.analyzeReviews.bind(storesController));

// ===== 전체 플로우 (선택사항) =====
/**
 * @swagger
 * /api/stores/full-flow:
 *   post:
 *     summary: 전체 플로우 실행 (1-6단계 통합)
 *     description: 1단계부터 6단계까지의 전체 플로우를 한 번에 실행합니다.
 *     tags: [Stores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - selectedStoreIndex
 *             properties:
 *               query:
 *                 type: string
 *                 description: 검색어 (상호명 또는 주소)
 *                 example: "신월3동 칼포니치킨"
 *               selectedStoreIndex:
 *                 type: integer
 *                 description: 사용자가 선택한 매장 인덱스 (0부터 시작)
 *                 example: 0
 *               
 *     responses:
 *       200:
 *         description: 전체 플로우 실행 성공
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
 *                     searchResult:
 *                       type: object
 *                       properties:
 *                         query:
 *                           type: string
 *                           example: "신월3동 칼포니치킨"
 *                         totalCount:
 *                           type: integer
 *                           example: 5
 *                         selectedStore:
 *                           type: object
 *                           properties:
 *                             title:
 *                               type: string
 *                               example: "칼포니치킨"
 *                             placeId:
 *                               type: string
 *                               example: "1234567890"
 *                     storeId:
 *                       type: integer
 *                       example: 1
 *                     reviewId:
 *                       type: integer
 *                       example: 1
 *                     analysisId:
 *                       type: integer
 *                       example: 1
 *                     analysis:
 *                       type: object
 *                       properties:
 *                         sentiment:
 *                           type: object
 *                           properties:
 *                             overall:
 *                               type: string
 *                               example: "긍정적"
 *                         keywords:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["맛", "서비스", "친절"]
 *                         satisfactionScore:
 *                           type: integer
 *                           example: 85
 *                     completedAt:
 *                       type: string
 *                       example: "2024-01-15T22:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "전체 플로우가 성공적으로 완료되었습니다."
 */
router.post('/full-flow', storesController.executeFullFlow.bind(storesController));

module.exports = router; 