import { supabase } from '../services/supabaseService.js';
import { saveNaverCredentials, getNaverCredentials } from '../services/naverCredentialService.js';
import { autoLoginToNaver } from '../services/naverAutoLoginService.js';
import { logger } from '../utils/logger.js';

/**
 * 네이버 플레이스 연동 설정 (로그인 정보 저장)
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 * @param {Function} next - 다음 미들웨어
 */
export const setupNaverIntegration = async (req, res, next) => {
  try {
    const { userStoreId, username, password } = req.body;
    const userId = req.user.id;

    // 입력값 검증
    if (!userStoreId || !username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'userStoreId, username, password가 모두 필요합니다' 
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
        message: '연동할 수 있는 스토어가 없습니다' 
      });
    }

    logger.info(`네이버 플레이스 연동 설정 시작: ${store.store_name} (${userStoreId})`);

    // 1. 로그인 정보 저장
    await saveNaverCredentials(userStoreId, username, password);
    logger.info(`✅ 네이버 로그인 정보 저장 완료: ${store.store_name}`);
    
    // 연동 상태: 자격 증명 저장됨 → configured 로 기록
    try {
      await supabase
        .from('naver_integration_status')
        .upsert({
          user_store_id: userStoreId,
          has_credentials: true,
          integration_status: 'configured',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_store_id' });
    } catch (e) {
      logger.warn('연동 상태 upsert 실패(무시 가능):', e.message);
    }
    
    // 2. 즉시 연결 테스트 (자동 로그인)
    try {
      logger.info(`연결 테스트 시작: ${store.store_name}`);
      await autoLoginToNaver(userStoreId, { username, password });
      
      // 자동 로그인 성공 → active 로 갱신
      try {
        await supabase
          .from('naver_integration_status')
          .upsert({
            user_store_id: userStoreId,
            has_credentials: true,
            integration_status: 'active',
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_store_id' });
      } catch (e) {
        logger.warn('연동 상태(active) upsert 실패(무시 가능):', e.message);
      }
      
      res.json({ 
        success: true, 
        message: '네이버 플레이스 연동 설정 완료 및 연결 테스트 성공',
        data: {
          store: {
            id: store.id,
            name: store.store_name
          },
          integrationStatus: 'active',
          testResult: 'success'
        }
      });
      
    } catch (loginError) {
      logger.warn(`연결 테스트 실패: ${store.store_name} - ${loginError.message}`);
      
      // 로그인 정보는 저장했지만 연결 테스트 실패 → configured 유지
      res.json({ 
        success: true, 
        message: '네이버 플레이스 연동 설정 완료 (연결 테스트 실패 - 나중에 재시도)',
        data: {
          store: {
            id: store.id,
            name: store.store_name
          },
          integrationStatus: 'configured',
          testResult: 'failed',
          warning: loginError.message
        }
      });
    }
    
  } catch (error) {
    logger.error('네이버 플레이스 연동 설정 에러:', error);
    res.status(500).json({ 
      success: false, 
      message: '네이버 플레이스 연동 설정에 실패했습니다',
      error: error.message
    });
  }
};

/**
 * 네이버 연결 테스트 (저장된 정보로 로그인 테스트)
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 * @param {Function} next - 다음 미들웨어
 */
export const testNaverConnection = async (req, res, next) => {
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
        message: '테스트할 수 있는 스토어가 없습니다' 
      });
    }

    logger.info(`🔄 네이버 연결 테스트 시작: ${store.store_name} (${userStoreId})`);

    // 자동 로그인 테스트
    const result = await autoLoginToNaver(userStoreId);
    // 연결 테스트 성공 시 상태 테이블 업데이트 (active)
    try {
      await supabase
        .from('naver_integration_status')
        .upsert({
          user_store_id: userStoreId,
          has_credentials: true,
          integration_status: 'active',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_store_id' });
    } catch (e) {
      logger.warn('연동 상태 upsert 실패(무시 가능):', e.message);
    }
    
    logger.info(`✅ 네이버 연결 테스트 성공: ${store.store_name}`);
    
    res.json({ 
      success: true, 
      message: '네이버 연결 테스트 성공',
      data: {
        store: {
          id: store.id,
          name: store.store_name
        },
        testResult: 'success',
        testTime: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('네이버 연결 테스트 에러:', error);
    res.status(500).json({ 
      success: false, 
      message: `연결 테스트 실패: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * 네이버 플레이스 연동 상태 조회
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 * @param {Function} next - 다음 미들웨어
 */
export const getNaverIntegrationStatus = async (req, res, next) => {
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
        message: '조회할 수 있는 스토어가 없습니다' 
      });
    }

    // 연동 상태 계산 (기존 뷰/테이블이 없을 수 있으므로 실제 테이블에서 파생)
    // 1) 자격증명 존재 여부
    const { data: credential, error: credError } = await supabase
      .from('naver_credentials')
      .select('user_store_id, is_active, updated_at')
      .eq('user_store_id', userStoreId)
      .maybeSingle();

    if (credError) {
      throw new Error(`자격증명 조회 실패: ${credError.message}`);
    }

    // 2) 최근 로그인 히스토리 확인
    const { data: historyRows, error: historyError } = await supabase
      .from('naver_login_history')
      .select('success, attempt_timestamp, error_message')
      .eq('user_store_id', userStoreId)
      .order('attempt_timestamp', { ascending: false })
      .limit(1);

    if (historyError) {
      throw new Error(`로그인 히스토리 조회 실패: ${historyError.message}`);
    }

    const lastHistory = Array.isArray(historyRows) && historyRows.length > 0 ? historyRows[0] : null;
    const hasCredentials = !!credential && credential.is_active === true;
    let integrationStatus = 'not_configured';
    if (hasCredentials) {
      // 최근 성공 이력이 있으면 active, 없으면 configured
      const lastSuccess = lastHistory?.success === true;
      integrationStatus = lastSuccess ? 'active' : 'configured';
    }

    res.json({ 
      success: true, 
      message: '네이버 플레이스 연동 상태 조회 완료',
      data: {
        store: {
          id: store.id,
          name: store.store_name
        },
        integration: {
          has_credentials: hasCredentials,
          integration_status: integrationStatus,
          lastScrapeAt: null // 필요 시 review_summary_unified.last_analyzed_at로 대체 가능
        }
      }
    });
    
  } catch (error) {
    logger.error('네이버 플레이스 연동 상태 조회 에러:', error);
    res.status(500).json({ 
      success: false, 
      message: '연동 상태 조회에 실패했습니다',
      error: error.message
    });
  }
};

/**
 * 네이버 플레이스 연동 해제 (로그인 정보 삭제)
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 * @param {Function} next - 다음 미들웨어
 */
export const removeNaverIntegration = async (req, res, next) => {
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
        message: '해제할 수 있는 스토어가 없습니다' 
      });
    }

    logger.info(`🗑️ 네이버 플레이스 연동 해제 시작: ${store.store_name} (${userStoreId})`);

    // 1. 로그인 정보 비활성화
    const { error: credentialError } = await supabase
      .from('naver_credentials')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_store_id', userStoreId);

    if (credentialError) {
      throw new Error(`로그인 정보 비활성화 실패: ${credentialError.message}`);
    }

    // 2. 세션 정보 삭제
    const { error: sessionError } = await supabase
      .from('naver_sessions')
      .delete()
      .eq('user_store_id', userStoreId);

    if (sessionError) {
      logger.warn(`⚠️ 세션 삭제 실패: ${sessionError.message}`);
    }

    logger.info(`✅ 네이버 플레이스 연동 해제 완료: ${store.store_name}`);
    
    res.json({ 
      success: true, 
      message: '네이버 플레이스 연동이 해제되었습니다',
      data: {
        store: {
          id: store.id,
          name: store.store_name
        },
        removedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('네이버 플레이스 연동 해제 에러:', error);
    res.status(500).json({ 
      success: false, 
      message: '네이버 플레이스 연동 해제에 실패했습니다',
      error: error.message
    });
  }
};

/**
 * UUID 형식 검증
 * @param {string} uuid - 검증할 UUID
 * @returns {boolean} 유효성 여부
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
