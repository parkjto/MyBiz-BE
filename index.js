import dotenv from 'dotenv';
// 🎯 환경 변수를 먼저 로드
dotenv.config();

import express from 'express';
import cors from 'cors';
// 🎯 MongoDB import 제거
// import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// 🎯 상수 설정 import 추가
import { UPLOAD_CONFIG, SERVER_CONFIG } from './config/constants.js';

// 🎯 Supabase 연결 import 추가
// import { supabase } from './config/db.js';

// 🎯 OCR 서비스 import
import OcrService from './src/services/ocrService.js';

// 🎯 Review 모델 import 제거 (Supabase 사용)
// import Review from './models/review.js';

// 라우트 분리
import adsRoutes from './routes/ads.js';
import salesRoutes from './routes/sales.js';
import reviewsRoutes from './routes/reviews.js';
import authRoutes from './routes/auth.js'; // auth 라우트 추가
import aiAnalysisRoutes from './routes/aiAnalysis.js'; // AI 분석 라우트 추가
// 🎯 reviewProcessingRoutes import 제거 (Supabase 의존성)
// import reviewProcessingRoutes from './routes/reviewProcessing.js'; // 리뷰 처리 라우트 추가
import mockTestRoutes from './routes/mockTest.js'; // 모킹 테스트 라우트 추가

// 🎯 OCR 라우트 import 추가
import ocrRoutes from './src/routes/ocr.js';

const app = express();
const PORT = SERVER_CONFIG.PORT;

// 환경설정 및 DB 연결
// dotenv.config();

// 🎯 MongoDB 연결 코드 제거
// mongoose.connect(process.env.MONGODB_URI, {
//   dbName: 'mybiz', // 명시적으로 DB 이름 지정
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// });

// mongoose.connection.on('connected', () => {
//   console.log('[INFO] MongoDB 연결 성공');
// });

// mongoose.connection.on('error', (err) => {
//   console.error('[ERROR] MongoDB 연결 오류:', err);
// });

// 🎯 Supabase 연결 확인
console.log('[INFO] Supabase 연결 확인 중...');
// try {
//   const { data, error } = await supabase.from('reviews').select('count').limit(1);
//   if (error) {
//     console.log('[INFO] Supabase 연결 확인 완료 (테이블 접근 가능)');
//   } else {
//     console.log('[INFO] Supabase 연결 성공');
//   }
// } catch (err) {
//   console.log('[INFO] Supabase 연결 확인 완료');
// }
console.log('[INFO] Supabase 연결 확인 완료 (임시 비활성화)');

// 기본 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// 🎯 정적 파일 서빙 (테스트 페이지 접근용)
app.use(express.static('.'));

const ocrService = new OcrService();

// 🎯 Multer 설정 (파일 업로드)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/';
    // 🎯 업로드 디렉토리가 없으면 생성
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 🎯 안전한 파일명 생성 (UUID + 원본 확장자)
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// 🎯 파일 필터링 (이미지 파일만 허용)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('허용되지 않는 파일 형식입니다. PNG, JPG, JPEG만 허용됩니다.'), false);
  }
};

// 🎯 Multer 인스턴스 생성
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
    files: UPLOAD_CONFIG.MAX_FILES
  }
});

// 🎯 단일 파일 업로드 (테스트용)
const singleUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE
  }
});

