import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

// 환경변수 확인
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL 환경변수가 설정되지 않았습니다.');
}

if (!supabaseKey) {
  throw new Error('SUPABASE_SERVICE_KEY 환경변수가 설정되지 않았습니다.');
}

console.log('Supabase 연결 정보:', { url: supabaseUrl, key: supabaseKey ? '설정됨' : '설정안됨' });

export const supabase = createClient(supabaseUrl, supabaseKey);
