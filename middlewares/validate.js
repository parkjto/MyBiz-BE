export const validateBody = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed;
    next();
  } catch (e) {
    const issues = e?.issues?.map(i => `${i.path?.join('.')}: ${i.message}`) || [e.message];
    return res.status(400).json({ success: false, message: '유효하지 않은 입력', errors: issues });
  }
};