// 라우트 연결
app.use('/api/ads', adsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/auth', authRoutes); // auth 라우트 연결
app.use('/api/ai-analysis', aiAnalysisRoutes); // AI 분석 라우트 연결
// 🎯 reviewProcessingRoutes 연결 제거
// app.use('/api/review-processing', reviewProcessingRoutes); // 리뷰 처리 라우트 연결
app.use('/api/mock-test', mockTestRoutes); // 모킹 테스트 라우트 연결

// 🎯 OCR 라우트 연결
app.use('/api/ocr', ocrRoutes);

// 🎯 저장된 리뷰 조회 엔드포인트
app.get('/api/reviews/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: '매장 ID가 필요합니다.'
      });
    }

    console.log('📖 리뷰 조회 시작:', { storeId, limit, offset });

    const { getStoreReviews } = await import('./services/storeReviewService.js');
    
    const result = await getStoreReviews(storeId);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    // 페이지네이션 적용
    const reviews = result.data.slice(offset, offset + parseInt(limit));
    
    // 통계 계산
    const sentimentStats = reviews.reduce((stats, review) => {
      stats[review.sentiment] = (stats[review.sentiment] || 0) + 1;
      return stats;
    }, { 긍정: 0, 부정: 0, 보통: 0 });

    const positiveKeywords = new Map();
    const negativeKeywords = new Map();
    
    reviews.forEach(review => {
      review.positive_keywords?.forEach(keyword => {
        positiveKeywords.set(keyword, (positiveKeywords.get(keyword) || 0) + 1);
      });
      review.negative_keywords?.forEach(keyword => {
        negativeKeywords.set(keyword, (negativeKeywords.get(keyword) || 0) + 1);
      });
    });

    const keywordStats = {
      장점: Array.from(positiveKeywords.entries()).sort((a, b) => b[1] - a[1]),
      단점: Array.from(negativeKeywords.entries()).sort((a, b) => b[1] - a[1])
    };

    res.json({
      success: true,
      message: '리뷰 조회가 완료되었습니다.',
      data: {
        store_id: storeId,
        total_reviews: result.data.length,
        current_page_reviews: reviews.length,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: offset + reviews.length < result.data.length
        },
        sentimentStats,
        keywordStats,
        reviews: reviews.map(review => ({
          id: review.id,
          review_content: review.review_content,
          review_date: review.review_date,
          sentiment: review.sentiment,
          positive_keywords: review.positive_keywords,
          negative_keywords: review.negative_keywords,
          created_at: review.created_at
        }))
      }
    });

  } catch (error) {
    console.error('❌ 리뷰 조회 실패:', error);
    
    res.status(500).json({
      success: false,
      message: '리뷰 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 🎯 실제 프로덕션용 리뷰 처리 엔드포인트
app.post('/api/reviews/process', singleUpload.single('image'), async (req, res) => {
  try {
    // 필수 필드 검증
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '이미지 파일이 필요합니다.'
      });
    }

    const { storeId, userId } = req.body;
    
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: '매장 ID(storeId)가 필요합니다.'
      });
    }

    console.log('🔄 리뷰 처리 시작:', {
      filename: req.file.filename,
      storeId,
      userId: userId || '익명'
    });

    // 1단계: OCR 처리
    console.log('📖 1단계: OCR 처리 중...');
    const ocrText = await ocrService.processImage(req.file.path);
    
    // 2단계: GPT 분석
    console.log('🤖 2단계: GPT 분석 중...');
    const { analyzeOcrText } = await import('./services/openaiService.js');
    const analysisResult = await analyzeOcrText(ocrText);
    
    // 3단계: Supabase DB 저장
    console.log('💾 3단계: Supabase DB 저장 중...');
    
    const startTime = Date.now();
    
    try {
      const { saveStoreReview } = await import('./services/storeReviewService.js');
      
      const saveResult = await saveStoreReview({
        storeId: storeId,
        userId: userId || null,
        rawText: ocrText,
        cleanedText: ocrText,
        gptResult: analysisResult,
        ocrImageUrl: null
      });
      
      if (!saveResult.success) {
        throw new Error(`DB 저장 실패: ${saveResult.error}`);
      }
      
      console.log('✅ 리뷰 저장 완료:', saveResult.data);
      
      // 감정 통계 계산
      const sentimentStats = analysisResult.reduce((stats, item) => {
        stats[item.감정] = (stats[item.감정] || 0) + 1;
        return stats;
      }, { 긍정: 0, 부정: 0, 보통: 0 });

      // 키워드 통계 계산
      const 장점키워드 = new Map();
      const 단점키워드 = new Map();
      
      analysisResult.forEach(item => {
        item.장점키워드?.forEach(keyword => {
          장점키워드.set(keyword, (장점키워드.get(keyword) || 0) + 1);
        });
        item.단점키워드?.forEach(keyword => {
          단점키워드.set(keyword, (단점키워드.get(keyword) || 0) + 1);
        });
      });

      const keywordStats = {
        장점: Array.from(장점키워드.entries()).sort((a, b) => b[1] - a[1]),
        단점: Array.from(단점키워드.entries()).sort((a, b) => b[1] - a[1])
      };

      // 🎯 리뷰 처리 완료 후 업로드된 이미지 파일 자동 삭제 (모바일 앱 호환)
      try {
        await fs.unlink(req.file.path);
        console.log(`🗑️ 리뷰 처리 완료 후 파일 자동 삭제: ${req.file.filename}`);
      } catch (deleteError) {
        console.error(`⚠️ 리뷰 처리 완료 후 파일 자동 삭제 실패: ${req.file.filename}`, deleteError);
      }
      
      res.json({
        success: true,
        message: '리뷰 처리가 완료되었습니다.',
        data: {
          review_id: saveResult.data.id,
          store_id: storeId,
          user_id: userId || null,
          processing_time: Date.now() - startTime,
          created_at: saveResult.data.created_at,
          analysis: {
            sentiment: analysisResult[0]?.감정 || '보통',
            content: analysisResult[0]?.리뷰 || '',
            positive_keywords: analysisResult[0]?.장점키워드 || [],
            negative_keywords: analysisResult[0]?.단점키워드 || []
          },
          sentimentStats,
          keywordStats
        }
      });
      
    } catch (dbError) {
      console.error('❌ DB 저장 실패:', dbError);
      
      res.status(500).json({
        success: false,
        message: '리뷰 분석은 완료되었지만 DB 저장에 실패했습니다.',
        error: dbError.message,
        analysis_result: analysisResult
      });
    }

  } catch (error) {
    console.error('❌ 리뷰 처리 실패:', error);
    
    res.status(500).json({
      success: false,
      message: '리뷰 처리 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 🎯 통합 테스트 엔드포인트 추가
// app.post('/api/test/integrated-flow', singleUpload.single('image'), async (req, res) => {
//   try {
//     // 필수 필드 검증
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: '이미지 파일이 필요합니다.'
//       });
//     }

//     const { storeId, userId } = req.body;
    
//     if (!storeId) {
//       return res.status(400).json({
//         success: false,
//         message: '매장 ID(storeId)가 필요합니다.'
//       });
//     }

//     console.log('🔄 통합 테스트 시작:', {
//       filename: req.file.filename,
//       storeId,
//       userId: userId || '익명'
//     });

//     // 1단계: OCR 처리
//     console.log('📖 1단계: OCR 처리 중...');
//     const ocrText = await ocrService.processImage(req.file.path);
    
//     // 2단계: GPT 분석
//     console.log('🤖 2단계: GPT 분석 중...');
//     const { analyzeOcrText } = await import('./services/openaiService.js');
//     const analysisResult = await analyzeOcrText(ocrText);
    
//     // 3단계: Supabase DB 저장
//     console.log('💾 3단계: Supabase DB 저장 중...');
    
//     const startTime = Date.now();
    
//     // 🎯 실제 store_reviews 테이블에 저장
//     try {
//       const { saveStoreReview } = await import('./services/storeReviewService.js');
      
//       const saveResult = await saveStoreReview({
//         storeId: storeId,
//         userId: userId || null, // 사용자가 제공하지 않으면 null (익명)
//         rawText: ocrText,
//         cleanedText: ocrText, // OCR 텍스트를 그대로 사용
//         gptResult: analysisResult,
//         ocrImageUrl: null
//       });
      
//       if (!saveResult.success) {
//         throw new Error(`DB 저장 실패: ${saveResult.error}`);
//       }
      
//       console.log('✅ store_reviews 테이블에 저장 완료:', saveResult.data);
      
//       // 🎯 감정 통계 계산
//       const sentimentStats = analysisResult.reduce((stats, item) => {
//         stats[item.감정] = (stats[item.감정] || 0) + 1;
//         return stats;
//       }, { 긍정: 0, 부정: 0, 보통: 0 });

//       // 🎯 키워드 통계 계산
//       const 장점키워드 = new Map();
//       const 단점키워드 = new Map();
      
//       analysisResult.forEach(item => {
//         item.장점키워드?.forEach(keyword => {
//           장점키워드.set(keyword, (장점키워드.get(keyword) || 0) + 1);
//         });
//         item.단점키워드?.forEach(keyword => {
//           단점키워드.set(keyword, (단점키워드.get(keyword) || 0) + 1);
//         });
//       });

//       const keywordStats = {
//         장점: Array.from(장점키워드.entries()).sort((a, b) => b[1] - a[1]),
//         단점: Array.from(단점키워드.entries()).sort((a, b) => b[1] - a[1])
//       };

//       res.json({
//         success: true,
//         message: '통합 테스트 완료 - Supabase DB 저장됨',
//         result: {
//           id: saveResult.data.id,
//           filename: req.file.filename,
//           original_name: req.file.originalname,
//           store_id: storeId,
//           user_id: userId || null,
//           ocr_text: ocrText,
//           analysis_result: analysisResult,
//           sentimentStats: sentimentStats,
//           keywordStats: keywordStats,
//           processing_time: Date.now() - startTime,
//           created_at: saveResult.data.created_at,
//           status: 'completed'
//         }
//       });
      
//     } catch (dbError) {
//       console.error('❌ DB 저장 실패:', dbError);
      
//       // DB 저장 실패 시에도 분석 결과는 반환
//       const sentimentStats = analysisResult.reduce((stats, item) => {
//         stats[item.감정] = (stats[item.감정] || 0) + 1;
//         return stats;
//       }, { 긍정: 0, 부정: 0, 보통: 0 });

//       res.json({
//         success: true,
//         message: '통합 테스트 완료 - DB 저장 실패했지만 분석 결과 반환',
//         result: {
//           id: 'temp-' + Date.now(),
//           filename: req.file.filename,
//           original_name: req.file.originalname,
//           store_id: storeId,
//           user_id: userId || null,
//           ocr_text: ocrText,
//           analysis_result: analysisResult,
//           sentimentStats: sentimentStats,
//           processing_time: Date.now() - startTime,
//           created_at: new Date().toISOString(),
//           status: 'completed',
//           db_error: dbError.message
//         }
//       });
//     }

//   } catch (error) {
//     console.error('❌ 통합 테스트 실패:', error);
//     res.status(500).json({
//       success: false,
//       message: '통합 테스트 실패',
//       error: error.message
//     });
//   }
// });

// 헬스 체크 라우트
app.get('/', (req, res) => {
  res.send('MyBiz 백엔드 서버가 정상적으로 동작 중입니다!');
});

// 🎯 OCR 메인 엔드포인트
app.post('/api/ocr/reviews', upload.array('images', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        code: 'ERR_NO_FILES',
        error: '파일 미첨부',
        message: '최소 1개 이상의 파일이 필요합니다.'
      });
    }

    console.log(`📁 업로드된 파일 수: ${req.files.length}`);

    // 🎯 각 파일별 OCR 처리
    const results = [];
    for (const file of req.files) {
      try {
        console.log(`🔍 파일 처리 시작: ${file.filename}`);
        
        // 🎯 OCR 처리
        const text = await ocrService.processImage(file.path);
        
        results.push({
          filename: file.filename,
          originalName: file.originalname,
          text: text,
          success: true
        });
        
        // 🎯 OCR 처리 완료 후 파일 자동 삭제 (모바일 앱 호환)
        try {
          await fs.unlink(file.path);
          console.log(`🗑️ 파일 자동 삭제 완료: ${file.filename}`);
        } catch (deleteError) {
          console.error(`⚠️ 파일 자동 삭제 실패: ${file.filename}`, deleteError);
        }
        
        console.log(`✅ 파일 처리 완료: ${file.filename} (${text.length}자)`);
      } catch (error) {
        console.error(`❌ 파일 처리 실패: ${file.filename}`, error);
        
        results.push({
          filename: file.filename,
          originalName: file.originalname,
          text: '',
          success: false,
          error: error.message
        });
        
        // 🎯 OCR 처리 실패 시에도 파일 자동 삭제 (모바일 앱 호환)
        try {
          await fs.unlink(file.path);
          console.log(`🗑️ 실패 파일 자동 삭제 완료: ${file.filename}`);
        } catch (deleteError) {
          console.error(`⚠️ 실패 파일 자동 삭제 실패: ${file.filename}`, deleteError);
        }
      }
    }

    // 🎯 성공/실패 통계
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`📊 OCR 처리 완료: ${successCount}/${totalCount} 성공`);

    res.json({
      success: true,
      message: `${totalCount}개 파일 중 ${successCount}개 처리 완료`,
      results: results,
      summary: {
        total: totalCount,
        success: successCount,
        failed: totalCount - successCount
      }
    });

  } catch (error) {
    console.error('❌ OCR 처리 중 오류 발생:', error);
    res.status(500).json({
      code: 'ERR_OCR_FAIL',
      error: 'OCR 처리 실패',
      message: error.message
    });
  }
});

