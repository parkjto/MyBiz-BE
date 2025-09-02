import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL_TEXT = process.env.OPENAI_MODEL_TEXT || "gpt-4o-mini";
const MODEL_VISION = process.env.OPENAI_MODEL_VISION || "gpt-4o";
const MODEL_IMAGE = process.env.OPENAI_MODEL_IMAGE || "gpt-image-1";

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

/**
 * 매장 사진 분석(JSON 최소 필드) - 토큰 절약 모드
 * @param {string} imageBase64 - 이미지 base64 문자열 (data URL 미포함 순수 base64)
 * @returns {Promise<Object>} 분석 결과 JSON
 */
export async function analyzeStorePhotoBase64(imageBase64) {
  try {
    const prompt = [
      '사진을 분석해 아래 JSON만 반환:',
      '{"business_type":"카페|레스토랑|치킨집|베이커리|기타","main_products":[""],"atmosphere":"모던|클래식|아늑함|활기참|고급","color_palette":["#hex(선택)"],"recommended_slogans":[""]}',
      '설명 금지, JSON만.'
    ].join('\n');

    const res = await client.chat.completions.create({
      model: MODEL_VISION,
      messages: [
        { role: 'system', content: '당신은 매장 사진을 간결하게 구조화하는 분석기입니다.' },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 400,
      temperature: 0.2
    });

    const raw = res.choices?.[0]?.message?.content || '{}';
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`매장 사진 분석 실패: ${error.message}`);
  }
}

/**
 * 스타일별 초단문 프롬프트 생성
 * @param {('sns'|'store_promo'|'event'|'premium')} style
 * @param {Object} user - 사용자 입력
 * @param {Object} analysis - 이미지 분석(선택)
 */
export function buildPosterPrompt(style, user, analysis = {}) {
  const mainProduct = user.mainProduct;
  const vibe = user.vibe || analysis.atmosphere || 'modern';
  const colors = user.colorPreference || (analysis.color_palette?.[0] || 'brand/store colors');

  // 용도별 특화 프롬프트 (사용자 선택 기반)
  function getPurposeSpecificPrompt(purpose, product) {
    const p = String(product || '').toLowerCase();
    
    switch (purpose) {
      case 'product_promo':
        return `Professional minimal product poster featuring ${product}. Clean centered composition with soft natural studio lighting. Solid background with subtle shadows, generous top whitespace for large title text. Modern clean composition, high-end product photography style. No people, no watermark, no embedded text in image.`;
        
      case 'cafe_restaurant':
        if (p.includes('케이크') || p.includes('cake') || p.includes('디저트')) {
          return `Warm and inviting cafe poster featuring a chocolate cream cake slice with rich layered cream and cocoa powder dusting, placed on a round white ceramic plate with an elegant silver fork. Warm beige solid background, soft natural lighting creating cozy shadows. The cake is perfectly centered with generous top whitespace for large title text. Cozy cafe atmosphere, high-end food photography style. No people, no watermark, no embedded text in image.`;
        }
        if (p.includes('커피') || p.includes('coffee') || p.includes('라떼') || p.includes('음료')) {
          return `Warm cafe poster showing two elegant iced coffee drinks - one americano and one layered latte - in clear glass cups on blue coasters, placed on a round white table. Blue tile background with soft natural lighting. Cozy composition with the drinks centered and large empty space at top for brand title. Professional cafe photography style, warm and inviting. No people, no watermark, no embedded text.`;
        }
        return `Warm and inviting restaurant poster featuring ${product}. Cozy composition with soft natural lighting and warm background. Generous top whitespace for title text, inviting and comfortable style. High-quality food photography. No people, no watermark, no embedded text in image.`;
        
      case 'event_announcement':
        return `Clear and informative event poster featuring ${product}. Bold composition with strong contrast and clear lighting. Information-focused layout with generous top space for large title text. Professional event photography style, easy to read. No people, no watermark, no embedded text in image.`;
        
      case 'personal_social':
        return `Creative and artistic poster featuring ${product}. Free-form composition with artistic lighting and creative background. Generous top space for artistic title text, creative and expressive style. High-quality artistic photography. No people, no watermark, no embedded text in image.`;
        
      default:
        return `Professional poster design featuring ${product}. Clean centered composition with soft natural lighting and solid background. Generous top whitespace for title text, modern and elegant style. High-quality photography. No people, no watermark, no embedded text in image.`;
    }
  }

  const base = {
    sns: getPurposeSpecificPrompt(user.purpose || 'product_promo', mainProduct),
    store_promo: getPurposeSpecificPrompt('cafe_restaurant', mainProduct),
    event: getPurposeSpecificPrompt('event_announcement', mainProduct),
    premium: getPurposeSpecificPrompt('personal_social', mainProduct)
  };

  return base[style];
}

