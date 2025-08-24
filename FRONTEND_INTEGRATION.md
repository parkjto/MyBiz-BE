# 🚀 프론트엔드 연동 가이드

## 📋 개요

MyBiz-BE의 스마트 이미지 보정 시스템을 프론트엔드에서 사용하기 위한 연동 가이드입니다.

## 🔧 환경 설정

### 1. 환경 변수 설정

`.env` 파일에 다음 설정을 추가하세요:

```bash
# 개발 환경
NODE_ENV=development

# 프로덕션 환경 (실제 도메인으로 설정)
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# 서버 포트
PORT=4000
```

### 2. CORS 정책

- **개발 환경**: 모든 origin 허용
- **프로덕션 환경**: `ALLOWED_ORIGINS`에 명시된 도메인만 허용

## 🌐 API 엔드포인트

### 기본 URL
```
http://localhost:4000/api
```

### 1. 이미지 분석 API

```typescript
// 이미지 분석
POST /api/analyze-image
Content-Type: multipart/form-data

Request:
- image: File (이미지 파일)

Response:
{
  "imageType": "food|portrait|landscape|document|product|other",
  "brightness": 128,
  "contrast": 50,
  "sharpness": 20,
  "noise": 15,
  "colorAccuracy": 70,
  "exposure": 65,
  "composition": 70,
  "technicalQuality": 65,
  "qualityGrade": "A+|A|B+|B|C",
  "resolution": "1920x1080",
  "aspectRatio": 1.78,
  "fileSize": 1024000,
  "isDark": false,
  "isBright": false,
  "isLowContrast": false,
  "isBlurry": false,
  "isNoisy": false
}
```

### 2. 이미지 보정 API

```typescript
// 이미지 보정
POST /api/enhance-image
Content-Type: multipart/form-data

Request:
- image: File (이미지 파일)

Response:
{
  "enhancedImage": "base64_encoded_image",
  "originalAnalysis": { /* 원본 분석 결과 */ },
  "enhancedAnalysis": { /* 보정 후 분석 결과 */ },
  "appliedParameters": {
    "brightness": 1.08,
    "saturation": 1.15,
    "sharpness": 1.25,
    "contrast": 1.08,
    "gamma": 1.02,
    "noiseReduction": 0.0,
    "highlights": 1.05,
    "shadows": 1.1
  }
}
```

### 3. 이미지 진단 API

```typescript
// 이미지 진단
POST /api/diagnose-image
Content-Type: multipart/form-data

Request:
- image: File (이미지 파일)

Response:
{
  "imageType": "food",
  "quality": { /* 품질 분석 결과 */ },
  "diagnosis": {
    "issues": ["어두운 이미지", "낮은 대비"],
    "recommendations": [
      "밝기를 15-20% 증가시키는 것을 권장합니다.",
      "대비를 20-25% 증가시키는 것을 권장합니다."
    ],
    "overallScore": 65,
    "grade": "B",
    "priority": "MEDIUM"
  }
}
```

### 4. 보정 파라미터 조회 API

```typescript
// 이미지 타입별 보정 파라미터 조회
GET /api/enhancement-parameters/:imageType?quality={qualityParams}

Request:
- imageType: string (food|portrait|landscape|document|product|other)
- quality: string (URL 인코딩된 JSON, 선택사항)

Response:
{
  "imageType": "food",
  "quality": { /* 품질 정보 */ },
  "parameters": { /* 최적 보정 파라미터 */ }
}
```

## 💻 프론트엔드 구현 예제

### React + TypeScript 예제

```typescript
// types/imageAnalysis.ts
export interface ImageAnalysis {
  imageType: string;
  brightness: number;
  contrast: number;
  sharpness: number;
  noise: number;
  colorAccuracy: number;
  exposure: number;
  composition: number;
  technicalQuality: number;
  qualityGrade: string;
  resolution: string;
  aspectRatio: number;
  fileSize: number;
  isDark: boolean;
  isBright: boolean;
  isLowContrast: boolean;
  isBlurry: boolean;
  isNoisy: boolean;
}

export interface EnhancementParameters {
  brightness: number;
  saturation: number;
  sharpness: number;
  contrast: number;
  gamma: number;
  noiseReduction: number;
  highlights: number;
  shadows: number;
}

export interface EnhancementResult {
  enhancedImage: string;
  originalAnalysis: ImageAnalysis;
  enhancedAnalysis: ImageAnalysis | null;
  appliedParameters: EnhancementParameters;
}
```