// 🎯 OCR 결과 조회
app.get('/api/ocr/reviews/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 🎯 파일 경로에서 결과 조회 (임시 구현)
    // 실제로는 데이터베이스에서 조회해야 함
    res.json({
      success: true,
      message: 'OCR 결과 조회 완료',
      result: {
        id: id,
        text: 'OCR 결과 텍스트가 여기에 표시됩니다.',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ OCR 결과 조회 실패:', error);
    res.status(500).json({
      code: 'ERR_OCR_RESULT_FAIL',
      error: 'OCR 결과 조회 실패',
      message: error.message
    });
  }
});

// 🎯 OCR 설정 조회
app.get('/api/ocr/config', async (req, res, next) => {
  try {
    const config = ocrService.getConfig();
    
    res.json({
      success: true,
      message: 'OCR 설정 조회 완료',
      config: config
    });
  } catch (error) {
    console.error('❌ OCR 설정 조회 실패:', error);
    res.status(500).json({
      code: 'ERR_OCR_CONFIG_FAIL',
      error: 'OCR 설정 조회 실패',
      message: error.message
    });
  }
});

// 🎯 회색 글씨 최적화 설정
app.post('/api/ocr/optimize-gray-text', async (req, res, next) => {
  try {
    const { contrastMultiplier, brightnessOffset, sharpenSigma, thresholdValue } = req.body;
    
    // 🎯 설정 업데이트
    const newConfig = {};
    if (contrastMultiplier !== undefined) newConfig.contrastMultiplier = contrastMultiplier;
    if (brightnessOffset !== undefined) newConfig.brightnessOffset = brightnessOffset;
    if (sharpenSigma !== undefined) newConfig.sharpenSigma = sharpenSigma;
    if (thresholdValue !== undefined) newConfig.thresholdValue = thresholdValue;
    
    ocrService.updateConfig(newConfig);
    
    res.json({
      success: true,
      message: '회색 글씨 최적화 설정 업데이트 완료',
      config: ocrService.getConfig()
    });
  } catch (error) {
    console.error('❌ 회색 글씨 최적화 설정 실패:', error);
    res.status(500).json({
      code: 'ERR_OCR_OPTIMIZE_FAIL',
      error: '회색 글씨 최적화 설정 실패',
      message: error.message
    });
  }
});

// 🎯 회색 글씨 최적화 테스트
app.post('/api/ocr/test-gray-text', singleUpload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 'ERR_NO_FILE',
        error: '파일 미첨부',
        message: '테스트할 이미지 파일이 필요합니다.'
      });
    }

    console.log(`🧪 회색 글씨 최적화 테스트 시작: ${req.file.filename}`);
    
    // 🎯 회색 글씨 최적화 OCR 실행
    const text = await ocrService.optimizeForGrayText(req.file.path);
    
    // 🎯 회색 글씨 최적화 테스트 완료 후 파일 자동 삭제 (모바일 앱 호환)
    try {
      await fs.unlink(req.file.path);
      console.log(`🗑️ 테스트 파일 자동 삭제 완료: ${req.file.filename}`);
    } catch (deleteError) {
      console.error(`⚠️ 테스트 파일 자동 삭제 실패: ${req.file.filename}`, deleteError);
    }
    
    res.json({
      success: true,
      message: '회색 글씨 최적화 테스트 완료',
      result: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        text: text,
        length: text.length
      }
    });
  } catch (error) {
    console.error('❌ 회색 글씨 최적화 테스트 실패:', error);
    res.status(500).json({
      code: 'ERR_OCR_TEST_FAIL',
      error: '회색 글씨 최적화 테스트 실패',
      message: error.message
    });
  }
});

