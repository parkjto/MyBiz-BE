require('dotenv').config();
const reviewService = require('../services/reviewService');

console.log('=== 실제 네이버 플레이스 Place ID 리뷰 크롤링 테스트 ===\n');

/**
 * 실제 네이버 플레이스 Place ID로 리뷰 크롤링 테스트
 */
async function testRealPlaceIds() {
  try {
    console.log('🔍 실제 네이버 플레이스 Place ID 테스트 시작...\n');

    // 사용자가 제공한 실제 Place ID들 (칼포니치킨만 테스트)
    const realPlaceIds = [
      {
        id: '18433301',
        url: 'https://map.naver.com/p/entry/place/18433301',
        description: '칼포니치킨'
      }
      // {
      //   id: '1936172952',
      //   url: 'https://map.naver.com/p/entry/place/1936172952',
      //   description: '호돈돈가스'
      // },
      // {
      //   id: '20495022',
      //   url: 'https://map.naver.com/p/entry/place/20495022',
      //   description: '스타벅스 인하대점'
      // }
    ];

    console.log('📋 제공된 실제 네이버 플레이스 Place ID들:');
    realPlaceIds.forEach((place, index) => {
      console.log(`   ${index + 1}. ${place.description}: ${place.id}`);
      console.log(`      URL: ${place.url}`);
    });
    console.log('');

    // 각 Place ID로 리뷰 크롤링 테스트
    for (let i = 0; i < realPlaceIds.length; i++) {
      const place = realPlaceIds[i];
      console.log(`📋 ${i + 1}. ${place.description} (${place.id}) 리뷰 크롤링 테스트`);
      console.log(`   🔗 원본 URL: ${place.url}`);
      console.log(`   🔗 리뷰 URL: https://pcmap.place.naver.com/place/${place.id}/review/visitor`);
      
      const startTime = Date.now();
      const result = await reviewService.crawlReviewsByPlaceId(place.id, 5);
      const endTime = Date.now();
      
      console.log(`   ⏱️  소요 시간: ${endTime - startTime}ms`);
      console.log(`   📊 결과: ${result.success ? '✅ 성공' : '❌ 실패'}`);
      console.log(`   📝 메시지: ${result.message}`);
      
      if (result.success && result.data.reviews) {
        console.log(`   📋 크롤링된 리뷰: ${result.data.reviews.length}개`);
        
        if (result.data.reviews.length > 0) {
          console.log('   📋 리뷰 상세:');
          result.data.reviews.forEach((review, index) => {
            console.log(`      ${index + 1}. ${review.author}`);
            console.log(`         내용: ${review.content.substring(0, 100)}${review.content.length > 100 ? '...' : ''}`);
            console.log(`         방문일: ${review.visitDate || 'N/A'}`);
            console.log(`         방문횟수: ${review.visitCount || 'N/A'}`);
            console.log(`         사진 개수: ${review.photoCount || 0}장`);
            console.log('');
          });
        } else {
          console.log('   ⚠️  크롤링된 리뷰가 없습니다.');
        }
      } else if (result.error) {
        console.log(`   ❌ 오류: ${result.error}`);
      }
      
      console.log('   ' + '='.repeat(60));
      console.log('');
    }

    console.log('🎉 실제 네이버 플레이스 Place ID 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
  }
}

/**
 * API 엔드포인트 테스트
 */
async function testApiEndpoints() {
  console.log('\n=== API 엔드포인트 테스트 ===\n');
  
  try {
    const placeIds = ['18433301']; // 칼포니치킨만 테스트
    
    for (let i = 0; i < placeIds.length; i++) {
      const placeId = placeIds[i];
      console.log(`📋 ${i + 1}. Place ID ${placeId} API 테스트`);
      
      const startTime = Date.now();
      
      // API 호출
      const { exec } = require('child_process');
      const command = `curl -s "http://localhost:3000/api/reviews/crawling/place/${placeId}?maxReviews=3"`;
      
      exec(command, (error, stdout, stderr) => {
        const endTime = Date.now();
        console.log(`   ⏱️  API 응답 시간: ${endTime - startTime}ms`);
        
        if (error) {
          console.log(`   ❌ API 호출 실패: ${error.message}`);
        } else {
          try {
            const response = JSON.parse(stdout);
            console.log(`   📊 API 결과: ${response.success ? '✅ 성공' : '❌ 실패'}`);
            console.log(`   📝 메시지: ${response.message}`);
            
            if (response.success && response.data.reviews) {
              console.log(`   📋 API를 통한 크롤링된 리뷰: ${response.data.reviews.length}개`);
            }
          } catch (parseError) {
            console.log(`   ❌ JSON 파싱 실패: ${parseError.message}`);
            console.log(`   📄 원본 응답: ${stdout.substring(0, 200)}...`);
          }
        }
        
        console.log('');
      });
      
      // API 호출 간격
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
  } catch (error) {
    console.error('❌ API 테스트 중 오류 발생:', error.message);
  }
}

// 테스트 실행
testRealPlaceIds()
  .then(() => {
    console.log('\n🎉 모든 테스트 완료!');
    console.log('\n📝 참고사항:');
    console.log('   1. 실제 Place ID로 크롤링이 성공하면 실제 리뷰 데이터를 얻을 수 있습니다.');
    console.log('   2. 크롤링된 리뷰는 작성자, 평점, 내용, 날짜, 도움됨 수를 포함합니다.');
    console.log('   3. API 엔드포인트를 통해 외부에서도 크롤링을 요청할 수 있습니다.');
    console.log('   4. 네이버의 이용약관을 준수하여 크롤링을 사용해주세요.');
    
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 테스트 실행 중 오류 발생:', error);
    process.exit(1);
  }); 