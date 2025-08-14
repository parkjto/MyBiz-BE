const ocrService = require('../services/ocrService');
const sentimentService = require('../services/sentimentService');
const gptService = require('../services/gptService');
const { createOcrResult, getOcrResultById } = require('../models/ocrResult');
const { scheduleCleanupForUploadedFiles } = require('../middlewares/ocrUploadMiddleware');

class OcrController {
  /**
   * POST /api/ocr/reviews
   * 스크롤 캡처 리뷰 이미지 OCR → 감정 분석 → 요약/키워드
   */
  async processReviewImages(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        const err = new Error('ERR_NO_FILES');
        err.statusCode = 400;
        err.code = 'ERR_NO_FILES';
        throw err;
      }

      const filePaths = req.files.map((f) => f.path);
      const ocrResult = await ocrService.extractMergedText(filePaths);
      
      // 구조화된 데이터에서 텍스트 추출
      const { text, structured } = ocrResult;
      
      const sentiment = await sentimentService.analyze(text);
      const { summary, keywords } = await gptService.summarize(text);

      // 저장: 이미지 비저장 정책 (텍스트 결과만 저장)
      const saved = await createOcrResult({
        userId: req.user?.id || null,
        text,
        sentiment,
        keywords,
        summary,
      });

      // OCR 처리 완료 후 이미지 자동 삭제 스케줄링 (1시간 후)
      scheduleCleanupForUploadedFiles(req.files);

      res.status(200).json({ 
        id: saved.id, 
        text, 
        structured, // 구조화된 데이터 추가
        sentiment, 
        keywords, 
        summary,
        status: saved.status,
        createdAt: saved.created_at,
        updatedAt: saved.updated_at
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /api/ocr/reviews/:id
   * 저장된 결과 조회
   */
  async getResultById(req, res, next) {
    try {
      const { id } = req.params;
      const row = await getOcrResultById(id);
      if (!row) return res.status(404).json({ code: 'NOT_FOUND', error: '결과를 찾을 수 없습니다.' });
      return res.status(200).json({
        id: row.id,
        text: row.text,
        sentiment: row.sentiment || [],
        keywords: row.keywords || [],
        summary: row.summary || '',
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/ocr/config
   * 현재 OCR 설정 조회 (디버깅용)
   */
  async getConfig(req, res, next) {
    try {
      const config = ocrService.getConfig();
      res.status(200).json({
        message: 'OCR 설정 조회 성공',
        config
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new OcrController();


