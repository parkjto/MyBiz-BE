require('dotenv').config();
const supabase = require('./utils/supabaseClient');

(async () => {
  const { data, error } = await supabase.from('ads').select('*');
  if (error) {
    console.error('Supabase 연결 실패:', error.message);
  } else if (!data || data.length === 0) {
    console.log('Supabase 연결 성공, ads 테이블에 데이터가 없습니다.');
  } else {
    console.log('Supabase 연결 성공, ads 테이블 데이터:');
    console.table(data);
  }
})();