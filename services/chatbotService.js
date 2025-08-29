import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { supabase } from '../utils/supabaseClient.js';
import { transcribeAudio } from './speechRecognitionService.js';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL_TEXT = process.env.OPENAI_MODEL_TEXT || 'gpt-3.5-turbo';

/**
 * 의도 분류 함수 (규칙 기반)
 */
function classifyIntent(text) {
  const lowerText = text.toLowerCase();
  
  // 매출 관련 명령
  if (/(매출.*분석|매출.*보여|매출.*확인|매출.*조회|매출.*상황)/.test(lowerText)) {
    return { intent: 'sales_analysis', screen: 'sales', priority: 'high' };
  }
  
  // 리뷰 관련 명령
  if (/(리뷰.*분석|리뷰.*보여|리뷰.*확인|리뷰.*조회|리뷰.*상황)/.test(lowerText)) {
    return { intent: 'review_analysis', screen: 'review', priority: 'high' };
  }
  
  // 매출 개선 방안
  if (/(매출.*올리|매출.*증가|매출.*개선|어떻게.*해야|방법.*알려|조언.*해줘)/.test(lowerText)) {
    return { intent: 'improvement_suggestion', screen: 'chat', priority: 'medium' };
  }
  
  // 광고 생성
  if (/(광고.*만들|포스터.*만들|홍보.*물|광고.*생성)/.test(lowerText)) {
    return { intent: 'ad_generation', screen: 'ad', priority: 'medium' };
  }
  
  // 스토어 정보
  if (/(매장.*정보|스토어.*정보|가게.*정보|위치.*알려)/.test(lowerText)) {
    return { intent: 'store_info', screen: 'store', priority: 'low' };
  }
  
  // 일반 대화
  if (/(안녕|반가워|고마워|도움|질문)/.test(lowerText)) {
    return { intent: 'general_chat', screen: null, priority: 'low' };
  }
  
  return { intent: 'unknown', screen: null, priority: 'low' };
}

/**
 * 매출 데이터 조회
 */
async function getSalesData(userId) {
  try {
      const { data, error } = await supabase
    .from('sales_user_view')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString())
    .order('created_at', { ascending: false });
    
    if (error) {
      logger.error('매출 데이터 조회 실패(supabase):', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        userId
      });
      throw error;
    }
    
    return analyzeSalesData(data || []);
  } catch (error) {
    logger.error('매출 데이터 조회 실패(catch):', { message: error?.message, stack: error?.stack });
    throw new Error('매출 데이터를 가져올 수 없습니다.');
  }
}

/**
 * 매출 데이터 분석
 */
function analyzeSalesData(salesData) {
  if (!salesData || salesData.length === 0) {
    return {
      total_sales: 0,
      average_daily: 0,
      trend: 'no_data',
      message: '최근 30일간 매출 데이터가 없습니다.',
      data_count: 0,
      wow_change_pct: null,
      best_day: null,
      worst_day: null,
      weekday_breakdown: [],
      recent_samples: []
    };
  }

  const toDateStr = (ts) => new Date(ts).toISOString().slice(0, 10);
  const weekdays = ['일','월','화','수','목','금','토'];

  const totalSales = salesData.reduce((sum, sale) => sum + (Number(sale.amount) || 0), 0);
  const averageDaily = totalSales / salesData.length;

  // 최근 7일 vs 이전 7일 (정렬: 최신이 앞)
  const recent7 = salesData.slice(0, 7);
  const older7 = salesData.slice(7, 14);
  const recent7Sum = recent7.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const older7Sum = older7.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const wowChangePct = older7Sum > 0 ? Math.round(((recent7Sum - older7Sum) / older7Sum) * 1000) / 10 : null;

  // 일자별 합계
  const byDayMap = new Map();
  for (const row of salesData) {
    const d = toDateStr(row.created_at);
    const amt = Number(row.amount) || 0;
    byDayMap.set(d, (byDayMap.get(d) || 0) + amt);
  }
  const byDay = Array.from(byDayMap.entries()).map(([date, amount]) => ({ date, amount }));
  byDay.sort((a, b) => b.amount - a.amount);
  const bestDay = byDay[0];
  const worstDay = byDay[byDay.length - 1];

  // 요일별 합계
  const weekdayAgg = new Array(7).fill(0);
  for (const row of salesData) {
    const day = new Date(row.created_at).getDay();
    weekdayAgg[day] += Number(row.amount) || 0;
  }
  const weekday_breakdown = weekdayAgg.map((total, idx) => ({ weekday: weekdays[idx], total }));
  weekday_breakdown.sort((a, b) => b.total - a.total);

  // 최근 샘플 7개 (날짜 단위 집계 후 최신 순)
  const recentSamples = Array.from(new Map(byDayMap).entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 7)
    .map(([date, amount]) => ({ date, amount }));

  // 트렌드 라벨
  let trend = 'stable';
  if (wowChangePct !== null) {
    if (wowChangePct > 10) trend = 'increasing';
    else if (wowChangePct < -10) trend = 'decreasing';
  }

  const messageParts = [
    `최근 30일 총 ${totalSales.toLocaleString()}원 · 일평균 ${Math.round(averageDaily).toLocaleString()}원`,
    wowChangePct === null ? '전주 대비 변화율 산출 불가' : `전주 대비 ${wowChangePct > 0 ? '+' : ''}${wowChangePct}%`,
    bestDay ? `최고 일 매출 ${bestDay.date} · ${bestDay.amount.toLocaleString()}원` : null,
    worstDay ? `최저 일 매출 ${worstDay.date} · ${worstDay.amount.toLocaleString()}원` : null
  ].filter(Boolean);

  return {
    total_sales: totalSales,
    average_daily: Math.round(averageDaily),
    trend,
    data_count: salesData.length,
    wow_change_pct: wowChangePct,
    best_day: bestDay || null,
    worst_day: worstDay || null,
    weekday_breakdown,
    recent_samples: recentSamples,
    message: messageParts.join(' · ')
  };
}

