// Supabase(PostgreSQL) 기반 매출 쿼리 예시
const supabase = require('../config/db');

/**
 * 매출 ID로 매출 정보 조회
 * @param {string|number} id
 * @returns {Promise<object|null>}
 */
async function getSalesById(id) {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * 전체 매출 목록 조회
 * @returns {Promise<object[]>}
 */
async function getAllSales() {
  const { data, error } = await supabase
    .from('sales')
    .select('*');
  if (error) throw error;
  return data;
}

module.exports = { getSalesById, getAllSales };
