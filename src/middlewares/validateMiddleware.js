const Joi = require('joi');

/**
 * Joi 스키마를 사용한 입력 검증 미들웨어
 * @param {Object} schema - Joi 검증 스키마
 * @returns {Function} Express 미들웨어 함수
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        error: '입력 데이터 검증 실패',
        details: errorMessage
      });
    }
    
    // 검증된 데이터로 req.body 업데이트
    req.body = value;
    next();
  };
};

/**
 * 쿼리 파라미터 검증 미들웨어
 * @param {Object} schema - Joi 검증 스키마
 * @returns {Function} Express 미들웨어 함수
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        error: '쿼리 파라미터 검증 실패',
        details: errorMessage
      });
    }
    
    req.query = value;
    next();
  };
};

// 카카오 로그인 요청 검증 스키마
const kakaoLoginSchema = Joi.object({
  code: Joi.string().required().messages({
    'string.empty': '카카오 인가 코드는 필수입니다.',
    'any.required': '카카오 인가 코드가 필요합니다.'
  })
});

// 사용자 프로필 업데이트 검증 스키마
const updateProfileSchema = Joi.object({
  nickname: Joi.string().min(2).max(20).optional().messages({
    'string.min': '닉네임은 최소 2자 이상이어야 합니다.',
    'string.max': '닉네임은 최대 20자까지 가능합니다.'
  }),
  email: Joi.string().email().optional().messages({
    'string.email': '유효한 이메일 주소를 입력해주세요.'
  })
});

// 매장 검색 검증 스키마
const storeSearchSchema = Joi.object({
  query: Joi.string().min(1).max(100).required().messages({
    'string.empty': '검색어는 필수입니다.',
    'string.min': '검색어는 최소 1자 이상이어야 합니다.',
    'string.max': '검색어는 최대 100자까지 가능합니다.',
    'any.required': '검색어가 필요합니다.'
  }),
  page: Joi.number().integer().min(1).max(100).default(1).messages({
    'number.base': '페이지 번호는 숫자여야 합니다.',
    'number.integer': '페이지 번호는 정수여야 합니다.',
    'number.min': '페이지 번호는 1 이상이어야 합니다.',
    'number.max': '페이지 번호는 100 이하여야 합니다.'
  })
});

module.exports = {
  validate,
  validateQuery,
  schemas: {
    kakaoLogin: kakaoLoginSchema,
    updateProfile: updateProfileSchema,
    storeSearch: storeSearchSchema
  }
}; 