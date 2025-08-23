import { parseAndInsertCsv, getMonthlySummary, getCategorySummary, getBestsellers, getHighlights, getProfitability, getSalesByHour, getSalesByWeekday, getWeeklyByMonth, getMonthSummary } from '../services/salesService.js';
import { logger } from '../utils/logger.js';
import { supabase } from '../utils/supabaseClient.js';

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
  
  logger.warn('스토어 조회 실패:', storeError);
  return null;
}

export const uploadCsv = async (req, res, next) => {
  try {
    if (!req.file?.path) {
      return res.status(400).json({ success: false, message: 'CSV 파일이 필요합니다' });
    }
    const userId = req.user?.id || null;
    const result = await parseAndInsertCsv(req.file.path, userId);
    res.json({ success: true, ...result });
  } catch (e) {
    logger.error('CSV 업로드 실패', { message: e.message });
    next(e);
  }
};

export const monthlySummary = async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const userId = req.user?.id || null;
    const userStoreId = await getUserStoreId(userId);
    const data = await getMonthlySummary({ start, end, userStoreId });
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

export const categorySummary = async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const userId = req.user?.id || null;
    const userStoreId = await getUserStoreId(userId);
    const data = await getCategorySummary({ start, end, userStoreId });
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

export const bestsellers = async (req, res, next) => {
  try {
    const { start, end, limit } = req.query;
    const userId = req.user?.id || null;
    const userStoreId = await getUserStoreId(userId);
    const data = await getBestsellers({ start, end, limit: Number(limit) || 10, userStoreId });
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

export const highlights = async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const userId = req.user?.id || null;
    const userStoreId = await getUserStoreId(userId);
    const data = await getHighlights({ start, end, userStoreId });
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

export const profitability = async (req, res, next) => {
  try {
    const { start, end, rate } = req.query;
    const userId = req.user?.id || null;
    const userStoreId = await getUserStoreId(userId);
    const data = await getProfitability({ start, end, userStoreId, profitRate: rate ? Number(rate) : 0.7 });
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

export const salesByHour = async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const userId = req.user?.id || null;
    const userStoreId = await getUserStoreId(userId);
    const data = await getSalesByHour({ start, end, userStoreId });
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

export const salesByWeekday = async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const userId = req.user?.id || null;
    const userStoreId = await getUserStoreId(userId);
    const data = await getSalesByWeekday({ start, end, userStoreId });
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

export const weeklyByMonth = async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!year || !month) return res.status(400).json({ success: false, message: 'year, month가 필요합니다' });
    const userId = req.user?.id || null;
    const userStoreId = await getUserStoreId(userId);
    const data = await getWeeklyByMonth({ year, month, userStoreId });
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

export const monthSummary = async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!year || !month) return res.status(400).json({ success: false, message: 'year, month가 필요합니다' });
    const userId = req.user?.id || null;
    const userStoreId = await getUserStoreId(userId);
    const data = await getMonthSummary({ year, month, userStoreId });
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

export default {
  uploadCsv,
  monthlySummary,
  categorySummary,
  bestsellers
  ,
  highlights,
  profitability,
  salesByHour,
  salesByWeekday
  ,
  weeklyByMonth,
  monthSummary
};
