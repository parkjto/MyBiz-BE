import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL_TEXT = process.env.OPENAI_MODEL_TEXT || "gpt-4o-mini";
const MODEL_VISION = process.env.OPENAI_MODEL_VISION || "gpt-4o";

/**
 * 텍스트 기반 광고 문구 생성 (구조화 출력)
 * @param {Object} params - 생성 파라미터
 * @param {string} params.productName - 제품명
 * @param {string} params.productDesc - 제품 설명
 * @param {Array<string>} params.keywords - 키워드 배열
 * @param {number} params.num - 생성할 문구 개수
 * @param {number} params.maxWords - 최대 단어 수
 * @returns {Promise<Object>} 생성된 광고 문구들
 */
export async function generateAdCopies({
  productName,
  productDesc,
  keywords = [],
  num = 4,
  maxWords = 16
}) {
  try {
    const prompt = [
      `역할: 당신은 SNS/배달앱 전용 카피라이터.`,
      `아래 정보를 보고 자극적이되 과장되지 않은 한국어 광고 문구를 ${num}개 생성하세요.`,
      `각 문구는 ${maxWords} 단어 이내(핵심 키워드 위주, 이모지 0~2개 허용).`,
      `문체는 다양화(예: 감성/유머/직관/한정수량/가성비 등)하여 style 필드에 표기.`,
      `출력은 JSON 형식으로만 반환하세요.`,
      `---`,
      `제품명: ${productName}`,
      `설명: ${productDesc}`,
      `키워드: ${keywords.join(", ") || "(없음)"}`,
      `---`,
      `응답 형식:`,
      `{`,
      `  "copies": [`,
      `    {`,
      `      "copy": "광고 문구",`,
      `      "style": "문체 스타일"`,
      `    }`,
      `  ]`,
      `}`
    ].join("\n");

    const res = await client.chat.completions.create({
      model: MODEL_TEXT,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const raw = res.choices[0].message.content;
    const parsed = JSON.parse(raw);

    // 안전한 길이 보정
    if (parsed.copies && Array.isArray(parsed.copies)) {
      parsed.copies = parsed.copies.map(it => ({
        ...it,
        copy: enforceMaxWords(it.copy, maxWords)
      }));
    }

    return parsed;
  } catch (error) {
    throw new Error(`광고 문구 생성 실패: ${error.message}`);
  }
}

/**
 * 이미지 기반 맞춤 광고 문구 생성
 * @param {Object} params - 생성 파라미터
 * @param {string} params.imageUrl - 이미지 URL
 * @param {string} params.productName - 제품명
 * @param {string} params.productDesc - 제품 설명
 * @param {Array<string>} params.keywords - 키워드 배열
 * @param {number} params.num - 생성할 문구 개수
 * @param {number} params.maxWords - 최대 단어 수
 * @returns {Promise<Object>} 생성된 광고 문구와 해시태그
 */
export async function generateFromImage({
  imageUrl,
  productName,
  productDesc,
  keywords = [],
  num = 3,
  maxWords = 16
}) {
  try {
    const system = `역할: 당신은 음식 사진을 분석해 매력 포인트를 뽑아내는 카피라이터.`;
    const userText = [
      `제품명: ${productName}`,
      `설명: ${productDesc}`,
      `키워드: ${keywords.join(", ") || "(없음)"}`,
      `제약: 광고 문구는 ${num}개, 각 ${maxWords} 단어 이내. 해시태그는 한글/영문 혼합 허용.`,
      `---`,
      `응답 형식:`,
      `{`,
      `  "copies": ["광고 문구1", "광고 문구2", "광고 문구3"],`,
      `  "hashtags": ["해시태그1", "해시태그2", "해시태그3"]`,
      `}`
    ].join("\n");

    const res = await client.chat.completions.create({
      model: MODEL_VISION,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const raw = res.choices[0].message.content;
    const parsed = JSON.parse(raw);
    
    if (parsed.copies && Array.isArray(parsed.copies)) {
      parsed.copies = parsed.copies.map(c => enforceMaxWords(c, maxWords));
    }

    return parsed;
  } catch (error) {
    throw new Error(`이미지 기반 광고 문구 생성 실패: ${error.message}`);
  }
}

/**
 * 텍스트 길이 제한 적용
 * @param {string} text - 원본 텍스트
 * @param {number} maxWords - 최대 단어 수
 * @returns {string} 제한된 텍스트
 */
function enforceMaxWords(text, maxWords) {
  if (!text || typeof text !== 'string') return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(" ").trim();
}
