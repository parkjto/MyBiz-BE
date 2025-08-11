const reviewsService = require('../services/reviewsService');

exports.getReviews = (req, res) => {
  try {
    const { storeId, limit = 20, offset = 0 } = req.query;
    const result = reviewsService.getReviews({ storeId, limit, offset });
    
    res.json({
      success: true,
      data: result.reviews,
      pagination: result.pagination,
      message: '리뷰를 성공적으로 조회했습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '리뷰 조회 중 오류가 발생했습니다.'
    });
  }
};

exports.analyzeReview = async (req, res) => {
  try {
    const { content, language = 'ko' } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: '리뷰 내용은 필수입니다.'
      });
    }

    const result = await reviewsService.analyzeReview(content, language);

    res.json({
      success: true,
      data: result,
      message: '감정 분석이 완료되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '감정 분석 중 오류가 발생했습니다.'
    });
  }
};

exports.batchAnalyzeReviews = async (req, res) => {
  try {
    const { reviews } = req.body;
    
    if (!reviews || !Array.isArray(reviews)) {
      return res.status(400).json({
        success: false,
        error: '리뷰 배열은 필수입니다.'
      });
    }

    const result = await reviewsService.batchAnalyzeReviews(reviews);

    res.json({
      success: true,
      data: result,
      message: '일괄 감정 분석이 완료되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '일괄 감정 분석 중 오류가 발생했습니다.'
    });
  }
};
