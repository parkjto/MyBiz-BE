import { analyzeReviewText } from '../services/openaiService.js'
import { aggregate } from '../utils/aggregate.js'
import { sanitizeOcr } from '../utils/sanitize.js'

/**
 * 🎯 AI 분석 컨트롤러
 * 
 * 입력 형식:
 *   "reviews": [{"리뷰": "리뷰 내용"}]  // 또는
 *   "reviewText": "리뷰에서 뽑은 긴 텍스트"   // 또는
 */
export const analyzeReviews = async (req, res) => {
  try {
    const { reviewText, reviews } = req.body || {}

    if (!reviewText && !Array.isArray(reviews)) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'reviewText 또는 reviews 배열 필요' })
    }

    // 1) 리뷰 텍스트 정리 (노이즈 1차 제거)
    const textForModel = Array.isArray(reviews) 
      ? reviews.map(r => r.리뷰 || r.review || '').join('\n')
      : sanitizeOcr(String(reviewText || ''))

    // 2) LLM 분석
    const items = await analyzeReviewText(textForModel)

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
