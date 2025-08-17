import { supabase } from '../config/db.js';

/**
 * GPT 분석 결과를 store_reviews 테이블에 저장
 * @param {Object} data - 저장할 데이터
 * @param {string} data.storeId - 매장 ID (필수)
 * @param {string} data.userId - 사용자 ID (선택)
 * @param {string} data.rawText - OCR 원본 텍스트
 * @param {string} data.cleanedText - 정리된 텍스트
 * @param {Object} data.gptResult - GPT 분석 결과
 * @param {string} data.ocrImageUrl - OCR 이미지 URL (선택)
 * @returns {Object} 저장 결과
 */
export async function saveStoreReview(data) {
  try {
    console.log('💾 store_reviews 테이블에 저장 시작:', {
      storeId: data.storeId,
      rawTextLength: data.rawText?.length,
      gptResult: data.gptResult
    });

    // GPT 결과에서 데이터 추출
    const gptData = data.gptResult[0] || {};
    
    // store_reviews 테이블 구조에 맞게 데이터 변환
    const reviewData = {
      store_id: data.storeId,
      user_id: data.userId || null,
      raw_text: data.rawText,
      cleaned_text: data.cleanedText || data.rawText,
      review_content: gptData.리뷰 || '',
      review_date: gptData.날짜 ? new Date(gptData.날짜) : null,
      sentiment: gptData.감정 || '보통',
      positive_keywords: gptData.장점키워드 || [],
      negative_keywords: gptData.단점키워드 || [],
      summary: gptData.리뷰 || '',
      ocr_image_url: data.ocrImageUrl || null,
      status: 'completed',
      error_message: null
    };

    console.log('📊 변환된 데이터:', reviewData);

    // Supabase에 데이터 삽입
    const { data: result, error } = await supabase
      .from('store_reviews')
      .insert([reviewData])
      .select()
      .single();

    if (error) {
      console.error('❌ store_reviews 저장 실패:', error);
      throw new Error(`DB 저장 실패: ${error.message}`);
    }

    console.log('✅ store_reviews 저장 성공:', result);
    return {
      success: true,
      data: result,
      message: '리뷰 데이터가 성공적으로 저장되었습니다.'
    };

  } catch (error) {
    console.error('❌ saveStoreReview 에러:', error);
    return {
      success: false,
      error: error.message,
      message: '리뷰 데이터 저장에 실패했습니다.'
    };
  }
}

/**
 * store_reviews 테이블에서 리뷰 조회
 * @param {string} storeId - 매장 ID
 * @returns {Object} 조회 결과
 */
export async function getStoreReviews(storeId) {
  try {
    const { data, error } = await supabase
      .from('store_reviews')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`리뷰 조회 실패: ${error.message}`);
    }

    return {
      success: true,
      data: data || [],
      message: '리뷰 조회가 완료되었습니다.'
    };

  } catch (error) {
    console.error('❌ getStoreReviews 에러:', error);
    return {
      success: false,
      error: error.message,
      message: '리뷰 조회에 실패했습니다.'
    };
  }
}
