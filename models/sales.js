// 🎯 Sales 모델 (향후 확장 예정)
// 현재 Supabase 테이블 구조에 sales 테이블이 정의되지 않음

/**
 * 🎯 Sales 관련 상수 정의
 */
export const SALES_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled'
};

/**
 * 🎯 Sales 타입 정의 (향후 확장)
 */
export const SalesType = {
  id: 'UUID',
  amount: 'number',
  date: 'timestamp',
  user_id: 'UUID',
  status: 'string',
  created_at: 'timestamp',
  updated_at: 'timestamp'
};

/**
 * 🎯 기본 Sales 데이터 생성
 */
export const getDefaultSalesData = (amount, date, userId) => ({
  amount,
  date,
  user_id: userId,
  status: SALES_STATUS.PENDING
});

module.exports = {
  SALES_STATUS,
  SalesType,
  getDefaultSalesData
};
