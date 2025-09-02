import sharp from 'sharp';

/**
 * 고급 이미지 타입 자동 감지 (AI 없이)
 * @param {Buffer} buffer - 이미지 버퍼
 * @returns {Promise<string>} 이미지 타입 ('food', 'portrait', 'landscape', 'document', 'product', 'other')
 */
export async function detectImageType(buffer) {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    // 고급 이미지 통계 분석
    const stats = await image.stats();
    const { channels } = stats;
    
    // RGB 채널별 상세 분석
    const rAvg = channels[0].mean;
    const gAvg = channels[1].mean;
    const bAvg = channels[2].mean;
    
    const rStd = channels[0].stdev;
    const gStd = channels[1].stdev;
    const bStd = channels[2].stdev;
    
    // 고급 색상 분석
    const colorVariance = (rStd + gStd + bStd) / 3;
    const brightness = (rAvg + gAvg + bAvg) / 3;
    const colorBalance = calculateColorBalance(rAvg, gAvg, bAvg);
    const saturation = calculateSaturation(rStd, gStd, bStd);
    
    // 이미지 복잡도 분석
    const complexity = calculateImageComplexity(stats, metadata);
    
    // 이미지 타입 판별 로직 강화
    if (isFoodImage(rAvg, gAvg, bAvg, colorVariance, saturation, complexity)) {
      return 'food';
    } else if (isPortraitImage(rAvg, gAvg, bAvg, colorVariance, metadata, complexity)) {
      return 'portrait';
    } else if (isLandscapeImage(rAvg, gAvg, bAvg, colorVariance, metadata, complexity)) {
      return 'landscape';
    } else if (isDocumentImage(brightness, colorVariance, complexity)) {
      return 'document';
    } else if (isProductImage(colorBalance, saturation, complexity, metadata)) {
      return 'product';
    } else {
      return 'other';
    }
  } catch (error) {
    console.warn('이미지 타입 감지 실패, 기본값 사용:', error.message);
    return 'other';
  }
}

/**
 * 고급 이미지 품질 분석
 * @param {Buffer} buffer - 이미지 버퍼
 * @returns {Promise<Object>} 품질 분석 결과
 */
export async function analyzeImageQuality(buffer) {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const stats = await image.stats();
    
    const { channels } = stats;
    const rAvg = channels[0].mean;
    const gAvg = channels[1].mean;
    const bAvg = channels[2].mean;
    
    const brightness = (rAvg + gAvg + bAvg) / 3;
    const contrast = calculateAdvancedContrast(channels);
    const sharpness = calculateAdvancedSharpness(channels, metadata);
    const noise = calculateNoiseLevel(channels);
    const colorAccuracy = calculateColorAccuracy(channels);
    
    // 고급 품질 지표
    const exposure = calculateExposure(brightness, contrast);
    const composition = calculateComposition(metadata);
    const technicalQuality = calculateTechnicalQuality(sharpness, noise, colorAccuracy);
    
    return {
      // 기본 품질 지표
      isDark: brightness < 80,
      isBright: brightness > 180,
      isLowContrast: contrast < 30,
      isBlurry: sharpness < 15,
      isNoisy: noise > 20,
      
      // 수치적 품질 지표
      brightness: Math.round(brightness),
      contrast: Math.round(contrast),
      sharpness: Math.round(sharpness),
      noise: Math.round(noise),
      colorAccuracy: Math.round(colorAccuracy),
      
      // 고급 품질 지표
      exposure: Math.round(exposure),
      composition: Math.round(composition),
      technicalQuality: Math.round(technicalQuality),
      
      // 메타데이터
      resolution: `${metadata.width}x${metadata.height}`,
      aspectRatio: metadata.width / metadata.height,
      fileSize: buffer.length,
      
      // 품질 등급 (A+, A, B+, B, C)
      qualityGrade: getQualityGrade(technicalQuality, composition)
    };
  } catch (error) {
    console.warn('이미지 품질 분석 실패, 기본값 사용:', error.message);
    return {
      isDark: false,
      isBright: false,
      isLowContrast: false,
      isBlurry: false,
      isNoisy: false,
      brightness: 128,
      contrast: 50,
      sharpness: 20,
      noise: 15,
      colorAccuracy: 70,
      exposure: 65,
      composition: 70,
      technicalQuality: 65,
      qualityGrade: 'B'
    };
  }
}

