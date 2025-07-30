require('dotenv').config();
const reviewService = require('../services/reviewService');
const naverLocalService = require('../services/naverLocalService');

console.log('=== 실제 리뷰 크롤링 테스트 ===\n');

/**
 * 실제 리뷰 크롤링 테스트
 */
async function testActualReviewCrawling() {
  try {
    console.log('🔍 실제 리뷰 크롤링 테스트 시작...\n');

    // 1. 매장 검색 및 Place ID 생성
    console.log('📋 1. 매장 검색 및 Place ID 생성');
    const searchResult = await naverLocalService.searchStore('스타벅스 강남점');
    
    if (searchResult.success && searchResult.data.length > 0) {
      const store = searchResult.data[0];
      console.log(`   ✅ 매장 검색 성공: ${store.title?.replace(/<[^>]*>/g, '')}`);
      console.log(`      주소: ${store.address}`);
      console.log(`      좌표: X=${store.coordinates?.x}, Y=${store.coordinates?.y}`);
      console.log(`      좌표 ID: ${store.coordinateId}`);
      
      // 좌표 ID를 Place ID로 사용 (실제 테스트용)
      const testPlaceId = store.coordinateId;
      console.log(`      테스트용 Place ID: ${testPlaceId}`);
      
      // 2. 크롤링 환경 테스트
      console.log('\n📋 2. 크롤링 환경 테스트');
      console.log('   🔄 Puppeteer 브라우저 초기화 중...');
      
      const testResult = await reviewService.crawlReviewsByPlaceId(testPlaceId, 3);
      
      if (testResult.success) {
        console.log('   ✅ 크롤링 환경 테스트 성공!');
        console.log(`   📊 크롤링된 리뷰 수: ${testResult.data.totalCount}개`);
        console.log(`   📅 크롤링 시간: ${testResult.data.crawledAt}`);
        
        // 크롤링된 리뷰 상세 정보 출력
        if (testResult.data.reviews && testResult.data.reviews.length > 0) {
          console.log('\n   📋 크롤링된 리뷰 상세:');
          testResult.data.reviews.forEach((review, index) => {
            console.log(`   ${index + 1}. ${review.author} (${review.rating}점)`);
            console.log(`      내용: ${review.content}`);
            console.log(`      날짜: ${review.date}`);
            console.log(`      도움됨: ${review.helpful}개`);
            console.log('');
          });
        } else {
          console.log('   ⚠️  크롤링된 리뷰가 없습니다.');
        }
        
      } else {
        console.log('   ❌ 크롤링 환경 테스트 실패');
        console.log(`   오류: ${testResult.message}`);
        if (testResult.error) {
          console.log(`   상세 오류: ${testResult.error}`);
        }
      }
      
    } else {
      console.log('❌ 매장 검색 실패');
    }

    console.log('\n🎉 실제 리뷰 크롤링 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
  }
}

/**
 * 크롤링 성능 테스트
 */
async function testCrawlingPerformance() {
  console.log('\n=== 크롤링 성능 테스트 ===\n');
  
  try {
    // 1. 작은 규모 테스트 (3개 리뷰)
    console.log('📋 1. 작은 규모 테스트 (3개 리뷰)');
    const startTime1 = Date.now();
    
    const smallTest = await reviewService.crawlReviewsByPlaceId('1270520660_374984818', 3);
    
    const endTime1 = Date.now();
    const duration1 = endTime1 - startTime1;
    
    console.log(`   ⏱️  소요 시간: ${duration1}ms`);
    console.log(`   📊 성공 여부: ${smallTest.success ? '✅' : '❌'}`);
    if (smallTest.success) {
      console.log(`   📋 크롤링된 리뷰: ${smallTest.data.totalCount}개`);
    }
    
    // 2. 중간 규모 테스트 (5개 리뷰)
    console.log('\n📋 2. 중간 규모 테스트 (5개 리뷰)');
    const startTime2 = Date.now();
    
    const mediumTest = await reviewService.crawlReviewsByPlaceId('1270520660_374984818', 5);
    
    const endTime2 = Date.now();
    const duration2 = endTime2 - startTime2;
    
    console.log(`   ⏱️  소요 시간: ${duration2}ms`);
    console.log(`   📊 성공 여부: ${mediumTest.success ? '✅' : '❌'}`);
    if (mediumTest.success) {
      console.log(`   📋 크롤링된 리뷰: ${mediumTest.data.totalCount}개`);
    }
    
    // 3. 성능 분석
    console.log('\n📋 3. 성능 분석');
    if (smallTest.success && mediumTest.success) {
      const avgTimePerReview1 = duration1 / smallTest.data.totalCount;
      const avgTimePerReview2 = duration2 / mediumTest.data.totalCount;
      
      console.log(`   📊 리뷰 1개당 평균 시간 (3개): ${avgTimePerReview1.toFixed(2)}ms`);
      console.log(`   📊 리뷰 1개당 평균 시간 (5개): ${avgTimePerReview2.toFixed(2)}ms`);
      
      const efficiency = ((avgTimePerReview1 - avgTimePerReview2) / avgTimePerReview1 * 100).toFixed(2);
      console.log(`   📈 효율성 개선: ${efficiency}%`);
    }
    
    console.log('\n✅ 크롤링 성능 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 성능 테스트 중 오류 발생:', error.message);
  }
}

/**
 * 크롤링 안정성 테스트
 */
async function testCrawlingStability() {
  console.log('\n=== 크롤링 안정성 테스트 ===\n');
  
  try {
    const testCases = [
      { placeId: '1270520660_374984818', maxReviews: 2, description: '정상적인 Place ID' },
      { placeId: 'invalid_place_id', maxReviews: 2, description: '잘못된 Place ID' },
      { placeId: '1270520660_374984818', maxReviews: 0, description: '0개 리뷰 요청' },
      { placeId: '1270520660_374984818', maxReviews: 100, description: '대량 리뷰 요청' }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`📋 ${i + 1}. ${testCase.description}`);
      console.log(`   Place ID: ${testCase.placeId}, 최대 리뷰: ${testCase.maxReviews}개`);
      
      const startTime = Date.now();
      const result = await reviewService.crawlReviewsByPlaceId(testCase.placeId, testCase.maxReviews);
      const endTime = Date.now();
      
      console.log(`   ⏱️  소요 시간: ${endTime - startTime}ms`);
      console.log(`   📊 결과: ${result.success ? '✅ 성공' : '❌ 실패'}`);
      console.log(`   📝 메시지: ${result.message}`);
      
      if (result.success && result.data.reviews) {
        console.log(`   📋 실제 크롤링된 리뷰: ${result.data.reviews.length}개`);
      }
      
      console.log('');
    }
    
    console.log('✅ 크롤링 안정성 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 안정성 테스트 중 오류 발생:', error.message);
  }
}

// 테스트 실행
testActualReviewCrawling()
  .then(() => testCrawlingPerformance())
  .then(() => testCrawlingStability())
  .then(() => {
    console.log('\n🎉 모든 리뷰 크롤링 테스트 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 테스트 실행 중 오류 발생:', error);
    process.exit(1);
  }); 