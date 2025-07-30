const axios = require('axios');
const config = require('../config/config');

/**
 * 네이버 로컬 API를 사용하여 매장 정보 검색
 * @param {string} query - 검색할 매장명
 * @param {string} address - 매장 주소 (선택사항)
 * @returns {Promise<object>} 검색 결과
 */
exports.searchStore = async (query, address = '') => {
  try {
    const searchQuery = address ? `${query} ${address}` : query;
    
    const response = await axios.get('https://openapi.naver.com/v1/search/local.json', {
      headers: {
        'X-Naver-Client-Id': config.naver.localApiClientId,
        'X-Naver-Client-Secret': config.naver.localApiClientSecret
      },
      params: {
        query: searchQuery,
        display: 5, // 검색 결과 개수
        sort: 'random' // 정확도 순 정렬
      }
    });

    return {
      success: true,
      data: response.data.items,
      total: response.data.total
    };
  } catch (error) {
    console.error('네이버 로컬 API 검색 실패:', error.response?.data || error.message);
    throw new Error('매장 검색에 실패했습니다.');
  }
};

/**
 * 매장명과 전화번호로 정확한 매장 정보 검색
 * @param {string} storeName - 매장명
 * @param {string} phoneNumber - 전화번호
 * @returns {Promise<object|null>} 매장 정보 또는 null
 */
exports.findStoreByPhone = async (storeName, phoneNumber) => {
  try {
    // 전화번호 형식 정규화 (하이픈 제거)
    const normalizedPhone = phoneNumber.replace(/[-\s]/g, '');
    
    // 매장명으로 검색
    const searchResult = await this.searchStore(storeName);
    
    if (!searchResult.data || searchResult.data.length === 0) {
      return null;
    }

    // 전화번호가 일치하는 매장 찾기
    const matchedStore = searchResult.data.find(store => {
      const storePhone = store.tel?.replace(/[-\s]/g, '') || '';
      return storePhone.includes(normalizedPhone) || normalizedPhone.includes(storePhone);
    });

    if (matchedStore) {
      return {
        success: true,
        data: {
          name: matchedStore.title?.replace(/<[^>]*>/g, ''), // HTML 태그 제거
          address: matchedStore.address,
          roadAddress: matchedStore.roadAddress,
          phone: matchedStore.tel,
          category: matchedStore.category,
          placeId: matchedStore.link?.match(/place\/(\d+)/)?.[1] || null
        }
      };
    }

    return null;
  } catch (error) {
    console.error('매장 정보 검색 실패:', error);
    throw new Error('매장 정보 검색에 실패했습니다.');
  }
};

/**
 * 네이버 플레이스 URL에서 place_id 추출
 * @param {string} placeUrl - 네이버 플레이스 URL
 * @returns {string|null} place_id 또는 null
 */
exports.extractPlaceId = (placeUrl) => {
  if (!placeUrl) return null;
  
  const match = placeUrl.match(/place\/(\d+)/);
  return match ? match[1] : null;
}; 