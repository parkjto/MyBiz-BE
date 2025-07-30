const reviewService = require('../services/reviewService');

/**
 * 리뷰 크롤링 준비 상태 확인
 */
exports.checkCrawlingReady = async (req, res) => {
  const { userId } = req.user;
  
  try {
    const result = await reviewService.checkReviewCrawlingReady(userId);
    
    if (result.ready) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 리뷰 크롤링 시작
 */
exports.startCrawling = async (req, res) => {
  const { userId } = req.user;
  
  try {
    const result = await reviewService.startReviewCrawling(userId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 크롤링된 리뷰 데이터 조회
 */
exports.getCrawledReviews = async (req, res) => {
  const { userId } = req.user;
  
  try {
    const result = await reviewService.getCrawledReviews(userId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
