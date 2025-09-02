import express from 'express';
import {
  handleTextMessage,
  handleVoiceCommand,
  getChatbotStatus,
  testIntentClassification
} from '../controllers/chatbotController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// 챗봇 상태 확인 (인증 불필요)
router.get('/status', getChatbotStatus);

// 텍스트 메시지 처리 (인증 필요)
router.post('/message', 
  authMiddleware, 
  rateLimiter,
  handleTextMessage
);

// 음성 명령 처리 (인증 필요)
router.post('/voice', 
  authMiddleware, 
  rateLimiter,
  handleVoiceCommand
);

// 의도 분류 테스트 (개발용, 인증 필요)
router.post('/test-intent', 
  authMiddleware, 
  rateLimiter,
  testIntentClassification
);

export default router;