```typescript
// services/imageAnalysisService.ts
import { ImageAnalysis, EnhancementResult } from '../types/imageAnalysis';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export class ImageAnalysisService {
  // 이미지 분석
  static async analyzeImage(file: File): Promise<ImageAnalysis> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/analyze-image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('이미지 분석에 실패했습니다.');
    }

    return response.json();
  }

  // 이미지 보정
  static async enhanceImage(file: File): Promise<EnhancementResult> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/enhance-image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('이미지 보정에 실패했습니다.');
    }

    return response.json();
  }

  // 이미지 진단
  static async diagnoseImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/diagnose-image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('이미지 진단에 실패했습니다.');
    }

    return response.json();
  }

  // 보정 파라미터 조회
  static async getEnhancementParameters(
    imageType: string,
    quality?: Partial<ImageAnalysis>
  ) {
    const url = new URL(`${API_BASE_URL}/enhancement-parameters/${imageType}`);
    
    if (quality) {
      url.searchParams.set('quality', encodeURIComponent(JSON.stringify(quality)));
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error('보정 파라미터 조회에 실패했습니다.');
    }

    return response.json();
  }
}
```

```tsx
// components/ImageEnhancer.tsx
import React, { useState } from 'react';
import { ImageAnalysisService } from '../services/imageAnalysisService';
import { ImageAnalysis, EnhancementResult } from '../types/imageAnalysis';

export const ImageEnhancer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [enhancedResult, setEnhancedResult] = useState<EnhancementResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalysis(null);
      setEnhancedResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const result = await ImageAnalysisService.analyzeImage(selectedFile);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnhance = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const result = await ImageAnalysisService.enhanceImage(selectedFile);
      setEnhancedResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '보정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const downloadEnhancedImage = () => {
    if (!enhancedResult) return;

    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${enhancedResult.enhancedImage}`;
    link.download = `enhanced_${selectedFile?.name || 'image.jpg'}`;
    link.click();
  };

  return (
    <div className="image-enhancer">
      <h2>스마트 이미지 보정</h2>
      
      <div className="file-input">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={loading}
        />
      </div>

      {selectedFile && (
        <div className="actions">
          <button onClick={handleAnalyze} disabled={loading}>
            {loading ? '분석 중...' : '이미지 분석'}
          </button>
          <button onClick={handleEnhance} disabled={loading}>
            {loading ? '보정 중...' : '이미지 보정'}
          </button>
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {analysis && (
        <div className="analysis-results">
          <h3>분석 결과</h3>
          <div className="quality-grade">
            품질 등급: <span className={`grade-${analysis.qualityGrade.toLowerCase()}`}>
              {analysis.qualityGrade}
            </span>
          </div>
          <div className="quality-metrics">
            <div>밝기: {analysis.brightness}</div>
            <div>대비: {analysis.contrast}</div>
            <div>선명도: {analysis.sharpness}</div>
            <div>노이즈: {analysis.noise}</div>
            <div>색상 정확도: {analysis.colorAccuracy}%</div>
          </div>
        </div>
      )}

      {enhancedResult && (
        <div className="enhanced-results">
          <h3>보정 결과</h3>
          <div className="image-comparison">
            <div>
              <h4>원본</h4>
              <img
                src={URL.createObjectURL(selectedFile!)}
                alt="원본"
                style={{ maxWidth: '300px' }}
              />
            </div>
            <div>
              <h4>보정됨</h4>
              <img
                src={`data:image/jpeg;base64,${enhancedResult.enhancedImage}`}
                alt="보정됨"
                style={{ maxWidth: '300px' }}
              />
            </div>
          </div>
          <button onClick={downloadEnhancedImage}>
            보정된 이미지 다운로드
          </button>
        </div>
      )}
    </div>
  );
};
```

### Vue.js 예제

```vue
<!-- ImageEnhancer.vue -->
<template>
  <div class="image-enhancer">
    <h2>스마트 이미지 보정</h2>
    
    <div class="file-input">
      <input
        type="file"
        accept="image/*"
        @change="handleFileSelect"
        :disabled="loading"
      />
    </div>

    <div v-if="selectedFile" class="actions">
      <button @click="handleAnalyze" :disabled="loading">
        {{ loading ? '분석 중...' : '이미지 분석' }}
      </button>
      <button @click="handleEnhance" :disabled="loading">
        {{ loading ? '보정 중...' : '이미지 보정' }}
      </button>
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div v-if="analysis" class="analysis-results">
      <h3>분석 결과</h3>
      <div class="quality-grade">
        품질 등급: 
        <span :class="`grade-${analysis.qualityGrade.toLowerCase()}`">
          {{ analysis.qualityGrade }}
        </span>
      </div>
      <div class="quality-metrics">
        <div>밝기: {{ analysis.brightness }}</div>
        <div>대비: {{ analysis.contrast }}</div>
        <div>선명도: {{ analysis.sharpness }}</div>
        <div>노이즈: {{ analysis.noise }}</div>
        <div>색상 정확도: {{ analysis.colorAccuracy }}%</div>
      </div>
    </div>

    <div v-if="enhancedResult" class="enhanced-results">
      <h3>보정 결과</h3>
      <div class="image-comparison">
        <div>
          <h4>원본</h4>
          <img
            :src="originalImageUrl"
            alt="원본"
            style="max-width: 300px"
          />
        </div>
        <div>
          <h4>보정됨</h4>
          <img
            :src="enhancedImageUrl"
            alt="보정됨"
            style="max-width: 300px"
          />
        </div>
      </div>
      <button @click="downloadEnhancedImage">
        보정된 이미지 다운로드
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { ImageAnalysisService } from '../services/imageAnalysisService';
import type { ImageAnalysis, EnhancementResult } from '../types/imageAnalysis';

export default defineComponent({
  name: 'ImageEnhancer',
  setup() {
    const selectedFile = ref<File | null>(null);
    const analysis = ref<ImageAnalysis | null>(null);
    const enhancedResult = ref<EnhancementResult | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    const originalImageUrl = computed(() => {
      if (!selectedFile.value) return '';
      return URL.createObjectURL(selectedFile.value);
    });

    const enhancedImageUrl = computed(() => {
      if (!enhancedResult.value) return '';
      return `data:image/jpeg;base64,${enhancedResult.value.enhancedImage}`;
    });

    const handleFileSelect = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        selectedFile.value = file;
        analysis.value = null;
        enhancedResult.value = null;
        error.value = null;
      }
    };

    const handleAnalyze = async () => {
      if (!selectedFile.value) return;

      loading.value = true;
      error.value = null;

      try {
        const result = await ImageAnalysisService.analyzeImage(selectedFile.value);
        analysis.value = result;
      } catch (err) {
        error.value = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.';
      } finally {
        loading.value = false;
      }
    };

    const handleEnhance = async () => {
      if (!selectedFile.value) return;

      loading.value = true;
      error.value = null;

      try {
        const result = await ImageAnalysisService.enhanceImage(selectedFile.value);
        enhancedResult.value = result;
      } catch (err) {
        error.value = err instanceof Error ? err.message : '보정 중 오류가 발생했습니다.';
      } finally {
        loading.value = false;
      }
    };

    const downloadEnhancedImage = () => {
      if (!enhancedResult.value) return;

      const link = document.createElement('a');
      link.href = enhancedImageUrl.value;
      link.download = `enhanced_${selectedFile.value?.name || 'image.jpg'}`;
      link.click();
    };

    return {
      selectedFile,
      analysis,
      enhancedResult,
      loading,
      error,
      originalImageUrl,
      enhancedImageUrl,
      handleFileSelect,
      handleAnalyze,
      handleEnhance,
      downloadEnhancedImage,
    };
  },
});
</script>
```

## 🔒 보안 고려사항

### 1. 파일 업로드 제한
- **최대 파일 크기**: 50MB
- **허용 파일 형식**: 이미지 파일만 (JPG, PNG, GIF, WebP)
- **파일 검증**: MIME 타입 및 확장자 검증

### 2. CORS 정책
- **개발 환경**: 모든 origin 허용
- **프로덕션 환경**: 특정 도메인만 허용
- **인증**: 필요시 JWT 토큰 기반 인증 추가

### 3. Rate Limiting
- **기본 제한**: 분당 100회 요청
- **이미지 업로드**: 분당 10회 요청

## 📱 모바일 최적화

### 1. 반응형 이미지 처리
- **자동 리사이징**: 모바일 기기에 맞는 최적 크기
- **프로그레시브 로딩**: 대용량 이미지 처리 시 진행률 표시

### 2. 터치 인터페이스
- **드래그 앤 드롭**: 모바일에서도 직관적인 파일 업로드
- **제스처 지원**: 핀치 줌, 스와이프 등

## 🚀 성능 최적화

### 1. 이미지 압축
- **WebP 형식**: 최신 브라우저에서 자동 WebP 변환
- **품질 조정**: 용도에 따른 적절한 압축률 적용

### 2. 캐싱 전략
- **브라우저 캐시**: 정적 리소스 캐싱
- **CDN 연동**: 이미지 전송 최적화

## 🔧 문제 해결

### 1. CORS 오류
```bash
# 브라우저 콘솔에서 확인
Access to fetch at 'http://localhost:4000/api/analyze-image' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**해결 방법**:
- 환경 변수 `NODE_ENV=development` 설정
- 프론트엔드 origin을 `ALLOWED_ORIGINS`에 추가

### 2. 파일 크기 제한
```bash
# 서버 로그에서 확인
PayloadTooLargeError: request entity too large
```

**해결 방법**:
- `express.json({ limit: '50mb' })` 설정 확인
- 클라이언트에서 파일 크기 사전 검증

### 3. 메모리 부족
```bash
# 서버 로그에서 확인
JavaScript heap out of memory
```

**해결 방법**:
- Node.js 메모리 제한 증가: `--max-old-space-size=4096`
- 이미지 처리 후 메모리 정리

## 📚 추가 리소스

- [Sharp.js 공식 문서](https://sharp.pixelplumbing.com/)
- [Express.js CORS 설정](https://expressjs.com/en/resources/middleware/cors.html)
- [Multer 파일 업로드](https://github.com/expressjs/multer)
- [프론트엔드 이미지 처리 가이드](https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications)
