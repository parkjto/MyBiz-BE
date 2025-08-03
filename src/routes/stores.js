/**
 * @swagger
 * tags:
 *   name: Stores
 *   description: 매장 검색 및 Place ID 추출 관련 API
 */

const express = require('express');
const router = express.Router();
const storesController = require('../controllers/storesController');

// 매장 검색 엔드포인트
/**
 * @swagger
 * /api/stores/search:
 *   get:
 *     summary: 매장 검색
 *     description: 상호명이나 주소로 매장을 검색합니다.
 *     tags: [Stores]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: 검색어 (상호명 또는 주소)
 *         example: "신월3동 칼포니치킨"
 *       - in: query
 *         name: display
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           default: 5
 *         description: 검색 결과 수
 *         example: 5
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
 *                   type: array
 *                   items:
 *                     type: object
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
 *                       phone:
 *                         type: string
 *                         example: "02-1234-5678"
 *                       category:
 *                         type: string
 *                         example: "음식점>치킨"
 *                       coordinates:
 *                         type: object
 *                         properties:
 *                           x:
 *                             type: string
 *                             example: "1269780493"
 *                           y:
 *                             type: string
 *                             example: "375672475"
 *                 total:
 *                   type: integer
 *                   example: 5
 *                 message:
 *                   type: string
 *                   example: "5개의 매장을 찾았습니다."
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
 *                   example: "검색어가 필요합니다."
 *                 message:
 *                   type: string
 *                   example: "검색어를 입력해주세요."
 */
router.get('/search', storesController.searchStores);

// Place ID 추출 엔드포인트 (개선된 버전)
/**
 * @swagger
 * /api/stores/extract-place-id:
 *   post:
 *     summary: Place ID 추출 (개선된 버전)
 *     description: 여러 방법을 순차적으로 시도하여 네이버 지도에서 Place ID를 추출합니다.
 *     tags: [Stores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: 매장명
 *                 example: "칼포니치킨"
 *               address:
 *                 type: string
 *                 description: 주소
 *                 example: "서울특별시 양천구 신월동 1002-4"
 *               roadAddress:
 *                 type: string
 *                 description: 도로명주소
 *                 example: "서울특별시 양천구 신월로 128"
 *               district:
 *                 type: string
 *                 description: 지역명
 *                 example: "신월동"
 *               x:
 *                 type: string
 *                 description: X 좌표
 *                 example: "1268381536"
 *               y:
 *                 type: string
 *                 description: Y 좌표
 *                 example: "375164998"
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
 *                       example: "selenium"
 *                     successRate:
 *                       type: number
 *                       example: 0.95
 *                     confidence:
 *                       type: number
 *                       example: 0.95
 *                     extractedAt:
 *                       type: string
 *                       example: "2024-01-15T22:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "Place ID를 성공적으로 추출했습니다: 1234567890"
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
 *                   example: "매장명이 필요합니다."
 *                 message:
 *                   type: string
 *                   example: "매장명을 입력해주세요."
 *       404:
 *         description: Place ID 추출 실패
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     manualSteps:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["1. https://map.naver.com 접속", "2. 매장 검색", "3. URL에서 Place ID 확인"]
 *                     method:
 *                       type: string
 *                       example: "manual"
 *                     successRate:
 *                       type: number
 *                       example: 1.0
 *                 message:
 *                   type: string
 *                   example: "자동 추출에 실패했습니다. 수동으로 확인해주세요."
 */
router.post('/extract-place-id', storesController.extractPlaceId);

// Place ID 추출 상태 확인 엔드포인트
/**
 * @swagger
 * /api/stores/extract-place-id/status:
 *   get:
 *     summary: Place ID 추출 상태 확인
 *     description: 현재 Place ID 추출 시스템의 상태와 성공률을 확인합니다.
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
 *                         allsearch:
 *                           type: object
 *                           properties:
 *                             successRate:
 *                               type: number
 *                               example: 0.3
 *                             description:
 *                               type: string
 *                               example: "네이버 지도 allSearch API"
 *                         selenium:
 *                           type: object
 *                           properties:
 *                             successRate:
 *                               type: number
 *                               example: 0.95
 *                             description:
 *                               type: string
 *                               example: "브라우저 자동화 (Puppeteer)"
 *                         scraping:
 *                           type: object
 *                           properties:
 *                             successRate:
 *                               type: number
 *                               example: 0.8
 *                             description:
 *                               type: string
 *                               example: "네이버 검색 스크래핑"
 *                         manual:
 *                           type: object
 *                           properties:
 *                             successRate:
 *                               type: number
 *                               example: 1.0
 *                             description:
 *                               type: string
 *                               example: "수동 확인"
 *                     overallSuccessRate:
 *                       type: number
 *                       example: 0.95
 *                     lastUpdated:
 *                       type: string
 *                       example: "2024-01-15T22:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "Place ID 추출 시스템 상태 확인 완료"
 */
