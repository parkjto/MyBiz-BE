// 🎯 Supabase users 테이블 구조 정의
// 이 파일은 테이블 구조와 타입 정의를 위한 참고용입니다.

/**
 * 🎯 Supabase users 테이블 구조
 * 
 * 주요 컬럼:
 * - id: UUID (Primary Key)
 * - instance_id: UUID (nullable)
 * - email: VARCHAR (필수)
 * - aud: VARCHAR (nullable)
 * - kakao_id: VARCHAR (nullable)
 * - role: VARCHAR (nullable)
 * - naver_id: VARCHAR (nullable)
 * - nickname: VARCHAR (nullable)
 * - encrypted_password: VARCHAR (nullable)
 * - profile_image_url: TEXT (nullable)
 * - email_confirmed_at: TIMESTAMP WITH TIME ZONE (nullable)
 * - phone_number: VARCHAR (nullable)
 * - business_type: VARCHAR (nullable)
 * - invited_at: TIMESTAMP WITH TIME ZONE (nullable)
 * - last_login_at: TIMESTAMP WITH TIME ZONE (nullable)
 * - is_super_admin: BOOLEAN (nullable)
 * - is_sso_user: BOOLEAN (기본값: false)
 * - is_anonymous: BOOLEAN (기본값: false)
 * - created_at: TIMESTAMP WITH TIME ZONE (기본값: now())
 * - updated_at: TIMESTAMP WITH TIME ZONE (기본값: now())
 */

/**
 * 🎯 사용자 역할 타입 정의
 */
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  BUSINESS_OWNER: 'business_owner'
};

/**
 * 🎯 비즈니스 타입 정의
 */
export const BUSINESS_TYPES = {
  RESTAURANT: 'restaurant',
  CAFE: 'cafe',
  RETAIL: 'retail',
  SERVICE: 'service',
  HEALTHCARE: 'healthcare',
  EDUCATION: 'education',
  OTHER: 'other'
};

/**
 * 🎯 소셜 로그인 타입 정의
 */
export const SOCIAL_LOGIN_TYPES = {
  KAKAO: 'kakao',
  NAVER: 'naver',
  GOOGLE: 'google',
  EMAIL: 'email'
};

/**
 * 🎯 메인 사용자 타입 정의
 */
export const UserType = {
  id: 'UUID',
  instance_id: 'UUID | null',
  email: 'string',
  aud: 'string | null',
  kakao_id: 'string | null',
  role: 'string | null',
  naver_id: 'string | null',
  nickname: 'string | null',
  encrypted_password: 'string | null',
  profile_image_url: 'string | null',
  email_confirmed_at: 'timestamp | null',
  phone_number: 'string | null',
  business_type: 'string | null',
  invited_at: 'timestamp | null',
  last_login_at: 'timestamp | null',
  is_super_admin: 'boolean | null',
  is_sso_user: 'boolean',
  is_anonymous: 'boolean',
  created_at: 'timestamp',
  updated_at: 'timestamp'
};

/**
 * 🎯 Supabase 테이블 이름
 */
export const USERS_TABLE = 'users';

/**
 * 🎯 사용자 상태
 */
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  DELETED: 'deleted'
};

/**
 * 🎯 사용자 데이터 검증 스키마 (Joi)
 */
export const userValidationSchema = {
  email: 'string (email)',
  nickname: 'string (min: 1, max: 50) | null',
  phone_number: 'string (pattern: /^[0-9-+()]+$/) | null',
  business_type: 'string (enum: restaurant, cafe, retail, service, healthcare, education, other) | null',
  profile_image_url: 'string (uri) | null',
  role: 'string (enum: user, admin, super_admin, business_owner) | null'
};

/**
 * 🎯 사용자 생성 시 기본값
 */
export const getDefaultUserData = (email, socialType = SOCIAL_LOGIN_TYPES.EMAIL) => ({
  email,
  aud: 'authenticated',
  role: USER_ROLES.USER,
  is_sso_user: socialType !== SOCIAL_LOGIN_TYPES.EMAIL,
  is_anonymous: false,
  is_super_admin: false
});

/**
 * 🎯 사용자 프로필 업데이트 데이터
 */
export const getUserProfileUpdateData = (profileData) => {
  const allowedFields = [
    'nickname',
    'phone_number',
    'business_type',
    'profile_image_url',
    'role'
  ];
  
  const updateData = {};
  allowedFields.forEach(field => {
    if (profileData[field] !== undefined) {
      updateData[field] = profileData[field];
    }
  });
  
  return updateData;
};

/**
 * 🎯 소셜 로그인 사용자 정보 설정
 */
export const setSocialLoginInfo = (userData, socialType, socialId) => {
  const updateData = {
    is_sso_user: true,
    last_login_at: new Date().toISOString()
  };
  
  switch (socialType) {
    case SOCIAL_LOGIN_TYPES.KAKAO:
      updateData.kakao_id = socialId;
      break;
    case SOCIAL_LOGIN_TYPES.NAVER:
      updateData.naver_id = socialId;
      break;
    default:
      break;
  }
  
  return updateData;
};

/**
 * 🎯 사용자 권한 확인 함수
 */
export const hasPermission = (userRole, requiredRole) => {
  const roleHierarchy = {
    [USER_ROLES.USER]: 1,
    [USER_ROLES.BUSINESS_OWNER]: 2,
    [USER_ROLES.ADMIN]: 3,
    [USER_ROLES.SUPER_ADMIN]: 4
  };
  
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
};

/**
 * 🎯 이메일 확인 상태 확인
 */
export const isEmailConfirmed = (userData) => {
  return userData.email_confirmed_at !== null;
};

/**
 * 🎯 전화번호 확인 상태 확인
 */
export const isPhoneConfirmed = (userData) => {
  return userData.phone_confirmed_at !== null;
};

module.exports = {
  USERS_TABLE,
  USER_ROLES,
  BUSINESS_TYPES,
  SOCIAL_LOGIN_TYPES,
  USER_STATUS,
  userValidationSchema,
  getDefaultUserData,
  getUserProfileUpdateData,
  setSocialLoginInfo,
  hasPermission,
  isEmailConfirmed,
  isPhoneConfirmed
};
