import { supabase } from '../services/supabaseService.js';
import { saveNaverCredentials, getNaverCredentials } from '../services/naverCredentialService.js';
import { autoLoginToNaver } from '../services/naverAutoLoginService.js';
import { logger } from '../utils/logger.js';

/**
 * 네이버 연동 설정 (로그인 정보 저장)
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

    logger.info(`네이버 연동 설정 시작: ${store.store_name} (${userStoreId})`);

    // 1. 로그인 정보 저장
    await saveNaverCredentials(userStoreId, username, password);
    logger.info(`✅ 네이버 로그인 정보 저장 완료: ${store.store_name}`);
    
    // 2. 즉시 연결 테스트 (자동 로그인)
    try {
      logger.info(`연결 테스트 시작: ${store.store_name}`);
      await autoLoginToNaver(userStoreId, { username, password });
      
      res.json({ 
        success: true, 
        message: '네이버 연동 설정 완료 및 연결 테스트 성공',
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
      
      // 로그인 정보는 저장했지만 연결 테스트 실패
      res.json({ 
        success: true, 
        message: '네이버 연동 설정 완료 (연결 테스트 실패 - 나중에 재시도)',
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
    logger.error('네이버 연동 설정 에러:', error);
    res.status(500).json({ 
      success: false, 
      message: '네이버 연동 설정에 실패했습니다',
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
    await autoLoginToNaver(userStoreId);
    
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
 * 네이버 연동 상태 조회
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

    // 연동 상태 조회
    const { data: integrationData, error: integrationError } = await supabase
      .from('naver_integration_status')
      .select('*')
      .eq('user_store_id', userStoreId)
      .single();

    if (integrationError && integrationError.code !== 'PGRST116') {
      throw new Error(`연동 상태 조회 실패: ${integrationError.message}`);
    }

    res.json({ 
      success: true, 
      message: '네이버 연동 상태 조회 완료',
      data: {
        store: {
          id: store.id,
          name: store.store_name
        },
        integration: integrationData || {
          has_credentials: false,
          integration_status: 'not_configured'
        }
      }
    });
    
  } catch (error) {
    logger.error('네이버 연동 상태 조회 에러:', error);
    res.status(500).json({ 
      success: false, 
      message: '연동 상태 조회에 실패했습니다',
      error: error.message
    });
  }
};

/**
 * 네이버 연동 해제 (로그인 정보 삭제)
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

    logger.info(`🗑️ 네이버 연동 해제 시작: ${store.store_name} (${userStoreId})`);

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

    logger.info(`✅ 네이버 연동 해제 완료: ${store.store_name}`);
    
    res.json({ 
      success: true, 
      message: '네이버 연동이 해제되었습니다',
      data: {
        store: {
          id: store.id,
          name: store.store_name
        },
        removedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('네이버 연동 해제 에러:', error);
    res.status(500).json({ 
      success: false, 
      message: '네이버 연동 해제에 실패했습니다',
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
