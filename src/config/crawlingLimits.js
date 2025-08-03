/**
 * 네이버 리뷰 크롤링 안전 설정
 * 크롤링 제한 및 딜레이 설정을 관리합니다.
 * 
 * 네이버 리뷰 구조: 초기 10개 → 더보기 클릭 시 10개씩 추가
 * 소표본 감성분석 한계: 10-20개(60-75%), 30-50개(75-85%), 100개+(85-95%)
 */

const CRAWLING_LIMITS = {
  // 세션별 제한
  maxReviewsPerSession: 20,    // 세션당 최대 리뷰 수
  maxClicksPerSession: 2,      // 세션당 최대 더보기 클릭 수
  
  // 딜레이 설정 (밀리초)
  delayBetweenClicks: 3000,    // 클릭 간 대기 시간
  delayBetweenSessions: 3600000, // 세션 간 대기 시간 (1시간)
  delayBetweenPages: 2000,     // 페이지 로딩 대기 시간
  
  // 일일 제한
  dailyLimit: 50,              // 일일 최대 크롤링 수
  maxSessionsPerDay: 10,       // 일일 최대 세션 수
  
  // IP별 제한
  maxRequestsPerHour: 100,     // 시간당 최대 요청 수
  maxRequestsPerDay: 500,      // 일일 최대 요청 수
};

/**
 * 크롤링 단계별 안전 설정
 * 네이버 리뷰 구조 기반 현실적 설정
 */
const CRAWLING_LEVELS = {
  basic: {
    name: '기초 단계',
    maxReviews: 10,            // 초기 10개 (더보기 클릭 없음)
    maxClicks: 0,              // 더보기 버튼 클릭 없음
    riskLevel: '낮음',
    description: '초기 10개 리뷰만 (더보기 클릭 없음)',
    analysis: '기본 감성, 주요 키워드 3개',
    accuracy: '60-75%',
    reliability: '낮음',
    warning: '⚠️ 리뷰가 부족해 정확도가 낮습니다 (60-75%)',
    recommendation: '참고용으로만 활용하세요'
  },
  
  intermediate: {
    name: '중급 단계',
    maxReviews: 30,            // 초기 10개 + 더보기 2회 (10+10+10)
    maxClicks: 2,              // 더보기 버튼 2회 클릭
    riskLevel: '보통',
    description: '초기 10개 + 더보기 2회 클릭 (총 30개)',
    analysis: '감성분석, 키워드 분석, 만족도',
    accuracy: '75-85%',
    reliability: '보통',
    warning: '📊 보통 수준의 분석입니다 (75-85%)',
    recommendation: '참고용으로 활용하세요'
  },
  
  advanced: {
    name: '고급 단계',
    maxReviews: 100,           // 초기 10개 + 더보기 9회 (10+90)
    maxClicks: 9,              // 더보기 버튼 9회 클릭
    riskLevel: '높음',
    description: '초기 10개 + 더보기 9회 클릭 (총 100개)',
    analysis: '속성별 분석, 개선점 도출, 신뢰할 수 있는 결과',
    accuracy: '85-95%',
    reliability: '높음',
    warning: '✅ 신뢰할 수 있는 분석입니다 (85-95%)',
    recommendation: '비즈니스 의사결정에 활용 가능'
  }
};

/**
 * 소표본 감성분석 정확도 정보
 */
const SENTIMENT_ANALYSIS_ACCURACY = {
  smallSample: {
    range: '5-15개',
    accuracy: '60-75%',
    reliability: '낮음',
    description: '참고용만 가능, 정확한 분석 불가',
    recommendation: '더 많은 리뷰 수집 후 재분석 권장'
  },
  
  mediumSample: {
    range: '15-30개',
    accuracy: '70-80%',
    reliability: '보통',
    description: '대략적 경향 파악 가능',
    recommendation: '제한적 의사결정 가능'
  },
  
  largeSample: {
    range: '30-100개',
    accuracy: '80-90%',
    reliability: '높음',
    description: '트렌드 분석 가능',
    recommendation: '의사결정에 활용 가능'
  },
  
  sufficientSample: {
    range: '100개+',
    accuracy: '90-95%',
    reliability: '매우 높음',
    description: '신뢰할 수 있는 분석',
    recommendation: '비즈니스 의사결정에 적합'
  }
};

/**
 * 안전한 크롤링 권장사항
 */
const CRAWLING_RECOMMENDATIONS = {
  // 시간대별 권장사항
  timeBased: {
    peakHours: {
      start: 9,
      end: 18,
      recommendation: '업무 시간대에는 크롤링을 최소화하세요.',
      maxSessionsPerHour: 2
    },
    offPeakHours: {
      start: 22,
      end: 6,
      recommendation: '야간 시간대에 크롤링을 권장합니다.',
      maxSessionsPerHour: 5
    }
  },
  
  // 요일별 권장사항
  dayBased: {
    weekday: {
      recommendation: '평일에는 업무 시간대를 피해 크롤링하세요.',
      maxSessionsPerDay: 8
    },
    weekend: {
      recommendation: '주말에는 더 많은 크롤링이 가능합니다.',
      maxSessionsPerDay: 15
    }
  },
  
  // 에러 처리 권장사항
  errorHandling: {
    rateLimitExceeded: {
      action: '1시간 대기 후 재시도',
      backoffMultiplier: 2
    },
    networkError: {
      action: '5분 대기 후 재시도',
      maxRetries: 3
    },
    captchaDetected: {
      action: '즉시 중단하고 수동 확인',
      cooldownPeriod: 7200000 // 2시간
    }
  }
};

/**
 * 크롤링 모니터링 설정
 */
const MONITORING_CONFIG = {
  // 로깅 설정
  logging: {
    enabled: true,
    level: 'info', // debug, info, warn, error
    includeHeaders: false,
    includeBody: false
  },
  
  // 알림 설정
  alerts: {
    dailyLimitReached: true,
    rateLimitExceeded: true,
    errorThreshold: 5, // 연속 5회 오류 시 알림
    successRate: 0.8   // 80% 미만 성공률 시 알림
  },
  
  // 메트릭 수집
  metrics: {
    responseTime: true,
    successRate: true,
    errorRate: true,
    dailyUsage: true
  }
};

module.exports = {
  CRAWLING_LIMITS,
  CRAWLING_LEVELS,
  SENTIMENT_ANALYSIS_ACCURACY,
  CRAWLING_RECOMMENDATIONS,
  MONITORING_CONFIG
}; 