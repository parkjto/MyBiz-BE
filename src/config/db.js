const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env' });

let supabase = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  try {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  } catch (error) {
    console.warn('Supabase 클라이언트 생성 실패:', error.message);
  }
} else {
  console.warn('Supabase 환경 변수가 설정되지 않았습니다. Supabase 기능이 비활성화됩니다.');
}

module.exports = supabase;
