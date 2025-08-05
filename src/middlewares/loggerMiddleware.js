/**
 * 개선된 로깅 미들웨어
 * Place ID 추출 시스템을 위한 상세한 로깅
 */

const fs = require('fs').promises;
const path = require('path');

class LoggerMiddleware {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
  }

  /**
   * 로그 디렉토리 생성
   */
  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('로그 디렉토리 생성 실패:', error);
    }
  }

  /**
   * 로그 파일명 생성
   * @param {string} type - 로그 타입
   * @returns {string} 로그 파일명
   */
  getLogFileName(type) {
    const date = new Date().toISOString().split('T')[0];
    return `${type}-${date}.log`;
  }

  /**
   * 로그 작성
   * @param {string} type - 로그 타입
   * @param {string} message - 로그 메시지
   * @param {Object} data - 추가 데이터
   */
  async writeLog(type, message, data = {}) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        type,
        message,
        data
      };

      const logFile = path.join(this.logDir, this.getLogFileName(type));
      const logLine = JSON.stringify(logEntry) + '\n';
      
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      console.error('로그 작성 실패:', error);
    }
  }

  /**
   * Place ID 추출 로그
   * @param {Object} storeInfo - 매장 정보
   * @param {Object} result - 추출 결과
   * @param {number} duration - 처리 시간
   */
  async logPlaceIdExtraction(storeInfo, result, duration) {
    await this.writeLog('place-id-extraction', 'Place ID 추출 완료', {
      storeName: storeInfo.name,
      storeAddress: storeInfo.address,
      success: !!result.placeId,
      placeId: result.placeId,
      method: result.extractionMethod,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 에러 로그
   * @param {string} operation - 작업명
   * @param {Error} error - 에러 객체
   * @param {Object} context - 컨텍스트 정보
   */
  async logError(operation, error, context = {}) {
    await this.writeLog('error', `에러 발생: ${operation}`, {
      operation,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 성능 로그
   * @param {string} operation - 작업명
   * @param {number} duration - 처리 시간
   * @param {Object} metadata - 메타데이터
   */
  async logPerformance(operation, duration, metadata = {}) {
    await this.writeLog('performance', `성능 측정: ${operation}`, {
      operation,
      duration,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * API 요청 로그 미들웨어
   */
  requestLogger() {
    return async (req, res, next) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      
      // 요청 로그
      console.log(`[${requestId}] ${req.method} ${req.path} - ${new Date().toISOString()}`);
      
      // 응답 완료 후 로그
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        
        console.log(`[${requestId}] ${req.method} ${req.path} - ${status} (${duration}ms)`);
        
        // 성능 로그 작성
        this.logPerformance('api-request', duration, {
          requestId,
          method: req.method,
          path: req.path,
          statusCode: status,
          userAgent: req.get('User-Agent')
        });
      });
      
      next();
    };
  }

  /**
   * Place ID 추출 전용 로그 미들웨어
   */
  placeIdExtractionLogger() {
    return async (req, res, next) => {
      if (req.path.includes('/extract-place-id')) {
        const startTime = Date.now();
        
        // 원본 응답 메서드 저장
        const originalJson = res.json;
        
        // 응답 인터셉트
        res.json = function(data) {
          const duration = Date.now() - startTime;
          
          // Place ID 추출 로그 작성
          if (data && data.data) {
            this.logPlaceIdExtraction(req.body, data.data, duration);
          }
          
          // 원본 메서드 호출
          return originalJson.call(this, data);
        }.bind(this);
      }
      
      next();
    };
  }

  /**
   * 요청 ID 생성
   * @returns {string} 요청 ID
   */
  generateRequestId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * 로그 통계 조회
   * @param {string} type - 로그 타입
   * @param {string} date - 날짜 (YYYY-MM-DD)
   * @returns {Promise<Object>} 로그 통계
   */
  async getLogStats(type, date) {
    try {
      const logFile = path.join(this.logDir, `${type}-${date}.log`);
      const content = await fs.readFile(logFile, 'utf8');
      
      const lines = content.trim().split('\n');
      const logs = lines.map(line => JSON.parse(line));
      
      return {
        total: logs.length,
        byHour: this.groupByHour(logs),
        byType: this.groupByType(logs),
        averageDuration: this.calculateAverageDuration(logs)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * 시간별 그룹핑
   * @param {Array} logs - 로그 배열
   * @returns {Object} 시간별 통계
   */
  groupByHour(logs) {
    const hourly = {};
    
    logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hourly[hour] = (hourly[hour] || 0) + 1;
    });
    
    return hourly;
  }

  /**
   * 타입별 그룹핑
   * @param {Array} logs - 로그 배열
   * @returns {Object} 타입별 통계
   */
  groupByType(logs) {
    const byType = {};
    
    logs.forEach(log => {
      byType[log.type] = (byType[log.type] || 0) + 1;
    });
    
    return byType;
  }

  /**
   * 평균 처리 시간 계산
   * @param {Array} logs - 로그 배열
   * @returns {number} 평균 처리 시간
   */
  calculateAverageDuration(logs) {
    const durationLogs = logs.filter(log => log.data && log.data.duration);
    
    if (durationLogs.length === 0) return 0;
    
    const totalDuration = durationLogs.reduce((sum, log) => sum + log.data.duration, 0);
    return totalDuration / durationLogs.length;
  }
}

// 싱글톤 인스턴스 생성
const loggerMiddleware = new LoggerMiddleware();

module.exports = loggerMiddleware; 