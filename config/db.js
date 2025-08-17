// 🎯 Supabase 연결 활성화
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// 🎯 환경 변수 확인
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// 🎯 실제 Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseKey);

console.log('[INFO] Supabase 클라이언트 초기화 완료');
console.log('[INFO] Supabase URL:', supabaseUrl ? '설정됨' : '설정되지 않음');
console.log('[INFO] Supabase Key:', supabaseKey ? '설정됨' : '설정되지 않음');
