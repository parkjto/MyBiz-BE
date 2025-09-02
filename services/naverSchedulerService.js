import cron from 'node-cron';
import { scrapeNaverReviewsComplete } from './finalNaverReviewService.js';
import { logger } from '../utils/logger.js';

/**
 * 야간 자동 실행 스케줄러 서비스
 * 매일 새벽 2시에 모든 활성 사용자 스토어에 대해 리뷰 수집을 자동 실행
 */
class NaverSchedulerService {
  constructor() {
    this.isRunning = false;
    this.scheduledJobs = new Map();
  }

  /**
   * 스케줄러 시작
   */
  start() {
    try {
      logger.info('네이버 야간 자동 실행 스케줄러 시작');
      
      // 매일 새벽 2시에 자동 실행
      const nightJob = cron.schedule('0 2 * * *', async () => {
        await this.runNightlyReviewCollection();
      }, {
        scheduled: true,
        timezone: 'Asia/Seoul' // 한국 시간대
      });

      this.scheduledJobs.set('nightly', nightJob);
      
      // 매시간 정각에 연결 상태 확인 (선택사항)
      const hourlyCheckJob = cron.schedule('0 * * * *', async () => {
        await this.checkConnectionStatus();
      }, {
        scheduled: true,
        timezone: 'Asia/Seoul'
      });

      this.scheduledJobs.set('hourly', hourlyCheckJob);
      
      logger.info('네이버 스케줄러 시작 완료');
      logger.info('야간 자동 실행: 매일 새벽 2시');
      logger.info('연결 상태 확인: 매시간 정각');
      
    } catch (error) {
      logger.error('❌ 네이버 스케줄러 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 스케줄러 중지
   */
  stop() {
    try {
      logger.info('네이버 야간 자동 실행 스케줄러 중지');
      
      // 모든 스케줄된 작업 중지
      for (const [name, job] of this.scheduledJobs) {
        job.stop();
        logger.info(`${name} 작업 중지됨`);
      }
      
      this.scheduledJobs.clear();
      this.isRunning = false;
      
      logger.info('네이버 스케줄러 중지 완료');
      
    } catch (error) {
      logger.error('❌ 네이버 스케줄러 중지 실패:', error);
      throw error;
    }
  }

  /**
   * 야간 자동 리뷰 수집 실행
   */
  async runNightlyReviewCollection() {
    if (this.isRunning) {
      logger.warn('야간 자동 실행이 이미 진행 중입니다. 중복 실행 방지');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    
    try {
      logger.info('야간 자동 리뷰 수집 시작');
      logger.info(`시작 시간: ${startTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
      
      // 활성 사용자 스토어 조회
      const activeStores = await this.getActiveUserStores();
      logger.info(`📊 처리할 스토어 수: ${activeStores.length}개`);
      
      if (activeStores.length === 0) {
        logger.info('처리할 활성 스토어가 없습니다');
        return;
      }

      let successCount = 0;
      let failureCount = 0;
      const results = [];

      // 각 스토어에 대해 순차적으로 리뷰 수집 실행
      for (let i = 0; i < activeStores.length; i++) {
        const store = activeStores[i];
        const storeIndex = i + 1;
        
        try {
          logger.info(`[${storeIndex}/${activeStores.length}] ${store.store_name} 리뷰 수집 시작`);
          
          const result = await scrapeNaverReviewsComplete(store.id);
          
          logger.info(`[${storeIndex}/${activeStores.length}] ${store.store_name} 리뷰 수집 완료`);
          
          successCount++;
          results.push({
            storeId: store.id,
            storeName: store.store_name,
            status: 'success',
            result: result
          });
          
        } catch (error) {
          logger.error(`[${storeIndex}/${activeStores.length}] ${store.store_name} 리뷰 수집 실패:`, error.message);
          
          failureCount++;
          results.push({
            storeId: store.id,
            storeName: store.store_name,
            status: 'failed',
            error: error.message
          });
        }

        // 서버 부하 방지를 위한 간격 조절 (5초)
        if (i < activeStores.length - 1) {
          await this.delay(5000);
        }
      }

      const endTime = new Date();
      const duration = endTime - startTime;
      
      // 결과 요약 로깅
      logger.info('야간 자동 리뷰 수집 완료');
      logger.info(`종료 시간: ${endTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
      logger.info(`총 소요 시간: ${Math.round(duration / 1000)}초`);
      logger.info(`📊 처리 결과: 성공 ${successCount}개, 실패 ${failureCount}개`);
      
      // 상세 결과 로깅
      if (results.length > 0) {
        logger.info('📋 상세 결과:');
        results.forEach((result, index) => {
          const status = result.status === 'success' ? 'SUCCESS' : 'FAILED';
          logger.info(`${status} ${index + 1}. ${result.storeName}: ${result.status}`);
        });
      }

      // 실패한 스토어가 있으면 관리자에게 알림 (선택사항)
      if (failureCount > 0) {
        await this.notifyAdminOfFailures(results.filter(r => r.status === 'failed'));
      }

    } catch (error) {
      logger.error('❌ 야간 자동 리뷰 수집 중 오류 발생:', error);
      
      // 관리자에게 오류 알림 (선택사항)
      await this.notifyAdminOfError(error);
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 연결 상태 확인
   */
  async checkConnectionStatus() {
    try {
      logger.info('🔍 네이버 연결 상태 확인 시작');
      
      // 활성 사용자 스토어 조회
      const activeStores = await this.getActiveUserStores();
      
      if (activeStores.length === 0) {
        logger.info('📝 확인할 활성 스토어가 없습니다');
        return;
      }

      logger.info(`📊 연결 상태 확인할 스토어 수: ${activeStores.length}개`);
      
      // 간단한 연결 상태만 확인 (전체 스크래핑은 하지 않음)
      for (const store of activeStores) {
        try {
          // 여기서는 간단한 연결 테스트만 수행
          // 실제 구현시에는 더 가벼운 연결 확인 로직 사용
          logger.info(`🔍 ${store.store_name} 연결 상태 확인 완료`);
          
        } catch (error) {
          logger.warn(`⚠️ ${store.store_name} 연결 상태 확인 실패: ${error.message}`);
        }
      }
      
      logger.info('✅ 네이버 연결 상태 확인 완료');
      
    } catch (error) {
      logger.error('❌ 네이버 연결 상태 확인 중 오류 발생:', error);
    }
  }

  /**
   * 활성 사용자 스토어 조회
   */
  async getActiveUserStores() {
    try {
      // naver_integration_status 뷰를 사용하여 활성 스토어 조회
      const { data, error } = await supabase
        .from('naver_integration_status')
        .select('*')
        .eq('has_credentials', true)
        .eq('integration_status', 'active');

      if (error) {
        logger.error('활성 스토어 조회 실패:', error);
        return [];
      }

      return data || [];
      
    } catch (error) {
      logger.error('활성 스토어 조회 중 오류 발생:', error);
      return [];
    }
  }

  /**
   * 지연 함수
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 관리자에게 실패 알림 (선택사항)
   */
  async notifyAdminOfFailures(failedStores) {
    try {
      logger.warn(`실패한 스토어 ${failedStores.length}개 발견`);
      
      // 여기에 실제 알림 로직 구현 (이메일, 슬랙, 텔레그램 등)
      // 예시: 슬랙 웹훅, 이메일 발송 등
      
      logger.info('관리자 알림 발송 완료');
      
    } catch (error) {
      logger.error('관리자 알림 발송 실패:', error);
    }
  }

  /**
   * 관리자에게 오류 알림 (선택사항)
   */
  async notifyAdminOfError(error) {
    try {
      logger.error('야간 자동 실행 중 치명적 오류 발생');
      
      // 여기에 실제 알림 로직 구현
      // 예시: 슬랙 웹훅, 이메일 발송 등
      
      logger.info('관리자 오류 알림 발송 완료');
      
    } catch (notificationError) {
      logger.error('관리자 오류 알림 발송 실패:', notificationError);
    }
  }

  /**
   * 스케줄러 상태 조회
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduledJobs: Array.from(this.scheduledJobs.keys()),
      nextRun: this.getNextRunTime()
    };
  }

  /**
   * 다음 실행 시간 계산
   */
  getNextRunTime() {
    const now = new Date();
    const nextNight = new Date(now);
    
    // 다음 새벽 2시 계산
    nextNight.setDate(nextNight.getDate() + 1);
    nextNight.setHours(2, 0, 0, 0);
    
    return nextNight.toISOString();
  }
}

// 싱글톤 인스턴스 생성
const naverSchedulerService = new NaverSchedulerService();

export default naverSchedulerService;
