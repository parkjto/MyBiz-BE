import { supabase } from './supabaseService.js';
import { encrypt, decrypt } from '../utils/encryption.js';

// ERD 변경: user_store_id 기준으로 세션 저장/조회
export const saveNaverSession = async (userStoreId, sessionData) => {
  const encrypted = encrypt(JSON.stringify(sessionData.cookies));
  const expiresAt = sessionData.expiresAt || new Date(Date.now()+24*3600*1000).toISOString();
  
  // 기존 세션이 있으면 삭제 후 새로 생성
  await supabase.from('naver_sessions').delete().eq('user_store_id', userStoreId);
  
  const { error } = await supabase.from('naver_sessions').insert([
    {
      user_store_id: userStoreId,
      encrypted_cookies: encrypted,
      expires_at: expiresAt
    }
  ]);
  if (error) throw error;
};

export const getNaverSession = async (userStoreId) => {
  const { data, error } = await supabase
    .from('naver_sessions')
    .select('*')
    .eq('user_store_id', userStoreId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;
  data.cookies = JSON.parse(decrypt(data.encrypted_cookies));
  return data;
};

