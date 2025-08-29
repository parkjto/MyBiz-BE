import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { smartEnhanceImage, composeAdImage } from './imageService.js';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI 모델 설정
const MODEL_VISION = process.env.OPENAI_MODEL_VISION || 'gpt-4o';
const MODEL_TEXT = process.env.OPENAI_MODEL_TEXT || 'gpt-4o-mini';
const MODEL_IMAGE = 'dall-e-3'; // DALL-E 3 모델 사용

/**
 * 광고 목적별 프리셋 (사용자 선택 기반)
 */
export function getAdPurposePresets() {
  return [
    {
      key: 'product_launch',
      label: '신제품 출시',
      description: '새로운 제품의 혁신성과 가치를 강조',
      style: 'modern_bold',
      colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
      target: 'early_adopters',
      emotion: 'excitement'
    },
    {
      key: 'brand_awareness',
      label: '브랜드 인지도',
      description: '브랜드의 정체성과 가치를 전달',
      style: 'elegant_sophisticated',
      colors: ['#2C3E50', '#E74C3C', '#F39C12'],
      target: 'general_audience',
      emotion: 'trust'
    },
    {
      key: 'promotion_sale',
      label: '프로모션/할인',
      description: '즉시 행동을 유도하는 매력적인 제안',
      style: 'dynamic_energetic',
      colors: ['#E74C3C', '#F39C12', '#2ECC71'],
      target: 'price_sensitive',
      emotion: 'urgency'
    },
    {
      key: 'lifestyle_branding',
      label: '라이프스타일 브랜딩',
      description: '특정 라이프스타일과의 연결성 강조',
      style: 'aspirational_inspirational',
      colors: ['#9B59B6', '#3498DB', '#1ABC9C'],
      target: 'lifestyle_seekers',
      emotion: 'aspiration'
    }
  ];
}

/**
 * 1단계: 지능형 이미지 분석 (시각적 + 의미론적)
 */
