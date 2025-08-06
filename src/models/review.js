// Supabase(PostgreSQL) 기반 리뷰 쿼리 예시
const supabase = require('../config/db');

/**
 * 리뷰 ID로 리뷰 정보 조회
 * @param {string|number} id
 * @returns {Promise<object|null>}
 */
async function getReviewById(id) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * 전체 리뷰 목록 조회
 * @returns {Promise<object[]>}
 */
async function getAllReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('*');
  if (error) throw error;
  return data;
}

module.exports = { getReviewById, getAllReviews };