/**
 * 리뷰 데이터 조회
 */
async function getReviewData(userId) {
  try {
      const { data, error } = await supabase
    .from('reviews_user_view')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
    
    if (error) {
      logger.error('리뷰 데이터 조회 실패(supabase):', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        userId
      });
      throw error;
    }
    
    return analyzeReviewData(data || []);
  } catch (error) {
    logger.error('리뷰 데이터 조회 실패(catch):', { message: error?.message, stack: error?.stack });
    throw new Error('리뷰 데이터를 가져올 수 없습니다.');
  }
}

/**
 * 리뷰 데이터 분석
 */
function analyzeReviewData(reviewData) {
  if (!reviewData || reviewData.length === 0) {
    return {
      total_reviews: 0,
      average_rating: 0,
      sentiment: 'neutral',
      message: '리뷰 데이터가 없습니다.',
      rating_counts: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      latest_review_at: null,
      recent_samples: []
    };
  }

  const totalReviews = reviewData.length;
  const avg = reviewData.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / totalReviews;
  const averageRating = Math.round(avg * 10) / 10;

  const ratingCounts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const r of reviewData) {
    const val = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 0)));
    ratingCounts[val] += 1;
  }

  // 최근 7개 평균
  const recent7 = reviewData.slice(0, 7);
  const recent7AvgRaw = recent7.length ? recent7.reduce((s, r) => s + (Number(r.rating) || 0), 0) / recent7.length : null;
  const recent7Avg = recent7AvgRaw !== null ? Math.round(recent7AvgRaw * 10) / 10 : null;

  // 최신 리뷰 시각
  const latest = reviewData.reduce((max, r) => {
    const t = new Date(r.created_at).getTime();
    return t > max ? t : max;
  }, 0);
  const latest_review_at = latest ? new Date(latest).toISOString() : null;

  // 최근 샘플 5개
  const recentSamples = reviewData.slice(0, 5).map(r => ({ date: new Date(r.created_at).toISOString().slice(0,10), rating: Number(r.rating) || 0 }));

  // 감정 레이블
  let sentiment = 'neutral';
  if (averageRating >= 4.5) sentiment = 'positive';
  else if (averageRating <= 2.5) sentiment = 'negative';

  const messageParts = [
    `총 ${totalReviews}개 · 평균 ${averageRating}점`,
    `최근 7개 평균 ${recent7Avg !== null ? recent7Avg : 'N/A'}점`,
    `평점 분포 5★:${ratingCounts['5']} 4★:${ratingCounts['4']} 3★:${ratingCounts['3']} 2★:${ratingCounts['2']} 1★:${ratingCounts['1']}`
  ];

  return {
    total_reviews: totalReviews,
    average_rating: averageRating,
    sentiment,
    rating_counts: ratingCounts,
    latest_review_at,
    recent_samples: recentSamples,
    message: messageParts.join(' · ')
  };
}