/**
 * 스타일별 텍스트 레이아웃(규칙 기반) 생성 - [0,1] 좌표계
 */
export function buildTextLayout(style, user) {
  const brand = (user.brandName || '').toUpperCase();
  const slogan = user.slogan || '';
  const eventInfo = user.eventInfo || '';
  const contact = user.contactInfo || '';
  const website = user.website || '';
  const address = user.address || '';
  const instagram = user.instagram || '';

  const white = '#FFFFFF';
  const light = '#EEEEEE';

  // 통일된 레이아웃: 상단 타이틀, 그 아래 슬로건, 좌하단 3줄 정보
  const baseLayout = {
    title: { text: brand, position: { x: 0.06, y: 0.12 }, font_size: 120, color: white, style: 'bold', align: 'left' },
    subtitle: { text: slogan, position: { x: 0.06, y: 0.20 }, font_size: 42, color: white, style: 'normal', align: 'left' },
    meta1: { text: website || contact, position: { x: 0.06, y: 0.82 }, font_size: 30, color: light, style: 'normal', align: 'left' },
    meta2: { text: address, position: { x: 0.06, y: 0.88 }, font_size: 30, color: light, style: 'normal', align: 'left' },
    meta3: { text: instagram, position: { x: 0.06, y: 0.94 }, font_size: 30, color: light, style: 'normal', align: 'left' }
  };

  return baseLayout;
}

/**
 * 포스터 용도별 프리셋 (사용자 선택 기반)
 */
export function getPosterPurposePresets() {
  return [
    { 
      key: 'product_promo', 
      label: '상품/제품 홍보용', 
      description: '깔끔하고 미니멀한 디자인',
      vibe: 'minimal',
      colors: ['#F5F1EB', '#8B4513', '#D2B48C'],
      fontStyle: 'bold_sans',
      layout: 'centered_product'
    },
    { 
      key: 'cafe_restaurant', 
      label: '카페/음식점 홍보용', 
      description: '따뜻하고 감성적인 디자인',
      vibe: 'warm',
      colors: ['#F4F0E8', '#6B4423', '#A0714D'],
      fontStyle: 'elegant_serif',
      layout: 'warm_food'
    },
    { 
      key: 'event_announcement', 
      label: '이벤트/행사 안내용', 
      description: '정보 전달을 명확하게 하는 디자인',
      vibe: 'clear',
      colors: ['#E6F3FF', '#2C5282', '#4A90E2'],
      fontStyle: 'bold_modern',
      layout: 'info_centric'
    },
    { 
      key: 'personal_social', 
      label: '개인 소장/소셜 미디어용', 
      description: '자유롭고 예술적인 디자인',
      vibe: 'artistic',
      colors: ['#F0EDE8', '#5A4A3A', '#8C7853'],
      fontStyle: 'creative_script',
      layout: 'artistic_free'
    }
  ];
}

/**
 * 사전 정의된 무드/컬러 프리셋 제공 (기존 호환성)
 */
