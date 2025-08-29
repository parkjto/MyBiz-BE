import { processChatMessage, processVoiceCommand } from '../services/chatbotService.js';
import { logger } from '../utils/logger.js';

/**
 * 텍스트 메시지 처리
 * POST /api/chatbot/message
 */
export async function handleTextMessage(req, res) {
  try {
    const { text, userId } = req.body;
    
    // 입력값 검증
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: '텍스트 메시지가 필요합니다.'
      });
    }
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '사용자 ID가 필요합니다.'
      });
    }
    
    logger.info('텍스트 메시지 처리 요청:', { text, userId });
    
    // 챗봇 서비스로 메시지 처리
    const response = await processChatMessage(text.trim(), userId);
    
    res.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    logger.error('텍스트 메시지 처리 실패:', error);
    res.status(500).json({
      success: false,
      message: '메시지 처리 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}

/**
 * 음성 명령 처리
 * POST /api/chatbot/voice
 */
export async function handleVoiceCommand(req, res) {
  try {
    const { audioBuffer, userId } = req.body;
    
    // 입력값 검증
    if (!audioBuffer) {
      return res.status(400).json({
        success: false,
        message: '음성 데이터가 필요합니다.'
      });
    }
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '사용자 ID가 필요합니다.'
      });
    }
    
    logger.info('음성 명령 처리 요청:', { userId, audioLength: audioBuffer.length });
    
    // 챗봇 서비스로 음성 명령 처리
    const response = await processVoiceCommand(audioBuffer, userId);
    
    res.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    logger.error('음성 명령 처리 실패:', error);
    res.status(500).json({
      success: false,
      message: '음성 명령 처리 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}

/**
 * 챗봇 상태 확인
 * GET /api/chatbot/status
 */
export async function getChatbotStatus(req, res) {
  try {
    const status = {
      service: 'chatbot',
      status: 'active',
      features: {
        text_processing: true,
        voice_processing: false, // TODO: 음성 인식 API 연동 후 true로 변경
        intent_classification: true,
        ai_analysis: true,
        navigation: true
      },
      supported_intents: [
        'sales_analysis',
        'review_analysis', 
        'improvement_suggestion',
        'ad_generation',
        'store_info',
        'general_chat'
      ],
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    logger.error('챗봇 상태 확인 실패:', error);
    res.status(500).json({
      success: false,
      message: '상태 확인 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}

/**
 * 의도 분류 테스트 (개발용)
 * POST /api/chatbot/test-intent
 */
export async function testIntentClassification(req, res) {
  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: '테스트할 텍스트가 필요합니다.'
      });
    }
    
    // 의도 분류 함수 직접 호출 (테스트용)
    const { processChatMessage } = await import('../services/chatbotService.js');
    const response = await processChatMessage(text.trim(), 'test_user');
    
    res.json({
      success: true,
      data: {
        input_text: text,
        classified_response: response
      }
    });
    
  } catch (error) {
    logger.error('의도 분류 테스트 실패:', error);
    res.status(500).json({
      success: false,
      message: '의도 분류 테스트 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}
