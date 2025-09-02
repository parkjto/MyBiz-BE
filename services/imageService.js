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

/**
 * 광고 합성 이미지 생성: 선택적 블러/그라데이션 + 텍스트 오버레이
 * @param {Buffer} buffer - 원본 또는 보정된 이미지 버퍼
 * @param {Object} layout - 레이아웃 메타 (position: 0~1 비율, font_size(px), color)
 * @param {Object} options - { blur:boolean|number, gradient:boolean, maxSize:number }
 * @returns {Promise<Buffer>} 합성된 WEBP 버퍼
 */
export async function composeAdImage(buffer, layout, options = {}) {
  // 기본값: 사진 식별성 보존을 위해 blur 최소, gradient 비활성
  const { blur = 2, gradient = false, maxSize = 1600 } = options;
  try {
    const base = sharp(buffer, { failOn: "none" }).rotate();
    const meta = await base.metadata();
    const width = meta.width ?? maxSize;
    const height = meta.height ?? maxSize;
    const longer = Math.max(width, height);
    const scale = longer > maxSize ? maxSize / longer : 1;

    let canvas = await base
      .resize(Math.round(width * scale), Math.round(height * scale), { fit: "inside" })
      .toFormat("webp", { quality: 92 })
      .toBuffer();

    const sized = await sharp(canvas).metadata();
    const W = sized.width || Math.round(width * scale);
    const H = sized.height || Math.round(height * scale);

    const composites = [];

    // 배경 블러 레이어 (최소값으로 사진 식별성 유지)
    if (blur && blur > 0) {
      const sigma = typeof blur === 'number' ? Math.min(Math.max(blur, 1), 5) : 2;
      const blurred = await sharp(canvas).blur(sigma).toBuffer();
      composites.push({ input: blurred, blend: 'over' });
    }

    // 전체 그라데이션(선택) - 약하게 적용
    if (gradient) {
      const gradSVG = `<?xml version="1.0" encoding="UTF-8"?>
        <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#000000" stop-opacity="0.25" />
              <stop offset="40%" stop-color="#000000" stop-opacity="0.12" />
              <stop offset="100%" stop-color="#000000" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)" />
        </svg>`;
      composites.push({ input: Buffer.from(gradSVG), top: 0, left: 0, blend: 'over' });
    }

    // 텍스트 SVG 생성
    const px = (ratio) => Math.round(ratio * (ratio <= 1 ? W : 1));
    function toPxX(r) { return Math.round((r || 0) * W); }
    function toPxY(r) { return Math.round((r || 0) * H); }

    const title = layout?.title || {};
    const slogan = layout?.slogan || {};
    const cta = layout?.call_to_action || {};
    const hook = layout?.emotional_hook || {};

    const makeText = (t) => (t && t.text ? String(t.text) : '');
    const safeColor = (c, def) => (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c || '') ? c : def);
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
    const sanitize = (text) => String(text || '')
      .replace(/[\p{Extended_Pictographic}\p{Symbol}]+/gu, '')
      .replace(/["'`~^_|<>\[\]{}]/g, '')
      .trim();

    function wrapText(str, fontPx, maxWidthPx) {
      const text = sanitize(str);
      if (!text) return [];
      const approxCharPx = fontPx * 0.6;
      const maxChars = Math.max(4, Math.floor(maxWidthPx / approxCharPx));
      const words = text.split(/\s+/);
      const lines = [];
      let current = '';
      for (const w of words) {
        const tentative = current ? current + ' ' + w : w;
        if (tentative.length <= maxChars) {
          current = tentative;
        } else {
          if (current) lines.push(current);
          if (w.length > maxChars) {
            let i = 0;
            while (i < w.length) {
              lines.push(w.slice(i, i + maxChars));
              i += maxChars;
            }
            current = '';
          } else {
            current = w;
          }
        }
      }
      if (current) lines.push(current);
      return lines.slice(0, 3);
    }

    const marginX = Math.round(W * 0.05);
    const marginY = Math.round(H * 0.06);
    const maxTextWidth = Math.round(W * 0.9);
    function safeX(ratio) { return clamp(toPxX(ratio ?? 0.06), marginX, W - marginX); }
    function safeY(ratio) { return clamp(toPxY(ratio ?? 0.16), marginY, H - marginY); }

    const titleX = safeX(title.position?.x);
    const titleY = safeY(title.position?.y);
    const sloganX = safeX(slogan.position?.x ?? 0.06);
    const sloganY = safeY(slogan.position?.y ?? 0.25);
    const ctaX = safeX(cta.position?.x ?? 0.06);
    const ctaY = safeY(cta.position?.y ?? 0.78);
    const hookX = safeX(hook.position?.x ?? 0.06);
    const hookY = safeY(hook.position?.y ?? 0.88);

    const titleFont = title.font_size || 120;
    const sloganFont = slogan.font_size || 44;
    const ctaFont = cta.font_size || 56;
    const hookFont = hook.font_size || 32;

    // 섹션별 최대 줄수 제한 + 말줄임표 처리
    function limitLines(lines, max) {
      if (lines.length <= max) return lines;
      const limited = lines.slice(0, Math.max(0, max));
      if (limited.length > 0) {
        limited[limited.length - 1] = limited[limited.length - 1].replace(/\s+$/, '') + '…';
      }
      return limited;
    }

    // 하드 트렁케이션(과도한 길이 방지) + 스마트 요약
    const hardTruncate = (text, maxChars) => {
      const t = sanitize(text);
      if (t.length <= maxChars) return t;
      
      // 스마트 요약: 문장의 핵심 부분만 추출
      const words = t.split(/\s+/);
      if (words.length > 3) {
        // 핵심 단어들만 선택 (첫 2-3개 단어)
        const coreWords = words.slice(0, Math.min(3, Math.floor(maxChars / 4)));
        const core = coreWords.join(' ');
        if (core.length <= maxChars - 1) {
          return core + '…';
        }
      }
      
      // 일반적인 자르기
      return t.slice(0, maxChars - 1).trim() + '…';
    };

    // 섹션별 글자 크기와 길이에 따른 동적 배치 + 오버플로우 방지
    function getDynamicPosition(baseX, baseY, fontPx, textLength, section) {
      const charWidth = fontPx * 0.6;
      const textWidth = textLength * charWidth;
      const availWidth = W - baseX - marginX;
      
      // 1단계: 기본 위치 계산
      let finalX = baseX;
      let finalY = baseY;
      
      // 2단계: 텍스트 길이에 따른 X 위치 최적화
      if (textWidth > availWidth * 0.8) {
        // 매우 긴 텍스트는 중앙 정렬 (80% 초과)
        finalX = Math.round((W - textWidth) / 2);
      } else if (textWidth > availWidth * 0.6) {
        // 긴 텍스트는 중앙 정렬 (60% 초과)
        finalX = Math.round((W - textWidth) / 2);
      } else if (textLength > 15) {
        // 중간 길이 텍스트는 약간 우측으로
        finalX = Math.round(baseX + (availWidth - textWidth) * 0.2);
      }
      
      // 3단계: 오버플로우 방지 (절대 화면 밖으로 나가지 않도록)
      finalX = clamp(finalX, marginX, W - textWidth - marginX);
      
      // 4단계: 섹션별 Y 위치 조정 (폰트 크기와 라인 수 고려)
      if (section === 'title' && fontPx > 100) {
        finalY = Math.max(marginY + fontPx, baseY);
      } else if (section === 'cta' && fontPx > 50) {
        finalY = Math.min(baseY, H - marginY - fontPx * 2);
      } else if (section === 'hook' && fontPx > 30) {
        finalY = Math.min(baseY, H - marginY - fontPx * 1.5);
      }
      
      // 5단계: Y 오버플로우 방지
      finalY = clamp(finalY, marginY + fontPx, H - marginY - fontPx);
      
      return { x: finalX, y: finalY };
    }

    // 섹션별 가용 폭 계산 (동적 배치 고려)
    const titlePos = getDynamicPosition(titleX, titleY, titleFont, makeText(title).length, 'title');
    const sloganPos = getDynamicPosition(sloganX, sloganY, sloganFont, makeText(slogan).length, 'slogan');
    const ctaPos = getDynamicPosition(ctaX, ctaY, ctaFont, makeText(cta).length, 'cta');
    const hookPos = getDynamicPosition(hookX, hookY, hookFont, makeText(hook).length, 'hook');

    const availTitleWidth = Math.max(80, W - titlePos.x - marginX);
    const availSloganWidth = Math.max(80, W - sloganPos.x - marginX);
    const availCtaWidth = Math.max(80, W - ctaPos.x - marginX);
    const availHookWidth = Math.max(80, W - hookPos.x - marginX);

    // 폰트 자동 축소(최대 15%)로 폭 맞추기 + 스마트 길이 제한
    function fitLines(text, baseFont, maxLines, availWidth) {
      let font = baseFont;
      const minFont = Math.round(baseFont * 0.85);
      let raw = text;
      
      // 섹션별 스마트 길이 제한 (오버플로우 방지)
      if (maxLines === 1) {
        if (baseFont === titleFont) {
          raw = hardTruncate(raw, 25); // 제목은 25자로 제한
        } else if (baseFont === ctaFont) {
          raw = hardTruncate(raw, 20); // CTA는 20자로 제한
        } else if (baseFont === hookFont) {
          raw = hardTruncate(raw, 25); // 훅은 25자로 제한
        }
      } else if (maxLines === 2 && baseFont === sloganFont) {
        raw = hardTruncate(raw, 35); // 슬로건은 35자로 제한
      }
      
      while (font >= minFont) {
        const lines = wrapText(raw, font, availWidth);
        const limited = limitLines(lines, maxLines);
        // 가장 긴 줄의 추정 폭 검사
        const longest = limited.reduce((a, b) => (a.length > b.length ? a : b), '');
        const approxWidth = Math.ceil(longest.length * font * 0.6);
        if (approxWidth <= availWidth) {
          return { lines: limited, font };
        }
        font = font - Math.max(1, Math.round(baseFont * 0.03));
      }
      // 최소 폰트로도 안 맞으면 마지막에 강제 말줄임
      const lines = wrapText(raw, minFont, availWidth);
      return { lines: limitLines(lines, maxLines), font: minFont };
    }

    const titleFit = fitLines(makeText(title), titleFont, 1, availTitleWidth);
    const sloganFit = fitLines(makeText(slogan), sloganFont, 2, availSloganWidth);
    const ctaFit = fitLines(makeText(cta), ctaFont, 1, availCtaWidth);
    const hookFit = fitLines(makeText(hook), hookFont, 1, availHookWidth);

    const titleLines = titleFit.lines;
    const sloganLines = sloganFit.lines;
    const ctaLines = ctaFit.lines;
    const hookLines = hookFit.lines;
    const titleFontAdj = titleFit.font;
    const sloganFontAdj = sloganFit.font;
    const ctaFontAdj = ctaFit.font;
    const hookFontAdj = hookFit.font;

    const lineHeight = (px) => Math.round(px * 1.2);

    function renderLines(x, yStart, lineArray, fontPx) {
      const dy = lineHeight(fontPx);
      return lineArray.map((line, idx) => `<tspan x="${x}" y="${yStart + dy * idx}">${escapeXml(line)}</tspan>`).join('');
    }

    // 하단 경계 내에서 Y 좌표 보정 (라인 수 고려)
    function adjustY(y, fontPx, lines) {
      const blockH = lineHeight(fontPx) * Math.max(1, lines.length);
      const maxYStart = H - marginY - blockH + lineHeight(fontPx); // 기준점은 첫 줄의 baseline
      return clamp(y, marginY + lineHeight(fontPx), Math.max(marginY + lineHeight(fontPx), maxYStart));
    }

    // 동적 배치된 Y 좌표에 라인 수 고려한 최종 조정
    const titleYAdj = adjustY(titlePos.y, titleFontAdj, titleLines);
    const sloganYAdj = adjustY(sloganPos.y, sloganFontAdj, sloganLines);
    const ctaYAdj = adjustY(ctaPos.y, ctaFontAdj, ctaLines);
    const hookYAdj = adjustY(hookPos.y, hookFontAdj, hookLines);

    const svg = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>
      <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${W}\" height=\"${H}\">
        <style>
          .t1 { font-family: 'Pretendard', 'Noto Sans KR', system-ui, -apple-system, sans-serif; font-weight: ${title.weight || '700'}; fill: ${safeColor(title.color, '#FFFFFF')}; font-size: ${titleFontAdj}px; letter-spacing: -0.5px; }
          .t2 { font-family: 'Pretendard', 'Noto Sans KR', system-ui, -apple-system, sans-serif; font-weight: ${slogan.weight || '400'}; fill: ${safeColor(slogan.color, '#ECECEC')}; font-size: ${sloganFontAdj}px; }
          .t3 { font-family: 'Pretendard', 'Noto Sans KR', system-ui, -apple-system, sans-serif; font-weight: ${cta.weight || '700'}; fill: ${safeColor(cta.color, '#FFD700')}; font-size: ${ctaFontAdj}px; }
          .t4 { font-family: 'Pretendard', 'Noto Sans KR', system-ui, -apple-system, sans-serif; font-weight: ${hook.weight || '400'}; fill: ${safeColor(hook.color, '#DDDDDD')}; font-size: ${hookFontAdj}px; }
        </style>
        <text class=\"t1\">${renderLines(titlePos.x, titleYAdj, titleLines, titleFontAdj)}</text>
        <text class=\"t2\">${renderLines(sloganPos.x, sloganYAdj, sloganLines, sloganFontAdj)}</text>
        <text class=\"t3\">${renderLines(ctaPos.x, ctaYAdj, ctaLines, ctaFontAdj)}</text>
        <text class=\"t4\">${renderLines(hookPos.x, hookYAdj, hookLines, hookFontAdj)}</text>
      </svg>`;

    composites.push({ input: Buffer.from(svg), top: 0, left: 0, blend: 'over' });

    const composed = await sharp(canvas)
      .composite(composites)
      .toFormat('webp', { quality: 92 })
      .toBuffer();

    return composed;
  } catch (error) {
    throw new Error(`광고 합성 실패: ${error.message}`);
  }
}

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
