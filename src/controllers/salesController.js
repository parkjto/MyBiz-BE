const salesService = require('../services/salesService');

exports.getSales = (req, res) => {
  try {
    const result = salesService.getSales();
    res.json({
      success: true,
      data: result,
      message: '매출 데이터를 성공적으로 조회했습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '매출 데이터 조회 중 오류가 발생했습니다.'
    });
  }
};

exports.forecastSales = async (req, res) => {
  try {
    const { businessType, region, recentSales, userQuery } = req.body;
    
    if (!businessType || !region || !recentSales) {
      return res.status(400).json({
        success: false,
        error: '업종, 지역, 최근 매출 데이터는 필수입니다.'
      });
    }

    const result = await salesService.forecastSales({
      businessType,
      region,
      recentSales,
      userQuery
    });

    res.json({
      success: true,
      data: result,
      message: '7일 매출 예측이 완료되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '매출 예측 중 오류가 발생했습니다.'
    });
  }
};
