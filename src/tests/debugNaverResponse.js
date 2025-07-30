require('dotenv').config();
const axios = require('axios');

// 환경 변수 확인
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

console.log('=== 네이버 로컬 API 응답 구조 디버그 ===\n');

if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
  console.error('네이버 API 키가 설정되지 않았습니다.');
  process.exit(1);
}

/**
 * 네이버 로컬 API 응답 구조 분석
 */
async function debugNaverResponse() {
  try {
    console.log('🔍 네이버 로컬 API 응답 구조 분석...\n');

    // 테스트 검색
    const response = await axios.get('https://openapi.naver.com/v1/search/local.json', {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
      },
      params: {
        query: '스타벅스',
        display: 3,
        sort: 'random'
      }
    });

    console.log('📋 전체 응답 구조:');
    console.log(JSON.stringify(response.data, null, 2));

    console.log('\n📋 첫 번째 결과 상세 분석:');
    const firstItem = response.data.items[0];
    
    if (firstItem) {
      console.log('🔍 모든 필드 확인:');
      Object.keys(firstItem).forEach(key => {
        console.log(`   ${key}: ${JSON.stringify(firstItem[key])}`);
      });

      console.log('\n🔍 link 필드 상세 분석:');
      if (firstItem.link) {
        console.log(`   원본 link: ${firstItem.link}`);
        console.log(`   link 타입: ${typeof firstItem.link}`);
        console.log(`   link 길이: ${firstItem.link.length}`);
        
        // Place ID 패턴 검색
        const placePattern = /place\/(\d+)/;
        const match = firstItem.link.match(placePattern);
        console.log(`   Place ID 패턴 매치: ${match ? match[1] : '없음'}`);
        
        // 다른 패턴들도 확인
        const patterns = [
          /place\/(\d+)/,
          /entry\/place\/(\d+)/,
          /p\/entry\/place\/(\d+)/,
          /(\d{9,})/, // 9자리 이상 숫자
          /id=(\d+)/,
          /place_id=(\d+)/
        ];
        
        patterns.forEach((pattern, index) => {
          const patternMatch = firstItem.link.match(pattern);
          console.log(`   패턴 ${index + 1} (${pattern}): ${patternMatch ? patternMatch[1] : '없음'}`);
        });
      } else {
        console.log('   link 필드가 없습니다.');
      }

      console.log('\n🔍 description 필드 확인:');
      if (firstItem.description) {
        console.log(`   description: ${firstItem.description}`);
        const descMatch = firstItem.description.match(/place\/(\d+)/);
        console.log(`   description에서 Place ID: ${descMatch ? descMatch[1] : '없음'}`);
      } else {
        console.log('   description 필드가 없습니다.');
      }

      console.log('\n🔍 title 필드 확인:');
      if (firstItem.title) {
        console.log(`   원본 title: ${firstItem.title}`);
        const cleanTitle = firstItem.title.replace(/<[^>]*>/g, '');
        console.log(`   정리된 title: ${cleanTitle}`);
        const titleMatch = cleanTitle.match(/place\/(\d+)/);
        console.log(`   title에서 Place ID: ${titleMatch ? titleMatch[1] : '없음'}`);
      } else {
        console.log('   title 필드가 없습니다.');
      }
    }

  } catch (error) {
    console.error('❌ 디버그 중 오류 발생:', error.message);
    if (error.response) {
      console.error('   응답 상태:', error.response.status);
      console.error('   응답 데이터:', error.response.data);
    }
  }
}

// 디버그 실행
debugNaverResponse(); 