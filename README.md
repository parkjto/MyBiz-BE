# 🚀 MyBiz-BE - 스마트 이미지 보정 시스템

## 📋 개요

MyBiz-BE는 AI 기반 없이 고급 이미지 분석 알고리즘과 통계적 방법을 활용하여 전문가 수준의 이미지 보정을 제공하는 백엔드 시스템입니다.

## ✨ 주요 기능

### 🎨 스마트 이미지 보정
- **5가지 이미지 타입 자동 감지**: 음식, 인물, 풍경, 문서, 제품
- **고급 품질 분석**: 노이즈 레벨, 색상 정확도, 노출, 구도 등
- **품질 등급 시스템**: A+ ~ C 등급으로 이미지 품질 평가
- **타입별 최적화**: 각 이미지 타입에 맞는 맞춤형 보정

### 🔬 고급 이미지 분석
- **통계적 색상 분석**: RGB 채널별 상세 분석
- **이미지 복잡도 분석**: 색상 변화 + 해상도 복잡도
- **황금비율 기반 구도 분석**: 1.618 비율 기준 품질 평가

### 🚀 실시간 이미지 처리
- **Sharp.js 기반**: 고성능 이미지 처리
- **다양한 보정 기법**: 선명도, 노이즈 감소, 톤 커브 등
- **Base64 출력**: 즉시 다운로드 가능

## 🛠️ 기술 스택

- **Backend**: Node.js, Express.js
- **Image Processing**: Sharp.js
- **File Upload**: Multer
- **Security**: Helmet, CORS
- **Documentation**: Swagger
- **Logging**: Winston

## 🔧 환경 설정

### 1. 필수 환경 변수

`.env` 파일을 생성하고 다음 설정을 추가하세요:

```bash
# 서버 설정
NODE_ENV=development
PORT=4000

# CORS 설정 (프론트엔드 연동용)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://yourdomain.com

# 이미지 처리 설정
MAX_IMAGE_SIZE=52428800
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif,image/webp

# Rate Limiting 설정
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_MAX_UPLOADS=10
```

### 2. 개발 환경 vs 프로덕션 환경

#### 개발 환경
```bash
NODE_ENV=development
# 모든 origin 허용 (CORS)
```

#### 프로덕션 환경
```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
# 특정 도메인만 허용
```

## 🚀 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일을 편집하여 실제 값 입력
```

### 3. 서버 실행
```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

## 🌐 API 엔드포인트

### 기본 URL
```
http://localhost:4000/api
```

### 이미지 분석 및 보정 API

| 메서드 | 엔드포인트 | 설명 |
|--------|------------|------|
| `POST` | `/analyze-image` | 이미지 분석 |
| `POST` | `/enhance-image` | 이미지 보정 |
| `POST` | `/diagnose-image` | 이미지 진단 |
| `GET` | `/enhancement-parameters/:imageType` | 보정 파라미터 조회 |

### 기타 API

| 메서드 | 엔드포인트 | 설명 |
|--------|------------|------|
| `GET` | `/health` | 서버 상태 확인 |
| `GET` | `/api-docs` | API 문서 |

## 💻 프론트엔드 연동

### React + TypeScript 예제

```typescript
// 이미지 분석
const analyzeImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('http://localhost:4000/api/analyze-image', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
};

// 이미지 보정
const enhanceImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('http://localhost:4000/api/enhance-image', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
};
```

### Vue.js 예제

```vue
<template>
  <div class="image-enhancer">
    <input type="file" @change="handleFileSelect" accept="image/*" />
    <button @click="analyzeImage" :disabled="loading">
      {{ loading ? '분석 중...' : '이미지 분석' }}
    </button>
    <button @click="enhanceImage" :disabled="loading">
      {{ loading ? '보정 중...' : '이미지 보정' }}
    </button>
  </div>
</template>

<script>
export default {
  methods: {
    async analyzeImage() {
      // 이미지 분석 로직
    },
    async enhanceImage() {
      // 이미지 보정 로직
    }
  }
}
</script>
```

자세한 연동 가이드는 [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)를 참조하세요.

## 🔒 보안 기능

### CORS 정책
- 개발 환경: 모든 origin 허용
- 프로덕션 환경: 특정 도메인만 허용

### 파일 업로드 제한
- 최대 파일 크기: 50MB
- 허용 파일 형식: 이미지 파일만
- MIME 타입 검증

### Rate Limiting
- 기본 제한: 분당 100회 요청
- 이미지 업로드: 분당 10회 요청

## 📱 모바일 최적화

- 반응형 이미지 처리
- 터치 인터페이스 지원
- 드래그 앤 드롭
- 제스처 지원

## 🚀 성능 최적화

- 이미지 압축 및 최적화
- WebP 형식 자동 변환
- 브라우저 캐싱
- CDN 연동 지원

## 🔧 문제 해결

### CORS 오류
```bash
# 환경 변수 확인
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

### 파일 크기 제한
```bash
# 서버 설정 확인
MAX_IMAGE_SIZE=52428800
```

### 메모리 부족
```bash
# Node.js 메모리 제한 증가
node --max-old-space-size=4096 index.js
```

## 📚 API 문서

Swagger UI를 통해 API 문서를 확인할 수 있습니다:
```
http://localhost:4000/api-docs
```

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 지원

문제가 있거나 질문이 있으시면 [Issues](../../issues)를 통해 문의해 주세요.

---

**MyBiz-BE** - AI 없이도 전문가 수준의 이미지 보정 🎨✨
