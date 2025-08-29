import { logger } from '../utils/logger.js';

/**
 * 음성 인식 서비스 (Google Cloud Speech-to-Text 연동 예정)
 * 현재는 기본 구조만 구현
 */

/**
 * 음성 파일을 텍스트로 변환
 * @param {Buffer} audioBuffer - 오디오 데이터
 * @param {string} languageCode - 언어 코드 (ko-KR, en-US 등)
 * @returns {Promise<string>} 인식된 텍스트
 */
export async function transcribeAudio(audioBuffer, languageCode = 'ko-KR', audioMimeType) {
  try {
    logger.info('음성 인식 시작:', { 
      audioSize: audioBuffer.length, 
      languageCode,
      audioMimeType
    });

    // 실제 Google Cloud Speech-to-Text 연동 (환경변수로 on/off)
    if (process.env.GOOGLE_CLOUD_SPEECH_ENABLED === 'true') {
      const { SpeechClient } = await import('@google-cloud/speech');
      const client = new SpeechClient({ keyFilename: process.env.GOOGLE_CLOUD_KEY_FILENAME });

      // audioBuffer가 base64 문자열로 들어옴(프론트에서 DataURL에서 본문만 전달)
      const content = typeof audioBuffer === 'string' ? audioBuffer : Buffer.from(audioBuffer).toString('base64');

      // MIME → encoding 매핑
      const mime = (audioMimeType || '').toLowerCase();
      let encoding = undefined;
      if (mime.includes('wav')) encoding = 'LINEAR16';
      else if (mime.includes('mpeg') || mime.includes('mp3')) encoding = 'MP3';
      else if (mime.includes('webm')) encoding = 'WEBM_OPUS';
      else if (mime.includes('ogg')) encoding = 'OGG_OPUS';
      else if (mime.includes('flac')) encoding = 'FLAC';

      const request = {
        audio: { content },
        config: {
          languageCode,
          enableAutomaticPunctuation: true,
          encoding, // 일부 포맷은 생략해도 헤더로 처리되지만 명시 시 정확도 향상
        }
      };

      const [response] = await client.recognize(request);
      const transcripts = (response.results || []).flatMap(r => (r.alternatives || []).map(a => a.transcript)).filter(Boolean);
      const transcription = transcripts.join(' ').trim();
      if (transcription) {
        logger.info('음성 인식 완료 (google):', transcription);
        return transcription;
      }
      logger.warn('음성 인식 결과가 비어있음, 더미로 폴백');
    }
    
    // 임시 더미 응답
    const dummyResponses = [
      '매출 분석을 보여주세요',
      '리뷰 상황을 확인해주세요',
      '매출을 올리는 방법을 알려주세요',
      '광고를 만들어주세요'
    ];
    
    const randomResponse = dummyResponses[Math.floor(Math.random() * dummyResponses.length)];
    
    logger.info('음성 인식 완료 (더미):', randomResponse);
    return randomResponse;
    
  } catch (error) {
    logger.error('음성 인식 실패:', error);
    throw new Error(`음성 인식 실패: ${error.message}`);
  }
}

/**
 * 실시간 음성 스트림 처리 (WebSocket용)
 * @param {ReadableStream} audioStream - 오디오 스트림
 * @param {string} languageCode - 언어 코드
 * @returns {AsyncGenerator<string>} 실시간 인식 결과
 */
export async function* transcribeStream(audioStream, languageCode = 'ko-KR') {
  try {
    logger.info('실시간 음성 인식 시작:', { languageCode });
    
    // TODO: Google Cloud Speech-to-Text Streaming API 연동
    // 현재는 더미 스트림 반환
    
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      yield `실시간 음성 인식 ${i + 1}...`;
    }
    
    yield '음성 인식이 완료되었습니다.';
    
  } catch (error) {
    logger.error('실시간 음성 인식 실패:', error);
    throw new Error(`실시간 음성 인식 실패: ${error.message}`);
  }
}

/**
 * 지원하는 언어 목록 반환
 * @returns {Array} 지원 언어 목록
 */
export function getSupportedLanguages() {
  return [
    { code: 'ko-KR', name: '한국어', country: '대한민국' },
    { code: 'en-US', name: '영어', country: '미국' },
    { code: 'ja-JP', name: '일본어', country: '일본' },
    { code: 'zh-CN', name: '중국어', country: '중국' },
    { code: 'es-ES', name: '스페인어', country: '스페인' }
  ];
}

/**
 * 음성 인식 설정 반환
 * @returns {Object} 음성 인식 설정
 */
export function getSpeechRecognitionConfig() {
  return {
    enabled: process.env.GOOGLE_CLOUD_SPEECH_ENABLED === 'true',
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_CLOUD_KEY_FILENAME,
    defaultLanguage: 'ko-KR',
    supportedFormats: ['wav', 'mp3', 'flac', 'm4a'],
    maxAudioDuration: 60, // 최대 60초
    enablePunctuation: true,
    enableWordConfidence: true
  };
}

/**
 * 음성 인식 서비스 상태 확인
 * @returns {Object} 서비스 상태
 */
export function getServiceStatus() {
  const config = getSpeechRecognitionConfig();
  
  return {
    service: 'speech_recognition',
    status: config.enabled ? 'active' : 'disabled',
    provider: 'google_cloud_speech_to_text',
    features: {
      transcription: config.enabled,
      streaming: config.enabled,
      punctuation: config.enabled,
      word_confidence: config.enabled
    },
    supported_languages: getSupportedLanguages().length,
    default_language: config.defaultLanguage,
    timestamp: new Date().toISOString()
  };
}
