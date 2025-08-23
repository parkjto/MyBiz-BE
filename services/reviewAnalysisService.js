import { supabase } from '../utils/supabaseClient.js';
import { logger } from '../utils/logger.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class ReviewAnalysisService {
  
  /**
   * 리뷰를 GPT로 분석하고 결과를 저장
   * @param {string} reviewId - 분석할 리뷰 ID
   * @param {Object} reviewData - 리뷰 데이터
   * @returns {Object} 분석 결과
   */
  static async analyzeReview(reviewId, reviewData) {
    try {
      logger.info(`[INFO] 리뷰 분석 시작: ${reviewId}`);
      
      // GPT 프롬프트 생성
      const prompt = this.createAnalysisPrompt(reviewData);
      
      // GPT API 호출
      const gptResponse = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: '당신은 한국 소상공인 경영 도우미입니다. 고객 리뷰를 분석하여 요약, 감정 분석, 키워드를 추출해주세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'gpt-4o',
        temperature: 0.3
      });

      // GPT 응답 파싱
      const analysisResult = this.parseGptResponse(gptResponse.choices[0].message.content);
      
      // 분석 결과를 review_analysis 테이블에 저장
      const savedAnalysis = await this.saveAnalysisResult(reviewId, analysisResult);
      
      logger.info(`[INFO] 리뷰 분석 완료: ${reviewId}`);
      
      return {
        success: true,
        reviewId: reviewId,
        analysis: savedAnalysis,
        message: '리뷰 분석 완료'
      };

    } catch (error) {
      logger.error('[ERROR] 리뷰 분석 실패:', error.message);
      throw error;
    }
  }

  /**
   * GPT 분석용 프롬프트 생성
   * @param {Object} reviewData - 리뷰 데이터
   * @returns {string} GPT 프롬프트
   */
  static createAnalysisPrompt(reviewData) {
    return `
다음 네이버 리뷰를 분석해주세요:

**리뷰 내용:**
${reviewData.review_content}

**작성자:** ${reviewData.author_nickname}
**방문일:** ${reviewData.review_date}
**평점:** ${reviewData.rating || '평점 없음'}
**태그:** ${reviewData.extra_metadata?.tag || '태그 없음'}

다음 JSON 형식으로 응답해주세요:
{
  "summary": "리뷰 내용을 2-3문장으로 요약",
  "sentiment": "긍정/부정/중립 중 하나",
  "positive_keywords": ["긍정적인 키워드1", "긍정적인 키워드2"],
  "negative_keywords": ["부정적인 키워드1", "부정적인 키워드2"]
}

주의사항:
- summary는 한국어로 작성
- sentiment는 "긍정", "부정", "중립" 중 하나만 선택
- positive_keywords와 negative_keywords는 배열 형태로 제공
- 키워드는 2-4개 정도로 제한
- 부정적인 키워드가 없으면 빈 배열로 제공
`;
  }

  /**
   * GPT 응답 파싱
   * @param {string} gptResponse - GPT 응답 텍스트
   * @returns {Object} 파싱된 분석 결과
   */
  static parseGptResponse(gptResponse) {
    try {
      // JSON 부분 추출
      const jsonMatch = gptResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('GPT 응답에서 JSON을 찾을 수 없습니다');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // 필수 필드 검증
      const requiredFields = ['summary', 'sentiment', 'positive_keywords', 'negative_keywords'];
      for (const field of requiredFields) {
        if (!parsed[field]) {
          throw new Error(`필수 필드 누락: ${field}`);
        }
      }

      // sentiment 값 검증
      const validSentiments = ['긍정', '부정', '중립'];
      if (!validSentiments.includes(parsed.sentiment)) {
        parsed.sentiment = '중립'; // 기본값 설정
      }

      // 키워드 배열 검증
      if (!Array.isArray(parsed.positive_keywords)) {
        parsed.positive_keywords = [];
      }
      if (!Array.isArray(parsed.negative_keywords)) {
        parsed.negative_keywords = [];
      }

      return parsed;

    } catch (error) {
      logger.warn('[WARN] GPT 응답 파싱 실패, 기본값 사용:', error.message);
      
      // 기본값 반환
      return {
        summary: '리뷰 내용 분석에 실패했습니다',
        sentiment: '중립',
        positive_keywords: [],
        negative_keywords: []
      };
    }
  }

  /**
   * 분석 결과를 review_analysis 테이블에 저장
   * @param {string} reviewId - 리뷰 ID
   * @param {Object} analysisResult - 분석 결과
   * @returns {Object} 저장된 분석 결과
   */
  static async saveAnalysisResult(reviewId, analysisResult) {
    try {
      const analysisRecord = {
        review_id: reviewId,
        summary: analysisResult.summary,
        sentiment: analysisResult.sentiment,
        positive_keywords: analysisResult.positive_keywords,
        negative_keywords: analysisResult.negative_keywords
      };

      // 기존 분석 결과가 있는지 확인
      const { data: existingAnalysis } = await supabase
        .from('review_analysis')
        .select('id')
        .eq('review_id', reviewId)
        .single();

      let result;
      
      if (existingAnalysis) {
        // 기존 분석 결과 업데이트
        const { data, error } = await supabase
          .from('review_analysis')
          .update(analysisRecord)
          .eq('review_id', reviewId)
          .select('*')
          .single();

        if (error) throw error;
        result = data;
        logger.info('[INFO] 기존 분석 결과 업데이트 완료');
      } else {
        // 새로운 분석 결과 저장
        const { data, error } = await supabase
          .from('review_analysis')
          .insert(analysisRecord)
          .select('*')
          .single();

        if (error) throw error;
        result = data;
        logger.info('[INFO] 새로운 분석 결과 저장 완료');
      }

      return result;

    } catch (error) {
      logger.error('[ERROR] 분석 결과 저장 실패:', error.message);
      throw new Error(`분석 결과 저장 실패: ${error.message}`);
    }
  }

  /**
   * 일괄 리뷰 분석
   * @param {Array} reviewIds - 분석할 리뷰 ID 배열
   * @returns {Object} 일괄 분석 결과
   */
  static async batchAnalyzeReviews(reviewIds) {
    try {
      logger.info(`[INFO] 일괄 리뷰 분석 시작: ${reviewIds.length}개`);
      
      const results = [];
      const errors = [];
      
      for (const reviewId of reviewIds) {
        try {
          // 리뷰 데이터 조회
          const reviewData = await this.getReviewData(reviewId);
          if (!reviewData) {
            errors.push({ reviewId, error: '리뷰 데이터를 찾을 수 없습니다' });
            continue;
          }

          // 리뷰 분석
          const analysisResult = await this.analyzeReview(reviewId, reviewData);
          results.push(analysisResult);
          
          // API 호출 간격 조절
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          errors.push({ reviewId, error: error.message });
        }
      }

      logger.info(`[INFO] 일괄 분석 완료: 성공 ${results.length}개, 실패 ${errors.length}개`);
      
      return {
        success: true,
        totalCount: reviewIds.length,
        successCount: results.length,
        errorCount: errors.length,
        results: results,
        errors: errors
      };

    } catch (error) {
      logger.error('[ERROR] 일괄 리뷰 분석 실패:', error.message);
      throw error;
    }
  }

  /**
   * 리뷰 데이터 조회
   * @param {string} reviewId - 리뷰 ID
   * @returns {Object|null} 리뷰 데이터
   */
  static async getReviewData(reviewId) {
    try {
      const { data, error } = await supabase
        .from('naver_reviews')
        .select('*')
        .eq('id', reviewId)
        .single();

      if (error) {
        logger.warn(`[WARN] 리뷰 데이터 조회 실패: ${reviewId}`, error.message);
        return null;
      }

      return data;
    } catch (error) {
      logger.warn(`[WARN] 리뷰 데이터 조회 중 오류: ${reviewId}`, error.message);
      return null;
    }
  }

  /**
   * 분석 결과 조회
   * @param {string} reviewId - 리뷰 ID
   * @returns {Object|null} 분석 결과
   */
  static async getAnalysisResult(reviewId) {
    try {
      const { data, error } = await supabase
        .from('review_analysis')
        .select('*')
        .eq('review_id', reviewId)
        .single();

      if (error) {
        logger.warn(`[WARN] 분석 결과 조회 실패: ${reviewId}`, error.message);
        return null;
      }

      return data;
    } catch (error) {
      logger.warn(`[WARN] 분석 결과 조회 중 오류: ${reviewId}`, error.message);
      return null;
    }
  }

  /**
   * 특정 스토어의 모든 분석 결과 조회
   * @param {string} userStoreId - 사용자 스토어 ID
   * @param {number} limit - 조회할 결과 수
   * @param {number} offset - 오프셋
   * @returns {Array} 분석 결과 배열
   */
  static async getStoreAnalysisResults(userStoreId, limit = 50, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('review_analysis')
        .select(`
          *,
          naver_reviews!inner(user_store_id)
        `)
        .eq('naver_reviews.user_store_id', userStoreId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('[ERROR] 스토어 분석 결과 조회 실패:', error);
        throw new Error(`분석 결과 조회 실패: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('[ERROR] 스토어 분석 결과 조회 중 오류:', error.message);
      throw error;
    }
  }
}

// analyzeAndSave 함수 추가 (컨트롤러에서 사용)
export async function analyzeAndSave(reviewId) {
  try {
    // 리뷰 데이터 조회
    const reviewData = await ReviewAnalysisService.getReviewData(reviewId);
    if (!reviewData) {
      throw new Error('리뷰 데이터를 찾을 수 없습니다');
    }

    // 리뷰 분석 실행
    const result = await ReviewAnalysisService.analyzeReview(reviewId, reviewData);
    return result;
  } catch (error) {
    logger.error('[ERROR] analyzeAndSave 실패:', error.message);
    throw error;
  }
}