/**
 * AI 개선 방안 생성
 */
async function generateAIAdvice(userId, userQuery) {
  try {
    const salesData = await getSalesData(userId);
    const reviewData = await getReviewData(userId);
    
    const prompt = `
사용자 질문: "${userQuery}"

매출 데이터: ${JSON.stringify(salesData)}
리뷰 데이터: ${JSON.stringify(reviewData)}

위 데이터를 바탕으로 소상공인을 위한 구체적인 매출 개선 방안 3가지를 제시해주세요.
각 방안은 실행 가능하고 구체적이어야 합니다.
한국어로 답변해주세요.
`;

    const response = await client.chat.completions.create({
      model: MODEL_TEXT,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    logger.error('AI 조언 생성 실패:', error);
    return '죄송합니다. AI 조언을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.';
  }
}

/**
 * 일반 대화 응답 생성
 */
async function generateGeneralResponse(userQuery) {
  try {
    const prompt = `
사용자: "${userQuery}"

당신은 소상공인을 돕는 친근하고 전문적인 AI 어시스턴트입니다.
사용자의 질문에 대해 도움이 되는 답변을 한국어로 제공해주세요.
`;

    const response = await client.chat.completions.create({
      model: MODEL_TEXT,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    logger.error('일반 응답 생성 실패:', error);
    return '안녕하세요! 무엇을 도와드릴까요?';
  }
}

/**
 * 메인 챗봇 처리 함수
 */
export async function processChatMessage(text, userId) {
  try {
    logger.info('챗봇 메시지 처리 시작:', { text, userId });
    
    // 의도 분류
    const intent = classifyIntent(text);
    logger.info('의도 분류 결과:', intent);
    
    let response = {
      type: 'response',
      intent: intent.intent,
      screen: intent.screen,
      priority: intent.priority,
      message: '',
      data: null
    };
    
    // 의도별 처리
    switch (intent.intent) {
      case 'sales_analysis':
        const salesData = await getSalesData(userId);
        response.type = 'navigation';
        response.data = salesData;
        response.message = `매출 분석 화면으로 이동합니다. ${salesData.message}`;
        break;
        
      case 'review_analysis':
        const reviewData = await getReviewData(userId);
        response.type = 'navigation';
        response.data = reviewData;
        response.message = `리뷰 분석 화면으로 이동합니다. ${reviewData.message}`;
        break;
        
      case 'improvement_suggestion':
        const advice = await generateAIAdvice(userId, text);
        response.message = advice;
        break;
        
      case 'ad_generation':
        response.type = 'navigation';
        response.screen = 'ad';
        response.message = '광고 생성 화면으로 이동합니다.';
        break;
        
      case 'store_info':
        response.type = 'navigation';
        response.screen = 'store';
        response.message = '스토어 정보 화면으로 이동합니다.';
        break;
        
      case 'general_chat':
        const generalResponse = await generateGeneralResponse(text);
        response.message = generalResponse;
        break;
        
      default:
        response.message = '죄송합니다. 요청을 이해하지 못했습니다. 다른 방식으로 말씀해주세요.';
    }
    
    logger.info('챗봇 응답 생성 완료:', response);
    return response;
    
  } catch (error) {
    logger.error('챗봇 메시지 처리 실패:', error);
    return {
      type: 'error',
      message: '죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      error: error.message
    };
  }
}

/**
 * 음성 명령 처리 (텍스트 변환 후 처리)
 */
export async function processVoiceCommand(audioBuffer, userId) {
  try {
    logger.info('음성 명령 처리 시작:', { userId, audioSize: audioBuffer.length });
    
    // 1단계: 음성을 텍스트로 변환
    const transcribedText = await transcribeAudio(audioBuffer, 'ko-KR');
    logger.info('음성 인식 결과:', transcribedText);
    
    // 2단계: 인식된 텍스트를 챗봇으로 처리
    const response = await processChatMessage(transcribedText, userId);
    
    // 3단계: 음성 인식 결과를 포함하여 응답
    return {
      ...response,
      original_audio_size: audioBuffer.length,
      transcribed_text: transcribedText,
      source: 'voice'
    };
    
  } catch (error) {
    logger.error('음성 명령 처리 실패:', error);
    return {
      type: 'error',
      message: '음성 인식에 실패했습니다. 다시 시도해주세요.',
      error: error.message
    };
  }
}
