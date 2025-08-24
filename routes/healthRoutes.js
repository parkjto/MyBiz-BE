import express from 'express';
import multer from 'multer';
import { 
  detectImageType, 
  analyzeImageQuality, 
  generateOptimalParameters,
  enhanceImage 
} from '../services/smartImageAnalysisService.js';

const router = express.Router();

// Multer 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
  }
});

/**
 * 헬스체크
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      imageAnalysis: 'active',
      imageEnhancement: 'active',
      smartDetection: 'active'
    }
  });
});

/**
 * 이미지 분석 API
 * POST /api/analyze-image
 */
router.post('/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
    }

    const { buffer } = req.file;
    
    // 이미지 타입 감지
    const imageType = await detectImageType(buffer);
    
    // 이미지 품질 분석
    const quality = await analyzeImageQuality(buffer);
    
    // 분석 결과에 이미지 타입 추가
    const analysis = {
      ...quality,
      imageType
    };

    res.json(analysis);
  } catch (error) {
    console.error('이미지 분석 오류:', error);
    res.status(500).json({ 
      error: '이미지 분석 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
});

/**
 * 이미지 보정 API
 * POST /api/enhance-image
 */
router.post('/enhance-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
    }

    const { buffer } = req.file;
    
    // 이미지 타입 감지
    const imageType = await detectImageType(buffer);
    
    // 이미지 품질 분석
    const quality = await analyzeImageQuality(buffer);
    
    // 최적 보정 파라미터 생성
    const params = generateOptimalParameters(imageType, quality);
    
    // 이미지 보정 실행
    const enhancedBuffer = await enhanceImage(buffer, params);
    
    // 보정된 이미지를 base64로 인코딩
    const enhancedImage = enhancedBuffer.toString('base64');
    
    // 보정된 이미지 재분석 (선택사항)
    let enhancedAnalysis = null;
    try {
      enhancedAnalysis = await analyzeImageQuality(enhancedBuffer);
      enhancedAnalysis.imageType = imageType;
    } catch (error) {
      console.warn('보정된 이미지 재분석 실패:', error.message);
    }

    res.json({
      enhancedImage,
      originalAnalysis: { ...quality, imageType },
      enhancedAnalysis,
      appliedParameters: params
    });
  } catch (error) {
    console.error('이미지 보정 오류:', error);
    res.status(500).json({ 
      error: '이미지 보정 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
});

/**
 * 이미지 타입별 보정 파라미터 조회 API
 * GET /api/enhancement-parameters/:imageType
 */
router.get('/enhancement-parameters/:imageType', (req, res) => {
  try {
    const { imageType } = req.params;
    const { quality } = req.query;
    
    // 기본 품질 객체 생성
    const defaultQuality = {
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
    
    // 쿼리 파라미터로 품질 조정
    if (quality) {
      const qualityParams = JSON.parse(decodeURIComponent(quality));
      Object.assign(defaultQuality, qualityParams);
    }
    
    // 최적 보정 파라미터 생성
    const params = generateOptimalParameters(imageType, defaultQuality);
    
    res.json({
      imageType,
      quality: defaultQuality,
      parameters: params
    });
  } catch (error) {
    console.error('파라미터 조회 오류:', error);
    res.status(500).json({ 
      error: '파라미터 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
});

/**
 * 이미지 품질 진단 API
 * POST /api/diagnose-image
 */
router.post('/diagnose-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
    }

    const { buffer } = req.file;
    
    // 이미지 타입 감지
    const imageType = await detectImageType(buffer);
    
    // 이미지 품질 분석
    const quality = await analyzeImageQuality(buffer);
    
    // 품질 진단 및 개선 권장사항
    const diagnosis = generateQualityDiagnosis(quality, imageType);
    
    res.json({
      imageType,
      quality,
      diagnosis
    });
  } catch (error) {
    console.error('이미지 진단 오류:', error);
    res.status(500).json({ 
      error: '이미지 진단 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
});

/**
 * 품질 진단 및 개선 권장사항 생성
 */
function generateQualityDiagnosis(quality, imageType) {
  const recommendations = [];
  const issues = [];
  
  // 밝기 관련 진단
  if (quality.isDark) {
    issues.push('어두운 이미지');
    recommendations.push('밝기를 15-20% 증가시키는 것을 권장합니다.');
  } else if (quality.isBright) {
    issues.push('과도하게 밝은 이미지');
    recommendations.push('밝기를 5-10% 감소시키는 것을 권장합니다.');
  }
  
  // 대비 관련 진단
  if (quality.isLowContrast) {
    issues.push('낮은 대비');
    recommendations.push('대비를 20-25% 증가시키는 것을 권장합니다.');
  }
  
  // 선명도 관련 진단
  if (quality.isBlurry) {
    issues.push('흐린 이미지');
    recommendations.push('선명도를 30-40% 증가시키는 것을 권장합니다.');
  }
  
  // 노이즈 관련 진단
  if (quality.isNoisy) {
    issues.push('노이즈가 많음');
    recommendations.push('노이즈 감소를 40-60% 적용하는 것을 권장합니다.');
  }
  
  // 이미지 타입별 특별 권장사항
  const typeSpecificRecommendations = getTypeSpecificRecommendations(imageType, quality);
  recommendations.push(...typeSpecificRecommendations);
  
  // 전체 품질 등급별 권장사항
  const gradeRecommendations = getGradeSpecificRecommendations(quality.qualityGrade);
  recommendations.push(...gradeRecommendations);
  
  return {
    issues,
    recommendations,
    overallScore: quality.technicalQuality,
    grade: quality.qualityGrade,
    priority: getPriorityLevel(issues.length, quality.technicalQuality)
  };
}

/**
 * 이미지 타입별 특별 권장사항
 */
function getTypeSpecificRecommendations(imageType, quality) {
  const recommendations = [];
  
  switch (imageType) {
    case 'food':
      if (quality.saturation < 60) {
        recommendations.push('음식 이미지의 경우 채도를 10-15% 증가시키는 것을 권장합니다.');
      }
      if (quality.brightness < 120) {
        recommendations.push('음식 이미지의 경우 밝기를 8-12% 증가시키는 것을 권장합니다.');
      }
      break;
      
    case 'portrait':
      if (quality.sharpness > 25) {
        recommendations.push('인물 이미지의 경우 선명도를 15-20% 감소시키는 것을 권장합니다.');
      }
      if (quality.saturation > 80) {
        recommendations.push('인물 이미지의 경우 채도를 5-8% 감소시키는 것을 권장합니다.');
      }
      break;
      
    case 'landscape':
      if (quality.contrast < 40) {
        recommendations.push('풍경 이미지의 경우 대비를 15-20% 증가시키는 것을 권장합니다.');
      }
      if (quality.sharpness < 20) {
        recommendations.push('풍경 이미지의 경우 선명도를 25-35% 증가시키는 것을 권장합니다.');
      }
      break;
      
    case 'document':
      if (quality.brightness < 160) {
        recommendations.push('문서 이미지의 경우 밝기를 15-20% 증가시키는 것을 권장합니다.');
      }
      if (quality.contrast < 35) {
        recommendations.push('문서 이미지의 경우 대비를 20-25% 증가시키는 것을 권장합니다.');
      }
      break;
      
    case 'product':
      if (quality.colorAccuracy < 75) {
        recommendations.push('제품 이미지의 경우 색상 정확도를 위해 화이트 밸런스를 조정하는 것을 권장합니다.');
      }
      if (quality.sharpness < 25) {
        recommendations.push('제품 이미지의 경우 선명도를 20-30% 증가시키는 것을 권장합니다.');
      }
      break;
  }
  
  return recommendations;
}

/**
 * 품질 등급별 권장사항
 */
function getGradeSpecificRecommendations(grade) {
  const recommendations = [];
  
  switch (grade) {
    case 'A+':
      recommendations.push('이미지 품질이 매우 우수합니다. 미세한 조정만 권장합니다.');
      break;
    case 'A':
      recommendations.push('이미지 품질이 우수합니다. 소폭의 개선만 권장합니다.');
      break;
    case 'B+':
      recommendations.push('이미지 품질이 양호합니다. 중간 수준의 보정을 권장합니다.');
      break;
    case 'B':
      recommendations.push('이미지 품질이 보통입니다. 적극적인 보정을 권장합니다.');
      break;
    case 'C':
      recommendations.push('이미지 품질이 낮습니다. 강력한 보정이 필요합니다.');
      break;
  }
  
  return recommendations;
}

/**
 * 우선순위 레벨 결정
 */
function getPriorityLevel(issueCount, technicalQuality) {
  if (issueCount >= 4 || technicalQuality < 50) {
    return 'HIGH';
  } else if (issueCount >= 2 || technicalQuality < 70) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

export default router;
