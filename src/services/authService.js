const axios = require('axios');
const jwt = require('jsonwebtoken');
const supabase = require('../config/db');
const userModel = require('../models/user');
const naverLocalService = require('./naverLocalService');
const config = require('../config/config');

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * 매장 정보 자동 완성 및 검증
 * @param {string} storeName - 매장명
 * @param {string} phoneNumber - 전화번호
 * @returns {Promise<object>} 매장 정보
 */
async function autoCompleteStoreInfo(storeName, phoneNumber) {
  try {
    // 네이버 로컬 API로 매장 정보 검색
    const storeInfo = await naverLocalService.findStoreByPhone(storeName, phoneNumber);
    
    if (storeInfo) {
      return {
        success: true,
        data: storeInfo.data,
        message: '매장 정보를 찾았습니다.'
      };
    } else {
      // 매장을 찾지 못한 경우 기본 정보 반환
      return {
        success: false,
        data: {
          name: storeName,
          phone: phoneNumber,
          address: '',
          roadAddress: '',
          category: '',
          placeId: null
        },
        message: '매장 정보를 찾을 수 없습니다. 수동으로 입력해주세요.'
      };
    }
  } catch (error) {
    console.error('매장 정보 자동 완성 실패:', error);
    throw new Error('매장 정보 검색에 실패했습니다.');
  }
}

//카카오 로그인
exports.kakaoLogin = async (code, storeInfo = null) => {
  if (!code) throw new Error('카카오 인가 코드가 필요합니다.');

  // 1. 인가 코드로 access_token 요청
  const tokenRes = await axios.post(
    'https://kauth.kakao.com/oauth/token',
    null,
    {
      params: {
        grant_type: 'authorization_code',
        client_id: KAKAO_CLIENT_ID,
        redirect_uri: KAKAO_REDIRECT_URI,
        code,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );
  const { access_token } = tokenRes.data;

  // 2. access_token으로 사용자 정보 조회 (에러 핸들링 추가)
  let kakaoUser;
  try {
    const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    kakaoUser = userRes.data;
  } catch (err) {
    throw new Error('카카오 사용자 정보 조회 실패: ' + (err.response?.data?.msg || err.message));
  }

  // 3. DB에서 사용자 조회/생성
  let user = await userModel.getUserBySocialId(kakaoUser.id, 'kakao');

  if (!user) {
    // 신규 회원가입
    const email = kakaoUser.kakao_account?.email || `kakao_${kakaoUser.id}@noemail.com`;
    const nickname = kakaoUser.kakao_account?.profile?.nickname || null;
    const profile_image = kakaoUser.kakao_account?.profile?.profile_image_url || null;
    
    const userData = {
      kakao_id: kakaoUser.id,
      email,
      nickname,
      profile_image,
      is_new_user: true
    };

    // 매장 정보가 제공된 경우 자동 완성 시도
    if (storeInfo && storeInfo.storeName && storeInfo.phoneNumber) {
      try {
        const autoCompletedInfo = await autoCompleteStoreInfo(storeInfo.storeName, storeInfo.phoneNumber);
        if (autoCompletedInfo.success) {
          Object.assign(userData, {
            store_name: autoCompletedInfo.data.name,
            store_address: autoCompletedInfo.data.address,
            store_road_address: autoCompletedInfo.data.roadAddress,
            store_phone: autoCompletedInfo.data.phone,
            store_category: autoCompletedInfo.data.category,
            place_id: autoCompletedInfo.data.placeId,
            store_info_verified: true
          });
        }
      } catch (error) {
        console.error('매장 정보 자동 완성 실패:', error);
      }
    }

    user = await userModel.createUser(userData);
  }

  // 4. JWT 발급
  const token = jwt.sign({ id: user.id, kakao_id: user.kakao_id }, JWT_SECRET, { expiresIn: '7d' });

  return {
    message: '카카오 로그인 성공',
    user,
    token,
    isNewUser: user.is_new_user || false
  };
};

//네이버 로그인
exports.naverLogin = async (code, state, storeInfo = null) => {
  if (!code || !state) throw new Error('네이버 인가 코드와 state가 필요합니다.');

  // 1. 네이버 access_token 발급
  const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
  const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
  const NAVER_REDIRECT_URI = process.env.NAVER_REDIRECT_URI;
  const JWT_SECRET = process.env.JWT_SECRET;

  let tokenRes;
  try {
    tokenRes = await axios.post(
      'https://nid.naver.com/oauth2.0/token',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          client_id: NAVER_CLIENT_ID,
          client_secret: NAVER_CLIENT_SECRET,
          code,
          state,
          redirect_uri: NAVER_REDIRECT_URI,
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );
  } catch (err) {
    throw new Error('네이버 토큰 발급 실패: ' + (err.response?.data?.error_description || err.message));
  }
  const { access_token } = tokenRes.data;

  // 2. access_token으로 사용자 정보 조회
  let naverUser;
  try {
    const userRes = await axios.get('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    naverUser = userRes.data.response;
  } catch (err) {
    throw new Error('네이버 사용자 정보 조회 실패: ' + (err.response?.data?.message || err.message));
  }

  // 3. DB에서 사용자 조회/생성
  let user = await userModel.getUserBySocialId(naverUser.id, 'naver');

  if (!user) {
    // 신규 회원가입
    const email = naverUser.email || `naver_${naverUser.id}@noemail.com`;
    const nickname = naverUser.nickname || null;
    const profile_image = naverUser.profile_image || null;
    
    const userData = {
      naver_id: naverUser.id,
      email,
      nickname,
      profile_image,
      is_new_user: true
    };

    // 매장 정보가 제공된 경우 자동 완성 시도
    if (storeInfo && storeInfo.storeName && storeInfo.phoneNumber) {
      try {
        const autoCompletedInfo = await autoCompleteStoreInfo(storeInfo.storeName, storeInfo.phoneNumber);
        if (autoCompletedInfo.success) {
          Object.assign(userData, {
            store_name: autoCompletedInfo.data.name,
            store_address: autoCompletedInfo.data.address,
            store_road_address: autoCompletedInfo.data.roadAddress,
            store_phone: autoCompletedInfo.data.phone,
            store_category: autoCompletedInfo.data.category,
            place_id: autoCompletedInfo.data.placeId,
            store_info_verified: true
          });
        }
      } catch (error) {
        console.error('매장 정보 자동 완성 실패:', error);
      }
    }

    user = await userModel.createUser(userData);
  }

  // 4. JWT 발급
  const token = jwt.sign({ id: user.id, naver_id: user.naver_id }, JWT_SECRET, { expiresIn: '7d' });

  return {
    message: '네이버 로그인 성공',
    user,
    token,
    isNewUser: user.is_new_user || false
  };
}; 

//로그아웃
exports.logout = () => {
  // 실제 구현 시 세션/토큰 무효화 등 처리
  return { message: '로그아웃 예시 성공' };
};


