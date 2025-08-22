export function assertRequiredEnv() {
  const required = ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'ENCRYPTION_KEY'];
  const missing = required.filter(k => !process.env[k] || String(process.env[k]).trim().length === 0);
  if (missing.length) {
    throw new Error(`환경변수 누락: ${missing.join(', ')}`);
  }
}

