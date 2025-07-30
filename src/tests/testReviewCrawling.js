require('dotenv').config();
const axios = require('axios');
const reviewService = require('../services/reviewService');
const naverLocalService = require('../services/naverLocalService');

console.log('=== 리뷰 크롤링 환경 테스트 ===\n');

/**
 * 리뷰 크롤링 환경 테스트
 */
async function testReviewCrawlingEnvironment() {
  try {
    console.log('🔍 리뷰 크롤링 환경 테스트 시작...\n');

    // 1. 네이버 로컬 API로 매장 검색 및 Place ID 생성
    console.log('📋 1. 매장 검색 및 Place ID 생성 테스트');
    const searchResult = await naverLocalService.searchStore('스타벅스 강남점');
    
    if (searchResult.success && searchResult.data.length > 0) {
      const store = searchResult.data[0];
      console.log(`   ✅ 매장 검색 성공: ${store.title?.replace(/<[^>]*>/g, '')}`);
      console.log(`      주소: ${store.address}`);
      console.log(`      좌표: X=${store.coordinates?.x}, Y=${store.coordinates?.y}`);
      console.log(`      좌표 ID: ${store.coordinateId}`);
      
      // 좌표 ID를 Place ID로 사용 (실제로는 네이버 지도 API로 변환 필요)
      const mockPlaceId = store.coordinateId;
      console.log(`      생성된 Place ID: ${mockPlaceId}`);
      
      // 2. 리뷰 URL 생성 테스트
      console.log('\n📋 2. 리뷰 URL 생성 테스트');
      const reviewUrl = reviewService.generateReviewUrl(mockPlaceId);
      console.log(`   ✅ 리뷰 URL 생성: ${reviewUrl}`);
      
      // 3. 리뷰 크롤링 준비 상태 확인 (모의 사용자)
      console.log('\n📋 3. 리뷰 크롤링 준비 상태 확인');
      const mockUserId = 1;
      const readyStatus = await reviewService.checkReviewCrawlingReady(mockUserId);
      console.log(`   📊 준비 상태: ${readyStatus.ready ? '✅ 준비됨' : '❌ 준비되지 않음'}`);
      console.log(`   메시지: ${readyStatus.message}`);
      
      if (readyStatus.ready) {
        console.log(`   Place ID: ${readyStatus.placeId}`);
        console.log(`   매장명: ${readyStatus.storeName}`);
        console.log(`   리뷰 URL: ${readyStatus.reviewUrl}`);
      }
      
      // 4. 리뷰 크롤링 시작 테스트
      console.log('\n📋 4. 리뷰 크롤링 시작 테스트');
      const crawlingResult = await reviewService.startReviewCrawling(mockUserId);
      console.log(`   📊 크롤링 결과: ${crawlingResult.success ? '✅ 성공' : '❌ 실패'}`);
      console.log(`   메시지: ${crawlingResult.message}`);
      
      if (crawlingResult.success) {
        console.log(`   Place ID: ${crawlingResult.data.placeId}`);
        console.log(`   매장명: ${crawlingResult.data.storeName}`);
        console.log(`   리뷰 URL: ${crawlingResult.data.reviewUrl}`);
        console.log(`   상태: ${crawlingResult.data.status}`);
      }
      
      // 5. 크롤링된 리뷰 조회 테스트
      console.log('\n📋 5. 크롤링된 리뷰 조회 테스트');
      const reviewsResult = await reviewService.getCrawledReviews(mockUserId);
      console.log(`   📊 조회 결과: ${reviewsResult.success ? '✅ 성공' : '❌ 실패'}`);
      console.log(`   메시지: ${reviewsResult.message}`);
      
      if (reviewsResult.success) {
        console.log(`   Place ID: ${reviewsResult.data.placeId}`);
        console.log(`   리뷰 수: ${reviewsResult.data.totalCount}`);
        console.log(`   마지막 크롤링: ${reviewsResult.data.lastCrawledAt || '없음'}`);
      }
      
    } else {
      console.log('❌ 매장 검색 실패');
    }

    // 6. API 엔드포인트 테스트 (서버가 실행 중인 경우)
    console.log('\n📋 6. API 엔드포인트 테스트');
    try {
      const response = await axios.get('http://localhost:3000/health', { timeout: 5000 });
      console.log('   ✅ 서버 연결 성공');
      console.log(`   상태: ${response.status}`);
      
      // 리뷰 API 엔드포인트 확인
      console.log('\n   📋 리뷰 API 엔드포인트 확인:');
      console.log('   - GET /api/reviews/crawling/ready');
      console.log('   - POST /api/reviews/crawling/start');
      console.log('   - GET /api/reviews/crawled');
      
    } catch (error) {
      console.log('   ⚠️  서버 연결 실패 (서버가 실행되지 않았거나 다른 포트에서 실행 중)');
      console.log(`   오류: ${error.message}`);
    }

    console.log('\n🎉 리뷰 크롤링 환경 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
  }
}

/**
 * 실제 리뷰 크롤링 시뮬레이션
 */
async function simulateReviewCrawling() {
  console.log('\n=== 실제 리뷰 크롤링 시뮬레이션 ===\n');
  
  try {
    // 1. 매장 정보 준비
    console.log('📋 1. 매장 정보 준비');
    const store = {
      name: '스타벅스 강남점',
      placeId: '1269780493_375672475', // 좌표 기반 ID
      reviewUrl: 'https://pcmap.place.naver.com/place/1269780493_375672475/review/visitor'
    };
    
    console.log(`   매장명: ${store.name}`);
    console.log(`   Place ID: ${store.placeId}`);
    console.log(`   리뷰 URL: ${store.reviewUrl}`);
    
    // 2. 크롤링 프로세스 시뮬레이션
    console.log('\n📋 2. 크롤링 프로세스 시뮬레이션');
    console.log('   🔄 1단계: 리뷰 페이지 접속');
    console.log('   🔄 2단계: 리뷰 데이터 추출');
    console.log('   🔄 3단계: 데이터 파싱 및 정제');
    console.log('   🔄 4단계: 데이터베이스 저장');
    
    // 3. 예상 결과
    console.log('\n📋 3. 예상 크롤링 결과');
    const mockReviews = [
      {
        id: 1,
        author: '김철수',
        rating: 5,
        content: '맛있는 커피와 좋은 분위기입니다!',
        date: '2024-01-15',
        helpful: 3
      },
      {
        id: 2,
        author: '이영희',
        rating: 4,
        content: '깔끔하고 편안한 공간이에요.',
        date: '2024-01-14',
        helpful: 1
      }
    ];
    
    console.log(`   📊 총 리뷰 수: ${mockReviews.length}개`);
    mockReviews.forEach((review, index) => {
      console.log(`   ${index + 1}. ${review.author} (${review.rating}점) - ${review.content}`);
    });
    
    console.log('\n✅ 리뷰 크롤링 시뮬레이션 완료!');
    
  } catch (error) {
    console.error('❌ 시뮬레이션 중 오류 발생:', error.message);
  }
}

// 테스트 실행
testReviewCrawlingEnvironment().then(() => {
  simulateReviewCrawling();
}); 