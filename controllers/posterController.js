import { generateDynamicQuestions, analyzeStorePhotoBase64, generateAllPosters, getMoodColorPresets, getPosterPurposePresets, generatePosterBackground, buildTextLayout } from '../services/openaiService.js';
import sharp from 'sharp';

/**
 * Step 1: 이미지 분석(Optional) + 질문 생성
 * - 토큰 절약: 비전 호출은 필요할 때만 수행
 * 입력: multipart/form-data image (선택), 또는 imageAnalysis JSON
 */
export const analyzeAndAsk = async (req, res, next) => {
  try {
    const hasImage = Boolean(req.file);
    const providedAnalysis = req.body?.imageAnalysis ? JSON.parse(req.body.imageAnalysis) : null;

    let imageAnalysis = providedAnalysis || null;

    if (!imageAnalysis && hasImage) {
      const base64 = req.file.buffer.toString('base64');
      imageAnalysis = await analyzeStorePhotoBase64(base64);
    }

    // 분석을 건너뛴 경우에도 빈 구조를 반환
    imageAnalysis = imageAnalysis || {
      business_type: '기타',
      main_products: [],
      atmosphere: '모던',
      color_palette: [],
      recommended_slogans: []
    };

    const questions = generateDynamicQuestions(imageAnalysis);

    return res.json({ step: 'questions', image_analysis: imageAnalysis, questions });
  } catch (error) {
    return next(error);
  }
};

/**
 * 무드/컬러 프리셋 목록 조회 (기존 호환성)
 */
export const getPresets = async (req, res, next) => {
  try {
    const presets = getMoodColorPresets();
    return res.json({ presets });
  } catch (error) {
    return next(error);
  }
};

/**
 * 포스터 용도별 프리셋 목록 조회 (새로운 시스템)
 */
export const getPurposePresets = async (req, res, next) => {
  try {
    const presets = getPosterPurposePresets();
    return res.json({ presets });
  } catch (error) {
    return next(error);
  }
};

/**
 * 단일 포스터 생성(선택 무드/컬러 반영, 스타일 1개)
 * 입력: { style, user_inputs{brand_name, main_product, slogan?, event_info?, contact_info?, color_preference?}, image_analysis? , vibe? , colors?[] }
 */
