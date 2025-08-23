import fs from 'fs';
import { supabase } from '../utils/supabaseClient.js';
import { logger } from '../utils/logger.js';
import csv from 'csvtojson';

const BATCH_SIZE = 500;

function ensureSupabase() {
  if (!supabase) {
    const error = new Error('Supabase 클라이언트가 초기화되지 않았습니다. 환경변수를 확인하세요.');
    error.statusCode = 500;
    throw error;
  }
}

function toInteger(value, fallback = 0) {
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function validateDateRange(start, end) {
  if (start) {
    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) {
      throw new Error(`잘못된 시작일 형식: ${start}`);
    }
  }
  
  if (end) {
    const endDate = new Date(end);
    if (Number.isNaN(endDate.getTime())) {
      throw new Error(`잘못된 종료일 형식: ${end}`);
    }
  }
  
  if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (startDate > endDate) {
      throw new Error('시작일이 종료일보다 늦을 수 없습니다');
    }
  }
}

function mapCsvRowToSale(row, userId) {
  const dateRaw = row.sale_date || row.date || row.transaction_date || row.created_at;
  const productName = row.product_name || row.product || row.menu || row.item_name;
  const category = row.category || row.type || row.group || null;
  const quantity = toInteger(row.quantity || row.qty || 1, 1);
  const unitPrice = toInteger(row.unit_price || row.price || 0, 0);
  const totalAmount = toInteger(row.total_amount || row.amount || unitPrice * quantity, 0);

  return {
    order_datetime: normalizeDate(dateRaw),
    product_name: productName || 'Unknown',
    category,
    quantity,
    unit_price: unitPrice,
    total_amount: totalAmount,
    user_store_id: userId || null,
    payment_method: 'cash' // 기본값 설정
  };
}

