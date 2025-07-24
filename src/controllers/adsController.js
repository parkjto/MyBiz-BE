const adsService = require('../services/adsService');

exports.getAds = (req, res) => {
  const result = adsService.getAds();
  res.json(result);
};
