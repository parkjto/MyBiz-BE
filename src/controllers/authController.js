const authService = require('../services/authService');
const naverLocalService = require('../services/naverLocalService');
const userModel = require('../models/user');

//카카오 로그인
exports.kakaoLogin = async (req, res) => {
  const { code, storeName, phoneNumber } = req.body;
  if (!code) return res.status(400).json({ error: '카카오 인가 코드가 필요합니다.' });
  
  try {
    const storeInfo = storeName && phoneNumber ? { storeName, phoneNumber } : null;
    const result = await authService.kakaoLogin(code, storeInfo);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//네이버 로그인
exports.naverLogin = async (req, res) => {
  const { code, state, storeName, phoneNumber } = req.body;
  if (!code || !state) return res.status(400).json({ error: '네이버 인가 코드와 state가 필요합니다.' });
  
  try {
    const storeInfo = storeName && phoneNumber ? { storeName, phoneNumber } : null;
    const result = await authService.naverLogin(code, state, storeInfo);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 매장 정보 검색 API
 * 매장명과 전화번호로 네이버 로컬 API에서 매장 정보를 검색합니다.
 */
exports.searchStoreInfo = async (req, res) => {
  const { storeName, phoneNumber } = req.body;
  
  if (!storeName || !phoneNumber) {
    return res.status(400).json({ 
      error: '매장명과 전화번호가 필요합니다.' 
    });
  }

  try {
    const result = await naverLocalService.findStoreByPhone(storeName, phoneNumber);
    
    if (result) {
      res.json({
        success: true,
        data: result.data,
        message: '매장 정보를 찾았습니다.'
      });
    } else {
      res.json({
        success: false,
        message: '매장 정보를 찾을 수 없습니다.',
        data: {
          name: storeName,
          phone: phoneNumber,
          address: '',
          roadAddress: '',
          category: '',
          placeId: null
        }
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 매장 정보 확인 및 저장 API
 * 사용자가 확인한 매장 정보를 저장합니다.
 */
exports.confirmStoreInfo = async (req, res) => {
  const { userId } = req.user; // JWT 토큰에서 추출
  const { storeInfo } = req.body;
  
  if (!storeInfo || !storeInfo.name) {
    return res.status(400).json({ 
      error: '매장 정보가 필요합니다.' 
    });
  }

  try {
    // 사용자 매장 정보 업데이트
    const updatedUser = await userModel.updateStoreInfo(userId, storeInfo);
    
    res.json({
      success: true,
      message: '매장 정보가 저장되었습니다.',
      data: {
        user: updatedUser,
        placeId: storeInfo.placeId
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 사용자 매장 정보 조회 API
 */
exports.getStoreInfo = async (req, res) => {
  const { userId } = req.user; // JWT 토큰에서 추출
  
  try {
    const user = await userModel.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const storeInfo = {
      name: user.store_name,
      address: user.store_address,
      roadAddress: user.store_road_address,
      phone: user.store_phone,
      category: user.store_category,
      placeId: user.place_id,
      verified: user.store_info_verified
    };

    res.json({
      success: true,
      data: storeInfo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.logout = (req, res) => {
  // 실제로는 클라이언트에서 토큰 삭제
  res.json({ message: '로그아웃 예시 성공' });
};
