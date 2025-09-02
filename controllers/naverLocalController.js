import { NaverLocalService } from '../services/naverLocalService.js';
import { logger } from '../utils/logger.js';

const naverLocalService = new NaverLocalService();

/**
 * HTML 태그를 제거하고 순수 텍스트만 반환하는 함수
 * @param {string} htmlText - HTML 태그가 포함된 텍스트
 * @returns {string} HTML 태그가 제거된 순수 텍스트
 */
const removeHtmlTags = (htmlText) => {
  if (!htmlText || typeof htmlText !== 'string') return '';
  
  // HTML 태그 제거
  return htmlText
    .replace(/<[^>]*>/g, '') // 모든 HTML 태그 제거
    .replace(/&nbsp;/g, ' ') // HTML 공백 문자를 일반 공백으로 변환
    .replace(/&amp;/g, '&') // HTML 앰퍼샌드를 일반 앰퍼샌드로 변환
    .replace(/&lt;/g, '<') // HTML < 기호를 일반 < 기호로 변환
    .replace(/&gt;/g, '>') // HTML > 기호를 일반 > 기호로 변환
    .replace(/&quot;/g, '"') // HTML 따옴표를 일반 따옴표로 변환
    .replace(/&#39;/g, "'") // HTML 작은따옴표를 일반 작은따옴표로 변환
    .trim(); // 앞뒤 공백 제거
};

/**
 * 네이버 로컬 API로 매장 검색
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 * @param {Function} next - 다음 미들웨어
 */
export const searchStores = async (req, res, next) => {
  try {
    const { query, display = 5 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: '검색어가 필요합니다'
      });
    }

    logger.info(`매장 검색 요청: ${query}`);

    const result = await naverLocalService.searchStore(query, display);

    if (result.success) {
      // HTML 태그 제거 후 응답
      const cleanedData = result.data.map(store => ({
        ...store,
        title: removeHtmlTags(store.title),
        address: removeHtmlTags(store.address),
        roadAddress: removeHtmlTags(store.roadAddress),
        category: removeHtmlTags(store.category)
      }));
      
      res.json({
        success: true,
        message: result.message,
        data: cleanedData,
        total: cleanedData.length
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

  } catch (error) {
    logger.error('매장 검색 컨트롤러 에러:', error);
    next(error);
  }
};

/**
 * 매장 검색 및 Place ID 추출
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 * @param {Function} next - 다음 미들웨어
 */
export const findStoreWithPlaceId = async (req, res, next) => {
  try {
    const { query, selectedIndex = 0 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: '검색어가 필요합니다'
      });
    }

    logger.info(`매장 검색 및 Place ID 추출 요청: ${query}, 선택 인덱스: ${selectedIndex}`);

    const result = await naverLocalService.findStoreWithPlaceId(query, selectedIndex);

    if (result.success) {
      // HTML 태그 제거 후 응답
      const cleanedData = {
        ...result.data,
        title: removeHtmlTags(result.data.title),
        address: removeHtmlTags(result.data.address),
        roadAddress: removeHtmlTags(result.data.roadAddress),
        category: removeHtmlTags(result.data.category)
      };
      
      res.json({
        success: true,
        message: result.message,
        data: cleanedData
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

  } catch (error) {
    logger.error('매장 검색 및 Place ID 추출 컨트롤러 에러:', error);
    next(error);
  }
};

/**
 * 좌표 기반 매장 검색
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 * @param {Function} next - 다음 미들웨어
 */
export const findStoreByCoordinates = async (req, res, next) => {
  try {
    const { mapx, mapy, storeName = '' } = req.body;

    if (!mapx || !mapy) {
      return res.status(400).json({
        success: false,
        message: '좌표(mapx, mapy)가 필요합니다'
      });
    }

    logger.info(`좌표 기반 매장 검색 요청: X=${mapx}, Y=${mapy}`);

    const result = await naverLocalService.findStoreByCoordinates(mapx, mapy, storeName);

    if (result.success) {
      // HTML 태그 제거 후 응답
      const cleanedData = result.data.map(store => ({
        ...store,
        title: removeHtmlTags(store.title),
        address: removeHtmlTags(store.address),
        roadAddress: removeHtmlTags(store.roadAddress),
        category: removeHtmlTags(store.category)
      }));
      
      res.json({
        success: true,
        message: result.message,
        data: cleanedData
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

  } catch (error) {
    logger.error('좌표 기반 매장 검색 컨트롤러 에러:', error);
    next(error);
  }
};

/**
 * Place ID 추출
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 * @param {Function} next - 다음 미들웨어
 */
export const extractPlaceId = async (req, res, next) => {
  try {
    const { storeInfo } = req.body;

    if (!storeInfo || !storeInfo.title) {
      return res.status(400).json({
        success: false,
        message: '매장 정보가 필요합니다'
      });
    }

    logger.info(`Place ID 추출 요청: ${storeInfo.title}`);

    const result = await naverLocalService.extractPlaceId(storeInfo);

    res.json({
      success: true,
      message: 'Place ID 추출 완료',
      data: result
    });

  } catch (error) {
    logger.error('Place ID 추출 컨트롤러 에러:', error);
    next(error);
  }
};

/**
 * 네이버 API 상태 확인
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 * @param {Function} next - 다음 미들웨어
 */
export const getApiStatus = async (req, res, next) => {
  try {
    const hasApiKeys = !!(process.env.NAVER_CLIENT_ID || process.env.NAVER_LOCAL_CLIENT_ID) &&
                       !!(process.env.NAVER_CLIENT_SECRET || process.env.NAVER_LOCAL_CLIENT_SECRET);

    res.json({
      success: true,
      data: {
        apiConfigured: hasApiKeys,
        clientId: hasApiKeys ? '설정됨' : '설정되지 않음',
        clientSecret: hasApiKeys ? '설정됨' : '설정되지 않음',
        availableEndpoints: [
          'POST /api/naver/search - 매장 검색 (인증 필요)',
          'POST /api/naver/search-public - 매장 검색 (회원가입용, 인증 불필요)',
          'POST /api/naver/find-with-placeid - 매장 검색 및 Place ID 추출',
          'POST /api/naver/find-by-coordinates - 좌표 기반 매장 검색',
          'POST /api/naver/extract-placeid - Place ID 추출',
          'GET /api/naver/status - API 상태 확인'
        ],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('API 상태 확인 컨트롤러 에러:', error);
    next(error);
  }
};

/**
 * 회원가입용 매장 검색 (인증 불필요)
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 * @param {Function} next - 다음 미들웨어
 */
export const searchStoresPublic = async (req, res, next) => {
  try {
    const { query, limit = 20, for_signup = false } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: '검색어가 필요합니다'
      });
    }

    // 회원가입용 검색인지 확인
    if (!for_signup) {
      return res.status(400).json({
        success: false,
        message: '회원가입용 검색이 아닙니다'
      });
    }

    logger.info(`회원가입용 매장 검색 요청: ${query}, 제한: ${limit}`);

    // 네이버 로컬 API로 검색 수행
    const result = await naverLocalService.searchStore(query, limit);

    if (result.success) {
      // 회원가입용으로 필요한 정보만 필터링
      const filteredData = result.data.map(store => ({
        store_name: store.title || store.name || '',
        address: store.address || '',
        road_address: store.roadAddress || store.road_address || '',
        category: store.category || store.businessType || '',
        coordinates_x: store.mapx || store.coordinates_x || '',
        coordinates_y: store.mapy || store.coordinates_y || '',
        place_id: store.link || store.place_id || '',
        phone: store.telephone || store.phone || '',
        map_url: store.link || store.map_url || ''
      }));

      res.json({
        success: true,
        message: '회원가입용 매장 검색 완료',
        data: filteredData,
        total: filteredData.length,
        for_signup: true
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || '검색에 실패했습니다',
        error: result.error,
        for_signup: true
      });
    }

  } catch (error) {
    logger.error('회원가입용 매장 검색 컨트롤러 에러:', error);
    
    // 에러 발생 시에도 회원가입 과정을 방해하지 않도록 기본 데이터 반환
    res.json({
      success: true,
      message: '검색 중 오류가 발생했지만 기본 데이터를 제공합니다',
      data: _getDefaultStoresForSignup(),
      total: 5,
      for_signup: true,
      warning: '네이버 API 오류로 인해 기본 데이터를 제공합니다'
    });
  }
};

/**
 * 회원가입용 기본 매장 데이터 (API 오류 시 사용)
 * @returns {Array} 기본 매장 데이터 배열
 */
const _getDefaultStoresForSignup = () => {
  return [
    {
      store_name: '성화해장국 인하점',
      address: '인천광역시 미추홀구 용현동 96-30 1층',
      road_address: '인천광역시 미추홀구 인하로105번길 42 1층',
      category: '한식 > 해장국',
      coordinates_x: '126.6497',
      coordinates_y: '37.4561',
      place_id: 'signup_store_001',
      phone: '032-123-4567',
      map_url: 'https://map.naver.com'
    },
    {
      store_name: '성화해장국 본점',
      address: '인천광역시 미추홀구 용현동 627-432 1층',
      road_address: '인천광역시 미추홀구 낙섬서로 7-3 1층',
      category: '한식 > 해장국',
      coordinates_x: '126.6498',
      coordinates_y: '37.4562',
      place_id: 'signup_store_002',
      phone: '032-123-4568',
      map_url: 'https://map.naver.com'
    },
    {
      store_name: '성화해장국 청주점',
      address: '충청북도 청주시 서원구 성화동 746 1층',
      road_address: '충청북도 청주시 서원구 장전로6번가길 24 1층',
      category: '한식 > 해장국',
      coordinates_x: '127.4567',
      coordinates_y: '36.7890',
      place_id: 'signup_store_003',
      phone: '043-123-4567',
      map_url: 'https://map.naver.com'
    },
    {
      store_name: '성화감자탕',
      address: '충북 청주시 서원구 산남동 419',
      road_address: '충북 청주시 서원구 원흥로80번길 31-9',
      category: '한식 > 감자탕',
      coordinates_x: '127.4568',
      coordinates_y: '36.7891',
      place_id: 'signup_store_004',
      phone: '043-123-4568',
      map_url: 'https://map.naver.com'
    },
    {
      store_name: '성화해장국 강남점',
      address: '서울특별시 강남구 역삼동 123-45',
      road_address: '서울특별시 강남구 테헤란로 123',
      category: '한식 > 해장국',
      coordinates_x: '127.0276',
      coordinates_y: '37.4979',
      place_id: 'signup_store_005',
      phone: '02-123-4567',
      map_url: 'https://map.naver.com'
    }
  ];
};
