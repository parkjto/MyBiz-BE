const adsService = require('../services/adsService');

exports.getAds = (req, res) => {
  try {
    const result = adsService.getAds();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: '광고 목록 조회 중 오류가 발생했습니다.' 
    });
  }
};

exports.generateAd = async (req, res) => {
  try {
    const { storeId, adType, targetAudience, tone, keywords } = req.body;
    
    if (!storeId || !adType) {
      return res.status(400).json({
        success: false,
        error: '매장 ID와 광고 유형은 필수입니다.'
      });
    }

    const result = await adsService.generateAd({
      storeId,
      adType,
      targetAudience,
      tone,
      keywords
    });

    res.json({
      success: true,
      data: result,
      message: 'AI 광고가 성공적으로 생성되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '광고 생성 중 오류가 발생했습니다.'
    });
  }
};

exports.updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, status } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: '광고 ID는 필수입니다.'
      });
    }

    const result = await adsService.updateAd(id, { title, content, status });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: '광고를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '광고가 성공적으로 수정되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '광고 수정 중 오류가 발생했습니다.'
    });
  }
};

exports.deleteAd = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: '광고 ID는 필수입니다.'
      });
    }

    const result = await adsService.deleteAd(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: '광고를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '광고가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '광고 삭제 중 오류가 발생했습니다.'
    });
  }
};
