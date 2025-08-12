const supabase = require('../config/db');

/**
 * OCR 결과 저장 (이미지 비저장 정책)
 * @param {{userId: string|null, text: string, sentiment: any[], keywords: string[], summary: string}} payload
 * @returns {Promise<{id: string, text: string, sentiment: any[], keywords: string[], summary: string, status: string, created_at: string, updated_at: string}>}
 */
async function createOcrResult(payload) {
  const row = {
    user_id: payload.userId || null,
    text: payload.text,
    sentiment: payload.sentiment || [],
    keywords: payload.keywords || [],
    summary: payload.summary || '',
    status: 'completed',
    error_message: null
  };

  const { data, error } = await supabase
    .from('ocr_results')
    .insert(row)
    .select('id, text, sentiment, keywords, summary, status, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

/**
 * OCR 결과 단건 조회
 * @param {string} id
 * @returns {Promise<{id: string, text: string, sentiment: any[], keywords: string[], summary: string, status: string, created_at: string, updated_at: string}>}
 */
async function getOcrResultById(id) {
  const { data, error } = await supabase
    .from('ocr_results')
    .select('id, text, sentiment, keywords, summary, status, created_at, updated_at')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * 사용자별 OCR 결과 목록 조회
 * @param {string} userId
 * @param {number} limit
 * @param {number} offset
 */
async function getOcrResultsByUser(userId, limit = 10, offset = 0) {
  const { data, error } = await supabase
    .from('ocr_results')
    .select('id, text, sentiment, keywords, summary, status, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) throw error;
  return data;
}

/**
 * OCR 결과 상태 업데이트 (에러 처리용)
 * @param {string} id
 * @param {string} status
 * @param {string} errorMessage
 */
async function updateOcrResultStatus(id, status, errorMessage = null) {
  const { data, error } = await supabase
    .from('ocr_results')
    .update({ 
      status, 
      error_message: errorMessage,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('id, status, error_message, updated_at')
    .single();

  if (error) throw error;
  return data;
}

module.exports = { 
  createOcrResult, 
  getOcrResultById, 
  getOcrResultsByUser, 
  updateOcrResultStatus 
};


