import { supabase } from '../utils/supabaseClient.js';
// import { encrypt, decrypt } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

// Helpers: string <-> bytea(Buffer)
function stringToBytea(str) {
  return Buffer.from(str, 'utf8'); // supabase-js가 base64로 전송
}
function byteaToString(val) {
  if (val == null) return '';
  // Node Buffer JSON 형태 { type: 'Buffer', data: [...] }
  if (val?.type === 'Buffer' && Array.isArray(val.data)) {
    return Buffer.from(val.data).toString('utf8');
  }
  // Uint8Array
  if (val instanceof Uint8Array) {
    return Buffer.from(val).toString('utf8');
  }
  // ArrayBuffer
  if (val instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(val)).toString('utf8');
  }
  // base64 문자열로 반환되는 경우
  if (typeof val === 'string') {
    try {
      return Buffer.from(val, 'base64').toString('utf8');
    } catch (_) {
      return val;
    }
  }
  // 마지막 fallback
  try {
    return Buffer.from(val).toString('utf8');
  } catch (_) {
    return String(val);
  }
}

/**
 * 네이버 로그인 정보 저장
 * @param {string} userStoreId - 사용자 스토어 ID
 * @param {string} username - 네이버 아이디
 * @param {string} password - 네이버 비밀번호
 * @returns {Promise<Object>} 저장 결과
 */
export const saveNaverCredentials = async (userStoreId, username, password) => {
  try {
    // const encryptedUsername = encrypt(username);
    // const encryptedPassword = encrypt(password);
    
    const { data, error } = await supabase
      .from('naver_credentials')
      .upsert({
        user_store_id: userStoreId,
        username: username, // 일반 텍스트 컬럼 사용
        password: password, // 일반 텍스트 컬럼 사용
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_store_id'
      });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('네이버 자격증명 저장 실패:', error);
    throw error;
  }
};

/**
 * 네이버 로그인 정보 조회
 * @param {string} userStoreId - 사용자 스토어 ID
 * @returns {Promise<Object|null>} 복호화된 로그인 정보 또는 null
 */
export const getNaverCredentials = async (userStoreId) => {
  try {
    const { data, error } = await supabase
      .from('naver_credentials')
      .select('username, password')
      .eq('user_store_id', userStoreId)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    if (!data) return null;

    // return {
    //   username: decrypt(data.username),
    //   password: decrypt(data.password)
    // };
    
    return {
      username: data.username, // 일반 텍스트 컬럼에서 직접 반환
      password: data.password  // 일반 텍스트 컬럼에서 직접 반환
    };
  } catch (error) {
    console.error('네이버 자격증명 조회 실패:', error);
    throw error;
  }
};

/**
 * 네이버 로그인 정보 삭제 (비활성화)
 * @param {string} userStoreId - 사용자 스토어 ID
 * @returns {Promise<Object>} 삭제 결과
 */
export const deleteNaverCredentials = async (userStoreId) => {
  try {
    logger.info(`네이버 로그인 정보 삭제: ${userStoreId}`);
    
    if (!userStoreId) {
      throw new Error('userStoreId가 필요합니다');
    }
    
    // 실제 삭제하지 않고 비활성화
    const { error } = await supabase
      .from('naver_credentials')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_store_id', userStoreId);
    
    if (error) {
      throw new Error(`데이터베이스 업데이트 실패: ${error.message}`);
    }
    
    logger.info(`네이버 로그인 정보 삭제 완료: ${userStoreId}`);
    return { 
      success: true, 
      message: '네이버 로그인 정보가 삭제되었습니다' 
    };
    
  } catch (error) {
    logger.error('네이버 로그인 정보 삭제 에러:', error);
    throw error;
  }
};

/**
 * 네이버 로그인 정보 존재 여부 확인
 * @param {string} userStoreId - 사용자 스토어 ID
 * @returns {Promise<boolean>} 존재 여부
 */
