# MyBiz Backend - OCR 리뷰 처리 시스템

## 🎯 프로젝트 개요

MyBiz는 **사용자 리뷰 이미지를 OCR로 분석하고 GPT로 정리하여 구조화된 데이터로 저장**하는 백엔드 시스템입니다.

## 🚀 주요 기능

- **이미지 업로드**: Multer를 통한 안전한 파일 업로드
- **OCR 처리**: Tesseract.js 기반 텍스트 추출
- **AI 분석**: OpenAI GPT-4o-mini를 통한 리뷰 정리 및 감정 분석
- **데이터 저장**: PostgreSQL(Supabase) 기반 구조화된 저장
- **실시간 처리**: 비동기 처리 및 진행 상황 모니터링

## 🏗️ 아키텍처

```
📱 Client (test.html)
    ↓
🌐 Express.js Server
    ↓
📁 Multer (File Upload)
    ↓
🔍 Tesseract.js (OCR)
    ↓
🤖 OpenAI GPT (Analysis)
    ↓
💾 Supabase (PostgreSQL)
```

## 📁 프로젝트 구조

```
MyBiz-BE/
├── 📁 src/
│   ├── 📁 controllers/
│   │   └── ocrController.js      # OCR 처리 컨트롤러
│   ├── 📁 routes/
│   │   └── ocr.js               # OCR 관련 라우트
│   └── 📁 services/
│       └── ocrService.js        # OCR 서비스 로직
├── 📁 config/
│   └── db.js                    # Supabase 연결 설정
├── 📁 models/
│   └── review.js                # 리뷰 데이터 구조 정의
├── 📁 services/
│   ├── openaiService.js         # OpenAI GPT 분석 서비스
│   └── reviewProcessingService.js # 리뷰 처리 서비스
├── 📁 uploads/                  # 업로드된 이미지 저장소
├── 📁 routes/                   # 기타 API 라우트
├── 📁 controllers/              # 기타 컨트롤러
├── index.js                     # 메인 서버 파일
├── test.html                    # 테스트 페이지
├── supabase-setup.sql           # Supabase 테이블 생성 스크립트
└── README.md                    # 프로젝트 문서
```

## 🛠️ 기술 스택

- **Runtime**: Node.js
- **Framework**: Express.js
- **File Upload**: Multer
- **OCR Engine**: Tesseract.js
- **AI Analysis**: OpenAI GPT-4o-mini
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth (향후 확장)

## 📋 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Server
PORT=3000
NODE_ENV=development

# Supabase 설정
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI 설정
OPENAI_API_KEY=your_openai_api_key
```

### 3. Supabase 설정

Supabase에서 다음 테이블을 생성하세요:

1. `supabase-setup.sql` 파일을 Supabase SQL Editor에서 실행
2. 또는 수동으로 `reviews` 테이블 생성

### 4. 서버 실행

```bash
npm start
# 또는
node index.js
```

### 5. 테스트 페이지 접근

```
http://localhost:3000/test.html
```

## 🔄 테스트 플로우

### 통합 테스트 엔드포인트

```
POST /api/test/integrated-flow
```

**처리 단계:**
1. **사진 업로드** 📸 - 이미지 파일 선택 및 업로드
2. **OCR 테스트** 📖 - Tesseract.js로 텍스트 추출
3. **GPT로 정리** 🤖 - OpenAI로 리뷰 분석 및 구조화
4. **DB 저장** 💾 - Supabase PostgreSQL에 결과 저장

### 개별 테스트 엔드포인트

- **OCR 테스트**: `POST /api/ocr/reviews`
- **OCR 결과 조회**: `GET /api/ocr/reviews/:id`
- **OCR 설정**: `GET /api/ocr/config`
- **OCR 상태**: `GET /api/ocr/status`

## 📊 데이터 구조

### 리뷰 테이블 (reviews)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID | 고유 식별자 |
| filename | VARCHAR(255) | 저장된 파일명 |
| original_name | VARCHAR(255) | 원본 파일명 |
| file_path | TEXT | 파일 경로 |
| ocr_text | TEXT | OCR 추출 텍스트 |
| analysis_result | JSONB | GPT 분석 결과 |
| status | VARCHAR(20) | 처리 상태 |
| processing_time | INTEGER | 처리 시간 (ms) |
| created_at | TIMESTAMP | 생성 시간 |
| updated_at | TIMESTAMP | 수정 시간 |

### 분석 결과 구조

```json
{
  "작성자": "사용자명",
  "날짜": "2025.8.11",
  "리뷰": "리뷰 내용",
  "감정": "긍정|부정|보통",
  "장점키워드": ["키워드1", "키워드2"],
  "단점키워드": ["키워드1", "키워드2"]
}
```

## 🔍 검색 및 분석

### 감정별 검색
```sql
SELECT * FROM reviews WHERE analysis_result->>'감정' = '긍정';
```

### 키워드 검색
```sql
SELECT * FROM reviews 
WHERE analysis_result->'장점키워드' ? '맛있어요'
   OR analysis_result->'단점키워드' ? '맛있어요';
```

### 통계 조회
```sql
-- 감정별 통계
SELECT 
  analysis_result->>'감정' as sentiment,
  COUNT(*) as count
FROM reviews 
GROUP BY analysis_result->>'감정';

-- 키워드 빈도
SELECT 
  jsonb_array_elements_text(analysis_result->'장점키워드') as keyword,
  COUNT(*) as frequency
FROM reviews 
GROUP BY keyword 
ORDER BY frequency DESC;
```

## 🚨 주의사항

- **파일 크기**: 최대 20MB
- **지원 형식**: PNG, JPG, JPEG
- **동시 처리**: 최대 10개 파일
- **API 키**: OpenAI API 키가 필요합니다
- **Supabase**: 프로젝트 URL과 API 키 설정이 필요합니다

## 🔧 개발 가이드

### 새로운 기능 추가

1. **서비스 레이어**: `services/` 디렉토리에 비즈니스 로직 구현
2. **컨트롤러**: `controllers/` 디렉토리에 API 엔드포인트 구현
3. **라우트**: `routes/` 디렉토리에 URL 매핑 정의
4. **모델**: `models/` 디렉토리에 데이터 구조 정의

### 에러 처리

- 모든 비동기 함수는 try-catch로 감싸기
- 적절한 HTTP 상태 코드 반환
- 사용자 친화적인 에러 메시지 제공

### 로깅

- 중요 단계마다 console.log로 진행 상황 기록
- 에러 발생 시 console.error로 상세 정보 기록

## 📈 성능 최적화

- **인덱스**: 자주 검색되는 필드에 인덱스 설정
- **배치 처리**: 여러 파일을 동시에 처리
- **캐싱**: 반복되는 OCR 결과 캐싱 (향후 구현)
- **워커 풀**: OCR 처리용 워커 풀 활용

## 🔮 향후 계획

- [ ] 사용자 인증 및 권한 관리
- [ ] 리뷰 이미지 압축 및 최적화
- [ ] 실시간 처리 상태 웹소켓
- [ ] 배치 처리 및 스케줄링
- [ ] 분석 결과 시각화 API
- [ ] 다국어 지원 (영어, 중국어 등)

## 📞 문의 및 지원

프로젝트 관련 문의사항이 있으시면 이슈를 생성해주세요.

---

**Made with ❤️ for MyBiz Team**
