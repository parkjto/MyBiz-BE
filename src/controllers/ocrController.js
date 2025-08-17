import OcrService from '../services/ocrService.js';
import path from 'path';
import fs from 'fs/promises';

// 🎯 OCR 서비스 인스턴스 생성
const ocrService = new OcrService();

/**
 * 🎯 리뷰 이미지 OCR 처리
 */
const processReviewImages = async (req, res) => {
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
          // 파일 삭제 실패해도 OCR 결과는 정상 반환
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
};

/**
 * 🎯 OCR 결과 조회
 */
const getOcrResult = async (req, res) => {
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
};

/**
 * 🎯 OCR 설정 조회
 */
const getOcrConfig = async (req, res) => {
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
};

/**
 * 🎯 회색 글씨 최적화 설정
 */
const optimizeGrayText = async (req, res) => {
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
};

/**
 * 🎯 회색 글씨 최적화 테스트
 */
const testGrayTextOptimization = async (req, res) => {
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
};

/**
 * 🎯 OCR 서비스 상태 확인
 */
const getOcrStatus = async (req, res) => {
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
};

export {
  processReviewImages,
  getOcrResult,
  getOcrConfig,
  optimizeGrayText,
  testGrayTextOptimization,
  getOcrStatus
};


