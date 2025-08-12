const fs = require('fs/promises');
const path = require('path');

/**
 * OCR 서비스: Google Cloud Vision API 호출 래퍼
 * 실제 호출은 @google-cloud/vision 클라이언트를 런타임 의존성으로 사용
 */
class OcrService {
  constructor() {
    try {
      // Lazy require to avoid crash if module not installed in some envs
      // eslint-disable-next-line global-require
      const vision = require('@google-cloud/vision');
      this.client = new vision.ImageAnnotatorClient();
    } catch (err) {
      // Defer error until first call
      this.initError = err;
    }
  }

  /**
   * 파일 경로 배열을 받아 OCR 텍스트를 병합하여 반환
   * @param {string[]} filePaths
   * @returns {Promise<string>}
   */
  async extractMergedText(filePaths) {
    if (this.initError) throw this._makeError(500, 'ERR_OCR_INIT', `OCR 클라이언트 초기화 실패: ${this.initError.message}`);
    if (!Array.isArray(filePaths) || filePaths.length === 0) return '';

    const texts = await Promise.all(filePaths.map((p) => this._documentTextDetection(p)));
    return this._postProcess(texts.join('\n'));
  }

  async _documentTextDetection(filePath) {
    try {
      const [result] = await this.client.documentTextDetection(filePath);
      return result?.fullTextAnnotation?.text || '';
    } catch (err) {
      throw this._makeError(500, 'ERR_OCR_FAIL', `Google Vision 호출 실패: ${err.message}`);
    }
  }

  _postProcess(text) {
    if (!text) return '';
    const normalized = text
      .replace(/[\t\r]+/g, ' ')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();

    // Split long lines; merge hyphenated line breaks common in OCR
    return normalized
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => l.replace(/-\s*\n/g, ''))
      .join('\n');
  }

  _makeError(statusCode, code, message) {
    const e = new Error(message);
    e.statusCode = statusCode;
    e.code = code;
    return e;
  }
}

module.exports = new OcrService();


