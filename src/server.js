import 'dotenv/config';
import express from 'express';
import { applyCommon } from '../middlewares/common.js';
import adRoutes from '../routes/adRoutes.js';
import healthRoutes from '../routes/healthRoutes.js';

const app = express();

// 공통 미들웨어 적용
applyCommon(app);

// 정적 파일 서빙 (public 폴더)
app.use(express.static('public'));

// JSON & 폼 파서
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 라우트 설정
app.use('/api/ad', adRoutes);
app.use('/', healthRoutes);

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    ok: false,
    message: '요청한 엔드포인트를 찾을 수 없습니다.',
    path: req.originalUrl
  });
});

// 전역 에러 핸들러
app.use((error, req, res, next) => {
  console.error('서버 에러:', error);
  
  res.status(error.status || 500).json({
    ok: false,
    message: error.message || '서버 내부 오류가 발생했습니다.',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`🚀 [서버] http://localhost:${port}에서 실행 중`);
  console.log(`📝 [API] 텍스트 기반 광고: POST /api/ad/generate`);
  console.log(`🖼️ [API] 이미지 보정 전용: POST /api/ad/enhance-image`);
  console.log(`🖼️ [API] 이미지 기반 광고: POST /api/ad/generate-from-image`);
  console.log(`🖼️ [API] 이미지 업로드 + 보정 + 광고: POST /api/ad/generate-with-image`);
  console.log(`💚 [API] 헬스체크: GET /health`);
  console.log(`⚠️ [주의] 모든 데이터는 서버에 저장되지 않습니다!`);
});
