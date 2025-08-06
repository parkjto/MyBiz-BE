const salesService = require('../services/salesService');

exports.getSales = (req, res) => {
  const result = salesService.getSales();
  res.json(result);
};
