const { 
  extractPlaceIdFromLink, 
  extractPlaceIdFromStoreData, 
  extractPlaceIdsFromStores, 
  isValidPlaceId, 
  generateNaverMapUrl 
} = require('../utils/placeIdExtractor');

console.log('=== Place ID 추출 유틸리티 테스트 ===\n');

/**
 * Place ID 추출 테스트
 */
function testPlaceIdExtraction() {
  console.log('🔍 Place ID 추출 테스트...\n');

  // 테스트 데이터
  const testLinks = [
    'https://map.naver.com/p/entry/place/1234567890',
    'https://map.naver.com/p/entry/place/9876543210',
    'https://map.naver.com/p/entry/place/111222333',
    'https://example.com/no-place-id',
    null,
    '',
    'invalid-url'
  ];

  console.log('📋 Link에서 Place ID 추출 테스트:');
  testLinks.forEach((link, index) => {
    const placeId = extractPlaceIdFromLink(link);
    console.log(`   ${index + 1}. "${link}" → Place ID: ${placeId || 'null'}`);
  });

  console.log('\n📋 매장 데이터에서 Place ID 추출 테스트:');
  const testStoreData = [
    {
      title: '스타벅스 강남점',
      link: 'https://map.naver.com/p/entry/place/1234567890',
      tel: '02-1234-5678',
      address: '서울 강남구 강남대로 123'
    },
    {
      title: '맥도날드 홍대점',
      link: 'https://map.naver.com/p/entry/place/9876543210',
      tel: '02-2345-6789',
      address: '서울 마포구 홍대로 456'
    },
    {
      title: '올리브영 명동점',
      link: 'https://example.com/no-place-id',
      tel: '02-3456-7890',
      address: '서울 중구 명동길 789'
    },
    {
      title: '신월3동 칼포니치킨',
      link: null,
      tel: '',
      address: '서울 양천구 신월동 123'
    }
  ];

  testStoreData.forEach((store, index) => {
    const placeId = extractPlaceIdFromStoreData(store);
    console.log(`   ${index + 1}. ${store.title}`);
    console.log(`      Place ID: ${placeId || 'null'}`);
    console.log(`      유효성: ${isValidPlaceId(placeId) ? '✅' : '❌'}`);
    if (placeId) {
      console.log(`      지도 URL: ${generateNaverMapUrl(placeId)}`);
    }
    console.log('');
  });
}

/**
 * Place ID 유효성 검증 테스트
 */
function testPlaceIdValidation() {
  console.log('✅ Place ID 유효성 검증 테스트...\n');

  const testPlaceIds = [
    '1234567890',
    '9876543210',
    '111222333',
    'abc123def',
    '123-456-789',
    '',
    null,
    '123.456',
    '123abc456'
  ];

  testPlaceIds.forEach((placeId, index) => {
    const isValid = isValidPlaceId(placeId);
    console.log(`   ${index + 1}. "${placeId}" → 유효성: ${isValid ? '✅' : '❌'}`);
  });
}

/**
 * 네이버 지도 URL 생성 테스트
 */
function testMapUrlGeneration() {
  console.log('\n🗺️ 네이버 지도 URL 생성 테스트...\n');

  const testPlaceIds = [
    '1234567890',
    '9876543210',
    'invalid-id',
    null,
    ''
  ];

  testPlaceIds.forEach((placeId, index) => {
    const mapUrl = generateNaverMapUrl(placeId);
    console.log(`   ${index + 1}. Place ID: "${placeId}"`);
    console.log(`      지도 URL: ${mapUrl || '생성 실패'}`);
    console.log('');
  });
}

/**
 * 여러 매장 데이터에서 Place ID 추출 테스트
 */
function testMultipleStoresExtraction() {
  console.log('📊 여러 매장 데이터에서 Place ID 추출 테스트...\n');

  const storesData = [
    {
      title: '스타벅스 강남점',
      link: 'https://map.naver.com/p/entry/place/1234567890',
      tel: '02-1234-5678'
    },
    {
      title: '맥도날드 홍대점',
      link: 'https://map.naver.com/p/entry/place/9876543210',
      tel: '02-2345-6789'
    },
    {
      title: '올리브영 명동점',
      link: 'https://example.com/no-place-id',
      tel: '02-3456-7890'
    }
  ];

  const storesWithPlaceIds = extractPlaceIdsFromStores(storesData);
  
  console.log('📋 추출 결과:');
  storesWithPlaceIds.forEach((store, index) => {
    console.log(`   ${index + 1}. ${store.title}`);
    console.log(`      Place ID: ${store.placeId || 'null'}`);
    console.log(`      유효성: ${isValidPlaceId(store.placeId) ? '✅' : '❌'}`);
    if (store.placeId) {
      console.log(`      지도 URL: ${generateNaverMapUrl(store.placeId)}`);
    }
    console.log('');
  });

  const validPlaceIds = storesWithPlaceIds.filter(store => store.placeId);
  console.log(`📊 통계: ${validPlaceIds.length}/${storesWithPlaceIds.length}개 매장에서 Place ID 추출 성공`);
}

// 테스트 실행
testPlaceIdExtraction();
testPlaceIdValidation();
testMapUrlGeneration();
testMultipleStoresExtraction();

console.log('🎉 Place ID 추출 유틸리티 테스트 완료!'); 