router.get('/extract-place-id/status', storesController.getPlaceIdExtractionStatus);

// Place ID 검증 엔드포인트
/**
 * @swagger
 * /api/stores/validate-place-id:
 *   post:
 *     summary: Place ID 검증
 *     description: Place ID가 유효한지 확인하고 관련 정보를 반환합니다.
 *     tags: [Stores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - placeId
 *             properties:
 *               placeId:
 *                 type: string
 *                 description: 검증할 Place ID
 *                 example: "1234567890"
 *     responses:
 *       200:
 *         description: Place ID 검증 성공
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
 *                     isValid:
 *                       type: boolean
 *                       example: true
 *                     placeId:
 *                       type: string
 *                       example: "1234567890"
 *                     placeUrl:
 *                       type: string
 *                       example: "https://m.place.naver.com/place/1234567890/home"
 *                     reviewUrl:
 *                       type: string
 *                       example: "https://m.place.naver.com/place/1234567890/review"
 *                     storeInfo:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "칼포니치킨"
 *                         address:
 *                           type: string
 *                           example: "서울특별시 양천구 신월로 128"
 *                 message:
 *                   type: string
 *                   example: "Place ID가 유효합니다."
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
 *                   example: "Place ID가 필요합니다."
 *                 message:
 *                   type: string
 *                   example: "Place ID를 입력해주세요."
 */
router.post('/validate-place-id', storesController.validatePlaceId);

// 통합 매장 검색 엔드포인트
/**
 * @swagger
 * /api/stores/find:
 *   post:
 *     summary: 통합 매장 검색
 *     description: 상호명이나 주소로 매장을 검색하고 Place ID를 추출합니다.
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
 *               extractPlaceId:
 *                 type: boolean
 *                 default: true
 *                 description: Place ID 추출 여부
 *                 example: true
 *     responses:
 *       200:
 *         description: 통합 매장 검색 성공
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
 *                       name:
 *                         type: string
 *                         example: "칼포니치킨"
 *                       address:
 *                         type: string
 *                         example: "서울특별시 양천구 신월로 128"
 *                       placeId:
 *                         type: string
 *                         example: "1234567890"
 *                       mapUrl:
 *                         type: string
 *                         example: "https://map.naver.com/p/entry/place/1234567890"
 *                 total:
 *                   type: integer
 *                   example: 1
 *                 message:
 *                   type: string
 *                   example: "1개의 매장을 찾았습니다. Place ID 추출을 완료했습니다."
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
 *                   example: "검색어가 필요합니다."
 *                 message:
 *                   type: string
 *                   example: "검색어를 입력해주세요."
 */
router.post('/find', storesController.findStoreByQuery);

// 해커톤용 통합 매장 검색 엔드포인트
/**
 * @swagger
 * /api/stores/find-with-selection:
 *   post:
 *     summary: 해커톤용 통합 매장 검색 (검색 + Place ID 추출)
 *     description: 상호명이나 주소로 매장을 검색하고 선택된 매장의 Place ID를 추출합니다.
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
 *               selectedIndex:
 *                 type: integer
 *                 default: 0
 *                 description: 사용자가 선택한 매장 인덱스 (0부터 시작)
 *                 example: 0
 *     responses:
 *       200:
 *         description: 통합 매장 검색 성공
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
 *                     selectedStore:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "칼포니치킨"
 *                         address:
 *                           type: string
 *                           example: "서울특별시 양천구 신월동 1002-4"
 *                         placeId:
 *                           type: string
 *                           example: "1234567890"
 *                         mapUrl:
 *                           type: string
 *                           example: "https://map.naver.com/p/entry/place/1234567890"
 *                     allStores:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           address:
 *                             type: string
 *                           coordinates:
 *                             type: object
 *                             properties:
 *                               x:
 *                                 type: string
 *                               y:
 *                                 type: string
 *                 total:
 *                   type: integer
 *                   example: 3
 *                 selectedIndex:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: "3개의 매장을 찾았습니다. 선택된 매장: 칼포니치킨"
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
 *                   example: "검색어가 필요합니다."
 *                 message:
 *                   type: string
 *                   example: "검색어를 입력해주세요."
 */
router.post('/find-with-selection', storesController.findStoreWithSelection);

