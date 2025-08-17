// 🎯 Supabase 기반 모델 통합 인덱스
// 모든 모델을 한 곳에서 import하여 사용할 수 있도록 합니다.

const userModel = require('./models/user');
const userStoreModel = require('./models/userStore');
const reviewModel = require('./models/review');
const salesModel = require('./models/sales');

/**
 * 🎯 모델 통합 객체
 * 각 모델의 상수와 함수들을 하나의 객체로 통합하여 제공합니다.
 */
const models = {
  // 사용자 관련
  users: {
    table: userModel.USERS_TABLE,
    roles: userModel.USER_ROLES,
    businessTypes: userModel.BUSINESS_TYPES,
    socialLoginTypes: userModel.SOCIAL_LOGIN_TYPES,
    status: userModel.USER_STATUS,
    validationSchema: userModel.userValidationSchema,
    getDefaultData: userModel.getDefaultUserData,
    getProfileUpdateData: userModel.getUserProfileUpdateData,
    setSocialLoginInfo: userModel.setSocialLoginInfo,
    hasPermission: userModel.hasPermission,
    isEmailConfirmed: userModel.isEmailConfirmed,
    isPhoneConfirmed: userModel.isPhoneConfirmed
  },

  // 사용자 매장 관련
  userStores: {
    table: userStoreModel.USER_STORES_TABLE,
    categories: userStoreModel.STORE_CATEGORIES,
    status: userStoreModel.STORE_STATUS,
    validationSchema: userStoreModel.userStoreValidationSchema,
    getDefaultData: userStoreModel.getDefaultStoreData,
    getUpdateData: userStoreModel.getStoreUpdateData,
    validateCoordinates: userStoreModel.validateCoordinates,
    normalizeAddress: userStoreModel.normalizeAddress,
    getCategoryKoreanName: userStoreModel.getCategoryKoreanName,
    updateVerificationStatus: userStoreModel.updateStoreVerificationStatus
  },

  // 리뷰 관련
  reviews: {
    table: reviewModel.STORE_REVIEWS_TABLE,
    status: reviewModel.REVIEW_STATUS,
    sentimentTypes: reviewModel.SENTIMENT_TYPES,
    statusDescription: reviewModel.REVIEW_STATUS_DESCRIPTION,
    keywordCategories: reviewModel.KEYWORD_CATEGORIES,
    validationSchema: reviewModel.reviewValidationSchema,
    getDefaultData: reviewModel.getDefaultReviewData,
    updateStatus: reviewModel.updateReviewStatus,
    formatSentiment: reviewModel.formatSentimentResult,
    formatKeywords: reviewModel.formatKeywordsResult,
    formatSummary: reviewModel.formatSummaryResult
  },

  // 매출 관련 (향후 확장)
  sales: {
    status: salesModel.SALES_STATUS,
    getDefaultData: salesModel.getDefaultSalesData
  }
};

/**
 * 🎯 테이블 이름 상수
 */
const TABLES = {
  USERS: userModel.USERS_TABLE,
  USER_STORES: userStoreModel.USER_STORES_TABLE,
  STORE_REVIEWS: reviewModel.STORE_REVIEWS_TABLE
};

/**
 * 🎯 공통 상태 상수
 */
const COMMON_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ACTIVE: 'active',
  INACTIVE: 'inactive'
};

/**
 * 🎯 데이터베이스 연결 상태 확인
 */
const checkDatabaseConnection = () => {
  // Supabase 연결 상태 확인 로직 (향후 구현)
  return {
    status: 'connected',
    provider: 'supabase',
    timestamp: new Date().toISOString()
  };
};

/**
 * 🎯 모델 초기화
 */
const initializeModels = () => {
  console.log('🎯 Supabase 모델 초기화 완료');
  console.log('📊 사용 가능한 테이블:', Object.values(TABLES));
  return models;
};

module.exports = {
  models,
  TABLES,
  COMMON_STATUS,
  checkDatabaseConnection,
  initializeModels,
  
  // 개별 모델 직접 접근
  userModel,
  userStoreModel,
  reviewModel,
  salesModel
};