/**
 * 고급 이미지 타입별 최적 보정 파라미터 생성
 * @param {string} imageType - 이미지 타입
 * @param {Object} quality - 품질 분석 결과
 * @returns {Object} 최적화된 보정 파라미터
 */
export function generateOptimalParameters(imageType, quality) {
  const baseParams = {
    brightness: 1.0,
    saturation: 1.0,
    sharpness: 1.0,
    contrast: 1.0,
    gamma: 1.0,
    noiseReduction: 0.0,
    highlights: 1.0,
    shadows: 1.0,
    whites: 1.0,
    blacks: 1.0
  };
  
  // 이미지 타입별 기본 파라미터 (더 세밀하게 조정)
  switch (imageType) {
    case 'food':
      baseParams.brightness = 1.08;
      baseParams.saturation = 1.15;
      baseParams.sharpness = 1.25;
      baseParams.contrast = 1.08;
      baseParams.gamma = 1.02;
      baseParams.highlights = 1.05;
      baseParams.shadows = 1.1;
      break;
      
    case 'portrait':
      baseParams.brightness = 1.03;
      baseParams.saturation = 0.92;
      baseParams.sharpness = 0.75;
      baseParams.contrast = 1.02;
      baseParams.gamma = 0.98;
      baseParams.noiseReduction = 0.3;
      baseParams.highlights = 0.95;
      baseParams.shadows = 1.05;
      break;
      
    case 'landscape':
      baseParams.brightness = 1.05;
      baseParams.saturation = 1.12;
      baseParams.sharpness = 1.35;
      baseParams.contrast = 1.1;
      baseParams.gamma = 1.03;
      baseParams.highlights = 1.08;
      baseParams.shadows = 1.12;
      break;
      
    case 'document':
      baseParams.brightness = 1.12;
      baseParams.saturation = 0.85;
      baseParams.sharpness = 1.6;
      baseParams.contrast = 1.2;
      baseParams.gamma = 1.05;
      baseParams.noiseReduction = 0.5;
      baseParams.highlights = 1.1;
      baseParams.shadows = 1.15;
      break;
      
    case 'product':
      baseParams.brightness = 1.06;
      baseParams.saturation = 1.08;
      baseParams.sharpness = 1.4;
      baseParams.contrast = 1.12;
      baseParams.gamma = 1.01;
      baseParams.highlights = 1.03;
      baseParams.shadows = 1.08;
      break;
      
    default:
      baseParams.brightness = 1.05;
      baseParams.saturation = 1.05;
      baseParams.sharpness = 1.0;
      baseParams.contrast = 1.05;
      baseParams.gamma = 1.0;
  }
  
  // 품질별 파라미터 조정 (더 정교하게)
  adjustParametersByQuality(baseParams, quality);
  
  // 파라미터 범위 제한 및 최적화
  return optimizeParameters(baseParams);
}

/**
 * 이미지 보정 실행
 * @param {Buffer} buffer - 원본 이미지 버퍼
 * @param {Object} params - 보정 파라미터
 * @returns {Promise<Buffer>} 보정된 이미지 버퍼
 */
export async function enhanceImage(buffer, params) {
  try {
    let image = sharp(buffer);
    
    // 기본 보정 적용
    if (params.brightness !== 1.0) {
      image = image.modulate({
        brightness: params.brightness,
        saturation: params.saturation
      });
    }
    
    if (params.contrast !== 1.0) {
      image = image.linear(params.contrast, 0);
    }
    
    if (params.gamma !== 1.0) {
      image = image.gamma(params.gamma);
    }
    
    // 선명도 보정
    if (params.sharpness !== 1.0) {
      const sigma = Math.max(0.5, (params.sharpness - 1) * 2);
      image = image.sharpen({ sigma });
    }
    
    // 노이즈 감소
    if (params.noiseReduction > 0) {
      image = image.median(Math.ceil(params.noiseReduction * 3));
    }
    
    // 하이라이트/섀도우 보정
    if (params.highlights !== 1.0 || params.shadows !== 1.0) {
      image = image.toneCurve([
        [0, 0],
        [0.25, params.shadows * 0.25],
        [0.75, params.highlights * 0.75],
        [1, 1]
      ]);
    }
    
    return await image.jpeg({ quality: 90 }).toBuffer();
  } catch (error) {
    console.error('이미지 보정 실패:', error.message);
    return buffer; // 실패 시 원본 반환
  }
}

// ===== 고급 헬퍼 함수들 =====

function calculateColorBalance(r, g, b) {
  const total = r + g + b;
  return {
    r: r / total,
    g: g / total,
    b: b / total
  };
}

