/**
 * GPT 분석을 모킹하여 테스트할 수 있는 서비스
 * 실제 OpenAI API 키 없이도 OCR → DB 저장 플로우를 테스트할 수 있습니다.
 */

// 모킹된 리뷰 분석 결과
const mockReviewResults = [
  {
    작성자: "김철수",
    날짜: "2024.01.15",
    리뷰: "음식이 정말 맛있고 서비스도 친절합니다. 다음에 또 방문하고 싶어요!",
    감정: "긍정",
    장점키워드: ["맛있음", "친절", "서비스"],
    단점키워드: []
  },
  {
    작성자: "이영희",
    날짜: "2024.01.14",
    리뷰: "가격대비 괜찮고 분위기도 좋습니다. 다만 대기시간이 좀 길었어요.",
    감정: "보통",
    장점키워드: ["가격대비", "분위기"],
    단점키워드: ["대기시간"]
  },
  {
    작성자: "박민수",
    날짜: "2024.01.13",
    리뷰: "음식이 너무 짜고 직원들이 불친절했습니다. 다시는 안 갈 것 같아요.",
    감정: "부정",
    장점키워드: [],
    단점키워드: ["짜다", "불친절"]
  }
];

/**
 * OCR 텍스트를 분석하여 구조화된 리뷰 배열 반환 (모킹)
 */
export async function analyzeOcrText(ocrText) {
  console.log('[DEBUG] Mock GPT 분석 시작');
  console.log(`[DEBUG] OCR 텍스트 길이: ${ocrText.length}자`);
  
  // OCR 텍스트 길이에 따라 다른 결과 반환
  if (ocrText.length < 100) {
    console.log('[DEBUG] 짧은 텍스트: 1개 리뷰 반환');
    return [mockReviewResults[0]];
  } else if (ocrText.length < 500) {
    console.log('[DEBUG] 중간 텍스트: 2개 리뷰 반환');
    return mockReviewResults.slice(0, 2);
  } else {
    console.log('[DEBUG] 긴 텍스트: 3개 리뷰 반환');
    return mockReviewResults;
  }
}

/**
 * 감정 분석 결과 반환 (모킹)
 */
export function analyzeSentiment(text) {
  const positiveWords = ['맛있', '좋', '친절', '깔끔', '편안', '즐거', '만족'];
  const negativeWords = ['나쁘', '별로', '불친절', '더럽', '불편', '실망', '짜다'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (text.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (text.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount) return '긍정';
  if (negativeCount > positiveCount) return '부정';
  return '보통';
}

/**
 * 키워드 추출 (모킹)
 */
export function extractKeywords(text) {
  const commonKeywords = ['음식', '서비스', '가격', '분위기', '위치', '맛', '친절'];
  const extracted = [];
  
  commonKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      extracted.push(keyword);
    }
  });
  
  // 최대 5개까지만 반환
  return extracted.slice(0, 5);
}

/**
 * 리뷰 요약 생성 (모킹)
 */
export function generateSummary(review) {
  const sentiment = review.감정;
  const pros = review.장점키워드?.length > 0 ? review.장점키워드.join(', ') : '없음';
  const cons = review.단점키워드?.length > 0 ? review.단점키워드.join(', ') : '없음';
  
  return `${sentiment} 리뷰입니다. 장점: ${pros}, 단점: ${cons}`;
}

/**
 * 모킹 서비스 상태 확인
 */
export function getServiceStatus() {
  return {
    service: 'MockOpenAI',
    status: 'active',
    mode: 'mock',
    timestamp: new Date().toISOString(),
    features: [
      'OCR 텍스트 분석 모킹',
      '감정 분석 모킹',
      '키워드 추출 모킹',
      '리뷰 요약 생성 모킹'
    ],
    note: '실제 OpenAI API 없이 테스트용으로 사용'
  };
}

export default {
  analyzeOcrText,
  analyzeSentiment,
  extractKeywords,
  generateSummary,
  getServiceStatus
};