export async function parseAndInsertCsv(filePath, userId) {
  ensureSupabase();

  // 사용자의 기본 스토어 ID 조회
  let userStoreId = null;
  if (userId) {
    console.log('사용자 ID로 스토어 조회:', userId);
    const { data: stores, error: storeError } = await supabase
      .from('user_stores')
      .select('id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();
    
    console.log('스토어 조회 결과:', { stores, storeError });
    
    if (!storeError && stores) {
      userStoreId = stores.id;
      console.log('사용자 스토어 ID:', userStoreId);
    } else {
      console.log('스토어 조회 실패:', storeError);
    }
  }

  const start = Date.now();
  let processedCount = 0;
  let insertedCount = 0;
  const batch = [];

  try {
    await csv()
      .fromFile(filePath)
      .subscribe(async (json) => {
        const mapped = mapCsvRowToSale(json, userStoreId);
        if (!mapped.order_datetime) return; // 유효하지 않은 날짜는 스킵
        batch.push(mapped);
        processedCount += 1;
        
        if (batch.length >= BATCH_SIZE) {
          const toInsert = batch.splice(0, batch.length);
          const { error, count } = await supabase.from('sales').insert(toInsert, { returning: 'minimal', count: 'exact' });
          if (error) throw error;
          insertedCount += count || toInsert.length;
        }
      });

    if (batch.length > 0) {
      const toInsert = batch.splice(0, batch.length);
      const { error, count } = await supabase.from('sales').insert(toInsert, { returning: 'minimal', count: 'exact' });
      if (error) throw error;
      insertedCount += count || toInsert.length;
    }

    const durationMs = Date.now() - start;
    return { processedCount, insertedCount, durationMs };
  } catch (error) {
    logger.error('CSV 파싱/저장 실패', { message: error.message });
    const err = new Error(`CSV 처리 실패: ${error.message}`);
    err.statusCode = 500;
    throw err;
  } finally {
    try { await fs.promises.unlink(filePath); } catch {}
  }
}

async function getUserStoreId(userId) {
  if (!userId) return null;
  
  const { data: stores, error: storeError } = await supabase
    .from('user_stores')
    .select('id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single();
  
  if (!storeError && stores) {
    return stores.id;
  }
  
  console.log('스토어 조회 실패:', storeError);
  return null;
}

function inRange(d, start, end) {
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return false;
  if (start && t < new Date(start).getTime()) return false;
  if (end && t > new Date(end).getTime()) return false;
  return true;
}

export async function fetchSalesRows({ start, end, userStoreId }) {
  ensureSupabase();

  let query = supabase
    .from('sales')
    .select('order_datetime, product_name, category, quantity, unit_price, total_amount');

  if (start) query = query.gte('order_datetime', start);
  if (end) query = query.lte('order_datetime', end);
  if (userStoreId) query = query.eq('user_store_id', userStoreId);

  const { data, error } = await query;
  if (error) {
    const err = new Error(`매출 데이터 조회 실패: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
  
  console.log('매출 데이터 조회 결과:', { count: data?.length || 0, start, end, userStoreId });
  return data || [];
}

export async function getMonthlySummary({ start, end, userStoreId }) {
  validateDateRange(start, end);
  const rows = await fetchSalesRows({ start, end, userStoreId });
  const byMonth = new Map();
  for (const r of rows) {
    if (!inRange(r.order_datetime, start, end)) continue;
    const d = new Date(r.order_datetime);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const prev = byMonth.get(key) || 0;
    byMonth.set(key, prev + (r.total_amount || 0));
  }
  return Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total }));
}

export async function getCategorySummary({ start, end, userStoreId }) {
  validateDateRange(start, end);
  const rows = await fetchSalesRows({ start, end, userStoreId });
  const byCat = new Map();
  let totalAll = 0;
  for (const r of rows) {
    if (!inRange(r.order_datetime, start, end)) continue;
    const key = r.category || '기타';
    const amt = r.total_amount || 0;
    totalAll += amt;
    byCat.set(key, (byCat.get(key) || 0) + amt);
  }
  return Array.from(byCat.entries())
    .map(([category, total]) => ({ category, total, pct: totalAll ? Math.round((total / totalAll) * 1000) / 10 : 0 }))
    .sort((a, b) => b.total - a.total);
}

export async function getBestsellers({ start, end, limit = 10, userStoreId }) {
  validateDateRange(start, end);
  const rows = await fetchSalesRows({ start, end, userStoreId });
  const byProduct = new Map();
  for (const r of rows) {
    if (!inRange(r.order_datetime, start, end)) continue;
    const key = r.product_name || 'Unknown';
    const amt = r.total_amount || 0;
    byProduct.set(key, (byProduct.get(key) || 0) + amt);
  }
  return Array.from(byProduct.entries())
    .map(([productName, total]) => ({ productName, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export async function getHighlights({ start, end, userStoreId }) {
  validateDateRange(start, end);
  // 월별 합계, 카테고리 비중, 베스트셀러 top3, 최대 성장률 월 구간
  const [monthly, categories, top3] = await Promise.all([
    getMonthlySummary({ start, end, userStoreId }),
    getCategorySummary({ start, end, userStoreId }),
    getBestsellers({ start, end, limit: 3, userStoreId })
  ]);

  let maxGrowth = null; // { fromMonth, toMonth, growthRatePct }
  for (let i = 1; i < monthly.length; i++) {
    const prev = monthly[i - 1];
    const curr = monthly[i];
    if (!prev?.total || prev.total <= 0) continue;
    const rate = ((curr.total - prev.total) / prev.total) * 100;
    if (rate > 0 && (!maxGrowth || rate > maxGrowth.growthRatePct)) {
      maxGrowth = { fromMonth: prev.month, toMonth: curr.month, growthRatePct: Math.round(rate * 10) / 10 };
    }
  }

  // 특정 시즌 아이템 예시: 팥빙수
  const rows = await fetchSalesRows({ start, end, userStoreId });
  let patbingsu = 0;
  for (const r of rows) {
    if (!inRange(r.order_datetime, start, end)) continue;
    if ((r.product_name || '').includes('팥빙수')) patbingsu += r.total_amount || 0;
  }

  const totalRevenue = monthly.reduce((s, m) => s + (m.total || 0), 0);

  return {
    totalRevenue,
    monthly,
    categories,
    top3,
    maxGrowth, // null일 수 있음
    seasonal: { patbingsu }
  };
}

export async function getProfitability({ start, end, userStoreId, profitRate = 0.7 }) {
  validateDateRange(start, end);
  const rows = await fetchSalesRows({ start, end, userStoreId });
  const byProduct = new Map();
  let totalAll = 0;
  for (const r of rows) {
    if (!inRange(r.order_datetime, start, end)) continue;
    const key = r.product_name || 'Unknown';
    const amt = r.total_amount || 0;
    totalAll += amt;
    byProduct.set(key, (byProduct.get(key) || 0) + amt);
  }
  const list = Array.from(byProduct.entries()).map(([productName, revenue]) => ({
    productName,
    revenue,
    estimatedProfit: Math.round(revenue * profitRate),
    contributionPct: totalAll ? Math.round((revenue / totalAll) * 10000) / 100 : 0
  }));
  list.sort((a, b) => b.revenue - a.revenue);
  return { profitRate, totalRevenue: totalAll, items: list };
}

export async function getSalesByHour({ start, end, userStoreId }) {
  validateDateRange(start, end);
  const rows = await fetchSalesRows({ start, end, userStoreId });
  const hours = Array.from({ length: 24 }, () => 0);
  for (const r of rows) {
    if (!inRange(r.order_datetime, start, end)) continue;
    const h = new Date(r.order_datetime).getHours();
    hours[h] += r.total_amount || 0;
  }
  return hours.map((total, hour) => ({ hour, total }));
}

export async function getSalesByWeekday({ start, end, userStoreId }) {
  validateDateRange(start, end);
  const rows = await fetchSalesRows({ start, end, userStoreId });
  const days = Array.from({ length: 7 }, () => 0);
  for (const r of rows) {
    if (!inRange(r.order_datetime, start, end)) continue;
    const d = new Date(r.order_datetime).getDay(); // 0:Sun ~ 6:Sat
    days[d] += r.total_amount || 0;
  }
  const labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return days.map((total, idx) => ({ weekday: labels[idx], total }));
}

function getMonthDateRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // month 0-based; day 0 -> last day prev month
  return { start: start.toISOString(), end: end.toISOString() };
}

function getPrevMonth(year, month) {
  const m0 = month - 1; // 1..12 -> 0..11
  const d = new Date(Date.UTC(year, m0, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return { year: y, month: m };
}

function getWeekIndex(dayOfMonth) {
  const idx = Math.ceil(dayOfMonth / 7);
  return Math.min(Math.max(idx, 1), 6); // 1..6
}

export async function getWeeklyByMonth({ year, month, userStoreId }) {
  const { start, end } = getMonthDateRange(year, month);
  const rows = await fetchSalesRows({ start, end, userStoreId });
  const weeks = Array.from({ length: 6 }, () => 0);
  for (const r of rows) {
    const dt = new Date(r.order_datetime);
    if (!inRange(dt, start, end)) continue;
    const day = dt.getUTCDate();
    const idx = getWeekIndex(day) - 1; // 0-based
    weeks[idx] += r.total_amount || 0;
  }
  const monthTotal = weeks.reduce((s, v) => s + v, 0);

  // previous month summary
  const prev = getPrevMonth(year, month);
  const prevRange = getMonthDateRange(prev.year, prev.month);
  const prevRows = await fetchSalesRows({ start: prevRange.start, end: prevRange.end, userStoreId });
  const prevTotal = prevRows.reduce((s, r) => s + (r.total_amount || 0), 0);
  const mom = prevTotal > 0 ? Math.round(((monthTotal - prevTotal) / prevTotal) * 1000) / 10 : null;

  return {
    year,
    month,
    weeks: weeks.map((total, i) => ({ week: i + 1, total })),
    monthTotal,
    prevMonth: { year: prev.year, month: prev.month, total: prevTotal },
    momChangePct: mom
  };
}

export async function getMonthSummary({ year, month, userStoreId }) {
  const { start, end } = getMonthDateRange(year, month);
  const rows = await fetchSalesRows({ start, end, userStoreId });
  const monthTotal = rows.reduce((s, r) => s + (r.total_amount || 0), 0);
  const prev = getPrevMonth(year, month);
  const prevRange = getMonthDateRange(prev.year, prev.month);
  const prevRows = await fetchSalesRows({ start: prevRange.start, end: prevRange.end, userStoreId });
  const prevTotal = prevRows.reduce((s, r) => s + (r.total_amount || 0), 0);
  const mom = prevTotal > 0 ? Math.round(((monthTotal - prevTotal) / prevTotal) * 1000) / 10 : null;
  return { year, month, monthTotal, prevMonth: { year: prev.year, month: prev.month, total: prevTotal }, momChangePct: mom };
}


