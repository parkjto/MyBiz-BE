require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

console.log('=== API 엔드포인트 테스트 ===');
console.log('서버 URL:', BASE_URL);
console.log('');

/**
 * API 테스트 함수들
 */
async function testApiEndpoints() {
  try {
    // 1. 서버 상태 확인
    console.log('1. 서버 상태 확인...');
    try {
      const response = await axios.get(`${BASE_URL}/`);
      console.log('서버 정상 동작:', response.data);
    } catch (error) {
      console.log('서버 연결 실패:', error.message);
      return;
    }

    // 2. 매장 정보 검색 API 테스트
    console.log('\n🔍 2. 매장 정보 검색 API 테스트...');
    try {
      const searchResponse = await axios.post(`${BASE_URL}/api/auth/store/search`, {
        storeName: '스타벅스',
        phoneNumber: '02-1234-5678'
      });
      
      if (searchResponse.data.success) {
        console.log('매장 검색 성공');
        console.log('매장 정보:', searchResponse.data.data);
      } else {
        console.log('매장 검색 실패 (정상적인 경우)');
        console.log('기본 정보:', searchResponse.data.data);
      }
    } catch (error) {
      console.log('매장 검색 API 오류:', error.response?.data || error.message);
    }

    // 3. 네이버 로그인 API 테스트 (인가 코드 없이)
    console.log('\n 3. 네이버 로그인 API 테스트 (인가 코드 없이)...');
    try {
      await axios.post(`${BASE_URL}/api/auth/naver/login`, {
        code: 'invalid_code',
        state: 'invalid_state'
      });
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('올바른 에러 처리 (인가 코드 필요)');
      } else {
        console.log('예상치 못한 에러:', error.response?.data || error.message);
      }
    }

    // 4. 매장 정보 확인 API 테스트 (토큰 없이)
    console.log('\n🔍 4. 매장 정보 확인 API 테스트 (토큰 없이)...');
    try {
      await axios.post(`${BASE_URL}/api/auth/store/confirm`, {
        storeInfo: {
          name: '테스트 매장',
          address: '테스트 주소',
          phone: '010-1234-5678'
        }
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ✅ 올바른 인증 에러 처리');
      } else {
        console.log('   ❌ 예상치 못한 에러:', error.response?.data || error.message);
      }
    }

    // 5. 리뷰 크롤링 준비 API 테스트 (토큰 없이)
    console.log('\n🔍 5. 리뷰 크롤링 준비 API 테스트 (토큰 없이)...');
    try {
      await axios.get(`${BASE_URL}/api/reviews/crawling/ready`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ✅ 올바른 인증 에러 처리');
      } else {
        console.log('   ❌ 예상치 못한 에러:', error.response?.data || error.message);
      }
    }

    console.log('\n🎉 API 엔드포인트 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
  }
}

/**
 * 실제 매장 정보로 테스트
 */
async function testWithRealStoreData() {
  console.log('\n=== 실제 매장 정보로 테스트 ===');
  
  const realStores = [
    { name: '스타벅스 강남점', phone: '02-1234-5678' },
    { name: '맥도날드 홍대점', phone: '02-2345-6789' },
    { name: '올리브영 명동점', phone: '02-3456-7890' }
  ];

  for (const store of realStores) {
    console.log(`\n📋 테스트 매장: ${store.name}`);
    
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/store/search`, {
        storeName: store.name,
        phoneNumber: store.phone
      });
      
      if (response.data.success) {
        console.log('   ✅ 검색 성공');
        console.log(`   📍 주소: ${response.data.data.address}`);
        console.log(`   📞 전화: ${response.data.data.phone}`);
        console.log(`   🆔 Place ID: ${response.data.data.placeId}`);
      } else {
        console.log('   ⚠️  검색 실패 (정상적인 경우)');
      }
    } catch (error) {
      console.log('   ❌ API 호출 실패:', error.response?.data || error.message);
    }
  }
}

// 테스트 실행
async function runAllTests() {
  await testApiEndpoints();
  await testWithRealStoreData();
}

runAllTests(); 