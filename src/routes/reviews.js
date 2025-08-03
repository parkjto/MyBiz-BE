/**
 * @swagger
 * tags:
 *   name: Crawling
 *   description: 네이버 리뷰 크롤링 관련 API
 */

// 리뷰 관련 라우트
const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');

// 기존 라우트
/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: 리뷰 목록 조회
 *     tags: [Reviews]
 *     responses:
 *       200:
 *         description: 리뷰 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "리뷰 목록 조회 성공"
 */
router.get('/', reviewsController.getReviews);

// 매장 검색 엔드포인트
/**
 * @swagger
 * /api/reviews/search-stores:
 *   get:
 *     summary: 매장 검색
 *     description: 매장명이나 주소로 매장을 검색하고 Place ID를 추출합니다.
 *     tags: [Crawling]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: 검색할 매장명이나 주소
 *         example: "스타벅스 강남점"
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
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                       example: "스타벅스 강남점"
 *                     stores:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 0
 *                           name:
 *                             type: string
 *                             example: "스타벅스 강남점"
 *                           address:
 *                             type: string
 *                             example: "서울 강남구 강남대로 396"
 *                           phone:
 *                             type: string
 *                             example: "02-1234-5678"
 *                           category:
 *                             type: string
 *                             example: "카페"
 *                           placeId:
 *                             type: string
 *                             example: "1234567890"
 *                           coordinateId:
 *                             type: string
 *                             example: "coord_1234567890"
 *                           mapUrl:
 *                             type: string
 *                             example: "https://map.naver.com/p/entry/place/1234567890"
 *                           hasPlaceId:
 *                             type: boolean
 *                             example: true
 *                     total:
 *                       type: integer
 *                       example: 3
 *                     hasResults:
 *                       type: boolean
 *                       example: true
 *                     placeIdAvailable:
 *                       type: boolean
 *                       example: true
 *                 message:
 *                   type: string
 *                   example: "3개의 매장을 찾았습니다."
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
 *                   example: "매장명이나 주소를 입력해주세요."
 *       500:
 *         description: 서버 오류
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
 *                   example: "매장 검색 중 오류가 발생했습니다."
 */
router.get('/search-stores', reviewsController.searchStores);