export async function analyzeImageForAd(imageBuffer) {
  try {
    const base64Image = imageBuffer.toString('base64');
    
    const analysis = await client.chat.completions.create({
      model: MODEL_VISION,
      messages: [
        {
          role: 'system',
          content: `당신은 광고 디자인을 위한 전문 이미지 분석가입니다. 
          업로드된 이미지를 분석하여 다음 정보를 JSON 형태로 제공하세요:
          
          {
            "main_subject": "주요 피사체 (제품/서비스/브랜드)",
            "visual_style": "시각적 스타일 (미니멀/화려함/클래식/모던)",
            "color_palette": ["주요 색상 3개 (hex 코드)"],
            "mood_atmosphere": "전체적인 분위기 (따뜻함/차가움/활기참/차분함)",
            "composition": "구도 분석 (중앙/대각선/대칭/자유로운)",
            "brand_identity": "브랜드 정체성 추정 (프리미엄/친근함/전문성/트렌디)",
            "target_audience": "타겟 고객층 추정 (연령대, 라이프스타일)",
            "ad_suggestions": ["광고 활용 방향 3가지"]
          }`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '이 이미지를 광고 포스터로 활용하기 위한 분석을 해주세요.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 800,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(analysis.choices[0].message.content);
    logger.info('이미지 분석 완료:', result);
    return result;
    
  } catch (error) {
    logger.error('이미지 분석 실패:', error);
    throw new Error(`이미지 분석 실패: ${error.message}`);
  }
}

/**
 * 2단계: 지능형 텍스트 최적화 (GPT 기반)
 */
export async function optimizeTextForAd(userInputs, imageAnalysis, adPurpose) {
  try {
    const purpose = getAdPurposePresets().find(p => p.key === adPurpose);
    
    const optimization = await client.chat.completions.create({
      model: MODEL_TEXT,
      messages: [
        {
          role: 'system',
          content: `당신은 광고 카피라이터입니다. 
          
          ⚠️ 중요한 규칙: 
          - 브랜드명: 사용자 입력 그대로 유지 (변경 금지)
          - 상품/서비스: 사용자 입력 그대로 유지 (변경 금지)
          - 슬로건: 사용자 입력이 있으면 기반으로 개선, 없으면 새로 생성 (개선 허용)
          
          다음 요소들을 고려하여 개선하세요:
          - 브랜드명: 절대 변경 금지
          - 상품/서비스: 절대 변경 금지  
          - 슬로건: 사용자 입력 기반으로 더 매력적이고 임팩트 있게 개선
          - 행동 유도 문구: 상품과 브랜드에 맞게 설득력 있게 생성
          - 감정적 훅: 슬로건과 연관된 강력한 감정적 훅 생성
          
          슬로건 개선 예시:
          - 입력: "프리미엄 커피, 도심의 여유" → "프리미엄 커피로 만나는 도심의 특별한 여유"
          - 입력: "맛있는 빵" → "매일 아침을 특별하게 만드는 맛있는 빵"
          
          JSON 형태로 응답하세요:
          {
            "optimized_brand": "사용자 입력 브랜드명 그대로",
            "optimized_slogan": "사용자 입력 슬로건 기반 개선 또는 신규 생성",
            "call_to_action": "상품과 브랜드에 맞는 행동 유도",
            "emotional_hook": "슬로건과 연관된 감정적 훅",
            "tone_style": "톤앤매너 설명"
          }`
        },
        {
          role: 'user',
          content: `사용자 입력 (변경 금지):
          브랜드: ${userInputs.brand_name}
          상품: ${userInputs.main_product}
          슬로건: ${userInputs.slogan}
          
          참고 정보:
          이미지 분석: ${JSON.stringify(imageAnalysis)}
          광고 목적: ${purpose?.label || '일반'}`
        }
      ],
      max_tokens: 600,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(optimization.choices[0].message.content);
    logger.info('텍스트 최적화 완료:', result);
    return result;
    
  } catch (error) {
    logger.error('텍스트 최적화 실패:', error);
    throw new Error(`텍스트 최적화 실패: ${error.message}`);
  }
}

/**
 * 3단계: Sharp.js로 원본 이미지 + 텍스트 오버레이 포스터 생성
 */
export async function generateAdDesign(purpose, optimizedText, imageAnalysis, originalImageBuffer) {
  try {
    logger.info('Sharp.js 텍스트 오버레이 포스터 생성 시작:', { purpose: purpose?.key, style: purpose?.style });
    
    // Sharp.js를 사용하여 원본 이미지에 텍스트 오버레이
    const posterBuffer = await createTextOverlayPoster(
      originalImageBuffer,
      optimizedText,
      purpose,
      imageAnalysis
    );
    
    // Base64로 인코딩하여 반환
    const posterBase64 = posterBuffer.toString('base64');
    const posterUrl = `data:image/png;base64,${posterBase64}`;
    
    logger.info('Sharp.js 텍스트 오버레이 포스터 생성 완료');
    
    return {
      poster_url: posterUrl,
      layout: {
        text_positions: {
          brand: 'top_center',
          slogan: 'below_brand',
          cta: 'bottom_center',
          hook: 'above_cta'
        },
        font_sizes: {
          brand: 'large',
          slogan: 'medium',
          cta: 'medium',
          hook: 'small'
        }
      },
      metadata: {
        purpose: purpose?.key,
        style: purpose?.style,
        colors: purpose?.colors,
        target: purpose?.target,
        emotion: purpose?.emotion,
        note: 'Sharp.js로 원본 이미지 + 텍스트 오버레이 포스터 생성'
      }
    };
    
  } catch (error) {
    logger.error('Sharp.js 텍스트 오버레이 포스터 생성 실패:', error);
    throw new Error(`Sharp.js 텍스트 오버레이 포스터 생성 실패: ${error.message}`);
  }
}

/**
 * OpenAI images/edits API용 프롬프트 (원본 이미지 + 텍스트 오버레이)
 */
function buildImageEditPrompt(purpose, optimizedText, imageAnalysis) {
  const style = purpose?.style || 'modern';
  const colors = purpose?.colors?.join(', ') || 'brand colors';
  const emotion = purpose?.emotion || 'professional';
  
  return `Add clean, modern poster-style text overlay to the original image:

IMPORTANT: Keep the original image exactly as is, only add text overlay. Do not change, modify, or replace the original image content.

Text overlay requirements:
- Brand Name: "${optimizedText.optimized_brand}" (large, bold, white font at top center)
- Slogan: "${optimizedText.optimized_slogan}" (medium size, white font below brand name)
- Call to Action: "${optimizedText.call_to_action}" (medium size, white font at bottom center)
- Emotional Hook: "${optimizedText.emotional_hook}" (small size, white font above call to action)

Design specifications:
- Style: ${style} with ${emotion} emotional appeal
- Text color: White for maximum readability
- Font: Bold, modern, professional sans-serif
- Text positioning: Strategic placement that doesn't cover important image elements
- Background: Semi-transparent dark overlay behind text if needed for readability

Layout guidelines:
- Brand name: Top center, large and prominent
- Slogan: Below brand name, supporting the message
- Call to action: Bottom center, encouraging user action
- Emotional hook: Above call to action, creating emotional connection

Technical requirements:
- Text must be clearly visible and readable
- Maintain the original image's visual appeal
- Professional poster appearance
- Suitable for both print and digital use

Remember: ONLY add text overlay, do NOT change the original image content.`;
}

/**
 * GPT 포스터 생성 프롬프트 (텍스트 포함)
 */
function buildGPTPosterPrompt(purpose, optimizedText, imageAnalysis) {
  const style = purpose?.style || 'modern';
  const colors = purpose?.colors?.join(', ') || 'brand colors';
  const emotion = purpose?.emotion || 'professional';
  
  return `당신은 전문적인 광고 포스터 디자이너입니다. 
  사용자가 업로드한 사진의 내용과 스타일을 기반으로 하여, 
  사용자가 입력한 텍스트를 포함한 완벽한 광고 포스터를 생성해야 합니다.
  
  포스터는 다음 요소들을 포함해야 합니다:
  - 사용자 업로드 사진의 주요 내용: ${imageAnalysis.main_subject}
  - 사용자가 입력한 브랜드명: "${optimizedText.optimized_brand}"
  - 사용자가 입력한 상품명: "${optimizedText.optimized_slogan}"
  - AI가 생성한 행동 유도 문구: "${optimizedText.call_to_action}"
  - AI가 생성한 감정적 훅: "${optimizedText.emotional_hook}"
  
  디자인 사양:
  - 스타일: ${style} with ${emotion} emotional appeal
  - 색상 팔레트: ${colors} (사용자 업로드 이미지 색상과 보완: ${imageAnalysis.color_palette?.join(', ')})
  - 레이아웃: 전문적이고 매력적인 디자인
  - 타이포그래피: 브랜드 성격에 맞는 명확하고 읽기 쉬운 폰트
  - 구성: 텍스트가 자연스럽게 통합된 균형 잡힌 디자인
  
  이미지 통합 요구사항:
  - 포스터는 사용자 업로드 이미지 내용을 반드시 포함해야 합니다: ${imageAnalysis.main_subject}
  - 시각적 스타일 유지: ${imageAnalysis.visual_style}
  - 사용자 업로드 이미지 색상 체계 사용: ${imageAnalysis.color_palette?.join(', ')}
  - 분위기와 분위기 유지: ${imageAnalysis.mood_atmosphere}
  - 텍스트 요소를 이미지 내용과 원활하게 통합
  - 전문적인 광고 느낌의 일관된 디자인 생성
  
  텍스트 배치:
  - 브랜드명: 눈에 띄는 위치
  - 슬로건: 브랜드명 아래, 메시지 지원
  - 행동 유도: 하단 영역, 사용자 행동 유도
  - 감정적 훅: 감정적 연결 생성을 위한 전략적 위치
  
  기술적 요구사항:
  - 상업적 촬영 스타일의 고품질
  - 텍스트는 명확하고 읽기 쉬워야 합니다
  - 전문적인 색상 조정 및 조명
  - 인쇄와 디지털 사용에 적합
  - 전문적인 디자인 느낌으로 보이는 것이 중요합니다
  
  중요: 포스터는 사용자 업로드 이미지 내용 (${imageAnalysis.main_subject})과 사용자 브랜드 (${optimizedText.optimized_brand}) 및 제품 정보를 보여주어야 하며, 비즈니스 광고의 시각적 매력과 전문성을 유지해야 합니다.`;
}

/**
 * DALL-E 3 포스터 생성 프롬프트 (텍스트 포함)
 */
function buildDALLE3PosterPrompt(purpose, optimizedText, imageAnalysis) {
  const style = purpose?.style || 'modern';
  const colors = purpose?.colors?.join(', ') || 'brand colors';
  const emotion = purpose?.emotion || 'professional';
  
  return `당신은 전문적인 광고 포스터 디자이너입니다. 
  사용자가 업로드한 사진의 내용과 스타일을 기반으로 하여, 
  사용자가 입력한 텍스트를 포함한 완벽한 광고 포스터를 생성해야 합니다.
  
  포스터는 다음 요소들을 포함해야 합니다:
  - 사용자 업로드 사진의 주요 내용: ${imageAnalysis.main_subject}
  - 사용자가 입력한 브랜드명: "${optimizedText.optimized_brand}"
  - 사용자가 입력한 상품명: "${optimizedText.optimized_slogan}"
  - AI가 생성한 행동 유도 문구: "${optimizedText.call_to_action}"
  - AI가 생성한 감정적 훅: "${optimizedText.emotional_hook}"
  
  디자인 사양:
  - 스타일: ${style} with ${emotion} emotional appeal
  - 색상 팔레트: ${colors} (사용자 업로드 이미지 색상과 보완: ${imageAnalysis.color_palette?.join(', ')})
  - 레이아웃: 전문적이고 매력적인 디자인
  - 타이포그래피: 브랜드 성격에 맞는 명확하고 읽기 쉬운 폰트
  - 구성: 텍스트가 자연스럽게 통합된 균형 잡힌 디자인
  
  이미지 통합 요구사항:
  - 포스터는 사용자 업로드 이미지 내용을 반드시 포함해야 합니다: ${imageAnalysis.main_subject}
  - 시각적 스타일 유지: ${imageAnalysis.visual_style}
  - 사용자 업로드 이미지 색상 체계 사용: ${imageAnalysis.color_palette?.join(', ')}
  - 분위기와 분위기 유지: ${imageAnalysis.mood_atmosphere}
  - 텍스트 요소를 이미지 내용과 원활하게 통합
  - 전문적인 광고 느낌의 일관된 디자인 생성
  
  텍스트 배치:
  - 브랜드명: 눈에 띄는 위치
  - 슬로건: 브랜드명 아래, 메시지 지원
  - 행동 유도: 하단 영역, 사용자 행동 유도
  - 감정적 훅: 감정적 연결 생성을 위한 전략적 위치
  
  기술적 요구사항:
  - 상업적 촬영 스타일의 고품질
  - 텍스트는 명확하고 읽기 쉬워야 합니다
  - 전문적인 색상 조정 및 조명
  - 인쇄와 디지털 사용에 적합
  - 전문적인 디자인 느낌으로 보이는 것이 중요합니다
  
  중요: 포스터는 사용자 업로드 이미지 내용 (${imageAnalysis.main_subject})과 사용자 브랜드 (${optimizedText.optimized_brand}) 및 제품 정보를 보여주어야 하며, 비즈니스 광고의 시각적 매력과 전문성을 유지해야 합니다.`;
}

/**
 * OpenAI images/generations API용 상세 프롬프트 (원본 이미지 기반)
 */
function buildDetailedGenerationPrompt(purpose, optimizedText, imageAnalysis) {
  const style = purpose?.style || 'modern';
  const colors = purpose?.colors?.join(', ') || 'brand colors';
  const emotion = purpose?.emotion || 'professional';
  
  return `Create a professional advertising poster that EXACTLY matches the user's uploaded image:

CRITICAL REQUIREMENTS:
- The poster MUST feature the EXACT same main subject: ${imageAnalysis.main_subject}
- Maintain the EXACT visual style: ${imageAnalysis.visual_style}
- Use the EXACT color palette from the uploaded image: ${imageAnalysis.color_palette?.join(', ')}
- Preserve the EXACT mood and atmosphere: ${imageAnalysis.mood_atmosphere}
- Keep the EXACT composition style: ${imageAnalysis.composition}
- Maintain the EXACT brand identity: ${imageAnalysis.brand_identity}

User's specific content to include:
- Brand Name: "${optimizedText.optimized_brand}" (large, bold, prominent)
- Slogan: "${optimizedText.optimized_slogan}" (medium size, supporting)
- Call to Action: "${optimizedText.call_to_action}" (medium size, encouraging)
- Emotional Hook: "${optimizedText.emotional_hook}" (small size, emotional)

Design specifications:
- Style: ${style} with ${emotion} emotional appeal
- Layout: Professional, modern, attention-grabbing
- Typography: Clear, readable fonts that match the brand personality
- Composition: Balanced design with text naturally integrated

Image integration requirements:
- The poster MUST showcase the user's uploaded image content: ${imageAnalysis.main_subject}
- Text elements should be strategically placed without covering important image elements
- Create a cohesive design that feels like a professional advertisement
- Maintain the visual appeal and professional quality

Technical requirements:
- High-quality commercial photography style
- Text must be clearly visible and readable
- Professional color grading and lighting
- Suitable for both print and digital use

IMPORTANT: The poster MUST be based on the user's uploaded image (${imageAnalysis.main_subject}) and include the user's brand (${optimizedText.optimized_brand}) with all the specified text elements, while maintaining the exact visual style and content of the original image.`;
}

/**
 * 통합 광고 생성 (3단계 전체 프로세스)
 */
export async function generateCompleteAd(imageBuffer, userInputs, adPurpose) {
  try {
    logger.info('AI 기반 광고 생성 시작:', { adPurpose, userInputs });
    
    // 🚫 사용자 입력 절대 검증 (AI 임의 생성 금지)
    if (!userInputs.brand_name || !userInputs.brand_name.trim()) {
      throw new Error('브랜드명은 필수이며 비어있을 수 없습니다.');
    }
    if (!userInputs.main_product || !userInputs.main_product.trim()) {
      throw new Error('주요 상품/서비스는 필수이며 비어있을 수 없습니다.');
    }
    
    // 사용자 입력 로깅 (디버깅용)
    logger.info('사용자 입력 확인:', {
      brand_name: userInputs.brand_name,
      main_product: userInputs.main_product,
      slogan: userInputs.slogan || '없음',
      contact_info: userInputs.contact_info || '없음'
    });
    
    // 1단계: 이미지 분석 (업로드된 사진만 사용)
    const imageAnalysis = await analyzeImageForAd(imageBuffer);
    
    // 2단계: 텍스트 최적화 (사용자 입력 100% 보존)
    const optimizedText = await optimizeTextForAd(userInputs, imageAnalysis, adPurpose);
    
    // 🚫 브랜드명과 상품은 절대 보존 (AI 변경 금지)
    optimizedText.optimized_brand = userInputs.brand_name;
    
    // ✅ 슬로건은 AI 개선 허용 (사용자 입력이 있으면 기반으로 개선, 없으면 새로 생성)
    if (userInputs.slogan && userInputs.slogan.trim()) {
      // 사용자 슬로건이 있으면 AI가 개선
      logger.info('사용자 슬로건 기반 AI 개선:', userInputs.slogan);
    } else {
      // 사용자 슬로건이 없으면 AI가 새로 생성
      logger.info('AI 슬로건 신규 생성');
    }
    
    // 3단계: DALL-E 3가 직접 포스터 이미지 생성 (원본 사진 + 텍스트 합성)
    const purpose = getAdPurposePresets().find(p => p.key === adPurpose);
    
    // purpose가 없을 경우 기본값 제공
    if (!purpose) {
      logger.warn(`광고 목적 '${adPurpose}'에 대한 프리셋을 찾을 수 없음. 기본값 사용.`);
      // 기본 프리셋 사용
      const defaultPurpose = getAdPurposePresets()[0]; // 첫 번째 프리셋을 기본값으로
      const adDesign = await generateAdDesign(defaultPurpose, optimizedText, imageAnalysis, imageBuffer);
      
      // 최종 결과 통합
      const result = {
        ad_purpose: adPurpose,
        image_analysis: imageAnalysis,
        optimized_text: optimizedText,
        design: adDesign,
        poster_url: adDesign.poster_url, // DALL-E 3가 생성한 포스터 이미지 URL
        metadata: {
          generated_at: new Date().toISOString(),
          model_versions: {
            vision: MODEL_VISION,
            text: MODEL_TEXT,
            image: MODEL_IMAGE
          },
          note: 'DALL-E 3가 원본 사진 + 텍스트를 합성한 포스터 이미지 생성 (기본 프리셋 사용)'
        }
      };
      
      logger.info('DALL-E 3 기반 광고 생성 완료 (기본 프리셋):', { adPurpose, success: true });
      return result;
    }
    
    const adDesign = await generateAdDesign(purpose, optimizedText, imageAnalysis, imageBuffer);

    // OpenAI images/generations API가 생성한 포스터 이미지를 직접 사용 (추가 합성 불필요)
    logger.info('OpenAI images/generations API 포스터 이미지 사용:', { posterUrl: adDesign.poster_url?.substring(0, 100) + '...' });
    
    // 최종 결과 통합
    const result = {
      ad_purpose: adPurpose,
      image_analysis: imageAnalysis,
      optimized_text: optimizedText,
      design: adDesign,
      poster_url: adDesign.poster_url, // OpenAI images/generations API가 생성한 포스터 이미지 URL
      metadata: {
        generated_at: new Date().toISOString(),
        model_versions: {
          vision: MODEL_VISION,
          text: MODEL_TEXT,
          image: MODEL_IMAGE
        },
        note: 'OpenAI images/generations API로 원본 이미지 기반 포스터 생성'
      }
    };
    
    logger.info('AI 기반 광고 생성 완료:', { adPurpose, success: true });
    return result;
    
  } catch (error) {
    logger.error('통합 광고 생성 실패:', error);
    throw new Error(`광고 생성 실패: ${error.message}`);
  }
}

/**
 * Sharp.js를 사용하여 원본 이미지에 텍스트 오버레이
 */
async function createTextOverlayPoster(originalImageBuffer, optimizedText, purpose, imageAnalysis) {
  try {
    // Sharp.js import (ES6 모듈 방식)
    const sharp = await import('sharp');
    
    // 원본 이미지 로드
    let image = sharp.default(originalImageBuffer);
    
    // 이미지 메타데이터 가져오기
    const metadata = await image.metadata();
    const { width, height } = metadata;
    
    // 포스터 크기 계산 (원본 비율 유지, 최소 너비 800px)
    const minWidth = 800;
    const posterWidth = Math.max(width, minWidth);
    const posterHeight = Math.round((height / width) * posterWidth);
    
    // 이미지 리사이즈
    image = image.resize(posterWidth, posterHeight, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    });
    
    // 텍스트 오버레이를 위한 SVG 생성
    const svgText = generateSVGText(optimizedText, posterWidth, posterHeight, purpose);
    
    // 텍스트 오버레이 적용
    const posterBuffer = await image
      .composite([{
        input: Buffer.from(svgText),
        top: 0,
        left: 0
      }])
      .png()
      .toBuffer();
    
    return posterBuffer;
    
  } catch (error) {
    logger.error('Sharp.js 텍스트 오버레이 생성 실패:', error);
    throw new Error(`Sharp.js 텍스트 오버레이 생성 실패: ${error.message}`);
  }
}

/**
 * SVG 텍스트 생성 (텍스트 오버레이용)
 */
function generateSVGText(optimizedText, width, height, purpose) {
  const style = purpose?.style || 'modern';
  const colors = purpose?.colors || ['#FFFFFF', '#000000'];
  
  // 텍스트 색상 결정 (가독성을 위해)
  const textColor = colors[0] === '#FFFFFF' ? '#000000' : '#FFFFFF';
  const shadowColor = colors[0] === '#FFFFFF' ? '#FFFFFF' : '#000000';
  
  // 폰트 크기 계산
  const brandSize = Math.round(width * 0.08); // 브랜드명: 너비의 8%
  const sloganSize = Math.round(width * 0.04); // 슬로건: 너비의 4%
  const ctaSize = Math.round(width * 0.035); // CTA: 너비의 3.5%
  const hookSize = Math.round(width * 0.03); // 훅: 너비의 3%
  
  // 텍스트 위치 계산
  const centerX = width / 2;
  const topMargin = height * 0.1; // 상단 여백 10%
  const bottomMargin = height * 0.1; // 하단 여백 10%
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="${shadowColor}" flood-opacity="0.8"/>
        </filter>
      </defs>
      
      <!-- 브랜드명 (상단 중앙) -->
      <text x="${centerX}" y="${topMargin + brandSize}" 
            font-family="Arial, sans-serif" font-size="${brandSize}" 
            font-weight="bold" text-anchor="middle" 
            fill="${textColor}" filter="url(#shadow)">
        ${optimizedText.optimized_brand}
      </text>
      
      <!-- 슬로건 (브랜드명 아래) -->
      <text x="${centerX}" y="${topMargin + brandSize + sloganSize + 20}" 
            font-family="Arial, sans-serif" font-size="${sloganSize}" 
            font-weight="600" text-anchor="middle" 
            fill="${textColor}" filter="url(#shadow)">
        ${optimizedText.optimized_slogan}
      </text>
      
      <!-- 감정적 훅 (하단 CTA 위) -->
      <text x="${centerX}" y="${height - bottomMargin - ctaSize - hookSize - 20}" 
            font-family="Arial, sans-serif" font-size="${hookSize}" 
            font-weight="500" text-anchor="middle" 
            fill="${textColor}" filter="url(#shadow)">
        ${optimizedText.emotional_hook}
      </text>
      
      <!-- 행동 유도 (하단 중앙) -->
      <text x="${centerX}" y="${height - bottomMargin - ctaSize}" 
            font-family="Arial, sans-serif" font-size="${ctaSize}" 
            font-weight="600" text-anchor="middle" 
            fill="${textColor}" filter="url(#shadow)">
        ${optimizedText.call_to_action}
      </text>
    </svg>
  `;
}
