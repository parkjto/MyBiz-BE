const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 일반 사용자용 클라이언트 (RLS 적용)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 서비스 역할용 클라이언트 (RLS 우회)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

module.exports = { supabase, supabaseAdmin };
