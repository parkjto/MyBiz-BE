/**
 * 정리된 Place ID 추출 시스템 테스트
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/stores';

async function testSimplifiedPlaceIdExtraction() {
  console.log('[INFO] 정리된 Place ID 추출 시스템 테스트 시작\n');

  // 테스트할 매장들
  const testStores = [
    {
      name: '칼포니치킨',
      address: '서울특별시 양천구 신월동 1002-4',
      district: '신월동'
    },
    {
      name: '스타벅스 강남점',
      address: '서울특별시 강남구 역삼동 737',
      district: '역삼동'
    },
    {
      name: '올리브영 홍대점',
      address: '서울특별시 마포구 동교동 160-1',
      district: '동교동'
    }
  ];

  try {
    // 1. 시스템 상태 확인
    console.log('[INFO] 1. 시스템 상태 확인');
    const statusResponse = await axios.get(`${BASE_URL}/extract-place-id/status`);
    console.log('[SUCCESS] 시스템 상태:', statusResponse.data.data.overallSuccessRate * 100 + '%');
    console.log('');

    // 2. 각 매장별 Place ID 추출 테스트
    for (let i = 0; i < testStores.length; i++) {
      const store = testStores[i];
      console.log(`[INFO] ${i + 2}. ${store.name} Place ID 추출 테스트`);
      console.log(`[INFO] 주소: ${store.address}`);
      
      try {
        const response = await axios.post(`${BASE_URL}/extract-place-id`, store);
        
        if (response.data.success) {
          const result = response.data.data;
          console.log('[SUCCESS] 추출 성공!');
          console.log(`   - Place ID: ${result.placeId}`);
          console.log(`   - 방법: ${result.extractionMethod}`);
          console.log(`   - 성공률: ${result.successRate * 100}%`);
          console.log(`   - 플레이스 URL: ${result.placeUrl}`);
          
          // Place ID 검증
          const validationResponse = await axios.post(`${BASE_URL}/validate-place-id`, {
            placeId: result.placeId
          });
          
          if (validationResponse.data.data.isValid) {
                      console.log('[SUCCESS] Place ID 검증 성공');
        } else {
          console.log('[ERROR] Place ID 검증 실패');
        }
      } else {
        console.log('[ERROR] 추출 실패');
        console.log('[INFO] 수동 확인 단계:');
          if (response.data.data.manualSteps) {
            response.data.data.manualSteps.forEach((step, index) => {
              console.log(`   ${index + 1}. ${step}`);
            });
          }
        }
      } catch (error) {
        console.log('[ERROR] 요청 실패:', error.message);
      }
      
      console.log('');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
    }

    // 3. 통합 검색 + Place ID 추출 테스트
    console.log('[INFO] 5. 통합 검색 + Place ID 추출 테스트');
    console.log('검색어: "신월3동 칼포니치킨"');
    
    try {
      const searchResponse = await axios.post(`${BASE_URL}/find-with-selection`, {
        query: '신월3동 칼포니치킨',
        selectedIndex: 0
      });
      
      if (searchResponse.data.success) {
        console.log('[SUCCESS] 통합 검색 성공');
        console.log(`   - 검색된 매장 수: ${searchResponse.data.data.total}개`);
        console.log(`   - 선택된 매장: ${searchResponse.data.data.selectedStore.title}`);
        
        // 선택된 매장의 Place ID 추출
        const placeIdResponse = await axios.post(`${BASE_URL}/extract-place-id-for-selected`, {
          query: '신월3동 칼포니치킨',
          selectedIndex: 0
        });
        
        if (placeIdResponse.data.success) {
          console.log('[SUCCESS] 선택된 매장 Place ID 추출 성공');
        } else {
          console.log('[ERROR] 선택된 매장 Place ID 추출 실패');
        }
      } else {
        console.log('[ERROR] 통합 검색 실패');
      }
    } catch (error) {
      console.log('[ERROR] 통합 검색 요청 실패:', error.message);
    }

    console.log('\n[SUCCESS] 테스트 완료!');

  } catch (error) {
    console.error('[ERROR] 테스트 중 오류 발생:', error.message);
  }
}

// 테스트 실행
testSimplifiedPlaceIdExtraction(); 