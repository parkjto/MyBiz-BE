// 🎯 Supabase store_reviews 테이블 구조 정의
// 이 파일은 테이블 구조와 타입 정의를 위한 참고용입니다.

/**
 * 🎯 Supabase store_reviews 테이블 구조
 * 
 * 기존 테이블 구조:
 * - id: UUID (Primary Key)
 * - store_id: UUID (user_stores 테이블 참조)
 * - user_id: UUID (users 테이블 참조, nullable)
 * - raw_text: TEXT (필수)
 * - cleaned_text: TEXT (기본값: '')
 * - sentiment: JSONB (기본값: [])
 * - keywords: TEXT[] (기본값: {})
 * - summary: TEXT (nullable)
 * - image_url: TEXT (nullable)
 * - status: VARCHAR (기본값: 'pending')
 * - error_message: TEXT (nullable)
 * - created_at: TIMESTAMP WITH TIME ZONE (기본값: now())
 * - updated_at: TIMESTAMP WITH TIME ZONE (기본값: now())
 */

/**
 * 🎯 리뷰 감정 분석 타입 정의
 */
export const ReviewSentimentType = {
  감정: '긍정 | 부정 | 보통',
  점수: 'number', // 0-100
  신뢰도: 'number' // 0-1
};

/**
 * 🎯 메인 리뷰 타입 정의
 */
export const StoreReviewType = {
  id: 'UUID',
  store_id: 'UUID',
  user_id: 'UUID | null',
  raw_text: 'string',
  cleaned_text: 'string',
  sentiment: 'ReviewSentimentType[]',
  keywords: 'string[]',
  summary: 'string | null',
  image_url: 'string | null',
  status: 'pending | processing | completed | failed',
  error_message: 'string | null',
  created_at: 'timestamp',
  updated_at: 'timestamp'
};

/**
 * 🎯 Supabase 테이블 이름
 */
export const STORE_REVIEWS_TABLE = 'store_reviews';
export const USER_STORES_TABLE = 'user_stores';
export const USERS_TABLE = 'users';

/**
 * 🎯 기본 상태값들
 */
export const REVIEW_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * 🎯 감정 타입
 */
export const SENTIMENT_TYPES = {
  POSITIVE: '긍정',
  NEGATIVE: '부정',
  NEUTRAL: '보통'
};

/**
 * 🎯 리뷰 상태별 설명
 */
export const REVIEW_STATUS_DESCRIPTION = {
  [REVIEW_STATUS.PENDING]: '대기 중',
  [REVIEW_STATUS.PROCESSING]: '처리 중',
  [REVIEW_STATUS.COMPLETED]: '완료',
  [REVIEW_STATUS.FAILED]: '실패'
};

/**
 * 🎯 기본 키워드 카테고리
 */
export const KEYWORD_CATEGORIES = {
  서비스: 'service',
  품질: 'quality',
  가격: 'price',
  분위기: 'atmosphere',
  위치: 'location',
  직원: 'staff',
  청결: 'cleanliness',
  맛: 'taste',
  속도: 'speed'
};

/**
 * 🎯 리뷰 데이터 검증 스키마 (Joi)
 */
export const reviewValidationSchema = {
  store_id: 'UUID',
  user_id: 'UUID | null',
  raw_text: 'string (min: 1)',
  cleaned_text: 'string',
  sentiment: 'array',
  keywords: 'array',
  summary: 'string | null',
  image_url: 'string | null',
  status: 'string (enum: pending, processing, completed, failed)',
  error_message: 'string | null'
};

/**
 * 🎯 리뷰 생성 시 기본값
 */
export const getDefaultReviewData = (storeId, rawText, userId = null) => ({
  store_id: storeId,
  user_id: userId,
  raw_text: rawText,
  cleaned_text: '',
  sentiment: [],
  keywords: [],
  summary: null,
  image_url: null,
  status: REVIEW_STATUS.PENDING,
  error_message: null
});

/**
 * 🎯 리뷰 상태 업데이트 함수
 */
export const updateReviewStatus = (reviewId, status, errorMessage = null) => ({
  id: reviewId,
  status,
  error_message: errorMessage,
  updated_at: new Date().toISOString()
});

/**
 * 🎯 감정 분석 결과 포맷팅
 */
export const formatSentimentResult = (sentimentData) => {
  if (!Array.isArray(sentimentData)) {
    return [];
  }
  
  return sentimentData.map(item => ({
    감정: item.감정 || SENTIMENT_TYPES.NEUTRAL,
    점수: item.점수 || 50,
    신뢰도: item.신뢰도 || 0.8
  }));
};

/**
 * 🎯 키워드 추출 결과 포맷팅
 */
export const formatKeywordsResult = (keywordsData) => {
  if (!Array.isArray(keywordsData)) {
    return [];
  }
  
  return keywordsData.filter(keyword => 
    typeof keyword === 'string' && keyword.trim().length > 0
  );
};

/**
 * 🎯 리뷰 요약 결과 포맷팅
 */
export const formatSummaryResult = (summaryData) => {
  if (!summaryData || typeof summaryData !== 'string') {
    return null;
  }
  
  return summaryData.trim();
};

module.exports = {
  STORE_REVIEWS_TABLE,
  USER_STORES_TABLE,
  USERS_TABLE,
  REVIEW_STATUS,
  SENTIMENT_TYPES,
  REVIEW_STATUS_DESCRIPTION,
  KEYWORD_CATEGORIES,
  reviewValidationSchema,
  getDefaultReviewData,
  updateReviewStatus,
  formatSentimentResult,
  formatKeywordsResult,
  formatSummaryResult
};
