const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// 환경변수 로드
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';
const TEST_IMAGE_PATH = path.join(__dirname, 'uploads', 'ocr', 'testimagelong.jpg');

async function testOcr() {
  try {
    console.log('🔍 OCR 테스트 시작...');
    console.log(`📁 테스트 이미지 경로: ${TEST_IMAGE_PATH}`);
    
    // 이미지 파일 존재 확인
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      console.error('❌ 테스트 이미지 파일을 찾을 수 없습니다.');
      console.log('💡 testimagelong.jpg 파일을 프로젝트 루트에 배치해주세요.');
      return;
    }

    // 1. OCR 설정 확인
    console.log('\n📋 1. OCR 설정 확인...');
    const configResponse = await fetch(`${BASE_URL}/api/ocr/config`);
    const configData = await configResponse.json();
    console.log('✅ OCR 설정:', JSON.stringify(configData, null, 2));

    // 2. 이미지 업로드 및 OCR 처리
    console.log('\n📤 2. 이미지 업로드 및 OCR 처리...');
    
    const form = new FormData();
    form.append('files', fs.createReadStream(TEST_IMAGE_PATH));
    
    const ocrResponse = await fetch(`${BASE_URL}/api/ocr/reviews`, {
      method: 'POST',
      body: form
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error('❌ OCR 처리 실패:', ocrResponse.status, errorText);
      return;
    }

    const ocrResult = await ocrResponse.json();
    console.log('✅ OCR 처리 성공!');
    console.log('📄 추출된 텍스트:');
    console.log('─'.repeat(50));
    console.log(ocrResult.text);
    console.log('─'.repeat(50));
    
    // 구조화된 데이터 표시
    if (ocrResult.structured) {
      console.log('\n🏗️ 구조화된 데이터:');
      console.log('─'.repeat(50));
      
      if (ocrResult.structured.reviews && ocrResult.structured.reviews.length > 0) {
        console.log(`📝 리뷰 데이터 (${ocrResult.structured.reviews.length}개):`);
        ocrResult.structured.reviews.slice(0, 3).forEach((review, index) => {
          console.log(`  ${index + 1}. ${review.date} - ${review.type}`);
          console.log(`     평점: ${review.rating || 'N/A'}`);
          console.log(`     내용: ${review.content.slice(0, 2).join(', ')}...`);
        });
        if (ocrResult.structured.reviews.length > 3) {
          console.log(`     ... 외 ${ocrResult.structured.reviews.length - 3}개 더`);
        }
      }
      
      if (ocrResult.structured.menus && ocrResult.structured.menus.length > 0) {
        console.log(`🍽️ 메뉴 데이터 (${ocrResult.structured.menus.length}개):`);
        ocrResult.structured.menus.slice(0, 5).forEach((menu, index) => {
          console.log(`  ${index + 1}. ${menu.name} - ${menu.price}원`);
        });
        if (ocrResult.structured.menus.length > 5) {
          console.log(`     ... 외 ${ocrResult.structured.menus.length - 5}개 더`);
        }
      }
      
      if (ocrResult.structured.summary) {
        console.log(`📊 요약: ${ocrResult.structured.summary}`);
      }
      
      console.log('─'.repeat(50));
    }
    
    if (ocrResult.sentiment) {
      console.log('\n😊 감정 분석 결과:', ocrResult.sentiment);
    }
    
    if (ocrResult.keywords) {
      console.log('\n🔑 키워드:', ocrResult.keywords);
    }
    
    if (ocrResult.summary) {
      console.log('\n📝 요약:', ocrResult.summary);
    }

    // 3. 결과 ID로 저장된 결과 조회
    if (ocrResult.id) {
      console.log('\n💾 3. 저장된 결과 조회...');
      const getResponse = await fetch(`${BASE_URL}/api/ocr/reviews/${ocrResult.id}`);
      if (getResponse.ok) {
        const savedResult = await getResponse.json();
        console.log('✅ 저장된 결과 조회 성공:', savedResult.id);
      }
    }

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 서버가 실행 중인지 확인해주세요: npm run dev');
    }
  }
}

// 서버 상태 확인
async function checkServerStatus() {
  try {
    const response = await fetch(`${BASE_URL}/`);
    if (response.ok) {
      console.log('✅ 서버가 정상적으로 실행 중입니다.');
      return true;
    }
  } catch (error) {
    console.log('❌ 서버에 연결할 수 없습니다.');
    return false;
  }
  return false;
}

// 메인 실행
async function main() {
  console.log('🚀 MyBiz OCR 테스트 시작');
  console.log(`🌐 서버 URL: ${BASE_URL}`);
  
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    console.log('\n💡 서버를 시작하려면:');
    console.log('   npm run dev');
    return;
  }
  
  await testOcr();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testOcr, checkServerStatus };