export function getMoodColorPresets() {
  return [
    { key: 'minimal_beige',     label: '미니멀/베이지',   vibe: 'minimal',  colors: ['#F5F1EB','#8B4513','#D2B48C'] },
    { key: 'modern_blue',       label: '모던/블루',       vibe: 'modern',   colors: ['#E6F3FF','#2C5282','#4A90E2'] },
    { key: 'premium_muted',     label: '프리미엄/뮤티드', vibe: 'luxury',   colors: ['#F0EDE8','#5A4A3A','#8C7853'] },
    { key: 'warm_coffee',       label: '따뜻함/커피톤',   vibe: 'cozy',     colors: ['#F4F0E8','#6B4423','#A0714D'] },
    { key: 'clean_white',       label: '깔끔함/화이트',   vibe: 'clean',    colors: ['#FFFFFF','#333333','#F8F8F8'] }
  ];
}

/**
 * 스타일별 권장 이미지 사이즈
 */
function getSizeByStyleForModel(style, model) {
  const isGptImage = model === 'gpt-image-1';
  if (isGptImage) {
    // gpt-image-1 지원: 1024x1024, 1024x1536, 1536x1024
    switch (style) {
      case 'sns':
        return '1024x1024';
      case 'event':
        return '1536x1024';
      case 'store_promo':
      case 'premium':
      default:
        return '1024x1536';
    }
  } else {
    // dall-e-3 지원: 1024x1024, 1024x1792, 1792x1024
    switch (style) {
      case 'sns':
        return '1024x1024';
      case 'event':
        return '1792x1024';
      case 'store_promo':
      case 'premium':
      default:
        return '1024x1792';
    }
  }
}

/**
 * 단일 포스터 배경 생성 (이미지 모델)
 */
export async function generatePosterBackground(style, user, analysis = {}) {
  try {
    const model = MODEL_IMAGE;
    const prompt = buildPosterPrompt(style, user, analysis);
    const size = getSizeByStyleForModel(style, model);

    const options = {
      model,
      prompt,
      size,
      n: 1
    };
    if (model === 'gpt-image-1') {
      options.quality = 'high';
    }
    const res = await client.images.generate(options);

    const data = res.data?.[0];
    if (!data) throw new Error('이미지 생성 결과가 비어있습니다.');
    return { url: data.url || null, b64: data.b64_json || null };
  } catch (error) {
    throw new Error(`포스터 배경 생성 실패: ${error.message}`);
  }
}

/**
 * 4종 포스터 일괄 생성
 */
export async function generateAllPosters(user, analysis = {}) {
  const styles = ['sns', 'store_promo', 'event', 'premium'];
  const out = {};
  for (const style of styles) {
    const bg = await generatePosterBackground(style, user, analysis);
    out[style] = {
      background_url: bg.url || '',
      background_b64: bg.b64 || '',
      text_layout: buildTextLayout(style, user),
      style_config: { style, size: getSizeByStyle(style) }
    };
  }
  return out;
}

/**
 * 이미지 분석 결과 기반 맞춤 질문 생성
 */
export function generateDynamicQuestions(imageAnalysis) {
  const business = imageAnalysis?.business_type || '매장';
  const products = imageAnalysis?.main_products || [];
  const atmosphere = imageAnalysis?.atmosphere || '모던';
  const p0 = products[0] || '';
  const p1 = products[1] || '';
  const suggested = (imageAnalysis?.recommended_slogans || [])[0] || '당신만의 특별한 공간';

  return [
    `🤖 ${business} 사진을 분석했습니다!`,
    `   주력 상품: ${products.join(', ')}`,
    `   매장 분위기: ${atmosphere}`,
    '',
    '📝 포스터 제작을 위해 정보를 입력해주세요:',
    '',
    '1. 매장명/브랜드명: [        ]',
    '',
    `2. 대표 메뉴/상품명: [        ] (추천: ${p0}${p1 ? `, ${p1}` : ''})`,
    '',
    `3. 슬로건/핵심 메시지 (선택사항): [        ] (예시: "${suggested}")`,
    '',
    '4. 특별 이벤트/할인 정보 (선택사항): [        ] (예: 오픈 기념 20% 할인, 신메뉴 출시 등)',
    '',
    '5. 연락처/위치 (선택사항): [        ]'
  ].join('\n');
}