// 매장명 기반 리뷰 크롤링 엔드포인트
/**
 * @swagger
 * /api/reviews/crawl-by-store:
 *   post:
 *     summary: 매장명으로 리뷰 크롤링
 *     description: 매장명을 입력받아 검색 후 선택한 매장의 리뷰를 크롤링합니다.
 *     tags: [Crawling]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storeName
 *             properties:
 *               storeName:
 *                 type: string
 *                 description: 검색할 매장명
 *                 example: "스타벅스 강남점"
 *               storeIndex:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *                 description: 검색 결과에서 선택할 매장 인덱스
 *                 example: 0
 *               level:
 *                 type: string
 *                 enum: [basic, intermediate, advanced]
 *                 default: basic
 *                 description: 크롤링 레벨
 *                 example: "basic"
 *               maxReviews:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 description: "최대 크롤링할 리뷰 수 (기본값: 레벨별 설정값)"
 *                 example: 30
 *           example:
 *             storeName: "스타벅스 강남점"
 *             storeIndex: 0
 *             level: "intermediate"
 *             maxReviews: 30
 *     responses:
 *       200:
 *         description: 리뷰 크롤링 성공
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
 *                     store:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "스타벅스 강남점"
 *                         address:
 *                           type: string
 *                           example: "서울 강남구 강남대로 396"
 *                         phone:
 *                           type: string
 *                           example: "02-1234-5678"
 *                         category:
 *                           type: string
 *                           example: "카페"
 *                         placeId:
 *                           type: string
 *                           example: "1234567890"
 *                         mapUrl:
 *                           type: string
 *                           example: "https://map.naver.com/p/entry/place/1234567890"
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           author:
 *                             type: string
 *                             example: "사용자1"
 *                           content:
 *                             type: string
 *                             example: "맛있어요!"
 *                           visitDate:
 *                             type: string
 *                             example: "2024-01-15"
 *                           visitCount:
 *                             type: string
 *                             example: "1"
 *                           photoCount:
 *                             type: integer
 *                             example: 0
 *                     totalCount:
 *                       type: integer
 *                       example: 30
 *                     crawledAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T22:30:00.000Z"
 *                     crawlingMethod:
 *                       type: string
 *                       example: "중급 레벨"
 *                     analysis:
 *                       type: object
 *                       properties:
 *                         level:
 *                           type: string
 *                           example: "intermediate"
 *                         accuracy:
 *                           type: string
 *                           example: "75-85%"
 *                         reliability:
 *                           type: string
 *                           example: "보통"
 *                         warning:
 *                           type: string
 *                           example: "📊 보통 수준의 분석입니다 (75-85%)"
 *                         recommendation:
 *                           type: string
 *                           example: "참고용으로 활용하세요"
 *                     crawlingHistory:
 *                       type: object
 *                       properties:
 *                         dailyCount:
 *                           type: integer
 *                           example: 40
 *                         sessionCount:
 *                           type: integer
 *                           example: 4
 *                         lastSessionTime:
 *                           type: string
 *                           example: "2024-01-15 오후 10:30:00"
 *                     searchInfo:
 *                       type: object
 *                       properties:
 *                         originalQuery:
 *                           type: string
 *                           example: "스타벅스 강남점"
 *                         totalStoresFound:
 *                           type: integer
 *                           example: 3
 *                         selectedStoreIndex:
 *                           type: integer
 *                           example: 0
 *                 message:
 *                   type: string
 *                   example: "스타벅스 강남점에서 30개의 리뷰를 성공적으로 크롤링했습니다. (75-85% 정확도)"
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
 *         description: 매장을 찾을 수 없음
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
 *                   example: "매장을 찾을 수 없습니다."
 *                 message:
 *                   type: string
 *                   example: "\"존재하지 않는 매장\" 매장을 찾을 수 없습니다. 매장명을 다시 확인해주세요."
 *       429:
 *         description: 크롤링 제한됨
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
 *                   example: "크롤링 제한"
 *                 message:
 *                   type: string
 *                   example: "현재 크롤링이 제한되어 있습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       $ref: '#/components/schemas/CrawlingStatus'
 *                     nextBestTime:
 *                       type: string
 *                       example: "2024-01-15 오후 10:00:00"
 *                     selectedStore:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "스타벅스 강남점"
 *                         address:
 *                           type: string
 *                           example: "서울 강남구 강남대로 396"
 *                         placeId:
 *                           type: string
 *                           example: "1234567890"
 *       500:
 *         description: 서버 오류
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
 *                   example: "리뷰 크롤링 중 오류가 발생했습니다."
 */
router.post('/crawl-by-store', reviewsController.crawlReviewsByStoreName);

// 크롤링 상태 확인 엔드포인트
/**
 * @swagger
 * /api/reviews/crawling-status:
 *   get:
 *     summary: 현재 크롤링 가능 여부 확인
 *     description: 현재 시간, 사용량, 제한사항을 고려하여 크롤링 가능 여부를 확인합니다.
 *     tags: [Crawling]
 *     parameters:
 *       - in: query
 *         name: requestedReviews
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: 요청할 리뷰 수
 *         example: 10
 *     responses:
 *       200:
 *         description: 크롤링 가능
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CrawlingStatus'
 *             example:
 *               success: true
 *               data:
 *                 status: "크롤링 가능"
 *                 statusCode: "success"
 *                 canCrawl: true
 *                 currentTime: "2024-01-15 22:30:00"
 *                 timeRecommendation: "[INFO] 오프피크 시간대입니다. 크롤링에 적합합니다."
 *                 dayRecommendation: "[INFO] 주말입니다. 더 많은 크롤링이 가능합니다."
 *                 limits:
 *                   dailyCount: 10
 *                   dailyLimit: 50
 *                   remainingDaily: 40
 *                   usagePercentage: 20
 *                   maxReviewsPerSession: 20
 *                 recommendations:
 *                   suggestedReviews: 10
 *                   suggestedDelay: 3000
 *                   riskAssessment: "안전"
 *                   nextBestTime: "현재 시간이 최적입니다."
 *                   tips: ["새벽 시간대(02:00-05:00)에 크롤링하면 가장 안전합니다."]
 *               message: "크롤링을 시작할 수 있습니다."
 *       429:
 *         description: 크롤링 제한됨
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CrawlingStatus'
 *             example:
 *               success: true
 *               data:
 *                 status: "크롤링 제한됨"
 *                 statusCode: "time_restricted"
 *                 canCrawl: false
 *                 currentTime: "2024-01-15 14:30:00"
 *                 timeRecommendation: "[WARNING] 업무 시간대입니다. 크롤링을 최소화하세요."
 *                 dayRecommendation: "[WARNING] 평일입니다. 업무 시간대를 피해 크롤링하세요."
 *                 limits:
 *                   dailyCount: 0
 *                   dailyLimit: 50
 *                   remainingDaily: 50
 *                   usagePercentage: 0
 *                   maxReviewsPerSession: 20
 *                 recommendations:
 *                   suggestedReviews: 10
 *                   suggestedDelay: 3000
 *                   riskAssessment: "위험"
 *                   nextBestTime: "2024-01-15 오후 10:00:00"
 *                   tips: ["업무 시간대에는 크롤링을 최소화하여 안전하게 사용하세요."]
 *               message: "크롤링이 제한되어 있습니다: 현재는 업무 시간대입니다. 오후 10시 이후에 크롤링하세요."
 */
