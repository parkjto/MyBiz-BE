import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // .env 파일의 실제 변수명 사용

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[INFO] Supabase 클라이언트 생성 성공');
  } catch (error) {
    console.warn('[WARN] Supabase 클라이언트 생성 실패:', error.message);
  }
} else {
  console.warn('[WARN] Supabase 환경 변수가 설정되지 않았습니다. Supabase 기능이 비활성화됩니다.');
  console.warn('[WARN] SUPABASE_URL:', supabaseUrl ? '설정됨' : '설정되지 않음');
  console.warn('[WARN] SUPABASE_SERVICE_KEY:', supabaseKey ? '설정됨' : '설정되지 않음');
}

export { supabase };
