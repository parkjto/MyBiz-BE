const reviewsService = require('../services/reviewsService');

exports.getReviews = (req, res) => {
  const result = reviewsService.getReviews();
  res.json(result);
};
