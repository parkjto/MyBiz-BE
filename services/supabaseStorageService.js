import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BUCKET || 'ads-images';

export const supabase = url && key ? createClient(url, key) : null;

/**
 * Supabase Storage에 이미지 업로드
 * @param {Object} params - 업로드 파라미터
 * @param {Buffer} params.buffer - 이미지 버퍼
 * @param {string} params.contentType - MIME 타입
 * @param {string} params.fileName - 파일명
 * @returns {Promise<Object>} 업로드 결과 (publicUrl, path)
 */
export async function uploadToSupabase({ buffer, contentType, fileName }) {
  if (!supabase) {
    throw new Error('Supabase 설정이 필요합니다. SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 확인하세요.');
  }

  try {
    const path = `${new Date().toISOString().slice(0,10)}/${Date.now()}-${fileName}`;
    
    const { error } = await supabase
      .storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: true });

    if (error) throw error;

    // 퍼블릭 URL 획득
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    
    return { 
      publicUrl: data.publicUrl, 
      path,
      fileName: fileName
    };
  } catch (error) {
    throw new Error(`Supabase 업로드 실패: ${error.message}`);
  }
}

/**
 * 이미지 삭제
 * @param {string} path - 이미지 경로
 * @returns {Promise<boolean>} 삭제 성공 여부
 */
export async function deleteFromSupabase(path) {
  if (!supabase) return false;

  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    return !error;
  } catch (error) {
    console.error('이미지 삭제 실패:', error);
    return false;
  }
}
