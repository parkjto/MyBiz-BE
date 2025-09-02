import { scrapeReviewsWithSession } from '../services/scraperService.js';
import { scrapeNaverReviewsComplete } from '../services/finalNaverReviewService.js';
import { saveNaverSession } from '../services/sessionService.js';
import { analyzeReviewsFromDB } from '../services/reviewAnalysisService.js';
import { getStoredReviews } from '../services/reviewService.js';
import { ReviewScrapingJobService } from '../services/reviewScrapingJobService.js';
import { logger } from '../utils/logger.js';
import { supabase } from '../utils/supabaseClient.js';

export const scrapeReviews = async (req, res, next) => {
  try {
    const { userStoreId } = req.body;
    const userId = req.user.id;

    if (!userStoreId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userStoreId가 필요합니다' 
      });
    }

    // UUID 형식 검증
    if (!isValidUUID(userStoreId)) {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 userStoreId 형식입니다' 
      });
    }

    // 본인의 스토어인지 확인
    const { data: store, error: storeError } = await supabase
      .from('user_stores')
      .select('id, store_name')
      .eq('id', userStoreId)
      .eq('user_id', userId)
      .single();

    if (storeError || !store) {
      return res.status(404).json({ 
        success: false, 
        message: '스크래핑할 수 있는 스토어가 없습니다' 
      });
    }

    logger.info(`리뷰 스크래핑 시작: ${store.store_name} (${userStoreId})`);

    // 1. 기존 DB에 저장된 리뷰가 있는지 확인
    const existingReviews = await getStoredReviews(userStoreId);
    
    if (existingReviews && existingReviews.length > 0) {
      logger.info(`기존 리뷰 ${existingReviews.length}개 발견, 분석 진행`);
      
      // 기존 리뷰로 분석 수행
      const analysisResult = await analyzeReviewsFromDB(userStoreId, existingReviews);
      
      const response = {
        success: true,
        message: '기존 리뷰 분석 완료',
        data: {
          reviews: existingReviews,
          analysis: analysisResult,
          isFromDB: true
        },
        store: {
          id: store.id,
          name: store.store_name
        }
      };
      
      logger.info('[DEBUG] 기존 리뷰 응답:', JSON.stringify(response, null, 2));
      
      return res.json(response);
    }

    // 2. 비동기 스크래핑 작업 시작
    logger.info('비동기 리뷰 스크래핑 작업 시작');
    
    try {
      const jobResult = await ReviewScrapingJobService.createScrapingJob(userStoreId, store.store_name);
      
      return res.json({
        success: true,
        message: '스크래핑 작업이 시작되었습니다. 진행 상황을 확인해주세요.',
        data: {
          jobId: jobResult.jobId,
          status: 'pending',
          progress: 0,
          message: '스크래핑 작업 대기 중...'
        },
        store: {
          id: store.id,
          name: store.store_name
        }
      });
      
    } catch (jobError) {
      logger.error('스크래핑 작업 생성 실패:', jobError);
      
      // 작업 생성 실패 시 기존 방식으로 폴백
      logger.info('폴백: 동기 스크래핑 수행');
      const result = await scrapeNaverReviewsComplete(userStoreId, store.store_name);
      
      if (!result || !result.reviews || result.reviews.length === 0) {
        return res.json({
          success: true,
          message: '스크래핑 완료되었으나 리뷰가 없습니다',
          data: {
            reviews: [],
            analysis: null,
            isFromDB: false
          },
          store: {
            id: store.id,
            name: store.store_name
          }
        });
      }

      // 스크래핑된 리뷰 분석
      logger.info(`새로 스크래핑된 리뷰 ${result.reviews.length}개 분석 시작`);
      const analysisResult = await analyzeReviewsFromDB(userStoreId, result.reviews);
      
      return res.json({ 
        success: true, 
        message: '리뷰 스크래핑 및 분석 완료', 
        data: {
          reviews: result.reviews,
          analysis: analysisResult,
          isFromDB: false
        },
        store: {
          id: store.id,
          name: store.store_name
        }
      });
    }
  } catch(e){ 
    logger.error('리뷰 스크래핑 에러:', e);
    next(e); 
  }
};

