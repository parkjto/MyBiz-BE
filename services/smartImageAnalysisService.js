import sharp from 'sharp';

/**
 * 이미지 타입 자동 감지
 * @param {Buffer} buffer - 이미지 버퍼
 * @returns {Promise<string>} 이미지 타입 ('food', 'portrait', 'landscape', 'document', 'other')
 */
export async function detectImageType(buffer) {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    // 이미지 통계 분석
    const stats = await image.stats();
    const { channels } = stats;
    
    // RGB 채널별 평균값
    const rAvg = channels[0].mean;
    const gAvg = channels[1].mean;
    const bAvg = channels[2].mean;
    
    // 채널별 표준편차 (대비 분석)
    const rStd = channels[0].stdev;
    const gStd = channels[1].stdev;
    const bStd = channels[2].stdev;
    
    // 색상 분포 분석
    const colorVariance = (rStd + gStd + bStd) / 3;
    const brightness = (rAvg + gAvg + bAvg) / 3;
    
    // 이미지 타입 판별 로직
    if (isFoodImage(rAvg, gAvg, bAvg, colorVariance)) {
      return 'food';
    } else if (isPortraitImage(rAvg, gAvg, bAvg, colorVariance, metadata)) {
      return 'portrait';
    } else if (isLandscapeImage(rAvg, gAvg, bAvg, colorVariance, metadata)) {
      return 'landscape';
    } else if (isDocumentImage(brightness, colorVariance)) {
      return 'document';
    } else {
      return 'other';
    }
  } catch (error) {
    console.warn('이미지 타입 감지 실패, 기본값 사용:', error.message);
    return 'other';
  }
}

/**
 * 이미지 품질 분석
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
    const contrast = calculateContrast(channels);
    const sharpness = calculateSharpness(channels);
    
    return {
      isDark: brightness < 80,
      isBright: brightness > 180,
      isLowContrast: contrast < 30,
      isBlurry: sharpness < 15,
      brightness: Math.round(brightness),
      contrast: Math.round(contrast),
      sharpness: Math.round(sharpness),
      resolution: `${metadata.width}x${metadata.height}`,
      aspectRatio: metadata.width / metadata.height
    };
  } catch (error) {
    console.warn('이미지 품질 분석 실패, 기본값 사용:', error.message);
    return {
      isDark: false,
      isBright: false,
      isLowContrast: false,
      isBlurry: false,
      brightness: 128,
      contrast: 50,
      sharpness: 20
    };
  }
}

/**
 * 이미지 타입별 최적 보정 파라미터 생성
 * @param {string} imageType - 이미지 타입
 * @param {Object} quality - 품질 분석 결과
 * @returns {Object} 최적화된 보정 파라미터
 */
export function generateOptimalParameters(imageType, quality) {
  const baseParams = {
    brightness: 1.0,
    saturation: 1.0,
    sharpness: 1.0,
    contrast: 1.0
  };
  
  // 이미지 타입별 기본 파라미터
  switch (imageType) {
    case 'food':
      baseParams.brightness = 1.08;
      baseParams.saturation = 1.12;
      baseParams.sharpness = 1.2;
      baseParams.contrast = 1.05;
      break;
      
    case 'portrait':
      baseParams.brightness = 1.03;
      baseParams.saturation = 0.95;
      baseParams.sharpness = 0.8;
      baseParams.contrast = 1.02;
      break;
      
    case 'landscape':
      baseParams.brightness = 1.05;
      baseParams.saturation = 1.08;
      baseParams.sharpness = 1.3;
      baseParams.contrast = 1.08;
      break;
      
    case 'document':
      baseParams.brightness = 1.1;
      baseParams.saturation = 0.9;
      baseParams.sharpness = 1.5;
      baseParams.contrast = 1.15;
      break;
      
    default:
      baseParams.brightness = 1.05;
      baseParams.saturation = 1.05;
      baseParams.sharpness = 1.0;
      baseParams.contrast = 1.05;
  }
  
  // 품질별 파라미터 조정
  if (quality.isDark) {
    baseParams.brightness *= 1.15;
    baseParams.contrast *= 1.1;
  } else if (quality.isBright) {
    baseParams.brightness *= 0.95;
    baseParams.contrast *= 0.9;
  }
  
  if (quality.isLowContrast) {
    baseParams.contrast *= 1.2;
    baseParams.sharpness *= 1.1;
  }
  
  if (quality.isBlurry) {
    baseParams.sharpness *= 1.3;
    baseParams.contrast *= 1.1;
  }
  
  // 파라미터 범위 제한 (0.5 ~ 2.0)
  return {
    brightness: Math.max(0.5, Math.min(2.0, baseParams.brightness)),
    saturation: Math.max(0.5, Math.min(2.0, baseParams.saturation)),
    sharpness: Math.max(0.5, Math.min(2.0, baseParams.sharpness)),
    contrast: Math.max(0.5, Math.min(2.0, baseParams.contrast))
  };
}

// 헬퍼 함수들
function isFoodImage(r, g, b, variance) {
  // 음식 이미지 특징: 높은 채도, 따뜻한 색조
  const warmTone = r > g && g > b;
  const highSaturation = variance > 25;
  return warmTone && highSaturation;
}

function isPortraitImage(r, g, b, variance, metadata) {
  // 인물 이미지 특징: 세로 비율, 중간 채도
  const portraitRatio = metadata.height > metadata.width * 1.2;
  const mediumSaturation = variance > 15 && variance < 30;
  return portraitRatio && mediumSaturation;
}

function isLandscapeImage(r, g, b, variance, metadata) {
  // 풍경 이미지 특징: 가로 비율, 높은 채도
  const landscapeRatio = metadata.width > metadata.height * 1.2;
  const highSaturation = variance > 25;
  return landscapeRatio && highSaturation;
}

function isDocumentImage(brightness, variance) {
  // 문서 이미지 특징: 높은 밝기, 낮은 채도
  return brightness > 150 && variance < 20;
}

function calculateContrast(channels) {
  const rStd = channels[0].stdev;
  const gStd = channels[1].stdev;
  const bStd = channels[2].stdev;
  return (rStd + gStd + bStd) / 3;
}

function calculateSharpness(channels) {
  // 채널별 표준편차의 합으로 선명도 추정
  const rStd = channels[0].stdev;
  const gStd = channels[1].stdev;
  const bStd = channels[2].stdev;
  return (rStd + gStd + bStd) / 3;
}
