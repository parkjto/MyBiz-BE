import { supabase } from '../utils/supabaseClient.js';
// import { encrypt, decrypt } from '../utils/encryption.js';

export const saveNaverSession = async (userStoreId, cookies) => {
  try {
    // const encryptedCookies = encrypt(JSON.stringify(cookies));
    
    const { data, error } = await supabase
      .from('naver_sessions')
      .upsert({
        user_store_id: userStoreId,
        encrypted_cookies: JSON.stringify(cookies), // text 컬럼에 원본 텍스트 저장
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_store_id'
      });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('네이버 세션 저장 실패:', error);
    throw error;
  }
};

export const getNaverSession = async (userStoreId) => {
  try {
    const { data, error } = await supabase
      .from('naver_sessions')
      .select('encrypted_cookies')
      .eq('user_store_id', userStoreId)
      .single();

    if (error) {
      // PGRST116: 0행 또는 다중행 - 세션 없음으로 간주하고 로그인 유도
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    if (!data) return null;

    // return JSON.parse(decrypt(data.encrypted_cookies));
    return JSON.parse(data.encrypted_cookies); // text 컬럼에서 직접 반환
  } catch (error) {
    console.error('네이버 세션 조회 실패:', error);
    return null; // 조회 실패 시에도 새 로그인 플로우로 진행
  }
};