// 스크래핑 작업 상태 조회
export const getScrapingJobStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    if (!jobId) {
      return res.status(400).json({ 
        success: false, 
        message: 'jobId가 필요합니다' 
      });
    }

    // UUID 형식 검증
    if (!isValidUUID(jobId)) {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 jobId 형식입니다' 
      });
    }

    // 작업 상태 조회
    const jobStatus = await ReviewScrapingJobService.getJobStatus(jobId);
    
    // 본인의 스토어 작업인지 확인
    const { data: store, error: storeError } = await supabase
      .from('user_stores')
      .select('id, store_name')
      .eq('id', jobStatus.user_store_id)
      .eq('user_id', userId)
      .single();

    if (storeError || !store) {
      return res.status(404).json({ 
        success: false, 
        message: '접근할 수 없는 작업입니다' 
      });
    }
    
    logger.info(`스크래핑 작업 상태 조회: ${jobId} - ${jobStatus.status}`);
    
    res.json({ 
      success: true, 
      message: '작업 상태 조회 완료', 
      data: {
        jobId: jobStatus.id,
        status: jobStatus.status,
        progress: jobStatus.progress,
        message: jobStatus.message,
        totalReviews: jobStatus.total_reviews,
        scrapedReviews: jobStatus.scraped_reviews,
        storeName: jobStatus.store_name,
        createdAt: jobStatus.created_at,
        updatedAt: jobStatus.updated_at
      }
    });
  } catch(e){ 
    logger.error('스크래핑 작업 상태 조회 에러:', e);
    next(e); 
  }
};

// 사용자의 스크래핑 작업 목록 조회
export const getUserScrapingJobs = async (req, res, next) => {
  try {
    const { userStoreId } = req.params;
    const userId = req.user.id;

    if (!userStoreId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userStoreId가 필요합니다' 
      });
    }

    // UUID 형식 검증
    if (!isValidUUID(userStoreId)) {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 userStoreId 형식입니다' 
      });
    }

    // 본인의 스토어인지 확인
    const { data: store, error: storeError } = await supabase
      .from('user_stores')
      .select('id, store_name')
      .eq('id', userStoreId)
      .eq('user_id', userId)
      .single();

    if (storeError || !store) {
      return res.status(404).json({ 
        success: false, 
        message: '접근할 수 없는 스토어입니다' 
      });
    }

    // 작업 목록 조회
    const jobs = await ReviewScrapingJobService.getUserJobs(userStoreId);
    
    logger.info(`스크래핑 작업 목록 조회: ${userStoreId} - ${jobs.length}개 작업`);
    
    res.json({ 
      success: true, 
      message: '작업 목록 조회 완료', 
      data: {
        jobs: jobs.map(job => ({
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          message: job.message,
          totalReviews: job.total_reviews,
          scrapedReviews: job.scraped_reviews,
          storeName: job.store_name,
          createdAt: job.created_at,
          updatedAt: job.updated_at
        }))
      }
    });
  } catch(e){ 
    logger.error('스크래핑 작업 목록 조회 에러:', e);
    next(e); 
  }
};

export const setSession = async (req, res, next) => {
  try {
    const { userStoreId, cookies, expiresAt } = req.body;
    const userId = req.user.id;

    if (!userStoreId || !Array.isArray(cookies)) {
      return res.status(400).json({ 
        success: false, 
        message: 'userStoreId와 cookies가 필요합니다' 
      });
    }

    // UUID 형식 검증
    if (!isValidUUID(userStoreId)) {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 userStoreId 형식입니다' 
      });
    }

    // 본인의 스토어인지 확인
    const { data: store, error: storeError } = await supabase
      .from('user_stores')
      .select('id, store_name')
      .eq('id', userStoreId)
      .eq('user_id', userId)
      .single();

    if (storeError || !store) {
      return res.status(404).json({ 
        success: false, 
        message: '세션을 저장할 수 있는 스토어가 없습니다' 
      });
    }

    await saveNaverSession(userStoreId, { cookies, expiresAt });
    
    logger.info(`네이버 세션 저장 완료: ${store.store_name} (${userStoreId})`);
    
    res.json({ 
      success: true, 
      message: '세션 저장 완료',
      store: {
        id: store.id,
        name: store.store_name
      }
    });
  } catch(e){ 
    logger.error('세션 저장 에러:', e);
    next(e); 
  }
};

// UUID 형식 검증 함수
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