router.get('/crawling-status', reviewsController.checkCrawlingStatus);

// 크롤링 이력 조회 엔드포인트
/**
 * @swagger
 * /api/reviews/crawling-history:
 *   get:
 *     summary: 크롤링 이력 조회
 *     description: 일일 크롤링 사용량, 세션 수, 다음 리셋 시간 등의 이력 정보를 조회합니다.
 *     tags: [Crawling]
 *     responses:
 *       200:
 *         description: 크롤링 이력 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CrawlingHistory'
 *             example:
 *               success: true
 *               data:
 *                 dailyCount: 25
 *                 dailyLimit: 50
 *                 remainingDaily: 25
 *                 sessionCount: 3
 *                 maxSessionsPerDay: 10
 *                 lastSessionTime: "2024-01-15 오후 2:30:00"
 *                 usagePercentage: 50
 *                 status: "보통"
 *                 nextResetTime: "7시간 30분 후"
 *               message: "크롤링 이력이 조회되었습니다."
 */
router.get('/crawling-history', reviewsController.getCrawlingHistory);

// 안전한 크롤링 실행 엔드포인트
/**
 * @swagger
 * /api/reviews/crawl:
 *   post:
 *     summary: 안전한 크롤링 실행
 *     description: 크롤링 제한을 확인한 후 안전하게 네이버 리뷰를 크롤링합니다.
 *     tags: [Crawling]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrawlingRequest'
 *           example:
 *             placeId: "1234567890"
 *             maxReviews: 20
 *             level: "basic"
 *     responses:
 *       200:
 *         description: 크롤링 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CrawlingResponse'
 *             example:
 *               success: true
 *               data:
 *                 placeId: "1234567890"
 *                 reviews: [
 *                   {
 *                     author: "사용자1",
 *                     content: "맛있어요!",
 *                     visitDate: "2024-01-15",
 *                     visitCount: 1,
 *                     photoCount: 0
 *                   }
 *                 ]
 *                 totalCount: 15
 *                 crawledAt: "2024-01-15T22:30:00.000Z"
 *                 crawlingHistory:
 *                   dailyCount: 40
 *                   sessionCount: 4
 *                   lastSessionTime: "2024-01-15 오후 10:30:00"
 *               message: "15개의 리뷰를 성공적으로 크롤링했습니다."
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
 *                   example: "placeId가 필요합니다."
 *                 message:
 *                   type: string
 *                   example: "매장 ID를 입력해주세요."
 *       429:
 *         description: 크롤링 제한됨
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
 *                   example: "크롤링 제한"
 *                 message:
 *                   type: string
 *                   example: "현재 크롤링이 제한되어 있습니다."
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       $ref: '#/components/schemas/CrawlingStatus'
 *                     nextBestTime:
 *                       type: string
 *                       example: "2024-01-15 오후 10:00:00"
 */
router.post('/crawl', reviewsController.executeSafeCrawling);

module.exports = router;
