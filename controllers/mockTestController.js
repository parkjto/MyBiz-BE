import ReviewProcessingService from '../services/reviewProcessingService.js';

// 모킹 서비스 인스턴스 생성
const reviewProcessingService = new ReviewProcessingService();

/**
 * 모킹 모드 테스트 - 실제 이미지 파일 없이 테스트
 */
export const testMockProcessing = async (req, res) => {
  try {
    console.log('[INFO] 모킹 모드 테스트 시작');
    
    const { testType = 'default' } = req.body;
    
    // 테스트 타입에 따른 가상 이미지 파일 객체 생성
    const mockImageFile = {
      path: `./mock-images/${testType}-review.jpg`,
      originalname: `${testType}-review.jpg`,
      filename: `${testType}-review-${Date.now()}.jpg`
    };

    // 테스트용 매장 ID (실제 UUID로 변경 필요)
    const testStoreId = '550e8400-e29b-41d4-a716-446655440000';
    const testUserId = '550e8400-e29b-41d4-a716-446655440001';

    console.log(`[DEBUG] 테스트 타입: ${testType}, storeId: ${testStoreId}`);

    // OCR → GPT → DB 저장 플로우 실행
    const result = await reviewProcessingService.processImageToDatabase(
      mockImageFile, 
      testStoreId, 
      testUserId
    );

    res.json({
      success: true,
      message: '모킹 모드 테스트가 완료되었습니다.',
      data: {
        ...result,
        testType,
        mockMode: true,
        note: '이 결과는 모킹된 서비스를 사용한 테스트입니다.'
      }
    });

  } catch (error) {
    console.error(`[ERROR] 모킹 모드 테스트 실패:`, error.message);
    
    res.status(500).json({
      success: false,
      code: 'ERR_MOCK_TEST_FAILED',
      message: '모킹 모드 테스트 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 다양한 테스트 타입으로 배치 테스트
 */
export const testMockBatchProcessing = async (req, res) => {
  try {
    console.log('[INFO] 모킹 모드 배치 테스트 시작');
    
    const testTypes = ['positive', 'negative', 'mixed', 'default'];
    const testStoreId = '550e8400-e29b-41d4-a716-446655440000';
    const testUserId = '550e8400-e29b-41d4-a716-446655440001';

    // 각 테스트 타입별로 가상 이미지 파일 생성
    const mockImageFiles = testTypes.map((type, index) => ({
      path: `./mock-images/${type}-review-${index}.jpg`,
      originalname: `${type}-review-${index}.jpg`,
      filename: `${type}-review-${index}-${Date.now()}.jpg`
    }));

    console.log(`[DEBUG] ${mockImageFiles.length}개 테스트 타입으로 배치 테스트 시작`);

    // 배치 처리 실행
    const result = await reviewProcessingService.processBatchImages(
      mockImageFiles, 
      testStoreId, 
      testUserId
    );

    res.json({
      success: true,
      message: '모킹 모드 배치 테스트가 완료되었습니다.',
      data: {
        ...result,
        testTypes,
        mockMode: true,
        note: '이 결과는 모킹된 서비스를 사용한 테스트입니다.'
      }
    });

  } catch (error) {
    console.error(`[ERROR] 모킹 모드 배치 테스트 실패:`, error.message);
    
    res.status(500).json({
      success: false,
      code: 'ERR_MOCK_BATCH_TEST_FAILED',
      message: '모킹 모드 배치 테스트 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 모킹 서비스 상태 확인
 */
export const getMockServiceStatus = async (req, res) => {
  try {
    console.log('[INFO] 모킹 서비스 상태 확인 요청');

    const ocrStatus = reviewProcessingService.ocrService.getConfig();
    
    const status = {
      service: 'MockReviewProcessingService',
      status: 'active',
      mode: 'mock',
      timestamp: new Date().toISOString(),
      ocrService: ocrStatus,
      features: [
        'Mock OCR 이미지 처리',
        'Mock GPT 텍스트 분석',
        'PostgreSQL 저장 (실제 DB 필요)',
        '배치 처리',
        '에러 복구'
      ],
      note: 'OpenAI API 키 없이도 전체 플로우를 테스트할 수 있습니다.',
      requirements: [
        'Supabase 연결 설정 필요',
        'reviews 테이블 생성 필요'
      ]
    };

    res.json({
      success: true,
      message: '모킹 서비스 상태 확인이 완료되었습니다.',
      data: status
    });

  } catch (error) {
    console.error(`[ERROR] 모킹 서비스 상태 확인 실패:`, error.message);
    
    res.status(500).json({
      success: false,
      code: 'ERR_MOCK_STATUS_CHECK_FAILED',
      message: '모킹 서비스 상태 확인 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 모킹 OCR 서비스 직접 테스트
 */
export const testMockOcrService = async (req, res) => {
  try {
    console.log('[INFO] 모킹 OCR 서비스 직접 테스트 시작');
    
    const { testType = 'default' } = req.body;
    
    // OCR 서비스 직접 테스트
    const mockImagePath = `./mock-images/${testType}-review.jpg`;
    const ocrText = await reviewProcessingService.ocrService.processImage(mockImagePath);
    
    res.json({
      success: true,
      message: '모킹 OCR 서비스 테스트가 완료되었습니다.',
      data: {
        testType,
        mockImagePath,
        ocrText,
        textLength: ocrText.length,
        mockMode: true
      }
    });

  } catch (error) {
    console.error(`[ERROR] 모킹 OCR 서비스 테스트 실패:`, error.message);
    
    res.status(500).json({
      success: false,
      code: 'ERR_MOCK_OCR_TEST_FAILED',
      message: '모킹 OCR 서비스 테스트 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 모킹 GPT 서비스 직접 테스트
 */
export const testMockGptService = async (req, res) => {
  try {
    console.log('[INFO] 모킹 GPT 서비스 직접 테스트 시작');
    
    const { testText } = req.body;
    
    if (!testText) {
      return res.status(400).json({
        success: false,
        code: 'ERR_NO_TEST_TEXT',
        message: '테스트할 텍스트가 필요합니다.'
      });
    }

    // GPT 서비스 직접 테스트
    const { analyzeOcrText } = await import('../services/mockOpenaiService.js');
    const structuredReviews = await analyzeOcrText(testText);
    
    res.json({
      success: true,
      message: '모킹 GPT 서비스 테스트가 완료되었습니다.',
      data: {
        inputText: testText,
        inputLength: testText.length,
        structuredReviews,
        reviewCount: structuredReviews.length,
        mockMode: true
      }
    });

  } catch (error) {
    console.error(`[ERROR] 모킹 GPT 서비스 테스트 실패:`, error.message);
    
    res.status(500).json({
      success: false,
      code: 'ERR_MOCK_GPT_TEST_FAILED',
      message: '모킹 GPT 서비스 테스트 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};
