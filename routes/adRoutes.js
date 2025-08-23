import { Router } from 'express';
import { uploadImage } from '../middlewares/upload.js';
import { smartEnhanceImage } from '../services/imageService.js';
import { uploadToSupabase } from '../services/supabaseStorageService.js';
import { generateAdCopies, generateFromImage } from '../services/openaiService.js';

const router = Router();

/**
 * 텍스트만으로 광고 문구 생성 (완전 무저장)
 * POST /api/ad/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { productName, productDesc, keywords = [], num = 4, maxWords = 16 } = req.body;

    // 입력값 검증
    if (!productName || !productDesc) {
      return res.status(400).json({ 
        ok: false, 
        message: '제품명과 설명은 필수입니다.' 
      });
    }

    if (num < 1 || num > 8) {
      return res.status(400).json({ 
        ok: false, 
        message: '생성 개수는 1-8개 사이여야 합니다.' 
      });
    }

    if (maxWords < 3 || maxWords > 32) {
      return res.status(400).json({ 
        ok: false, 
        message: '최대 단어 수는 3-32개 사이여야 합니다.' 
      });
    }

    const result = await generateAdCopies({
      productName,
      productDesc,
      keywords: Array.isArray(keywords) ? keywords : [],
      num,
      maxWords
    });

    res.json({ 
      ok: true, 
      message: '광고 문구 생성 완료 - 사용자가 직접 저장하세요',
      generatedAt: new Date().toISOString(),
      productInfo: {
        productName,
        productDesc,
        keywords: Array.isArray(keywords) ? keywords : []
      },
      copies: result.copies,
      important: '⚠️ 생성된 광고 문구는 자동으로 저장되지 않습니다!',
      userAction: '핸드폰 메모, 파일, 클립보드 등에 직접 저장하세요.',
      note: '서버에서는 어떤 데이터도 저장하지 않습니다.'
    });

  } catch (error) {
    console.error('광고 문구 생성 에러:', error);
    res.status(500).json({ 
      ok: false, 
      message: error.message || '광고 문구 생성에 실패했습니다.' 
    });
  }
});

/**
 * 이미지 보정 전용 (완전 무저장)
 * POST /api/ad/enhance-image
 */
