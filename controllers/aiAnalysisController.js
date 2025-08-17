import { analyzeOcrText } from '../services/openaiService.js'
import { aggregate } from '../utils/aggregate.js'
import { sanitizeOcr } from '../utils/sanitize.js'

/**
 * 요청 형태 예시:
 * POST /api/ai-analysis
 * {
 *   "ocrText": "OCR에서 뽑은 긴 텍스트"   // 또는
 *   "reviews": ["리뷰1", "리뷰2"]         // (선택) 직접 리뷰 배열로 줄 수도 있음
 * }
 */
export async function aiAnalyze(req, res) {
  try {
    const { ocrText, reviews } = req.body || {}

    if (!ocrText && !Array.isArray(reviews)) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'ocrText 또는 reviews 배열 필요' })
    }

    // 1) OCR 텍스트 정리 (노이즈 1차 제거)
    const textForModel = Array.isArray(reviews)
      ? reviews.join('\n')
      : sanitizeOcr(String(ocrText || ''))

    // 2) LLM 분석
    const items = await analyzeOcrText(textForModel)

    // 3) 집계
    const { sentimentStats, pros, cons } = aggregate(items)

    // 4) 최근 리뷰 정렬 (날짜 내림차순)
    const recentReviews = items
      .map(r => ({ ...r, _sort: (r.날짜 || '').replace(/[^\d]/g, '') }))
      .sort((a, b) => (b._sort || '').localeCompare(a._sort || ''))
      .slice(0, 10)
      .map(({ _sort, ...rest }) => rest)

    return res.json({
      sentimentStats,
      recentReviews: recentReviews.map(r => ({
        작성자: r.작성자 || '익명',
        날짜: r.날짜 || '',
        리뷰: r.리뷰,
        감정: r.감정
      })),
      pros,
      cons
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'ANALYSIS_FAILED' })
  }
}
