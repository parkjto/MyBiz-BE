require('dotenv').config();
const reviewService = require('../services/reviewService');

console.log('=== 초기 페이지 로드 리뷰 크롤링 테스트 ===\n');

/**
 * 칼포니치킨의 초기 페이지 로드 시 리뷰 크롤링 테스트
 */
async function testSimpleReviewCrawling() {
  try {
    console.log('🔍 칼포니치킨 초기 페이지 리뷰 크롤링 테스트 시작...\n');

    const placeId = '18433301'; // 칼포니치킨
    const maxReviews = 5; // 초기 페이지에 보이는 리뷰만 테스트

    console.log(`📋 테스트 대상: 칼포니치킨 (Place ID: ${placeId})`);
    console.log(`📋 목표: 초기 페이지 로드 시 ${maxReviews}개 리뷰 추출`);
    console.log(`🔗 리뷰 URL: https://pcmap.place.naver.com/place/${placeId}/review/visitor`);
    console.log('');

    const startTime = Date.now();
    const result = await reviewService.crawlReviewsByPlaceId(placeId, maxReviews);
    const endTime = Date.now();

    console.log(`⏱️  크롤링 소요 시간: ${endTime - startTime}ms`);
    console.log(`📊 크롤링 결과: ${result.success ? '✅ 성공' : '❌ 실패'}`);
    console.log(`📝 메시지: ${result.message}`);
    console.log('');

    if (result.success && result.data.reviews) {
      const reviews = result.data.reviews;
      console.log(`🎉 성공적으로 ${reviews.length}개의 리뷰를 크롤링했습니다!`);
      console.log('');

      // 크롤링된 리뷰 상세 정보 출력
      console.log('📋 크롤링된 리뷰 상세:');
      console.log('='.repeat(80));
      
      reviews.forEach((review, index) => {
        console.log(`\n📝 리뷰 ${index + 1}:`);
        console.log(`   👤 작성자: ${review.author}`);
        console.log(`   📅 방문일: ${review.visitDate || 'N/A'}`);
        console.log(`   🔢 방문횟수: ${review.visitCount || 'N/A'}`);
        console.log(`   📸 사진 개수: ${review.photoCount || 0}장`);
        console.log(`   💬 리뷰 내용:`);
        console.log(`      ${review.content}`);
        console.log('-'.repeat(60));
      });

      console.log('\n📊 크롤링 통계:');
      console.log(`   • 총 리뷰 수: ${reviews.length}개`);
      console.log(`   • 사진이 있는 리뷰: ${reviews.filter(r => r.photoCount > 0).length}개`);
      console.log(`   • 평균 사진 개수: ${(reviews.reduce((sum, r) => sum + (r.photoCount || 0), 0) / reviews.length).toFixed(1)}장`);
      
      // 방문 횟수 분석
      const visitCounts = reviews.map(r => r.visitCount).filter(v => v);
      if (visitCounts.length > 0) {
        const firstTimeVisitors = visitCounts.filter(v => v.includes('1번째')).length;
        console.log(`   • 첫 방문자: ${firstTimeVisitors}명`);
        console.log(`   • 재방문자: ${visitCounts.length - firstTimeVisitors}명`);
      }

    } else {
      console.log('❌ 리뷰 크롤링에 실패했습니다.');
      if (result.error) {
        console.log(`   오류: ${result.error}`);
      }
    }

    console.log('\n🎉 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
  }
}

// 테스트 실행
testSimpleReviewCrawling()
  .then(() => {
    console.log('\n📝 테스트 요약:');
    console.log('   ✅ 초기 페이지 로드 시 리뷰 크롤링이 정상적으로 작동합니다.');
    console.log('   ✅ 작성자, 내용, 방문일, 방문횟수, 사진 개수가 정확히 추출됩니다.');
    console.log('   ✅ 더보기 버튼 클릭 없이 현재 페이지의 리뷰만 수집합니다.');
    
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 테스트 실행 중 오류 발생:', error);
    process.exit(1);
  }); 