export const hasNaverCredentials = async (userStoreId) => {
  try {
    if (!userStoreId) return false;
    
    const { data, error } = await supabase
      .from('naver_credentials')
      .select('id')
      .eq('user_store_id', userStoreId)
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      logger.error('네이버 로그인 정보 확인 실패:', error);
      return false;
    }
    
    return !!data;
    
  } catch (error) {
    logger.error('네이버 로그인 정보 확인 에러:', error);
    return false;
  }
};

/**
 * 네이버 로그인 정보 업데이트
 * @param {string} userStoreId - 사용자 스토어 ID
 * @param {Object} updateData - 업데이트할 데이터
 * @returns {Promise<Object>} 업데이트 결과
 */
export const updateNaverCredentials = async (userStoreId, updateData) => {
  try {
    logger.info(`네이버 로그인 정보 업데이트: ${userStoreId}`);
    
    if (!userStoreId) {
      throw new Error('userStoreId가 필요합니다');
    }
    
    const updateFields = { updated_at: new Date().toISOString() };
    
    // username이 제공된 경우 암호화
    if (updateData.username) {
      updateFields.username_enc = stringToBytea(encrypt(updateData.username));
    }
    
    // password가 제공된 경우 암호화
    if (updateData.password) {
      updateFields.password_enc = stringToBytea(encrypt(updateData.password));
    }
    
    // 기타 필드들
    if (updateData.is_active !== undefined) {
      updateFields.is_active = updateData.is_active;
    }
    
    if (updateData.last_login_at) {
      updateFields.last_login_at = updateData.last_login_at;
    }
    
    if (updateData.login_fail_count !== undefined) {
      updateFields.login_fail_count = updateData.login_fail_count;
    }
    
    const { error } = await supabase
      .from('naver_credentials')
      .update(updateFields)
      .eq('user_store_id', userStoreId);
    
    if (error) {
      throw new Error(`데이터베이스 업데이트 실패: ${error.message}`);
    }
    
    logger.info(`네이버 로그인 정보 업데이트 완료: ${userStoreId}`);
    return { 
      success: true, 
      message: '네이버 로그인 정보가 업데이트되었습니다' 
    };
    
  } catch (error) {
    logger.error('네이버 로그인 정보 업데이트 에러:', error);
    throw error;
  }
};

/**
 * 로그인 실패 횟수 증가
 * @param {string} userStoreId - 사용자 스토어 ID
 * @returns {Promise<void>}
 */
export const incrementLoginFailCount = async (userStoreId) => {
  try {
    // 현재 값 조회 후 +1 업데이트 (supabase.sql 미사용)
    const { data: current, error: selErr } = await supabase
      .from('naver_credentials')
      .select('login_fail_count')
      .eq('user_store_id', userStoreId)
      .single();
    if (selErr) return;
    const next = (current?.login_fail_count || 0) + 1;
    const { error } = await supabase
      .from('naver_credentials')
      .update({ 
        login_fail_count: next,
        updated_at: new Date().toISOString()
      })
      .eq('user_store_id', userStoreId);
    
    if (error) {
      logger.error('로그인 실패 횟수 증가 실패:', error);
    }
    
  } catch (error) {
    logger.error('로그인 실패 횟수 증가 에러:', error);
  }
};

/**
 * 로그인 성공 시 정보 업데이트
 * @param {string} userStoreId - 사용자 스토어 ID
 * @returns {Promise<void>}
 */
export const updateLoginSuccess = async (userStoreId) => {
  try {
    const { error } = await supabase
      .from('naver_credentials')
      .update({ 
        last_login_at: new Date().toISOString(),
        login_fail_count: 0, // 로그인 성공 시 실패 횟수 초기화
        updated_at: new Date().toISOString()
      })
      .eq('user_store_id', userStoreId);
    
    if (error) {
      logger.error('로그인 성공 정보 업데이트 실패:', error);
    }
    
  } catch (error) {
    logger.error('로그인 성공 정보 업데이트 에러:', error);
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
