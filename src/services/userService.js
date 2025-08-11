const { supabase } = require('../config/db');

/**
 * 사용자 ID로 사용자 정보 조회
 * @param {string|number} userId - 사용자 ID
 * @returns {Promise<Object|null>} 사용자 정보
 */
async function getUserById(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('[ERROR] 사용자 조회 실패:', error);
      throw new Error('사용자 정보를 조회할 수 없습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('[ERROR] getUserById 실패:', error);
    throw error;
  }
}

/**
 * 카카오 ID로 사용자 정보 조회
 * @param {string} kakaoId - 카카오 ID
 * @returns {Promise<Object|null>} 사용자 정보
 */
async function getUserByKakaoId(kakaoId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('kakao_id', kakaoId.toString())
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('[ERROR] 카카오 ID로 사용자 조회 실패:', error);
      throw new Error('사용자 정보를 조회할 수 없습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('[ERROR] getUserByKakaoId 실패:', error);
    throw error;
  }
}

/**
 * 새 사용자 생성
 * @param {Object} userData - 사용자 데이터
 * @returns {Promise<Object>} 생성된 사용자 정보
 */
async function createUser(userData) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) {
      console.error('[ERROR] 사용자 생성 실패:', error);
      throw new Error('사용자 생성에 실패했습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('[ERROR] createUser 실패:', error);
    throw error;
  }
}

/**
 * 사용자 정보 업데이트
 * @param {string|number} userId - 사용자 ID
 * @param {Object} updateData - 업데이트할 데이터
 * @returns {Promise<Object>} 업데이트된 사용자 정보
 */
async function updateUser(userId, updateData) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('[ERROR] 사용자 업데이트 실패:', error);
      throw new Error('사용자 정보 업데이트에 실패했습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('[ERROR] updateUser 실패:', error);
    throw error;
  }
}

/**
 * 사용자 마지막 로그인 시간 업데이트
 * @param {string|number} userId - 사용자 ID
 * @returns {Promise<void>}
 */
async function updateLastLogin(userId) {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        last_login_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      console.error('[ERROR] 마지막 로그인 시간 업데이트 실패:', error);
      // 로그인 시간 업데이트 실패는 치명적이지 않으므로 에러를 던지지 않음
    }
  } catch (error) {
    console.error('[ERROR] updateLastLogin 실패:', error);
    // 로그인 시간 업데이트 실패는 치명적이지 않으므로 에러를 던지지 않음
  }
}

/**
 * 사용자 삭제 (소프트 삭제)
 * @param {string|number} userId - 사용자 ID
 * @returns {Promise<boolean>} 삭제 성공 여부
 */
async function deleteUser(userId) {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false
      })
      .eq('id', userId);
    
    if (error) {
      console.error('[ERROR] 사용자 삭제 실패:', error);
      throw new Error('사용자 삭제에 실패했습니다.');
    }
    
    return true;
  } catch (error) {
    console.error('[ERROR] deleteUser 실패:', error);
    throw error;
  }
}

/**
 * 사용자 목록 조회 (관리자용)
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 사용자 목록과 메타데이터
 */
async function getUsers(options = {}) {
  try {
    const { page = 1, limit = 10, search = '' } = options;
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    // 검색 조건 추가
    if (search) {
      query = query.or(`nickname.ilike.%${search}%,email.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('[ERROR] 사용자 목록 조회 실패:', error);
      throw new Error('사용자 목록을 조회할 수 없습니다.');
    }
    
    return {
      users: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('[ERROR] getUsers 실패:', error);
    throw error;
  }
}

module.exports = {
  getUserById,
  getUserByKakaoId,
  createUser,
  updateUser,
  updateLastLogin,
  deleteUser,
  getUsers
}; 