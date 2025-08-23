import sharp from 'sharp';
import { detectImageType, analyzeImageQuality, generateOptimalParameters } from './smartImageAnalysisService.js';

/**
 * 스마트 이미지 자동 보정: 이미지 타입과 품질을 분석하여 최적화된 보정 적용
 * @param {Buffer} buffer - 원본 이미지 버퍼
 * @param {Object} options - 옵션
 * @param {number} options.maxSize - 긴 변 기준 최대 픽셀 (기본값: 1600)
 * @returns {Promise<Object>} 보정된 이미지 버퍼와 분석 정보
 */
export async function smartEnhanceImage(buffer, { maxSize = 1600 } = {}) {
  try {
    const image = sharp(buffer, { failOn: "none" });

    // 1단계: 이미지 분석
    const [imageType, quality] = await Promise.all([
      detectImageType(buffer),
      analyzeImageQuality(buffer)
    ]);

    // 2단계: 최적 파라미터 생성
    const params = generateOptimalParameters(imageType, quality);

    // 3단계: 메타데이터 분석
    const metadata = await image.metadata();
    const width = metadata.width ?? maxSize;
    const height = metadata.height ?? maxSize;
    const longer = Math.max(width, height);
    const scale = longer > maxSize ? maxSize / longer : 1;

    // 4단계: 스마트 보정 적용
    const enhanced = await image
      .rotate()                 // EXIF 기반 회전 교정
      .resize(Math.round(width * scale), Math.round(height * scale), { fit: "inside" })
      .normalize()              // 채널 정규화
      .modulate({ 
        brightness: params.brightness, 
        saturation: params.saturation 
      })
      .sharpen(params.sharpness)  // 동적 샤프닝
      .toFormat("webp", { quality: 88 })
      .toBuffer();

    // 5단계: 결과 반환
    return {
      enhancedImage: enhanced,
      analysis: {
        imageType,
        quality,
        parameters: params,
        originalSize: buffer.length,
        enhancedSize: enhanced.length,
        compressionRate: ((1 - enhanced.length / buffer.length) * 100).toFixed(1)
      }
    };

  } catch (error) {
    throw new Error(`스마트 이미지 보정 실패: ${error.message}`);
  }
}

/**
 * 기존 자동 보정 (하위 호환성 유지)
 * @param {Buffer} buffer - 원본 이미지 버퍼
 * @param {Object} options - 옵션
 * @param {number} options.maxSize - 긴 변 기준 최대 픽셀 (기본값: 1600)
 * @returns {Promise<Buffer>} 보정된 이미지 버퍼
 */
export async function autoEnhanceImage(buffer, { maxSize = 1600 } = {}) {
  try {
    const image = sharp(buffer, { failOn: "none" });

    const metadata = await image.metadata();
    const width = metadata.width ?? maxSize;
    const height = metadata.height ?? maxSize;
    const longer = Math.max(width, height);
    const scale = longer > maxSize ? maxSize / longer : 1;

    const out = await image
      .rotate()                 // EXIF 기반 회전 교정
      .resize(Math.round(width * scale), Math.round(height * scale), { fit: "inside" })
      .normalize()              // 채널 정규화(가벼운 대비 향상)
      .modulate({ brightness: 1.05, saturation: 1.05 }) // 살짝 밝기/채도
      .sharpen()                // 기본 샤픈
      .toFormat("webp", { quality: 88 })
      .toBuffer();

    return out;
  } catch (error) {
    throw new Error(`이미지 보정 실패: ${error.message}`);
  }
}

/**
 * 이미지 썸네일 생성
 * @param {Buffer} buffer - 원본 이미지 버퍼
 * @param {number} size - 썸네일 크기 (기본값: 300)
 * @returns {Promise<Buffer>} 썸네일 이미지 버퍼
 */
export async function createThumbnail(buffer, size = 300) {
  try {
    return await sharp(buffer)
      .resize(size, size, { fit: "cover" })
      .toFormat("webp", { quality: 80 })
      .toBuffer();
  } catch (error) {
    throw new Error(`썸네일 생성 실패: ${error.message}`);
  }
}
