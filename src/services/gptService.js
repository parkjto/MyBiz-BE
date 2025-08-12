const OpenAI = require('openai');

class GptService {
  constructor() {
    this.isAvailable = false;
    this.client = null;
    
    try {
      if (process.env.OPENAI_API_KEY) {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.isAvailable = true;
        console.log('[GPT] OpenAI API 설정 완료');
      } else {
        console.log('[GPT] OPENAI_API_KEY 미설정 - Fallback 모드 활성화');
      }
    } catch (error) {
      console.log('[GPT] OpenAI 초기화 실패 - Fallback 모드 활성화');
    }
  }

  /**
   * 텍스트 요약 및 키워드 추출
   * @param {string} text
   * @returns {Promise<{summary: string, keywords: string[]}>}
   */
  async summarize(text) {
    if (!text || text.trim().length === 0) return { summary: '', keywords: [] };

    // OpenAI API가 사용 불가능한 경우 기본 요약 제공
    if (!this.isAvailable || !this.client) {
      return this.generateFallbackSummary(text);
    }

    const prompt = [
      {
        role: 'system',
        content: '당신은 한국어 텍스트를 간결히 요약하고 핵심 키워드를 추출하는 전문가입니다.'
      },
      {
        role: 'user',
        content:
          '아래 텍스트를 50자 내외로 한국어 요약하고, 연관 키워드 3개를 한국어 단어만 배열로 주세요. JSON만 주세요.\n\n' +
          text.slice(0, 6000)
      }
    ];

    try {
      const tokenRes = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: prompt,
        temperature: 0.2,
        max_tokens: 1,
        stream: false
      });
      const promptTokens = tokenRes.usage?.prompt_tokens || 1024;
      const maxTokens = Math.ceil(promptTokens * 0.25); // concise

      const res = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: prompt,
        temperature: 0.2,
        max_tokens: maxTokens
      });
      const content = res.choices?.[0]?.message?.content || '';

      // Try parse JSON fallback
      try {
        const parsed = JSON.parse(content);
        return {
          summary: parsed.summary || parsed.요약 || '',
          keywords: parsed.keywords || parsed.키워드 || []
        };
      } catch (_e) {
        return { summary: content.trim().slice(0, 80), keywords: [] };
      }
    } catch (err) {
      console.log('[GPT] OpenAI API 호출 실패, Fallback 모드로 전환:', err.message);
      return this.generateFallbackSummary(text);
    }
  }

  /**
   * Fallback 요약 생성 (OpenAI 없이)
   * @param {string} text
   * @returns {{summary: string, keywords: string[]}}
   */
  generateFallbackSummary(text) {
    // 간단한 텍스트 분석으로 기본 요약 생성
    const sentences = text.split(/[.!?。！？]/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 1);
    
    // 자주 등장하는 단어 추출 (간단한 키워드)
    const wordCount = {};
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w가-힣]/g, '');
      if (cleanWord.length > 1) {
        wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
      }
    });
    
    const topKeywords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([word]) => word);

    // 첫 번째 문장을 요약으로 사용
    const summary = sentences[0] ? sentences[0].trim().slice(0, 50) + '...' : '텍스트 분석 완료';

    return {
      summary,
      keywords: topKeywords
    };
  }
}

module.exports = new GptService();