// 🎯 OCR 서비스 상태 확인
app.get('/api/ocr/status', async (req, res, next) => {
  try {
    const config = ocrService.getConfig();
    
    res.json({
      success: true,
      message: 'OCR 서비스 상태 확인 완료',
      status: {
        active: true,
        workerPoolSize: config.workerPoolSize,
        language: config.language,
        oem: config.oem,
        psm: config.psm,
        maxChunkHeight: config.maxChunkHeight,
        concurrency: config.concurrency
      }
    });
  } catch (error) {
    console.error('❌ OCR 서비스 상태 확인 실패:', error);
    res.status(500).json({
      code: 'ERR_OCR_STATUS_FAIL',
      error: 'OCR 서비스 상태 확인 실패',
      message: error.message
    });
  }
});

// 🎯 OCR 테스트 엔드포인트
app.get('/api/ocr/test', (req, res) => {
  res.json({
    success: true,
    message: 'OCR 서비스가 정상 작동 중입니다',
    timestamp: new Date().toISOString(),
    service: 'Tesseract.js OCR',
    version: '2.0.0'
  });
});

// Swagger API 문서화 설정
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MyBiz API',
      version: '1.0.0',
      description: 'MyBiz 소상공인 AI 백엔드 API 문서'
    },
    servers: [
      { url: `http://${SERVER_CONFIG.HOST}:${PORT}` }
    ]
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 공통 에러 처리 미들웨어
app.use((err, req, res, next) => {
  console.error('[ERROR] 서버 오류:', err.stack);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

// ...추가 라우트 및 기능 구현 예정...

app.listen(PORT, () => {
  console.log(`[INFO] MyBiz 백엔드 서버가 http://${SERVER_CONFIG.HOST}:${PORT} 에서 실행 중입니다.`);
  console.log(`[INFO] OCR 테스트: http://${SERVER_CONFIG.HOST}:${PORT}/api/ocr/test`);
  console.log(`[INFO] 모킹 테스트 API: http://${SERVER_CONFIG.HOST}:${PORT}/api/mock-test`);
  console.log(`[INFO] API 문서: http://${SERVER_CONFIG.HOST}:${PORT}/api-docs`);
});