/**
 * 네이버 로컬 API 응답에서 Place ID를 추출하는 유틸리티 함수들
 */

/**
 * 네이버 로컬 API link에서 Place ID 추출
 * @param {string} link - 네이버 로컬 API 응답의 link 필드
 * @returns {string|null} 추출된 Place ID 또는 null
 */
function extractPlaceIdFromLink(link) {
  if (!link || typeof link !== 'string') {
    return null;
  }

  // 네이버 지도 place URL 패턴: https://map.naver.com/p/entry/place/1234567890
  const placePattern = /place\/(\d+)/;
  const match = link.match(placePattern);
  
  return match ? match[1] : null;
}

/**
 * 네이버 로컬 API 응답 객체에서 Place ID 추출
 * @param {Object} storeData - 네이버 로컬 API 응답 객체
 * @returns {string|null} 추출된 Place ID 또는 null
 */
function extractPlaceIdFromStoreData(storeData) {
  if (!storeData || typeof storeData !== 'object') {
    return null;
  }

  // link 필드에서 추출 시도
  if (storeData.link) {
    const placeId = extractPlaceIdFromLink(storeData.link);
    if (placeId) {
      return placeId;
    }
  }

  // 추가적인 추출 방법들 (향후 확장 가능)
  // 1. description에서 추출
  if (storeData.description) {
    const descMatch = storeData.description.match(/place\/(\d+)/);
    if (descMatch) {
      return descMatch[1];
    }
  }

  // 2. title에서 추출 (HTML 태그 제거 후)
  if (storeData.title) {
    const cleanTitle = storeData.title.replace(/<[^>]*>/g, '');
    const titleMatch = cleanTitle.match(/place\/(\d+)/);
    if (titleMatch) {
      return titleMatch[1];
    }
  }

  return null;
}

/**
 * 좌표를 이용한 Place ID 검색 (네이버 지도 API 사용)
 * @param {string} mapx - X 좌표
 * @param {string} mapy - Y 좌표
 * @param {string} storeName - 매장명 (선택사항)
 * @returns {Promise<string|null>} Place ID 또는 null
 */
async function findPlaceIdByCoordinates(mapx, mapy, storeName = '') {
  try {
    // 네이버 지도 API를 사용하여 좌표로 Place ID 검색
    // 실제 구현에서는 네이버 지도 API의 Reverse Geocoding 또는 Places API 사용
    // 현재는 좌표를 Place ID로 변환하는 로직 구현
    
    if (!mapx || !mapy) {
      return null;
    }

    // 좌표를 Place ID로 변환하는 로직 (예시)
    // 실제로는 네이버 지도 API 호출이 필요
    const coordinateId = `${mapx}_${mapy}`;
    
    // 네이버 지도 URL 생성 (좌표 기반)
    const mapUrl = `https://map.naver.com/p/search/${encodeURIComponent(storeName)}?c=${mapy},${mapx},15,0,0,0,dh`;
    
    // 실제 Place ID는 네이버 지도 API를 통해 얻어야 함
    // 현재는 좌표 기반 임시 ID 반환
    return {
      coordinateId,
      mapUrl,
      coordinates: { x: mapx, y: mapy }
    };
  } catch (error) {
    console.error('좌표 기반 Place ID 검색 실패:', error);
    return null;
  }
}

/**
 * 네이버 로컬 API 응답에서 좌표 정보 추출
 * @param {Object} storeData - 네이버 로컬 API 응답 객체
 * @returns {Object|null} 좌표 정보 또는 null
 */
function extractCoordinates(storeData) {
  if (!storeData || typeof storeData !== 'object') {
    return null;
  }

  const mapx = storeData.mapx;
  const mapy = storeData.mapy;

  if (mapx && mapy) {
    return {
      x: mapx,
      y: mapy,
      coordinateId: `${mapx}_${mapy}`
    };
  }

  return null;
}

/**
 * 여러 매장 데이터에서 Place ID 추출
 * @param {Array} storesData - 네이버 로컬 API 응답 배열
 * @returns {Array} Place ID가 포함된 매장 데이터 배열
 */
function extractPlaceIdsFromStores(storesData) {
  if (!Array.isArray(storesData)) {
    return [];
  }

  return storesData.map(store => {
    const placeId = extractPlaceIdFromStoreData(store);
    const coordinates = extractCoordinates(store);
    
    return {
      ...store,
      placeId: placeId,
      coordinates: coordinates,
      coordinateId: coordinates ? coordinates.coordinateId : null
    };
  });
}

/**
 * Place ID 유효성 검증
 * @param {string} placeId - 검증할 Place ID
 * @returns {boolean} 유효한 Place ID인지 여부
 */
function isValidPlaceId(placeId) {
  if (!placeId || typeof placeId !== 'string') {
    return false;
  }

  // Place ID는 숫자로만 구성되어야 함
  return /^\d+$/.test(placeId) && placeId.length > 0;
}

/**
 * 네이버 지도 URL 생성
 * @param {string} placeId - Place ID
 * @returns {string} 네이버 지도 URL
 */
function generateNaverMapUrl(placeId) {
  if (!isValidPlaceId(placeId)) {
    return null;
  }

  return `https://map.naver.com/p/entry/place/${placeId}`;
}

/**
 * 좌표 기반 네이버 지도 URL 생성
 * @param {string} mapx - X 좌표
 * @param {string} mapy - Y 좌표
 * @param {string} storeName - 매장명 (선택사항)
 * @returns {string} 네이버 지도 URL
 */
function generateNaverMapUrlByCoordinates(mapx, mapy, storeName = '') {
  if (!mapx || !mapy) {
    return null;
  }

  if (storeName) {
    return `https://map.naver.com/p/search/${encodeURIComponent(storeName)}?c=${mapy},${mapx},15,0,0,0,dh`;
  } else {
    return `https://map.naver.com/p/search/?c=${mapy},${mapx},15,0,0,0,dh`;
  }
}

/**
 * 네이버 로컬 API 응답을 개선된 형태로 변환
 * @param {Object} storeData - 네이버 로컬 API 응답 객체
 * @returns {Object} 개선된 매장 정보
 */
function enhanceStoreData(storeData) {
  if (!storeData || typeof storeData !== 'object') {
    return null;
  }

  const placeId = extractPlaceIdFromStoreData(storeData);
  const coordinates = extractCoordinates(storeData);
  const cleanTitle = storeData.title ? storeData.title.replace(/<[^>]*>/g, '') : '';

  return {
    name: cleanTitle,
    address: storeData.address,
    roadAddress: storeData.roadAddress,
    phone: storeData.telephone || storeData.tel,
    category: storeData.category,
    placeId: placeId,
    coordinates: coordinates,
    coordinateId: coordinates ? coordinates.coordinateId : null,
    mapUrl: placeId ? generateNaverMapUrl(placeId) : 
            coordinates ? generateNaverMapUrlByCoordinates(coordinates.x, coordinates.y, cleanTitle) : null
  };
}

module.exports = {
  extractPlaceIdFromLink,
  extractPlaceIdFromStoreData,
  extractPlaceIdsFromStores,
  extractCoordinates,
  findPlaceIdByCoordinates,
  isValidPlaceId,
  generateNaverMapUrl,
  generateNaverMapUrlByCoordinates,
  enhanceStoreData
}; 