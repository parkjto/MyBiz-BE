import { supabase } from '../utils/supabaseClient.js';
import { logger } from '../utils/logger.js';
import { scrapeNaverReviewsComplete } from './finalNaverReviewService.js';

/**
 * 리뷰 스크래핑 작업 상태 관리
 */
export class ReviewScrapingJobService {
  static async createScrapingJob(userStoreId, storeName) {
    try {
      logger.info(`[INFO] 스크래핑 작업 생성: ${userStoreId} - ${storeName}`);
      
      // 작업 상태를 DB에 저장
      const { data, error } = await supabase
        .from('scraping_jobs')
        .insert({
          user_store_id: userStoreId,
          store_name: storeName,
          status: 'pending',
          progress: 0,
          message: '스크래핑 작업 대기 중...',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        logger.error('[ERROR] 스크래핑 작업 생성 실패:', error);
        throw error;
      }
      
      // 백그라운드에서 스크래핑 시작
      this.startScrapingInBackground(data.id, userStoreId, storeName);
      
      return {
        success: true,
        jobId: data.id,
        message: '스크래핑 작업이 시작되었습니다. 진행 상황을 확인해주세요.'
      };
      
    } catch (error) {
      logger.error('[ERROR] 스크래핑 작업 생성 중 오류:', error);
      throw error;
    }
  }
  
  static async startScrapingInBackground(jobId, userStoreId, storeName) {
    try {
      logger.info(`[INFO] 백그라운드 스크래핑 시작: Job ${jobId}`);
      
      // 작업 상태를 'running'으로 업데이트
      await this.updateJobStatus(jobId, 'running', 10, '스크래핑 시작...');
      
      // 스크래핑 실행 (jobId 전달)
      const result = await scrapeNaverReviewsComplete(userStoreId, storeName, jobId);
      
      if (result.success) {
        // 성공 시 완료 상태로 업데이트
        await this.updateJobStatus(jobId, 'completed', 100, 
          `스크래핑 완료: ${result.totalReviews}개 리뷰 수집됨`);
        
        logger.info(`[INFO] 스크래핑 작업 완료: Job ${jobId} - ${result.totalReviews}개 리뷰`);
      } else {
        // 실패 시 에러 상태로 업데이트
        await this.updateJobStatus(jobId, 'failed', 0, 
          `스크래핑 실패: ${result.error || '알 수 없는 오류'}`);
        
        logger.error(`[ERROR] 스크래핑 작업 실패: Job ${jobId}`);
      }
      
    } catch (error) {
      logger.error(`[ERROR] 백그라운드 스크래핑 중 오류: Job ${jobId}`, error);
      
      // 에러 상태로 업데이트
      await this.updateJobStatus(jobId, 'failed', 0, 
        `스크래핑 중 오류 발생: ${error.message}`);
    }
  }
  
  static async updateJobStatus(jobId, status, progress, message) {
    try {
      const { error } = await supabase
        .from('scraping_jobs')
        .update({
          status: status,
          progress: progress,
          message: message,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      if (error) {
        logger.error('[ERROR] 작업 상태 업데이트 실패:', error);
      }
      
    } catch (error) {
      logger.error('[ERROR] 작업 상태 업데이트 중 오류:', error);
    }
  }
  
  static async getJobStatus(jobId) {
    try {
      const { data, error } = await supabase
        .from('scraping_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (error) {
        logger.error('[ERROR] 작업 상태 조회 실패:', error);
        throw error;
      }
      
      return data;
      
    } catch (error) {
      logger.error('[ERROR] 작업 상태 조회 중 오류:', error);
      throw error;
    }
  }
  
  static async getUserJobs(userStoreId) {
    try {
      const { data, error } = await supabase
        .from('scraping_jobs')
        .select('*')
        .eq('user_store_id', userStoreId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        logger.error('[ERROR] 사용자 작업 목록 조회 실패:', error);
        throw error;
      }
      
      return data || [];
      
    } catch (error) {
      logger.error('[ERROR] 사용자 작업 목록 조회 중 오류:', error);
      throw error;
    }
  }
}