function calculateSaturation(rStd, gStd, bStd) {
  const avgStd = (rStd + gStd + bStd) / 3;
  return Math.min(100, avgStd * 2);
}

function calculateImageComplexity(stats, metadata) {
  const { channels } = stats;
  const rStd = channels[0].stdev;
  const gStd = channels[1].stdev;
  const bStd = channels[2].stdev;
  
  // 이미지 복잡도 = 색상 변화 + 해상도 복잡도
  const colorComplexity = (rStd + gStd + bStd) / 3;
  const resolutionComplexity = Math.log(metadata.width * metadata.height) / 10;
  
  return colorComplexity + resolutionComplexity;
}

function calculateAdvancedContrast(channels) {
  const rStd = channels[0].stdev;
  const gStd = channels[1].stdev;
  const bStd = channels[2].stdev;
  
  // 가중 평균을 사용한 대비 계산
  return (rStd * 0.299 + gStd * 0.587 + bStd * 0.114);
}

function calculateAdvancedSharpness(channels, metadata) {
  const rStd = channels[0].stdev;
  const gStd = channels[1].stdev;
  const bStd = channels[2].stdev;
  
  // 해상도를 고려한 선명도 계산
  const baseSharpness = (rStd + gStd + bStd) / 3;
  const resolutionFactor = Math.min(1.5, Math.log(metadata.width * metadata.height) / 15);
  
  return baseSharpness * resolutionFactor;
}

function calculateNoiseLevel(channels) {
  const rStd = channels[0].stdev;
  const gStd = channels[1].stdev;
  const bStd = channels[2].stdev;
  
  // 노이즈 레벨 = 채널별 표준편차의 변동성
  const avgStd = (rStd + gStd + bStd) / 3;
  const variance = Math.pow(rStd - avgStd, 2) + Math.pow(gStd - avgStd, 2) + Math.pow(bStd - avgStd, 2);
  
  return Math.sqrt(variance / 3);
}

function calculateColorAccuracy(channels) {
  const rStd = channels[0].stdev;
  const gStd = channels[1].stdev;
  const bStd = channels[2].stdev;
  
  // 색상 정확도 = 채널 간 균형
  const avgStd = (rStd + gStd + bStd) / 3;
  const balance = 1 - Math.abs(rStd - avgStd) / avgStd - Math.abs(gStd - avgStd) / avgStd - Math.abs(bStd - avgStd) / avgStd;
  
  return Math.max(0, balance * 100);
}

function calculateExposure(brightness, contrast) {
  // 노출 = 밝기와 대비의 조합
  const brightnessScore = Math.min(100, brightness * 0.5);
  const contrastScore = Math.min(100, contrast * 0.5);
  
  return (brightnessScore + contrastScore) / 2;
}

function calculateComposition(metadata) {
  const { width, height } = metadata;
  const aspectRatio = width / height;
  
  // 황금비율(1.618)에 가까울수록 높은 점수
  const goldenRatio = 1.618;
  const ratioScore = 100 - Math.abs(aspectRatio - goldenRatio) * 20;
  
  // 해상도 점수
  const resolutionScore = Math.min(100, Math.log(width * height) / 10 * 20);
  
  return Math.max(0, Math.min(100, (ratioScore + resolutionScore) / 2));
}

function calculateTechnicalQuality(sharpness, noise, colorAccuracy) {
  // 기술적 품질 = 선명도 + 노이즈 제거 + 색상 정확도
  const sharpnessScore = Math.min(100, sharpness * 2);
  const noiseScore = Math.max(0, 100 - noise * 2);
  const colorScore = colorAccuracy;
  
  return (sharpnessScore + noiseScore + colorScore) / 3;
}

function getQualityGrade(technicalQuality, composition) {
  const totalScore = (technicalQuality + composition) / 2;
  
  if (totalScore >= 90) return 'A+';
  if (totalScore >= 80) return 'A';
  if (totalScore >= 70) return 'B+';
  if (totalScore >= 60) return 'B';
  return 'C';
}

// ===== 이미지 타입 판별 함수들 강화 =====

function isFoodImage(r, g, b, variance, saturation, complexity) {
  const warmTone = r > g && g > b;
  const highSaturation = saturation > 60;
  const mediumComplexity = complexity > 20 && complexity < 50;
  const warmColorBalance = r > 140 && g > 120;
  
  return warmTone && highSaturation && mediumComplexity && warmColorBalance;
}