export const generateSinglePoster = async (req, res, next) => {
  try {
    const { style = 'sns', user_inputs = {}, image_analysis = {}, vibe, colors, preset_key, purpose_key } = req.body || {};

    // preset 우선 적용 (기존 시스템)
    let resolvedPreset = null;
    if (preset_key) {
      const presets = getMoodColorPresets();
      resolvedPreset = presets.find(p => p.key === String(preset_key));
    }

    // purpose 프리셋 적용 (새로운 시스템)
    let resolvedPurpose = null;
    if (purpose_key) {
      const purposePresets = getPosterPurposePresets();
      resolvedPurpose = purposePresets.find(p => p.key === String(purpose_key));
    }

    const resolvedVibe = resolvedPurpose?.vibe || resolvedPreset?.vibe || vibe || user_inputs.vibe || image_analysis?.atmosphere || '';
    const resolvedColors = (resolvedPurpose?.colors && resolvedPurpose.colors.length ? resolvedPurpose.colors : null) || (resolvedPreset?.colors && resolvedPreset.colors.length ? resolvedPreset.colors : null) || (Array.isArray(colors) ? colors : null) || null;

    const user = {
      brandName: user_inputs.brand_name || user_inputs.brandName,
      mainProduct: user_inputs.main_product || user_inputs.mainProduct,
      slogan: user_inputs.slogan || '',
      eventInfo: user_inputs.event_info || user_inputs.eventInfo || '',
      contactInfo: user_inputs.contact_info || user_inputs.contactInfo || '',
      purpose: resolvedPurpose?.key || user_inputs.purpose,
      colorPreference: (resolvedColors && resolvedColors[0]) || user_inputs.color_preference || user_inputs.colorPreference || '',
      vibe: resolvedVibe
    };

    const bg = await generatePosterBackground(style, user, image_analysis);
    const textLayout = buildTextLayout(style, user);

    return res.json({
      style,
      poster: {
        background_url: bg.url || '',
        background_b64: bg.b64 || '',
        text_layout: textLayout
      },
      user_data: user,
      selected_preset: resolvedPreset ? {
        key: resolvedPreset.key,
        label: resolvedPreset.label,
        vibe: resolvedPreset.vibe,
        colors: resolvedPreset.colors
      } : null,
      selected_purpose: resolvedPurpose ? {
        key: resolvedPurpose.key,
        label: resolvedPurpose.label,
        description: resolvedPurpose.description,
        vibe: resolvedPurpose.vibe,
        colors: resolvedPurpose.colors
      } : null
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 단일 포스터 합성(원본 사진 위에 텍스트 오버레이) - Before/After 반환
 * 입력: multipart/form-data image + JSON 필드(style, preset_key|vibe/colors, user_inputs, image_analysis?)
 * 반환: { before_b64, after_b64, selected_preset? }
 */
export const generateSingleComposite = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'IMAGE_REQUIRED', message: 'image 파일이 필요합니다.' });
    }

    const { style = 'sns', preset_key, vibe, colors } = req.body || {};
    const user_inputs = req.body.user_inputs ? JSON.parse(req.body.user_inputs) : {
      brand_name: req.body.brand_name,
      main_product: req.body.main_product,
      slogan: req.body.slogan,
      event_info: req.body.event_info,
      contact_info: req.body.contact_info
    };
    const image_analysis = req.body.image_analysis ? JSON.parse(req.body.image_analysis) : {};

    // preset 우선 적용
    let resolvedPreset = null;
    if (preset_key) {
      const presets = getMoodColorPresets();
      resolvedPreset = presets.find(p => p.key === String(preset_key));
    }

    const resolvedVibe = resolvedPreset?.vibe || vibe || user_inputs.vibe || image_analysis?.atmosphere || '';
    const resolvedColors = (resolvedPreset?.colors && resolvedPreset.colors.length ? resolvedPreset.colors : null) || (Array.isArray(colors) ? colors : null) || null;

    const user = {
      brandName: user_inputs.brand_name || user_inputs.brandName,
      mainProduct: user_inputs.main_product || user_inputs.mainProduct,
      slogan: user_inputs.slogan || '',
      eventInfo: user_inputs.event_info || user_inputs.eventInfo || '',
      contactInfo: user_inputs.contact_info || user_inputs.contactInfo || '',
      colorPreference: (resolvedColors && resolvedColors[0]) || user_inputs.color_preference || user_inputs.colorPreference || '',
      vibe: resolvedVibe
    };

    // 원본 자동 보정(밝기/채도/샤픈) 후 합성 → 미관 향상
    const inputBuffer = req.file.buffer;
    const baseBuffer = await sharp(inputBuffer, { failOn: 'none' })
      .rotate()
      .normalize()
      .modulate({ brightness: 1.06, saturation: 1.08 })
      .sharpen()
      .toBuffer();

    // 메타 및 캔버스 크기 (세로 1:1.5 고정 = 1024x1536)
    const src = sharp(baseBuffer, { failOn: 'none' });
    const meta = await src.metadata();
    const srcW = meta.width || 1024;
    const srcH = meta.height || 1024;
    const width = 1024;
    const height = 1536;

    // 배경: 원본을 cover로 깔고 블러/살짝 보정
    const bgBuffer = await sharp(baseBuffer, { failOn: 'none' })
      .resize(width, height, { fit: 'cover' })
      .blur(20)
      .modulate({ brightness: 1.02, saturation: 1.02 })
      .toBuffer();

    // 전경: 원본을 contain으로 맞춰 전체가 보이게 중앙 배치
    const scale = Math.min(width / srcW, height / srcH);
    const fgW = Math.max(1, Math.round(srcW * scale));
    const fgH = Math.max(1, Math.round(srcH * scale));
    const offsetX = Math.floor((width - fgW) / 2);
    const offsetY = Math.floor((height - fgH) / 2);
    const fgBuffer = await sharp(baseBuffer, { failOn: 'none' })
      .resize(fgW, fgH, { fit: 'contain' })
      .toBuffer();

    // 레이아웃 산출
    const layout = buildTextLayout(style, user);

    // SVG 오버레이 생성 (좌표계 [0..1] → px)
    function esc(t){ return String(t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function svgText(node){
      if (!node || !node.text) return '';
      const x = Math.round(node.position.x * width);
      const y = Math.round(node.position.y * height);
      // 기준 해상도 대비 폰트 스케일 (기본 1024 기준)
      const fontPx = Math.max(16, Math.round((node.font_size || 32) * (Math.min(width, height) / 1024)));
      const weight = node.style === 'bold' ? 700 : 400;
      const fill = node.color || '#FFFFFF';
      const anchor = node.align === 'right' ? 'end' : (node.align === 'center' ? 'middle' : 'start');
      // 텍스트 가독성 향상: 그림자+스트로크 적용
      return `<text x="${x}" y="${y}" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif" font-size="${fontPx}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" filter="url(#shadow)" stroke="#000" stroke-width="2" stroke-opacity="0.45" paint-order="stroke fill">${esc(node.text)}</text>`;
    }

    // 상/하단 그라디언트 바 추가(텍스트 영역 가독성 ↑)
    const gradHeight = Math.round(height * 0.22);
    const svg = Buffer.from(
      `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradTop" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#000" stop-opacity="0.38"/>
            <stop offset="100%" stop-color="#000" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="gradBottom" x1="0" x2="0" y1="1" y2="0">
            <stop offset="0%" stop-color="#000" stop-opacity="0.38"/>
            <stop offset="100%" stop-color="#000" stop-opacity="0"/>
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.6"/>
            <feOffset dx="0" dy="1" result="offsetblur"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="100%" height="${gradHeight}" fill="url(#gradTop)"/>
        <rect y="${height - gradHeight}" width="100%" height="${gradHeight}" fill="url(#gradBottom)"/>
        ${svgText(layout.title)}
        ${svgText(layout.subtitle)}
        ${svgText(layout.meta1)}
      </svg>`
    );

    // 합성: 배경 + 전경(원본) + 텍스트
    const after = await sharp(bgBuffer, { failOn: 'none' })
      .composite([
        { input: fgBuffer, top: offsetY, left: offsetX },
        { input: svg, top: 0, left: 0 }
      ])
      .toFormat('webp', { quality: 90 })
      .toBuffer();

    return res.json({
      after_b64: after.toString('base64'),
      selected_preset: resolvedPreset ? {
        key: resolvedPreset.key,
        label: resolvedPreset.label,
        vibe: resolvedPreset.vibe,
        colors: resolvedPreset.colors
      } : null
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Step 2: 최종 포스터 4종 생성 (LLM 토큰 사용 없음; 이미지 모델 사용)
 * 입력: user_inputs(JSON), image_analysis(JSON 선택)
 */
// generateFinalPosters 제거 (단일 생성만 유지)

/**
 * 파일 저장 없이 다운로드만 제공하는 프록시
 * - url이 있으면 원격 이미지를 가져와 스트리밍
 * - b64가 있으면 디코드하여 전송
 */
export const downloadPoster = async (req, res, next) => {
  try {
    const { url, b64, filename, mime } = req.query || {};

    const safeName = String(filename || 'poster.webp').replace(/[^\w\-.]/g, '_');
    const contentType = String(mime || (safeName.endsWith('.png') ? 'image/png' : safeName.endsWith('.jpg') || safeName.endsWith('.jpeg') ? 'image/jpeg' : 'image/webp'));

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

    if (url) {
      const resp = await fetch(String(url));
      if (!resp.ok) throw new Error(`원격 이미지 요청 실패: ${resp.status}`);
      const arrayBuffer = await resp.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }

    if (b64) {
      const buffer = Buffer.from(String(b64), 'base64');
      return res.send(buffer);
    }

    return res.status(400).json({ error: 'INVALID_INPUT', message: 'url 또는 b64 쿼리 파라미터가 필요합니다.' });
  } catch (error) {
    return next(error);
  }
};


