require('dotenv').config();
const reviewService = require('../services/reviewService');

console.log('=== 실제 네이버 플레이스 Place ID 테스트 ===\n');

/**
 * 실제 네이버 플레이스 Place ID로 리뷰 크롤링 테스트
 */
async function testRealPlaceId() {
  try {
    console.log('🔍 실제 네이버 플레이스 Place ID 테스트 시작...\n');

    // 실제 네이버 플레이스 Place ID들 (테스트용)
    const realPlaceIds = [
      '1234567890', // 예시 Place ID
      '1234567891', // 예시 Place ID
      '1234567892'  // 예시 Place ID
    ];

    console.log('📋 실제 네이버 플레이스 Place ID 테스트');
    console.log('   ⚠️  참고: 실제 Place ID는 네이버 지도에서 매장을 검색한 후');
    console.log('      URL에서 추출할 수 있습니다.');
    console.log('      예: https://pcmap.place.naver.com/place/1234567890 → Place ID: 1234567890\n');

    // 각 Place ID로 테스트
    for (let i = 0; i < realPlaceIds.length; i++) {
      const placeId = realPlaceIds[i];
      console.log(`📋 ${i + 1}. Place ID: ${placeId} 테스트`);
      
      const startTime = Date.now();
      const result = await reviewService.crawlReviewsByPlaceId(placeId, 3);
      const endTime = Date.now();
      
      console.log(`   ⏱️  소요 시간: ${endTime - startTime}ms`);
      console.log(`   📊 결과: ${result.success ? '✅ 성공' : '❌ 실패'}`);
      console.log(`   📝 메시지: ${result.message}`);
      
      if (result.success && result.data.reviews) {
        console.log(`   📋 크롤링된 리뷰: ${result.data.reviews.length}개`);
        
        if (result.data.reviews.length > 0) {
          console.log('   📋 리뷰 상세:');
          result.data.reviews.forEach((review, index) => {
            console.log(`      ${index + 1}. ${review.author} (${review.rating}점)`);
            console.log(`         내용: ${review.content.substring(0, 50)}...`);
            console.log(`         날짜: ${review.date}`);
          });
        }
      }
      
      console.log('');
    }

    console.log('🎉 실제 네이버 플레이스 Place ID 테스트 완료!');
    console.log('\n📝 참고사항:');
    console.log('   1. 실제 Place ID는 네이버 지도에서 매장을 검색하여 얻을 수 있습니다.');
    console.log('   2. URL 형식: https://pcmap.place.naver.com/place/{PLACE_ID}');
    console.log('   3. 리뷰 페이지: https://pcmap.place.naver.com/place/{PLACE_ID}/review/visitor');
    console.log('   4. 크롤링이 성공하면 실제 리뷰 데이터를 얻을 수 있습니다.');

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
  }
}

/**
 * 네이버 플레이스 URL 구조 설명
 */
function explainPlaceIdStructure() {
  console.log('\n=== 네이버 플레이스 URL 구조 설명 ===\n');
  
  console.log('📋 네이버 플레이스 URL 구조:');
  console.log('   기본 URL: https://pcmap.place.naver.com/place/{PLACE_ID}');
  console.log('   리뷰 URL: https://pcmap.place.naver.com/place/{PLACE_ID}/review/visitor');
  console.log('   사진 URL: https://pcmap.place.naver.com/place/{PLACE_ID}/photo');
  console.log('   메뉴 URL: https://pcmap.place.naver.com/place/{PLACE_ID}/menu');
  console.log('');
  
  console.log('📋 Place ID 찾는 방법:');
  console.log('   1. 네이버 지도에서 매장 검색');
  console.log('   2. 매장 클릭하여 상세 페이지 이동');
  console.log('   3. 브라우저 주소창에서 Place ID 확인');
  console.log('   4. 예: https://pcmap.place.naver.com/place/1234567890 → Place ID: 1234567890');
  console.log('');
  
  console.log('📋 실제 테스트를 위한 Place ID 예시:');
  console.log('   - 스타벅스 강남점: 실제 Place ID 필요');
  console.log('   - 맥도날드 강남점: 실제 Place ID 필요');
  console.log('   - 올리브영 강남점: 실제 Place ID 필요');
  console.log('');
  
  console.log('⚠️  주의사항:');
  console.log('   - 좌표 기반 ID는 실제 Place ID와 다릅니다.');
  console.log('   - 실제 Place ID는 네이버에서 고유하게 할당합니다.');
  console.log('   - 크롤링 시 네이버의 이용약관을 준수해야 합니다.');
}

// 테스트 실행
testRealPlaceId()
  .then(() => {
    explainPlaceIdStructure();
    console.log('\n🎉 모든 테스트 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 테스트 실행 중 오류 발생:', error);
    process.exit(1);
  }); 