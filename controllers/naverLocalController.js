import { NaverLocalService } from '../services/naverLocalService.js';
import { logger } from '../utils/logger.js';

const naverLocalService = new NaverLocalService();

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
      res.json({
        success: true,
        message: result.message,
        data: result.data,
        total: result.data.length
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
      res.json({
        success: true,
        message: result.message,
        data: result.data
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
      res.json({
        success: true,
        message: result.message,
        data: result.data
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
          'POST /api/naver/search - 매장 검색',
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
