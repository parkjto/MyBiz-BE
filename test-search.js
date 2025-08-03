/**
 * 매장 검색 테스트 스크립트
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/stores';

async function testSearch() {
  try {
    console.log('🔍 매장 검색 테스트 시작...');
    console.log('검색어: "신월3동 칼포니치킨"');
    
    const response = await axios.get(`${BASE_URL}/search`, {
      params: {
        query: '신월3동 칼포니치킨',
        display: 5
      }
    });
    
    console.log('\n✅ 검색 결과:');
    console.log('성공:', response.data.success);
    console.log('총 결과 수:', response.data.total);
    console.log('검색어:', response.data.query);
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('\n📋 검색된 매장들:');
      response.data.data.forEach((store, index) => {
        console.log(`\n${index + 1}. ${store.title || store.name}`);
        console.log(`   주소: ${store.address}`);
        console.log(`   도로명: ${store.roadAddress || 'N/A'}`);
        console.log(`   전화: ${store.telephone || 'N/A'}`);
        console.log(`   카테고리: ${store.category || 'N/A'}`);
        if (store.mapx && store.mapy) {
          console.log(`   좌표: (${store.mapx}, ${store.mapy})`);
        }
      });
      
      // 첫 번째 매장으로 Place ID 추출 테스트
      const firstStore = response.data.data[0];
      console.log('\n🔍 첫 번째 매장으로 Place ID 추출 테스트...');
      
      const placeIdResponse = await axios.post(`${BASE_URL}/extract-place-id`, {
        name: firstStore.title || firstStore.name,
        address: firstStore.address,
        roadAddress: firstStore.roadAddress,
        district: '신월동',
        x: firstStore.mapx,
        y: firstStore.mapy
      });
      
      if (placeIdResponse.data.success) {
        console.log('✅ Place ID 추출 성공!');
        console.log('Place ID:', placeIdResponse.data.data.placeId);
        console.log('추출 방법:', placeIdResponse.data.data.extractionMethod);
        console.log('성공률:', placeIdResponse.data.data.successRate * 100 + '%');
        console.log('플레이스 URL:', placeIdResponse.data.data.placeUrl);
        console.log('리뷰 URL:', placeIdResponse.data.data.reviewUrl);
      } else {
        console.log('❌ Place ID 추출 실패');
        console.log('수동 확인 단계:');
        if (placeIdResponse.data.data.manualSteps) {
          placeIdResponse.data.data.manualSteps.forEach((step, index) => {
            console.log(`  ${index + 1}. ${step}`);
          });
        }
      }
      
    } else {
      console.log('❌ 검색 결과가 없습니다.');
    }
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
    if (error.response) {
      console.error('응답 데이터:', error.response.data);
    }
  }
}

// 테스트 실행
testSearch(); 