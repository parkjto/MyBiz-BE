require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.warn('Supabase 클라이언트 생성 실패:', error.message);
  }
} else {
  console.warn('Supabase 환경 변수가 설정되지 않았습니다. Supabase 기능이 비활성화됩니다.');
}

module.exports = supabase; 