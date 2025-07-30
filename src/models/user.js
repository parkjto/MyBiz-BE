// Supabase(PostgreSQL) 기반 사용자 쿼리 예시
const supabase = require('../config/db');

/**
 * 사용자 ID로 유저 정보 조회
 * @param {string|number} id
 * @returns {Promise<object|null>}
 */
async function getUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * 소셜 ID로 사용자 조회
 * @param {string} socialId - 소셜 ID (kakao_id 또는 naver_id)
 * @param {string} provider - 소셜 제공자 ('kakao' 또는 'naver')
 * @returns {Promise<object|null>}
 */
async function getUserBySocialId(socialId, provider) {
  const columnName = `${provider}_id`;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq(columnName, socialId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * 새 사용자 생성
 * @param {object} userData - 사용자 데이터
 * @returns {Promise<object>}
 */
async function createUser(userData) {
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * 사용자 매장 정보 업데이트
 * @param {string|number} userId - 사용자 ID
 * @param {object} storeInfo - 매장 정보
 * @returns {Promise<object>}
 */
async function updateStoreInfo(userId, storeInfo) {
  const { data, error } = await supabase
    .from('users')
    .update({
      store_name: storeInfo.name,
      store_address: storeInfo.address,
      store_road_address: storeInfo.roadAddress,
      store_phone: storeInfo.phone,
      store_category: storeInfo.category,
      place_id: storeInfo.placeId,
      store_info_verified: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * 사용자 정보 업데이트
 * @param {string|number} userId - 사용자 ID
 * @param {object} updateData - 업데이트할 데이터
 * @returns {Promise<object>}
 */
async function updateUser(userId, updateData) {
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = { 
  getUserById, 
  getUserBySocialId, 
  createUser, 
  updateStoreInfo, 
  updateUser 
};
