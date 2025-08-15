const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// 환경변수 로드
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';
const TEST_IMAGE_PATH = path.join(__dirname, 'uploads', 'ocr', 'testimagelong.jpg');

async function testGrayTextOptimization() {
  try {
    console.log('🔍 회색 연한 글씨 OCR 최적화 테스트 시작...');
    console.log(`📁 테스트 이미지 경로: ${TEST_IMAGE_PATH}`);
    
    // 이미지 파일 존재 확인
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      console.error('❌ 테스트 이미지 파일을 찾을 수 없습니다.');
      return;
    }

    // 1. 현재 OCR 설정 확인
    console.log('\n📋 1. 현재 OCR 설정 확인...');
    const configResponse = await fetch(`${BASE_URL}/api/ocr/config`);
    const configData = await configResponse.json();
    console.log('✅ 현재 OCR 설정:', JSON.stringify(configData.config, null, 2));

    // 2. 회색 글씨 최적화 설정 적용
    console.log('\n🔧 2. 회색 글씨 최적화 설정 적용...');
    const optimizeResponse = await fetch(`${BASE_URL}/api/ocr/optimize-gray-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contrastMultiplier: 2.0,      // 대비 2배
        brightnessOffset: -0.3,       // 밝기 -0.3
        sharpenSigma: 2.0,            // 샤픈 강도 2.0
        thresholdValue: 150,           // 임계값 150 (회색 글씨용)
        useAdaptiveThreshold: true    // 적응형 임계값 사용
      })
    });

    if (!optimizeResponse.ok) {
      const errorText = await optimizeResponse.text();
      console.error('❌ 최적화 설정 실패:', optimizeResponse.status, errorText);
      return;
    }

    const optimizeData = await optimizeResponse.json();
    console.log('✅ 최적화 설정 적용 성공:', JSON.stringify(optimizeData.updatedConfig, null, 2));

    // 3. 회색 글씨 최적화 테스트
    console.log('\n🧪 3. 회색 글씨 최적화 테스트...');
    
    const form = new FormData();
    form.append('files', fs.createReadStream(TEST_IMAGE_PATH));
    
    const testResponse = await fetch(`${BASE_URL}/api/ocr/test-gray-text`, {
      method: 'POST',
      body: form
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('❌ 최적화 테스트 실패:', testResponse.status, errorText);
      return;
    }

    const testResult = await testResponse.json();
    console.log('✅ 회색 글씨 최적화 테스트 성공!');
    console.log('📄 최적화된 OCR 결과:');
    console.log('─'.repeat(50));
    console.log(testResult.originalText);
    console.log('─'.repeat(50));

    // 4. 일반 OCR과 비교 테스트
    console.log('\n📊 4. 일반 OCR과 최적화 OCR 비교...');
    
    const normalForm = new FormData();
    normalForm.append('files', fs.createReadStream(TEST_IMAGE_PATH));
    
    const normalResponse = await fetch(`${BASE_URL}/api/ocr/reviews`, {
      method: 'POST',
      body: normalForm
    });

    if (normalResponse.ok) {
      const normalResult = await normalResponse.json();
      console.log('📈 일반 OCR 결과 길이:', normalResult.text.length);
      console.log('📈 최적화 OCR 결과 길이:', testResult.originalText.length);
      
      const improvement = ((testResult.originalText.length - normalResult.text.length) / normalResult.text.length * 100).toFixed(2);
      console.log(`📈 개선률: ${improvement}%`);
      
      if (parseFloat(improvement) > 0) {
        console.log('🎉 회색 글씨 인식이 개선되었습니다!');
      } else {
        console.log('⚠️ 추가 최적화가 필요할 수 있습니다.');
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
  console.log('🚀 MyBiz 회색 글씨 OCR 최적화 테스트 시작');
  console.log(`🌐 서버 URL: ${BASE_URL}`);
  
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    console.log('\n💡 서버를 시작하려면:');
    console.log('   npm run dev');
    return;
  }
  
  await testGrayTextOptimization();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testGrayTextOptimization, checkServerStatus };
