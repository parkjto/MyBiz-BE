import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai'
import { z } from 'zod'

// 🎯 환경 변수 확인 및 로깅
console.log('OpenAI API Key 설정 상태:', process.env.OPENAI_API_KEY ? '설정됨' : '설정되지 않음');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// 모델이 반드시 이 스키마로 JSON을 내놓게 강제
export const ReviewItemSchema = z.object({
  작성자: z.string().nullable().optional(),
  날짜: z.string().nullable().optional(), // "YYYY.MM.DD" or 유사 포맷
  리뷰: z.string(),
  감정: z.enum(['긍정', '부정', '보통']),
  장점키워드: z.array(z.string()).max(5).optional().default([]),
  단점키워드: z.array(z.string()).max(5).optional().default([])
})

export const ReviewArraySchema = z.array(ReviewItemSchema)

function buildPrompt(ocrText) {
  return `
너는 한국어 리뷰 정리기다. 아래 OCR 텍스트에서 "실제 리뷰"만 남기고 노이즈(배너, 메뉴, 가격표, 영수증 숫자열, '답글 쓰기' 등)를 제거하라.
반드시 아래 JSON 배열만 출력하라. 설명/마크다운 금지.

[
  {
    "작성자": "문자열(모르면 null)",
    "날짜": "YYYY.MM.DD 혹은 YYYY.M.D (모르면 null)",
    "리뷰": "리뷰 본문(최대 200자 요약)",
    "감정": "긍정|부정|보통",
    "장점키워드": ["최대 5개"],
    "단점키워드": ["최대 5개"]
  }
]

판단 가이드:
- 중복문장은 1회만 유지.
- 근거 없으면 감정은 "보통".
- 키워드는 명사/형용사 위주로 간결히.

OCR:
${ocrText}
  `.trim()
}

async function askJSON(prompt) {
  try {
    console.log('🚀 GPT API 호출 시작...');
    
    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
    
    console.log('✅ GPT API 응답 수신:', {
      model: resp.model,
      usage: resp.usage,
      finishReason: resp.choices?.[0]?.finish_reason
    });
    
    // 원본 응답 내용 확인
    let raw = resp.choices?.[0]?.message?.content ?? '{}'
    console.log('📥 원본 GPT 응답:', raw);
    
    try {
      const obj = JSON.parse(raw)
      console.log('🔍 파싱된 JSON 객체:', {
        type: typeof obj,
        isArray: Array.isArray(obj),
        keys: Object.keys(obj),
        hasData: !!obj.data,
        hasResult: !!obj.result,
        hasReviews: !!obj.reviews,
        hasItems: !!obj.items
      });
      
      // 배열로 직접 내도록 유도했지만, 혹시 래핑되면 값만 꺼냄
      let arr = obj;
      if (Array.isArray(obj)) {
        arr = obj;
      } else if (obj.data && Array.isArray(obj.data)) {
        arr = obj.data;
      } else if (obj.result && Array.isArray(obj.result)) {
        arr = obj.result;
      } else if (obj.reviews && Array.isArray(obj.reviews)) {
        arr = obj.reviews;
      } else if (obj.items && Array.isArray(obj.items)) {
        arr = obj.items;
      } else {
        // 객체를 배열로 변환 시도
        arr = [obj];
      }
      
      console.log('📊 최종 배열 결과:', {
        isArray: Array.isArray(arr),
        length: arr?.length,
        sample: arr?.[0] ? Object.keys(arr[0]) : null
      });
      
      return Array.isArray(arr) ? arr : []
    } catch (parseError) {
      console.error('❌ JSON 파싱 에러:', parseError);
      console.error('📝 파싱 실패한 원본:', raw);
      return []
    }
  } catch (apiError) {
    console.error('❌ GPT API 호출 에러:', apiError);
    return []
  }
}

export async function analyzeOcrText(ocrText) {
  console.log('🔍 analyzeOcrText 시작:', { 
    ocrTextLength: ocrText?.length, 
    ocrTextPreview: ocrText?.substring(0, 100) 
  });
  
  const prompt = buildPrompt(ocrText)
  console.log('📝 프롬프트 생성 완료:', { promptLength: prompt.length });
  
  try {
    const arr = await askJSON(prompt)
    console.log('🤖 GPT API 응답 처리 완료:', { 
      responseType: typeof arr, 
      isArray: Array.isArray(arr), 
      length: arr?.length 
    });
    
    if (!Array.isArray(arr) || arr.length === 0) {
      console.log('⚠️ 빈 배열 또는 배열이 아닌 응답');
      return [];
    }
    
    // 1차 검증
    const parsed = ReviewArraySchema.safeParse(arr)
    console.log('✅ 1차 스키마 검증:', { 
      success: parsed.success, 
      errors: parsed.success ? null : parsed.error?.issues?.map(e => `${e.path.join('.')}: ${e.message}`) 
    });
    
    if (parsed.success) {
      console.log('🎉 스키마 검증 성공, 결과 반환:', parsed.data);
      return parsed.data;
    }

    // 복구 프롬프트(스키마 에러 날 때 재시도)
    console.log('🔄 스키마 검증 실패, 복구 시도 중...');
    console.log('📋 원본 데이터 샘플:', arr[0]);
    
    const repairPrompt = `
다음 JSON이 스키마 오류다. 스키마에 맞게 고쳐서 배열만 내라.
스키마: ${ReviewItemSchema.toString()}
JSON: ${JSON.stringify(arr).slice(0, 4000)}

에러: ${parsed.error?.issues?.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}
    `.trim()

    const repaired = await askJSON(repairPrompt)
    console.log('🔧 복구 후 응답:', { 
      responseType: typeof repaired, 
      isArray: Array.isArray(repaired), 
      length: repaired?.length 
    });
    
    if (!Array.isArray(repaired) || repaired.length === 0) {
      console.log('⚠️ 복구 후에도 빈 배열');
      return [];
    }
    
    const parsed2 = ReviewArraySchema.safeParse(repaired)
    console.log('✅ 2차 스키마 검증:', { 
      success: parsed2.success, 
      errors: parsed2.success ? null : parsed2.error?.issues?.map(e => `${e.path.join('.')}: ${e.message}`) 
    });
    
    if (parsed2.success) {
      console.log('🎉 복구 후 스키마 검증 성공:', parsed2.data);
      return parsed2.data;
    }
    
    console.log('❌ 모든 스키마 검증 실패');
    return [];
    
  } catch (error) {
    console.error('❌ analyzeOcrText 에러:', error);
    return [];
  }
}
