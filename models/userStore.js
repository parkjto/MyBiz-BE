// 🎯 Supabase user_stores 테이블 구조 정의
// 이 파일은 테이블 구조와 타입 정의를 위한 참고용입니다.

/**
 * 🎯 Supabase user_stores 테이블 구조
 * 
 * 주요 컬럼:
 * - id: UUID (Primary Key)
 * - user_id: UUID (users 테이블 참조, 필수)
 * - store_name: VARCHAR (필수)
 * - address: TEXT (nullable)
 * - road_address: TEXT (nullable)
 * - phone: VARCHAR (nullable)
 * - category: VARCHAR (nullable)
 * - coordinates_x: VARCHAR (nullable)
 * - coordinates_y: VARCHAR (nullable)
 * - place_id: VARCHAR (nullable)
 * - map_url: TEXT (nullable)
 * - extracted_at: TIMESTAMP WITH TIME ZONE (nullable)
 * - coordinate_id: VARCHAR (nullable)
 * - manual_check_url: TEXT (nullable)
 * - is_primary: BOOLEAN (기본값: false)
 * - is_verified: BOOLEAN (기본값: false)
 * - created_at: TIMESTAMP WITH TIME ZONE (기본값: now())
 * - updated_at: TIMESTAMP WITH TIME ZONE (기본값: now())
 */

/**
 * 🎯 매장 카테고리 타입 정의
 */
export const STORE_CATEGORIES = {
  RESTAURANT: 'restaurant',
  CAFE: 'cafe',
  RETAIL: 'retail',
  SERVICE: 'service',
  HEALTHCARE: 'healthcare',
  EDUCATION: 'education',
  ENTERTAINMENT: 'entertainment',
  BEAUTY: 'beauty',
  AUTOMOTIVE: 'automotive',
  OTHER: 'other'
};

/**
 * 🎯 매장 상태 타입 정의
 */
export const STORE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  SUSPENDED: 'suspended'
};

/**
 * 🎯 메인 매장 타입 정의
 */
export const UserStoreType = {
  id: 'UUID',
  user_id: 'UUID',
  store_name: 'string',
  address: 'string | null',
  road_address: 'string | null',
  phone: 'string | null',
  category: 'string | null',
  coordinates_x: 'string | null',
  coordinates_y: 'string | null',
  place_id: 'string | null',
  map_url: 'string | null',
  extracted_at: 'timestamp | null',
  coordinate_id: 'string | null',
  manual_check_url: 'string | null',
  is_primary: 'boolean',
  is_verified: 'boolean',
  created_at: 'timestamp',
  updated_at: 'timestamp'
};

/**
 * 🎯 Supabase 테이블 이름
 */
export const USER_STORES_TABLE = 'user_stores';

/**
 * 🎯 매장 데이터 검증 스키마 (Joi)
 */
export const userStoreValidationSchema = {
  user_id: 'UUID',
  store_name: 'string (min: 1, max: 100)',
  address: 'string (max: 500) | null',
  road_address: 'string (max: 500) | null',
  phone: 'string (pattern: /^[0-9-+()]+$/) | null',
  category: 'string (enum: restaurant, cafe, retail, service, healthcare, education, entertainment, beauty, automotive, other) | null',
  coordinates_x: 'string | null',
  coordinates_y: 'string | null',
  place_id: 'string | null',
  map_url: 'string (uri) | null',
  is_primary: 'boolean',
  is_verified: 'boolean'
};

/**
 * 🎯 매장 생성 시 기본값
 */
export const getDefaultStoreData = (userId, storeName) => ({
  user_id: userId,
  store_name: storeName,
  is_primary: false,
  is_verified: false
});

/**
 * 🎯 매장 업데이트 데이터
 */
export const getStoreUpdateData = (storeData) => {
  const allowedFields = [
    'store_name',
    'address',
    'road_address',
    'phone',
    'category',
    'coordinates_x',
    'coordinates_y',
    'place_id',
    'map_url',
    'is_primary',
    'is_verified'
  ];
  
  const updateData = {};
  allowedFields.forEach(field => {
    if (storeData[field] !== undefined) {
      updateData[field] = storeData[field];
    }
  });
  
  return updateData;
};

/**
 * 🎯 좌표 유효성 검사
 */
export const validateCoordinates = (x, y) => {
  if (!x || !y) return false;
  
  const xNum = parseFloat(x);
  const yNum = parseFloat(y);
  
  // 위도: -90 ~ 90, 경도: -180 ~ 180
  return !isNaN(xNum) && !isNaN(yNum) && 
         xNum >= -180 && xNum <= 180 && 
         yNum >= -90 && yNum <= 90;
};

/**
 * 🎯 주소 정규화
 */
export const normalizeAddress = (address) => {
  if (!address) return null;
  
  // 주소에서 불필요한 공백 제거 및 정규화
  return address.trim().replace(/\s+/g, ' ');
};

/**
 * 🎯 매장 카테고리 한글명 반환
 */
export const getCategoryKoreanName = (category) => {
  const categoryNames = {
    [STORE_CATEGORIES.RESTAURANT]: '음식점',
    [STORE_CATEGORIES.CAFE]: '카페',
    [STORE_CATEGORIES.RETAIL]: '소매점',
    [STORE_CATEGORIES.SERVICE]: '서비스업',
    [STORE_CATEGORIES.HEALTHCARE]: '의료/건강',
    [STORE_CATEGORIES.EDUCATION]: '교육',
    [STORE_CATEGORIES.ENTERTAINMENT]: '엔터테인먼트',
    [STORE_CATEGORIES.BEAUTY]: '뷰티',
    [STORE_CATEGORIES.AUTOMOTIVE]: '자동차',
    [STORE_CATEGORIES.OTHER]: '기타'
  };
  
  return categoryNames[category] || '기타';
};

/**
 * 🎯 매장 검증 상태 업데이트
 */
export const updateStoreVerificationStatus = (storeId, isVerified, manualCheckUrl = null) => ({
  id: storeId,
  is_verified: isVerified,
  manual_check_url: manualCheckUrl,
  updated_at: new Date().toISOString()
});

module.exports = {
  USER_STORES_TABLE,
  STORE_CATEGORIES,
  STORE_STATUS,
  userStoreValidationSchema,
  getDefaultStoreData,
  getStoreUpdateData,
  validateCoordinates,
  normalizeAddress,
  getCategoryKoreanName,
  updateStoreVerificationStatus
};
