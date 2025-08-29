import { logger } from '../utils/logger.js';
import { 
  getAdPurposePresets as getAdPurposePresetsService, 
  generateCompleteAd as generateCompleteAdService,
  analyzeImageForAd as analyzeImageForAdService,
  optimizeTextForAd as optimizeTextForAdService,
  generateAdDesign as generateAdDesignService
} from '../services/adGenerationService.js';

/**
 * 광고 목적별 프리셋 목록 조회
 */
export const getAdPurposePresets = async (req, res, next) => {
  try {
    const presets = getAdPurposePresetsService();
    return res.json({ 
      success: true,
      presets,
      count: presets.length
    });
  } catch (error) {
    logger.error('광고 프리셋 조회 실패:', error);
    return next(error);
  }
};

/**
 * 1단계: 이미지 분석만 수행
 */
export const analyzeImageForAd = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'IMAGE_REQUIRED', 
        message: '이미지 파일이 필요합니다.' 
      });
    }

    logger.info('이미지 분석 요청:', { 
      filename: req.file.originalname,
      size: req.file.size 
    });

    const analysis = await analyzeImageForAdService(req.file.buffer);
    
    return res.json({
      success: true,
      message: '이미지 분석이 완료되었습니다.',
      analysis,
      suggestions: {
        recommended_purposes: getRecommendedPurposes(analysis),
        design_tips: getDesignTips(analysis)
      }
    });
    
  } catch (error) {
    logger.error('이미지 분석 컨트롤러 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'ANALYSIS_FAILED',
      message: '이미지 분석 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

/**
 * 2단계: 텍스트 최적화만 수행
 */
export const optimizeTextForAd = async (req, res, next) => {
  try {
    const { user_inputs, ad_purpose, image_analysis } = req.body;
    
    if (!user_inputs || !ad_purpose) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: '사용자 입력과 광고 목적이 필요합니다.'
      });
    }

    logger.info('텍스트 최적화 요청:', { ad_purpose, user_inputs });

    const optimizedText = await optimizeTextForAdService(user_inputs, image_analysis || {}, ad_purpose);
    
    return res.json({
      success: true,
      message: '텍스트 최적화가 완료되었습니다.',
      optimized_text: optimizedText,
      comparison: {
        original: {
          brand: user_inputs.brand_name,
          slogan: user_inputs.slogan
        },
        optimized: optimizedText
      }
    });
    
  } catch (error) {
    logger.error('텍스트 최적화 컨트롤러 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'OPTIMIZATION_FAILED',
      message: '텍스트 최적화 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

/**
 * 3단계: 디자인 생성만 수행
 */
export const generateAdDesign = async (req, res, next) => {
  try {
    const { ad_purpose, optimized_text, image_analysis } = req.body;
    
    if (!ad_purpose || !optimized_text) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: '광고 목적과 최적화된 텍스트가 필요합니다.'
      });
    }

    logger.info('디자인 생성 요청:', { ad_purpose });

    const adDesign = await generateAdDesignService(ad_purpose, optimized_text, image_analysis || {});
    
    return res.json({
      success: true,
      message: '광고 디자인이 생성되었습니다.',
      design: adDesign,
      download_info: {
        background_url: adDesign.background_url,
        background_b64: adDesign.background_b64 ? 'available' : 'not_available'
      }
    });
    
  } catch (error) {
    logger.error('디자인 생성 컨트롤러 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'DESIGN_GENERATION_FAILED',
      message: '디자인 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

/**
 * 통합 광고 생성 (3단계 전체 프로세스)
 */
export const generateCompleteAd = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'IMAGE_REQUIRED',
        message: '이미지 파일이 필요합니다.'
      });
    }

    const { ad_purpose } = req.body;
    let { user_inputs } = req.body;
    let effects = req.body.effects;
    // 멀티파트 전송 시 문자열로 들어오는 user_inputs 파싱
    if (typeof user_inputs === 'string') {
      try {
        user_inputs = JSON.parse(user_inputs);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_USER_INPUTS_JSON',
          message: 'user_inputs 가 올바른 JSON 형식이 아닙니다.'
        });
      }
    }
    
    if (!ad_purpose || !user_inputs) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: '광고 목적과 사용자 입력이 필요합니다.'
      });
    }

    // 사용자 필수 값 1차 검증 (백엔드 서비스에서도 재검증함)
    if (!user_inputs.brand_name || !String(user_inputs.brand_name).trim()) {
      return res.status(400).json({
        success: false,
        error: 'BRAND_REQUIRED',
        message: '브랜드명은 필수입니다.'
      });
    }
    if (!user_inputs.main_product || !String(user_inputs.main_product).trim()) {
      return res.status(400).json({
        success: false,
        error: 'MAIN_PRODUCT_REQUIRED',
        message: '주요 상품/서비스는 필수입니다.'
      });
    }

    logger.info('통합 광고 생성 요청:', { 
      ad_purpose, 
      filename: req.file.originalname,
      user_inputs,
      effects
    });

    // 3단계 전체 프로세스 실행
    const completeAd = await generateCompleteAdService(
      req.file.buffer,
      user_inputs,
      ad_purpose
    );
    
    return res.json({
      success: true,
      message: 'AI 광고가 성공적으로 생성되었습니다.',
      result: completeAd,
      summary: {
        ad_purpose: completeAd.ad_purpose,
        main_subject: completeAd.image_analysis?.main_subject || '분석 불가',
        optimized_brand: completeAd.optimized_text?.optimized_brand || '생성 실패',
        call_to_action: completeAd.optimized_text?.call_to_action || '생성 실패',
        design_style: completeAd.design?.metadata?.style || '기본 스타일',
        target_emotion: completeAd.design?.metadata?.emotion || '기본 감정'
      }
    });
    
  } catch (error) {
    logger.error('통합 광고 생성 컨트롤러 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'AD_GENERATION_FAILED',
      message: '광고 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

/**
 * 광고 다운로드 프록시
 */
export const downloadAd = async (req, res, next) => {
  try {
    const { url, b64, filename = 'ai-generated-ad.webp' } = req.query;
    
    if (!url && !b64) {
      return res.status(400).json({
        success: false,
        error: 'DOWNLOAD_PARAMETERS_MISSING',
        message: '다운로드할 이미지 정보가 없습니다.'
      });
    }

    if (url) {
      // URL에서 직접 다운로드
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`이미지 다운로드 실패: ${response.status}`);
      }
      
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(Buffer.from(buffer));
      
    } else if (b64) {
      // Base64에서 다운로드
      const buffer = Buffer.from(b64, 'base64');
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    }
    
  } catch (error) {
    logger.error('광고 다운로드 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'DOWNLOAD_FAILED',
      message: '다운로드 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

// 헬퍼 함수들
function getRecommendedPurposes(imageAnalysis) {
  const { visual_style, mood_atmosphere, brand_identity } = imageAnalysis;
  
  const recommendations = [];
  
  if (visual_style?.includes('미니멀') || visual_style?.includes('클래식')) {
    recommendations.push('brand_awareness');
  }
  
  if (mood_atmosphere?.includes('활기참') || mood_atmosphere?.includes('따뜻함')) {
    recommendations.push('lifestyle_branding');
  }
  
  if (brand_identity?.includes('프리미엄') || brand_identity?.includes('전문성')) {
    recommendations.push('brand_awareness');
  }
  
  // 기본값 추가
  if (recommendations.length === 0) {
    recommendations.push('product_launch', 'brand_awareness');
  }
  
  return recommendations.slice(0, 2); // 최대 2개 추천
}

function getDesignTips(imageAnalysis) {
  const { color_palette, composition, visual_style } = imageAnalysis;
  
  const tips = [];
  
  if (color_palette?.length > 0) {
    tips.push(`추출된 색상 팔레트를 활용하여 브랜드 일관성을 유지하세요: ${color_palette.join(', ')}`);
  }
  
  if (composition?.includes('중앙')) {
    tips.push('중앙 구도를 활용하여 주요 메시지에 집중하세요');
  }
  
  if (visual_style?.includes('미니멀')) {
    tips.push('미니멀한 디자인에 강한 대비를 주어 가독성을 높이세요');
  }
  
  return tips;
}
