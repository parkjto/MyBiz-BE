// 입력 검증 미들웨어 예시
module.exports = (schema) => (req, res, next) => {
  // Joi 또는 Zod 스키마를 받아 검증
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
}; 