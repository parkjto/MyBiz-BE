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

module.exports = { getUserById };
