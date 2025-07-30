require('dotenv').config();
const axios = require('axios');

// 환경 변수 확인
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

console.log('=== 네이버 로컬 API 테스트 ===');
console.log('NAVER_CLIENT_ID:', NAVER_CLIENT_ID ? '설정됨' : '설정되지 않음');
console.log('NAVER_CLIENT_SECRET:', NAVER_CLIENT_SECRET ? '설정됨' : '설정되지 않음');
console.log('');

if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
  console.error('네이버 API 키가 설정되지 않았습니다.');
  console.error('   .env 파일에 NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET을 설정해주세요.');
  process.exit(1);
}

/**
 * 네이버 로컬 API 테스트
 */
async function testNaverLocalApi() {
  try {
    console.log('🔍 네이버 로컬 API 테스트 시작...');
    
    // 테스트할 매장 정보
    const testStores = [
      { name: '스타벅스', phone: '02-1234-5678' },
      { name: '맥도날드', phone: '02-2345-6789' },
      { name: '올리브영', phone: '02-3456-7890' },
      { name: '신월3동 칼포니치킨', phone: ''}
    ];

    for (const store of testStores) {
      console.log(`\n📋 테스트 매장: ${store.name} (${store.phone})`);
      
      // 1. 기본 검색 테스트
      console.log('   🔎 기본 검색 테스트...');
      const searchResult = await searchStore(store.name);
      
      if (searchResult.success) {
        console.log(`   ✅ 검색 성공: ${searchResult.total}개 결과`);
        
        // 2. 전화번호 매칭 테스트
        console.log('   📞 전화번호 매칭 테스트...');
        const matchedStore = await findStoreByPhone(store.name, store.phone);
        
        if (matchedStore) {
          console.log('   ✅ 매장 정보 매칭 성공!');
          console.log(`      매장명: ${matchedStore.data.name}`);
          console.log(`      주소: ${matchedStore.data.address}`);
          console.log(`      전화: ${matchedStore.data.phone}`);
          console.log(`      Place ID: ${matchedStore.data.placeId}`);
        } else {
          console.log(' ⚠️  매장 정보 매칭 실패 (정상적인 경우)');
        }
      } else {
        console.log('❌ 검색 실패');
      }
    }

    console.log('\n🎉 네이버 로컬 API 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
    if (error.response) {
      console.error('   응답 상태:', error.response.status);
      console.error('   응답 데이터:', error.response.data);
    }
  }
}

/**
 * 매장 검색 함수
 */
async function searchStore(query) {
  try {
    const response = await axios.get('https://openapi.naver.com/v1/search/local.json', {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
      },
      params: {
        query: query,
        display: 5,
        sort: 'random'
      }
    });

    return {
      success: true,
      data: response.data.items,
      total: response.data.total
    };
  } catch (error) {
    console.error('   검색 API 호출 실패:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

/**
 * 전화번호로 매장 찾기 함수
 */
async function findStoreByPhone(storeName, phoneNumber) {
  try {
    const normalizedPhone = phoneNumber.replace(/[-\s]/g, '');
    const searchResult = await searchStore(storeName);
    
    if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
      return null;
    }

    const matchedStore = searchResult.data.find(store => {
      const storePhone = store.tel?.replace(/[-\s]/g, '') || '';
      return storePhone.includes(normalizedPhone) || normalizedPhone.includes(storePhone);
    });

    if (matchedStore) {
      return {
        success: true,
        data: {
          name: matchedStore.title?.replace(/<[^>]*>/g, ''),
          address: matchedStore.address,
          roadAddress: matchedStore.roadAddress,
          phone: matchedStore.tel,
          category: matchedStore.category,
          placeId: matchedStore.link?.match(/place\/(\d+)/)?.[1] || null
        }
      };
    }

    return null;
  } catch (error) {
    console.error('   매장 찾기 실패:', error.message);
    return null;
  }
}

// 테스트 실행
testNaverLocalApi(); 