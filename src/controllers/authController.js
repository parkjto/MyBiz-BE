const authService = require('../services/authService');

exports.kakaoLogin = async (req, res) => {
  const { code } = req.body;
  try {
    const result = await authService.kakaoLogin(code);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.logout = (req, res) => {
  const result = authService.logout();
  res.json(result);
};