// 선택된 매장의 Place ID 추출 엔드포인트
/**
 * @swagger
 * /api/stores/extract-place-id-for-selected:
 *   post:
 *     summary: 선택된 매장의 Place ID 추출 (사용자 선택 기반)
 *     description: 매장 검색 후 사용자가 선택한 매장의 좌표를 이용해 Place ID를 추출합니다.
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
 *                 example: "스타벅스"
 *               selectedIndex:
 *                 type: integer
 *                 default: 0
 *                 description: 사용자가 선택한 매장 인덱스 (0부터 시작)
 *                 example: 2
 *               extractPlaceId:
 *                 type: boolean
 *                 default: true
 *                 description: Place ID 추출 여부
 *                 example: true
 *     responses:
 *       200:
 *         description: 선택된 매장 Place ID 추출 성공
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
 *                     selectedStore:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "스타벅스 강남점"
 *                         address:
 *                           type: string
 *                           example: "서울특별시 강남구 역삼동 123-45"
 *                         placeId:
 *                           type: string
 *                           example: "1234567890"
 *                         mapUrl:
 *                           type: string
 *                           example: "https://map.naver.com/p/entry/place/1234567890"
 *                         coordinates:
 *                           type: object
 *                           properties:
 *                             x:
 *                               type: string
 *                               example: "1270280000"
 *                             y:
 *                               type: string
 *                               example: "374500000"
 *                     allStores:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           address:
 *                             type: string
 *                           coordinates:
 *                             type: object
 *                             properties:
 *                               x:
 *                                 type: string
 *                               y:
 *                                 type: string
 *                     total:
 *                       type: integer
 *                       example: 5
 *                     selectedIndex:
 *                       type: integer
 *                       example: 2
 *                     placeIdExtraction:
 *                       type: object
 *                       properties:
 *                         success:
 *                           type: boolean
 *                           example: true
 *                         message:
 *                           type: string
 *                           example: "Place ID를 성공적으로 추출했습니다: 1234567890"
 *                 message:
 *                   type: string
 *                   example: "5개의 매장을 찾았습니다. 선택된 매장: 스타벅스 강남점 (Place ID: 1234567890)"
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
 *                   example: "검색어가 필요합니다."
 *                 message:
 *                   type: string
 *                   example: "검색어를 입력해주세요."
 */
router.post('/extract-place-id-for-selected', storesController.extractPlaceIdForSelectedStore);

// allSearch API 직접 호출 엔드포인트
/**
 * @swagger
 * /api/stores/extract-place-id-by-coordinates:
 *   post:
 *     summary: 좌표 기반 Place ID 추출 (allSearch API)
 *     description: 매장명과 좌표를 이용해 allSearch API로 Place ID를 추출합니다.
 *     tags: [Stores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - mapx
 *               - mapy
 *             properties:
 *               query:
 *                 type: string
 *                 description: 매장명
 *                 example: "칼포니치킨"
 *               mapx:
 *                 type: string
 *                 description: X 좌표
 *                 example: "1268381536"
 *               mapy:
 *                 type: string
 *                 description: Y 좌표
 *                 example: "375164998"
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
 *                     name:
 *                       type: string
 *                       example: "칼포니치킨"
 *                     address:
 *                       type: string
 *                       example: "서울특별시 양천구 신월동 1002-4"
 *                     mapUrl:
 *                       type: string
 *                       example: "https://map.naver.com/p/entry/place/1234567890"
 *                     extractedAt:
 *                       type: string
 *                       example: "2024-01-15T22:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "Place ID를 성공적으로 추출했습니다: 1234567890"
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
 *                   example: "필수 파라미터가 누락되었습니다."
 *                 message:
 *                   type: string
 *                   example: "매장명과 좌표를 모두 입력해주세요."
 */
router.post('/extract-place-id-by-coordinates', storesController.extractPlaceIdByCoordinates);

// 수동 Place ID 확인 엔드포인트
/**
 * @swagger
 * /api/stores/manual-place-id-check:
 *   post:
 *     summary: 수동 Place ID 확인 안내
 *     description: Place ID 추출 실패 시 수동으로 확인할 수 있는 방법을 안내합니다.
 *     tags: [Stores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - selectedIndex
 *             properties:
 *               query:
 *                 type: string
 *                 description: 검색어
 *                 example: "신월3동 칼포니치킨"
 *               selectedIndex:
 *                 type: integer
 *                 description: 선택된 매장 인덱스
 *                 example: 0
 *     responses:
 *       200:
 *         description: 수동 확인 안내 성공
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
 *                     storeInfo:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "칼포니치킨"
 *                         address:
 *                           type: string
 *                           example: "서울특별시 양천구 신월동 1002-4"
 *                     manualCheckSteps:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [
 *                         "1. https://map.naver.com 접속",
 *                         "2. '칼포니치킨 신월동' 검색",
 *                         "3. 검색 결과에서 해당 매장 클릭",
 *                         "4. URL에서 /place/숫자 부분 확인"
 *                       ]
 *                     searchUrl:
 *                   type: string
 *                   example: "https://map.naver.com/v5/search/칼포니치킨%20신월동"
 *                 message:
 *                   type: string
 *                   example: "수동 확인 방법을 안내합니다."
 */
router.post('/manual-place-id-check', storesController.manualPlaceIdCheck);

// Place ID 수동 입력 엔드포인트 (임시 비활성화)

module.exports = router; 