function isPortraitImage(r, g, b, variance, metadata, complexity) {
  const portraitRatio = metadata.height > metadata.width * 1.1;
  const mediumSaturation = variance > 15 && variance < 35;
  const lowComplexity = complexity < 40;
  const skinTone = Math.abs(r - g) < 20 && Math.abs(g - b) < 20;
  
  return portraitRatio && mediumSaturation && lowComplexity && skinTone;
}

function isLandscapeImage(r, g, b, variance, metadata, complexity) {
  const landscapeRatio = metadata.width > metadata.height * 1.1;
  const highSaturation = variance > 25;
  const highComplexity = complexity > 30;
  const naturalColors = g > r * 0.8 && g > b * 0.8;
  
  return landscapeRatio && highSaturation && highComplexity && naturalColors;
}

function isDocumentImage(brightness, variance, complexity) {
  const highBrightness = brightness > 160;
  const lowVariance = variance < 25;
  const lowComplexity = complexity < 30;
  const documentRatio = brightness / variance > 8;
  
  return highBrightness && lowVariance && lowComplexity && documentRatio;
}

function isProductImage(colorBalance, saturation, complexity, metadata) {
  const balancedColors = Math.abs(colorBalance.r - colorBalance.g) < 0.1 && 
                        Math.abs(colorBalance.g - colorBalance.b) < 0.1;
  const mediumSaturation = saturation > 40 && saturation < 80;
  const mediumComplexity = complexity > 25 && complexity < 60;
  const squareRatio = Math.abs(metadata.width / metadata.height - 1) < 0.2;
  
  return balancedColors && mediumSaturation && mediumComplexity && squareRatio;
}

// ===== 파라미터 조정 함수들 =====

function adjustParametersByQuality(params, quality) {
  // 밝기 조정
  if (quality.isDark) {
    params.brightness *= 1.2;
    params.shadows *= 1.15;
    params.gamma *= 0.95;
  } else if (quality.isBright) {
    params.brightness *= 0.9;
    params.highlights *= 0.9;
    params.gamma *= 1.05;
  }
  
  // 대비 조정
  if (quality.isLowContrast) {
    params.contrast *= 1.25;
    params.sharpness *= 1.15;
    params.shadows *= 1.1;
    params.highlights *= 1.1;
  }
  
  // 선명도 조정
  if (quality.isBlurry) {
    params.sharpness *= 1.4;
    params.contrast *= 1.15;
    params.noiseReduction *= 0.8; // 선명도 향상을 위해 노이즈 감소 줄임
  }
  
  // 노이즈 조정
  if (quality.isNoisy) {
    params.noiseReduction = Math.max(params.noiseReduction, 0.4);
    params.sharpness *= 0.9; // 노이즈가 많을 때는 선명도 줄임
  }
  
  // 품질 등급별 조정
  if (quality.qualityGrade === 'A+') {
    // 이미 좋은 품질이면 미세 조정만
    params.brightness *= 1.02;
    params.saturation *= 1.03;
  } else if (quality.qualityGrade === 'C') {
    // 낮은 품질이면 강한 보정
    params.brightness *= 1.15;
    params.contrast *= 1.2;
    params.sharpness *= 1.3;
    params.noiseReduction = Math.max(params.noiseReduction, 0.6);
  }
}

function optimizeParameters(params) {
  // 파라미터 범위 제한 및 최적화
  const optimized = {};
  
  for (const [key, value] of Object.entries(params)) {
    let optimizedValue = value;
    
    switch (key) {
      case 'brightness':
        optimizedValue = Math.max(0.5, Math.min(2.0, value));
        break;
      case 'saturation':
        optimizedValue = Math.max(0.3, Math.min(2.0, value));
        break;
      case 'sharpness':
        optimizedValue = Math.max(0.3, Math.min(2.5, value));
        break;
      case 'contrast':
        optimizedValue = Math.max(0.5, Math.min(2.0, value));
        break;
      case 'gamma':
        optimizedValue = Math.max(0.7, Math.min(1.5, value));
        break;
      case 'noiseReduction':
        optimizedValue = Math.max(0.0, Math.min(1.0, value));
        break;
      case 'highlights':
      case 'shadows':
      case 'whites':
      case 'blacks':
        optimizedValue = Math.max(0.5, Math.min(1.5, value));
        break;
    }
    
    // 소수점 둘째 자리까지 반올림
    optimized[key] = Math.round(optimizedValue * 100) / 100;
  }
  
  return optimized;
}
