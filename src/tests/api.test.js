const request = require('supertest');
const express = require('express');
const app = require('../index');

describe('API 엔드포인트 테스트', () => {
  it('/api/ads GET 광고 자동 생성', async () => {
    const res = await request(app).get('/api/ads');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('/api/sales GET 매출 분석 (인증 필요)', async () => {
    // 인증 미들웨어가 항상 통과하는 예시이므로 바로 테스트
    const res = await request(app).get('/api/sales');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('/api/reviews GET 고객 감정 분석', async () => {
    const res = await request(app).get('/api/reviews');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('/api/auth/kakao/login POST 카카오 로그인', async () => {
    const res = await request(app)
      .post('/api/auth/kakao/login')
      .send({ access_token: 'test_token' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('access_token');
  });

  it('/api/auth/logout POST 로그아웃', async () => {
    const res = await request(app)
      .post('/api/auth/logout');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
  });
}); 