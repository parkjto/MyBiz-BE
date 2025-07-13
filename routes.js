// API 라우트 예시
const express = require('express');
const router = express.Router();

// 예시: 광고 자동 생성 라우트
router.get('/ads', (req, res) => {
  res.json({ message: '광고 자동 생성 기능 (예시)' });
});

// 예시: 매출 분석 라우트
router.get('/sales', (req, res) => {
  res.json({ message: '매출 분석 기능 (예시)' });
});

// 예시: 고객 감정 분석 라우트
router.get('/reviews', (req, res) => {
  res.json({ message: '고객 감정 분석 기능 (예시)' });
});

module.exports = router;
