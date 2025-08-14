const ocrService = require('../services/ocrService');
const path = require('path');

describe('OCR Service Tests', () => {
  describe('Configuration', () => {
    test('should load configuration from environment variables', () => {
      const config = ocrService.getConfig();
      
      expect(config).toHaveProperty('maxChunkHeight');
      expect(config).toHaveProperty('overlap');
      expect(config).toHaveProperty('minLastChunk');
      expect(config).toHaveProperty('concurrency');
      expect(config).toHaveProperty('resizeWidth');
      expect(config).toHaveProperty('retries');
      expect(config).toHaveProperty('minLineLength');
      expect(config).toHaveProperty('thresholdValue');
      expect(config).toHaveProperty('jpegQuality');
      
      // 기본값 확인
      expect(config.maxChunkHeight).toBe(1024);
      expect(config.overlap).toBe(200);
      expect(config.minLastChunk).toBe(512);
      expect(config.concurrency).toBe(3);
      expect(config.resizeWidth).toBe(1024);
      expect(config.retries).toBe(3);
      expect(config.minLineLength).toBe(6);
      expect(config.thresholdValue).toBe(128);
      expect(config.jpegQuality).toBe(75);
    });
  });

  describe('Text Processing', () => {
    test('should process text correctly', () => {
      const inputText = '  Hello   World  \n\n  Test   Text  ';
      const processed = ocrService._postProcess(inputText);
      
      expect(processed).toBe('Hello World\nTest Text');
    });

    test('should handle special characters', () => {
      const inputText = 'Hello@#$%^&*()World\nTest\u200BText';
      const processed = ocrService._postProcess(inputText);
      
      expect(processed).toBe('HelloWorld\nTestText');
    });

    test('should handle hyphenated line breaks', () => {
      const inputText = 'Hello-\nWorld\nTest-\nText';
      const processed = ocrService._postProcess(inputText);
      
      expect(processed).toBe('HelloWorld\nTestText');
    });
  });

  describe('Chunk Processing', () => {
    test('should split image into chunks correctly', async () => {
      const mockImg = {
        metadata: async () => ({ width: 1024, height: 2500 })
      };
      
      const chunks = await ocrService._splitImageIntoChunks(mockImg, 2500);
      
      // 2500px 높이를 1024px 청크로 분할 (overlap 200px 고려)
      // 첫 번째: 0-1024 (1024px)
      // 두 번째: 824-1848 (1024px) 
      // 세 번째: 1648-2500 (852px, minLastChunk 미만이므로 앞 청크에 합침)
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toEqual({ top: 0, height: 1024 });
      expect(chunks[1]).toEqual({ top: 824, height: 1676 }); // 2500 - 824
    });

    test('should handle small images without splitting', async () => {
      const mockImg = {
        metadata: async () => ({ width: 1024, height: 800 })
      };
      
      const chunks = await ocrService._splitImageIntoChunks(mockImg, 800);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual({ top: 0, height: 800 });
    });
  });

  describe('Duplicate Removal', () => {
    test('should remove duplicate lines based on Levenshtein distance', () => {
      const chunks = [
        'Hello World\nThis is a test',
        'This is a test\nNew content here',
        'Another line\nMore content'
      ];
      
      const result = ocrService._finalizeTextFromChunks(chunks);
      
      // 중복된 "This is a test" 라인이 제거되어야 함
      expect(result).toContain('Hello World');
      expect(result).toContain('This is a test');
      expect(result).toContain('New content here');
      expect(result).toContain('Another line');
      expect(result).toContain('More content');
    });

    test('should not remove short lines', () => {
      const chunks = [
        'Hi\nHello World',
        'Hi\nNew content'
      ];
      
      const result = ocrService._finalizeTextFromChunks(chunks);
      
      // "Hi"는 짧은 라인이므로 중복 제거되지 않아야 함
      expect(result).toContain('Hi');
    });
  });

  describe('Error Handling', () => {
    test('should create proper error objects', () => {
      const error = ocrService._makeError(500, 'TEST_ERROR', 'Test error message');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
    });
  });
});