router.post('/enhance-image', (req, res, next) => {
  uploadImage(req, res, function (err) {
    if (err) {
      return res.status(400).json({ 
        ok: false, 
        message: err.message 
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        ok: false, 
        message: 'image 필드로 이미지를 업로드하세요.' 
      });
    }

    // 스마트 이미지 보정
    const result = await smartEnhanceImage(req.file.buffer, { maxSize: 1600 });
    const enhanced = result.enhancedImage;

    // Base64로 인코딩하여 즉시 응답 (저장 없음)
    const base64Image = enhanced.toString('base64');

    res.json({ 
      ok: true, 
      message: '스마트 이미지 보정 완료 - 사용자가 직접 저장하세요',
      base64Image: `data:image/webp;base64,${base64Image}`,
      originalSize: req.file.size,
      enhancedSize: enhanced.length,
      format: 'webp',
      // 스마트 분석 정보 추가
      smartAnalysis: {
        imageType: result.analysis.imageType,
        quality: result.analysis.quality,
        parameters: result.analysis.parameters,
        compressionRate: result.analysis.compressionRate
      },
      note: '보정된 이미지는 Base64 형식으로 반환됩니다. 클라이언트에서 적절히 처리하세요.'
    });

  } catch (error) {
    console.error('이미지 보정 에러:', error);
    res.status(500).json({ 
      ok: false, 
      message: error.message || '이미지 보정에 실패했습니다.' 
    });
  }
});

/**
 * 이미지 기반 맞춤 광고 문구 생성 (완전 무저장)
 * POST /api/ad/generate-from-image
 */
router.post('/generate-from-image', async (req, res) => {
  try {
    const { imageUrl, productName, productDesc, keywords = [], num = 3, maxWords = 16 } = req.body;

    // 입력값 검증
    if (!imageUrl || !productName || !productDesc) {
      return res.status(400).json({ 
        ok: false, 
        message: '이미지 URL, 제품명, 설명은 필수입니다.' 
      });
    }

    if (num < 1 || num > 6) {
      return res.status(400).json({ 
        ok: false, 
        message: '생성 개수는 1-6개 사이여야 합니다.' 
      });
    }

    if (maxWords < 3 || maxWords > 32) {
      return res.status(400).json({ 
        ok: false, 
        message: '최대 단어 수는 3-32개 사이여야 합니다.' 
      });
    }

    // URL 유효성 검증
    try {
      new URL(imageUrl);
    } catch (urlError) {
      return res.status(400).json({ 
        ok: false, 
        message: '유효한 이미지 URL을 입력해주세요.' 
      });
    }

    // 이미지 기반 맞춤 광고 문구 생성
    const result = await generateFromImage({
      imageUrl,
      productName,
      productDesc,
      keywords: Array.isArray(keywords) ? keywords : [],
      num,
      maxWords
    });

    res.json({ 
      ok: true, 
      message: '이미지 기반 맞춤 광고 문구 생성 완료 - 사용자가 직접 저장하세요',
      generatedAt: new Date().toISOString(),
      imageUrl,
      productInfo: {
        productName,
        productDesc,
        keywords: Array.isArray(keywords) ? keywords : []
      },
      ...result,
      important: '⚠️ 생성된 광고 문구는 자동으로 저장되지 않습니다!',
      userAction: '핸드폰 메모, 파일, 클립보드 등에 직접 저장하세요.',
      note: '서버에서는 어떤 데이터도 저장하지 않습니다.'
    });

  } catch (error) {
    console.error('이미지 기반 광고 문구 생성 에러:', error);
    res.status(500).json({ 
      ok: false, 
      message: error.message || '이미지 기반 광고 문구 생성에 실패했습니다.' 
    });
  }
});

/**
 * 이미지 업로드 + 보정 + 광고 문구 생성 (완전 무저장)
 * POST /api/ad/generate-with-image
 */
router.post('/generate-with-image', (req, res, next) => {
  // multer 에러를 캐치하기 위해 분리
  uploadImage(req, res, function (err) {
    if (err) {
      return res.status(400).json({ 
        ok: false, 
        message: err.message 
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { productName, productDesc, keywords = '', num = 3, maxWords = 16 } = req.body;

    // 입력값 검증
    if (!productName || !productDesc) {
      return res.status(400).json({ 
        ok: false, 
        message: '제품명과 설명은 필수입니다.' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        ok: false, 
        message: 'image 필드로 이미지를 업로드하세요.' 
      });
    }

    // 파라미터 정규화
    const parsedKeywords = keywords ? keywords.split(",").map(s => s.trim()).filter(Boolean) : [];
    const parsedNum = Math.min(6, Math.max(1, parseInt(num) || 3));
    const parsedMaxWords = Math.min(32, Math.max(3, parseInt(maxWords) || 16));

    // 1) 이미지 자동 보정
    const enhanced = await autoEnhanceImage(req.file.buffer, { maxSize: 1600 });

    // 2) 보정된 이미지를 Base64로 변환
    const base64Image = enhanced.toString('base64');

    // 3) 이미지 기반 맞춤 광고 문구 생성 (Base64 이미지 사용)
    const result = await generateFromImage({
      imageUrl: `data:image/webp;base64,${base64Image}`,
      productName,
      productDesc,
      keywords: parsedKeywords,
      num: parsedNum,
      maxWords: parsedMaxWords
    });

    res.json({ 
      ok: true, 
      message: '이미지 업로드 + 보정 + 맞춤 광고 문구 생성 완료 - 사용자가 직접 저장하세요',
      generatedAt: new Date().toISOString(),
      enhancedImage: {
        base64: `data:image/webp;base64,${base64Image}`,
        originalSize: req.file.size,
        enhancedSize: enhanced.length,
        format: 'webp'
      },
      productInfo: {
        productName,
        productDesc,
        keywords: parsedKeywords
      },
      ...result,
      important: '⚠️ 생성된 모든 데이터는 자동으로 저장되지 않습니다!',
      userAction: '핸드폰 앨범, 메모, 파일 등에 직접 저장하세요.',
      note: '서버에서는 어떤 데이터도 저장하지 않습니다.',
      downloadTip: 'Base64 이미지를 복사하여 이미지 뷰어에서 열거나, 온라인 Base64 to Image 변환기 사용'
    });

  } catch (error) {
    console.error('이미지 업로드 + 광고 문구 생성 에러:', error);
    res.status(500).json({ 
      ok: false, 
      message: error.message || '이미지 업로드 + 광고 문구 생성에 실패했습니다.' 
    });
  }
});

export default router;
