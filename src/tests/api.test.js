const request = require('supertest');
const express = require('express');
const app = require('./setup');

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

  describe('카카오 로그인 테스트', () => {
    it('POST /api/auth/kakao/login - 올바른 인가 코드로 로그인', async () => {
      const res = await request(app)
        .post('/api/auth/kakao/login')
        .send({ code: 'test_authorization_code' });
      
      // 실제 카카오 API 호출이 실패하더라도 적절한 에러 응답을 받아야 함
      expect(res.statusCode).toBe(400); // 카카오 API 키가 유효하지 않을 경우
      expect(res.body).toHaveProperty('success');
      expect(res.body.success).toBe(false);
      expect(res.body).toHaveProperty('error');
    });

    it('POST /api/auth/kakao/login - 인가 코드 누락 시 에러', async () => {
      const res = await request(app)
        .post('/api/auth/kakao/login')
        .send({});
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success');
      expect(res.body.success).toBe(false);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('카카오 인가 코드가 필요합니다.');
    });

    it('POST /api/auth/kakao/login - 빈 인가 코드로 에러', async () => {
      const res = await request(app)
        .post('/api/auth/kakao/login')
        .send({ code: '' });
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success');
      expect(res.body.success).toBe(false);
      expect(res.body).toHaveProperty('error');
    });
  });

  it('/api/auth/logout POST 로그아웃', async () => {
    const res = await request(app)
      .post('/api/auth/logout');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success');
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toBe('로그아웃 성공');
  });
}); 