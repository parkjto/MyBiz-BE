const ocrService = require('../services/ocrService');
const sentimentService = require('../services/sentimentService');
const gptService = require('../services/gptService');
const { createOcrResult, getOcrResultById } = require('../models/ocrResult');

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
      const text = await ocrService.extractMergedText(filePaths);
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

      res.status(200).json({ 
        id: saved.id, 
        text, 
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
}

module.exports = new OcrController();


