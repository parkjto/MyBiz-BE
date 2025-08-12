const axios = require('axios');

/**
 * KoBERT 감정 분석 마이크로서비스 호출 래퍼
 * 기본값: SENTIMENT_API_URL 환경변수 (예: http://localhost:8000/sentiment)
 */
class SentimentService {
  constructor() {
    this.endpoint = process.env.SENTIMENT_API_URL || 'http://localhost:8000/sentiment';
    this.isAvailable = false;
    
    // 마이크로서비스 연결 테스트
    this.testConnection();
  }

  /**
   * 마이크로서비스 연결 테스트
   */
  async testConnection() {
    try {
      await axios.get(this.endpoint.replace('/sentiment', '/health'), { timeout: 2000 });
      this.isAvailable = true;
      console.log('[Sentiment] KoBERT 마이크로서비스 연결 성공');
    } catch (error) {
      console.log('[Sentiment] KoBERT 마이크로서비스 연결 실패 - Fallback 모드 활성화');
      this.isAvailable = false;
    }
  }

  /**
   * 텍스트 감정 분석
   * @param {string} text
   * @returns {Promise<Array<{label: string, score: number}>>}
   */
  async analyze(text) {
    if (!text || text.trim().length === 0) return [];
    
    if (this.isAvailable) {
      try {
        const { data } = await axios.post(this.endpoint, { text }, { timeout: 5000 });
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.log('[Sentiment] API 호출 실패, Fallback 모드로 전환:', err.message);
        return this.generateFallbackSentiment(text);
      }
    } else {
      // Fallback 모드: 기본 감정 분석
      return this.generateFallbackSentiment(text);
    }
  }

  /**
   * Fallback 감정 분석 (마이크로서비스 없이)
   * @param {string} text
   * @returns {Array<{label: string, score: number}>}
   */
  generateFallbackSentiment(text) {
    // 간단한 키워드 기반 감정 분석
    const positiveWords = ['좋', '만족', '친절', '깔끔', '깨끗', '맛있', '편리', '빠르', '정확'];
    const negativeWords = ['나쁘', '불만', '불친절', '더럽', '느리', '불편', '잘못', '실수'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveScore += 0.3;
    });
    
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeScore += 0.3;
    });
    
    // 기본값: 중립
    if (positiveScore === 0 && negativeScore === 0) {
      return [
        { label: 'NEUTRAL', score: 0.8 },
        { label: 'POSITIVE', score: 0.1 },
        { label: 'NEGATIVE', score: 0.1 }
      ];
    }
    
    // 점수 정규화
    const total = positiveScore + negativeScore;
    const normalizedPositive = positiveScore / total;
    const normalizedNegative = negativeScore / total;
    const neutral = 1 - normalizedPositive - normalizedNegative;
    
    return [
      { label: 'POSITIVE', score: Math.min(normalizedPositive, 0.9) },
      { label: 'NEGATIVE', score: Math.min(normalizedNegative, 0.9) },
      { label: 'NEUTRAL', score: Math.max(neutral, 0.1) }
    ].sort((a, b) => b.score - a.score);
  }
}

module.exports = new SentimentService();


