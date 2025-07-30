require('dotenv').config();
const naverLocalService = require('../services/naverLocalService');

console.log('=== 개선된 네이버 로컬 API 테스트 ===\n');

/**
 * 개선된 네이버 로컬 API 테스트
 */
async function testEnhancedNaverLocalApi() {
  try {
    console.log('🔍 개선된 네이버 로컬 API 테스트 시작...\n');

    // 1. 기본 검색 테스트 (좌표 정보 포함)
    console.log('📋 1. 기본 검색 테스트 (좌표 정보 포함)');
    const searchResult = await naverLocalService.searchStore('스타벅스');
    
    if (searchResult.success) {
      console.log(`   ✅ 검색 성공: ${searchResult.total}개 결과`);
      
      searchResult.data.forEach((store, index) => {
        console.log(`\n   📍 매장 ${index + 1}: ${store.title?.replace(/<[^>]*>/g, '')}`);
        console.log(`      주소: ${store.address}`);
        console.log(`      도로명주소: ${store.roadAddress}`);
        console.log(`      전화: ${store.telephone || '없음'}`);
        console.log(`      카테고리: ${store.category}`);
        
        // 좌표 정보
        if (store.coordinates) {
          console.log(`      좌표: X=${store.coordinates.x}, Y=${store.coordinates.y}`);
          console.log(`      좌표 ID: ${store.coordinateId}`);
        }
        
        // Place ID 정보
        if (store.placeId) {
          console.log(`      Place ID: ${store.placeId}`);
          console.log(`      지도 URL: ${store.mapUrl}`);
        } else if (store.coordinates) {
          const mapUrl = naverLocalService.createMapUrlByCoordinates(
            store.coordinates.x, 
            store.coordinates.y, 
            store.title?.replace(/<[^>]*>/g, '')
          );
          console.log(`      좌표 기반 지도 URL: ${mapUrl}`);
        }
      });
    } else {
      console.log('❌ 검색 실패');
    }


    console.log('\n--------------------------------');
    // 2. 전화번호 매칭 테스트 (개선된 형태)
    console.log('\n📋 2. 전화번호 매칭 테스트 (개선된 형태)');
    const phoneMatchResult = await naverLocalService.findStoreByPhone('스타벅스', '02-1234-5678');
    
    if (phoneMatchResult && phoneMatchResult.success) {
      console.log('   ✅ 매장 정보 매칭 성공!');
      const store = phoneMatchResult.data;
      console.log(`      매장명: ${store.name}`);
      console.log(`      주소: ${store.address}`);
      console.log(`      전화: ${store.phone || '없음'}`);
      console.log(`      카테고리: ${store.category}`);
      
      if (store.placeId) {
        console.log(`      Place ID: ${store.placeId}`);
        console.log(`      지도 URL: ${store.mapUrl}`);
      } else if (store.coordinates) {
        console.log(`      좌표: X=${store.coordinates.x}, Y=${store.coordinates.y}`);
        console.log(`      좌표 ID: ${store.coordinateId}`);
        console.log(`      지도 URL: ${store.mapUrl}`);
      }
    } else {
      console.log('   ⚠️  매장 정보 매칭 실패 (정상적인 경우)');
    }
    
    console.log('\n--------------------------------');
    // 3. 좌표 기반 매장 검색 테스트
    console.log('\n📋 3. 좌표 기반 매장 검색 테스트');
    const coordinateResult = await naverLocalService.findStoreByCoordinates(
      '1269780493', 
      '375672475', 
      '스타벅스 한국프레스센터점'
    );
    
    if (coordinateResult && coordinateResult.success) {
      console.log('   ✅ 좌표 기반 검색 성공!');
      const store = coordinateResult.data;
      console.log(`      매장명: ${store.name}`);
      console.log(`      좌표: X=${store.coordinates.x}, Y=${store.coordinates.y}`);
      console.log(`      좌표 ID: ${store.coordinateId}`);
      console.log(`      지도 URL: ${store.mapUrl}`);
    } else {
      console.log('   ❌ 좌표 기반 검색 실패');
    }

    // 4. Place ID 유효성 검증 테스트
    console.log('\n📋 4. Place ID 유효성 검증 테스트');
    const testPlaceIds = ['1234567890', 'abc123def', '', null, '123-456-789'];
    
    testPlaceIds.forEach((placeId, index) => {
      const isValid = naverLocalService.validatePlaceId(placeId);
      const mapUrl = naverLocalService.createMapUrl(placeId);
      console.log(`   ${index + 1}. Place ID: "${placeId}"`);
      console.log(`      유효성: ${isValid ? '✅' : '❌'}`);
      console.log(`      지도 URL: ${mapUrl || '생성 실패'}`);
    });

    // 5. 개선된 매장 데이터 변환 테스트
    console.log('\n📋 5. 개선된 매장 데이터 변환 테스트');
    const testStoreData = {
      title: '<b>스타벅스</b> 강남점',
      link: 'http://www.starbucks.co.kr/',
      category: '카페,디저트>카페',
      description: '',
      telephone: '02-1234-5678',
      address: '서울특별시 강남구 강남대로 123',
      roadAddress: '서울특별시 강남구 강남대로 123',
      mapx: '1270276356',
      mapy: '3745123456'
    };

    const enhancedData = naverLocalService.enhanceStoreData(testStoreData);
    console.log('   ✅ 매장 데이터 변환 성공!');
    console.log(`      매장명: ${enhancedData.name}`);
    console.log(`      주소: ${enhancedData.address}`);
    console.log(`      전화: ${enhancedData.phone}`);
    console.log(`      카테고리: ${enhancedData.category}`);
    console.log(`      Place ID: ${enhancedData.placeId || '없음'}`);
    console.log(`      좌표: X=${enhancedData.coordinates?.x}, Y=${enhancedData.coordinates?.y}`);
    console.log(`      좌표 ID: ${enhancedData.coordinateId || '없음'}`);
    console.log(`      지도 URL: ${enhancedData.mapUrl || '없음'}`);

    console.log('\n🎉 개선된 네이버 로컬 API 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
  }
}

// 테스트 실행
testEnhancedNaverLocalApi(); 