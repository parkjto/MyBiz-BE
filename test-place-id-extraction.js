/**
 * Place ID 추출 시스템 테스트 스크립트
 * 
 * 사용법:
 * node test-place-id-extraction.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/stores';

// 테스트할 매장 데이터
const testStores = [
  {
    name: '칼포니치킨',
    address: '서울특별시 양천구 신월동 1002-4',
    roadAddress: '서울특별시 양천구 신월로 128',
    district: '신월동',
    x: '1268381536',
    y: '375164998'
  },
  {
    name: '스타벅스 강남점',
    address: '서울특별시 강남구 역삼동 737',
    roadAddress: '서울특별시 강남구 테헤란로 129',
    district: '역삼동',
    x: '1270280000',
    y: '373500000'
  },
  {
    name: '올리브영 홍대점',
    address: '서울특별시 마포구 동교동 160-1',
    roadAddress: '서울특별시 마포구 홍대로 374',
    district: '동교동',
    x: '1269240000',
    y: '375600000'
  }
];

/**
 * Place ID 추출 상태 확인
 */
async function checkExtractionStatus() {
  try {
    console.log('📊 Place ID 추출 시스템 상태 확인 중...');
    
    const response = await axios.get(`${BASE_URL}/extract-place-id/status`);
    
    if (response.data.success) {
      console.log('✅ 시스템 상태 확인 완료');
      console.log('📈 전체 성공률:', response.data.data.overallSuccessRate * 100 + '%');
      
      Object.entries(response.data.data.methods).forEach(([method, info]) => {
        console.log(`  - ${method}: ${info.successRate * 100}% (${info.description})`);
      });
    } else {
      console.log('❌ 시스템 상태 확인 실패');
    }
    
  } catch (error) {
    console.error('❌ 시스템 상태 확인 오류:', error.message);
  }
}

/**
 * Place ID 추출 테스트
 */
async function testPlaceIdExtraction(storeInfo) {
  try {
    console.log(`\n🔍 Place ID 추출 테스트: ${storeInfo.name}`);
    console.log(`📍 주소: ${storeInfo.address}`);
    
    const response = await axios.post(`${BASE_URL}/extract-place-id`, storeInfo);
    
    if (response.data.success) {
      const result = response.data.data;
      console.log('✅ Place ID 추출 성공!');
      console.log(`  - Place ID: ${result.placeId}`);
      console.log(`  - 추출 방법: ${result.extractionMethod}`);
      console.log(`  - 성공률: ${result.successRate * 100}%`);
      console.log(`  - 신뢰도: ${result.confidence * 100}%`);
      console.log(`  - 플레이스 URL: ${result.placeUrl}`);
      console.log(`  - 리뷰 URL: ${result.reviewUrl}`);
      console.log(`  - 추출 시간: ${result.extractedAt}`);
      
      return result.placeId;
    } else {
      console.log('❌ Place ID 추출 실패');
      console.log('📝 수동 확인 단계:');
      
      if (response.data.data.manualSteps) {
        response.data.data.manualSteps.forEach((step, index) => {
          console.log(`  ${index + 1}. ${step}`);
        });
      }
      
      return null;
    }
    
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('❌ Place ID 추출 실패 (자동 방법 모두 실패)');
      console.log('📝 수동 확인 단계:');
      
      if (error.response.data.data.manualSteps) {
        error.response.data.data.manualSteps.forEach((step, index) => {
          console.log(`  ${index + 1}. ${step}`);
        });
      }
    } else {
      console.error('❌ Place ID 추출 오류:', error.message);
    }
    
    return null;
  }
}

/**
 * Place ID 검증 테스트
 */
async function testPlaceIdValidation(placeId) {
  if (!placeId) {
    console.log('⚠️ 검증할 Place ID가 없습니다.');
    return;
  }
  
  try {
    console.log(`\n🔍 Place ID 검증 테스트: ${placeId}`);
    
    const response = await axios.post(`${BASE_URL}/validate-place-id`, { placeId });
    
    if (response.data.success) {
      const result = response.data.data;
      console.log('✅ Place ID 검증 성공!');
      console.log(`  - 유효성: ${result.isValid}`);
      console.log(`  - 플레이스 URL: ${result.placeUrl}`);
      console.log(`  - 리뷰 URL: ${result.reviewUrl}`);
    } else {
      console.log('❌ Place ID 검증 실패');
      console.log('  - 오류:', response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Place ID 검증 오류:', error.message);
  }
}

/**
 * 메인 테스트 실행
 */
async function runTests() {
  console.log('🚀 Place ID 추출 시스템 테스트 시작\n');
  
  // 1. 시스템 상태 확인
  await checkExtractionStatus();
  
  // 2. 각 매장에 대해 Place ID 추출 테스트
  const extractedPlaceIds = [];
  
  for (const store of testStores) {
    const placeId = await testPlaceIdExtraction(store);
    if (placeId) {
      extractedPlaceIds.push(placeId);
      
      // 3. 추출된 Place ID 검증
      await testPlaceIdValidation(placeId);
    }
    
    // 테스트 간 대기 (정책 준수)
    console.log('⏳ 다음 테스트까지 대기 중...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // 4. 테스트 결과 요약
  console.log('\n📊 테스트 결과 요약');
  console.log(`총 테스트 매장: ${testStores.length}개`);
  console.log(`성공한 추출: ${extractedPlaceIds.length}개`);
  console.log(`성공률: ${(extractedPlaceIds.length / testStores.length * 100).toFixed(1)}%`);
  
  if (extractedPlaceIds.length > 0) {
    console.log('\n✅ 추출된 Place ID 목록:');
    extractedPlaceIds.forEach((placeId, index) => {
      console.log(`  ${index + 1}. ${placeId}`);
    });
  }
  
  console.log('\n🎉 테스트 완료!');
}

// 스크립트 실행
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ 테스트 실행 중 오류 발생:', error);
    process.exit(1);
  });
}

module.exports = {
  checkExtractionStatus,
  testPlaceIdExtraction,
  testPlaceIdValidation,
  runTests
}; 