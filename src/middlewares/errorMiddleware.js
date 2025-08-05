/**
 * 개선된 에러 처리 미들웨어
 * Place ID 추출 시스템을 위한 상세한 에러 처리
 */

const loggerMiddleware = require('./loggerMiddleware');

class ErrorMiddleware {
  /**
   * 에러 처리 미들웨어
   */
  errorHandler() {
    return async (err, req, res, next) => {
      const errorId = this.generateErrorId();
      const timestamp = new Date().toISOString();
      
      // 에러 로그 작성
      await loggerMiddleware.logError('api-error', err, {
        errorId,
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      
      // 에러 응답 생성
      const errorResponse = this.createErrorResponse(err, errorId, timestamp);
      
      // Place ID 추출 관련 에러인지 확인
      if (req.path.includes('/extract-place-id')) {
        errorResponse.suggestions = this.getPlaceIdExtractionSuggestions(err);
      }
      
      res.status(errorResponse.statusCode).json(errorResponse);
    };
  }

  /**
   * 에러 응답 생성
   * @param {Error} err - 에러 객체
   * @param {string} errorId - 에러 ID
   * @param {string} timestamp - 타임스탬프
   * @returns {Object} 에러 응답
   */
  createErrorResponse(err, errorId, timestamp) {
    const baseResponse = {
      success: false,
      errorId,
      timestamp,
      message: '서버 오류가 발생했습니다.'
    };

    // 에러 타입별 처리
    if (err.name === 'ValidationError') {
      return {
        ...baseResponse,
        statusCode: 400,
        message: '입력 데이터 검증에 실패했습니다.',
        details: err.details || err.message,
        type: 'VALIDATION_ERROR'
      };
    }

    if (err.name === 'TimeoutError') {
      return {
        ...baseResponse,
        statusCode: 408,
        message: '요청 시간이 초과되었습니다.',
        details: '네트워크 연결이 불안정하거나 서버 응답이 지연되고 있습니다.',
        type: 'TIMEOUT_ERROR'
      };
    }

    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return {
        ...baseResponse,
        statusCode: 503,
        message: '외부 서비스 연결에 실패했습니다.',
        details: '네이버 API 서비스에 일시적으로 접근할 수 없습니다.',
        type: 'EXTERNAL_SERVICE_ERROR'
      };
    }

    if (err.response && err.response.status === 429) {
      return {
        ...baseResponse,
        statusCode: 429,
        message: '요청 한도를 초과했습니다.',
        details: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
        type: 'RATE_LIMIT_ERROR'
      };
    }

    if (err.response && err.response.status >= 500) {
      return {
        ...baseResponse,
        statusCode: 502,
        message: '외부 서비스 오류가 발생했습니다.',
        details: '네이버 서비스에서 일시적인 오류가 발생했습니다.',
        type: 'EXTERNAL_SERVICE_ERROR'
      };
    }

    // 기본 에러 응답
    return {
      ...baseResponse,
      statusCode: err.statusCode || 500,
      message: err.message || '알 수 없는 오류가 발생했습니다.',
      type: 'INTERNAL_SERVER_ERROR'
    };
  }

  /**
   * Place ID 추출 관련 제안사항
   * @param {Error} err - 에러 객체
   * @returns {Array} 제안사항 배열
   */
  getPlaceIdExtractionSuggestions(err) {
    const suggestions = [];

    if (err.name === 'TimeoutError') {
      suggestions.push(
        '네트워크 연결을 확인하고 다시 시도해주세요.',
        '매장명과 주소를 정확히 입력했는지 확인해주세요.',
        '잠시 후 다시 시도해주세요.'
      );
    }

    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      suggestions.push(
        '인터넷 연결을 확인해주세요.',
        '네이버 서비스가 정상적으로 작동하는지 확인해주세요.',
        '잠시 후 다시 시도해주세요.'
      );
    }

    if (err.response && err.response.status === 429) {
      suggestions.push(
        '잠시 후 다시 시도해주세요.',
        '한 번에 너무 많은 요청을 보내지 마세요.',
        '매장명을 더 구체적으로 입력해보세요.'
      );
    }

    if (err.message && err.message.includes('Place ID를 찾을 수 없습니다')) {
      suggestions.push(
        '매장명을 정확히 입력했는지 확인해주세요.',
        '주소 정보를 추가로 입력해보세요.',
        '수동으로 네이버 지도에서 Place ID를 확인해주세요.',
        '매장명에 특수문자나 공백이 있는지 확인해주세요.'
      );
    }

    return suggestions;
  }

  /**
   * 404 에러 처리
   */
  notFoundHandler() {
    return (req, res) => {
      const errorResponse = {
        success: false,
        errorId: this.generateErrorId(),
        timestamp: new Date().toISOString(),
        statusCode: 404,
        message: '요청한 리소스를 찾을 수 없습니다.',
        path: req.path,
        method: req.method,
        type: 'NOT_FOUND_ERROR'
      };

      res.status(404).json(errorResponse);
    };
  }

  /**
   * 에러 ID 생성
   * @returns {string} 에러 ID
   */
  generateErrorId() {
    return `ERR_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  /**
   * Place ID 추출 전용 에러 처리
   */
  placeIdExtractionErrorHandler() {
    return async (err, req, res, next) => {
      if (req.path.includes('/extract-place-id')) {
        const errorId = this.generateErrorId();
        const timestamp = new Date().toISOString();
        
        // Place ID 추출 전용 에러 로그
        await loggerMiddleware.logError('place-id-extraction-error', err, {
          errorId,
          storeInfo: req.body,
          method: req.method,
          path: req.path
        });
        
        // Place ID 추출 실패 시 수동 안내 포함
        const errorResponse = {
          success: false,
          errorId,
          timestamp,
          statusCode: 404,
          message: 'Place ID 자동 추출에 실패했습니다.',
          type: 'PLACE_ID_EXTRACTION_ERROR',
          manualSteps: [
            '1. https://map.naver.com 접속',
            `2. "${req.body.name} ${req.body.district || ''}" 검색`,
            '3. 매장 클릭 후 URL에서 /place/숫자 확인',
            '4. 해당 숫자가 Place ID입니다',
            '5. 또는 네이버 검색에서 매장명으로 검색 후 지도 링크 확인'
          ],
          suggestions: [
            '매장명을 정확히 입력했는지 확인해주세요.',
            '주소 정보를 추가로 입력해보세요.',
            '잠시 후 다시 시도해주세요.'
          ]
        };
        
        return res.status(404).json(errorResponse);
      }
      
      next(err);
    };
  }

  /**
   * 요청 검증 에러 처리
   */
  validationErrorHandler() {
    return (err, req, res, next) => {
      if (err.name === 'ValidationError' || err.type === 'entity.parse.failed') {
        const errorResponse = {
          success: false,
          errorId: this.generateErrorId(),
          timestamp: new Date().toISOString(),
          statusCode: 400,
          message: '입력 데이터가 올바르지 않습니다.',
          type: 'VALIDATION_ERROR',
          details: err.details || err.message,
          requiredFields: {
            name: '매장명 (필수)',
            address: '주소 (선택)',
            district: '지역 (선택)'
          }
        };
        
        return res.status(400).json(errorResponse);
      }
      
      next(err);
    };
  }
}

// 싱글톤 인스턴스 생성
const errorMiddleware = new ErrorMiddleware();

module.exports = errorMiddleware; 