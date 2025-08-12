## OCR 리뷰 분석 API

### 환경변수
```
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
SENTIMENT_API_URL=http://localhost:8000/sentiment
```

### API 엔드포인트

- **POST** `/api/ocr/reviews` - multipart/form-data, 필드: `files[]` (1~10장, png/jpg/jpeg)
  - **200 OK 응답**:
    ```json
    {
      "id": "uuid",
      "text": "OCR로 추출된 텍스트...",
      "sentiment": [{"label": "HAPPY", "score": 0.82}],
      "keywords": ["친절", "청결", "가격"],
      "summary": "대체로 친절한 서비스...",
      "status": "completed",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
    ```

- **GET** `/api/ocr/reviews/:id` - 저장된 결과 조회
  - **200 OK**: 위와 동일한 JSON 응답
  - **404**: 결과를 찾을 수 없음

### 데이터베이스 스키마 (Supabase)

테이블: `ocr_results`

| 컬럼 | 타입 | 설명 | 제약조건 |
|------|------|------|----------|
| `id` | UUID | 고유 식별자 | Primary Key, 자동 생성 |
| `user_id` | UUID | 사용자 ID (선택사항) | auth.users 참조, NULL 허용 |
| `text` | TEXT | OCR로 추출된 텍스트 | NOT NULL |
| `sentiment` | JSONB | 감정 분석 결과 | NOT NULL, 기본값 `[]` |
| `keywords` | TEXT[] | 추출된 키워드 배열 | NOT NULL, 기본값 `{}` |
| `summary` | TEXT | GPT 요약 결과 | NOT NULL, 기본값 `''` |
| `status` | VARCHAR | 처리 상태 | 기본값 `'pending'` |
| `error_message` | TEXT | 에러 메시지 | NULL 허용 |
| `created_at` | TIMESTAMPTZ | 생성 시간 | 자동 설정 |
| `updated_at` | TIMESTAMPTZ | 수정 시간 | 자동 설정 |

### 처리 상태 (status)
- `pending`: 처리 중
- `completed`: 처리 완료
- `failed`: 처리 실패

### 에러 코드

| HTTP | 코드 | 설명 |
|------|------|------|
| 400 | `ERR_NO_FILES` | 파일 미첨부 |
| 400 | `ERR_FILE_TYPE` | 허용된 확장자 아님 |
| 413 | `ERR_FILE_SIZE` | 5 MB 초과 |
| 500 | `ERR_OCR_FAIL` | Google Vision 응답 실패 |
| 502 | `ERR_NLP_FAIL` | 모델 추론 실패 |

# MyBiz 백엔드 서버

소상공인을 위한 경영 도우미 백엔드 서버입니다.

## 🚀 주요 기능

- **매장 관리**: 매장 정보 CRUD, 위치 기반 검색
- **매출 분석**: 매출 데이터 수집 및 분석, 예측 모델
- **리뷰 분석**: 고객 리뷰 감정 분석, 키워드 추출
- **광고 자동 생성**: AI 기반 광고 문구 및 이미지 생성
- **소셜 로그인**: 네이버, 카카오 OAuth 연동
- **📸 스크롤 캡처 이미지 업로드**: 다중 이미지 업로드 및 관리

## 📸 스크롤 캡처 이미지 업로드 기능

### 기능 개요
- 사용자로부터 **스크롤 캡처한 이미지 여러 장**을 안전하게 업로드 받음
- 업로드된 이미지의 **포맷, 크기, 개수 제한**을 검사
- 서버 내 안전한 위치에 파일을 저장
- 저장된 파일 정보를 JSON 형태로 클라이언트에 반환
- 이후 OCR 처리, 감정분석 등의 후속 파이프라인에 연계

### API 엔드포인트

| 메서드 | 엔드포인트 | 설명 |
|--------|------------|------|
| POST | `/api/upload/scroll-captures` | 다중 이미지 업로드 |
| GET | `/api/upload/scroll-captures` | 업로드된 이미지 목록 조회 |
| DELETE | `/api/upload/scroll-captures/:filename` | 특정 이미지 삭제 |
| GET | `/api/upload/scroll-captures/stats` | 업로드 통계 정보 |

### 제약사항
- **파일 형식**: JPG, JPEG, PNG만 허용
- **파일 크기**: 개별 파일 최대 10MB
- **파일 개수**: 최대 10장
- **저장 위치**: `./uploads/scroll_captures/`

### 사용 예시

#### 이미지 업로드
```bash
curl -X POST http://localhost:3000/api/upload/scroll-captures \
  -F "images=@screenshot1.jpg" \
  -F "images=@screenshot2.png"
```

#### 응답 예시
```json
{
  "success": true,
  "message": "이미지 업로드가 완료되었습니다.",
  "data": {
    "uploadedFiles": [
      {
        "originalName": "screenshot1.jpg",
        "savedName": "1703123456789-uuid123.jpg",
        "path": "./uploads/scroll_captures/1703123456789-uuid123.jpg",
        "size": 1024000,
        "mimetype": "image/jpeg",
        "uploadDate": "2023-12-21T10:30:56.789Z"
      }
    ],
    "totalCount": 1,
    "uploadDate": "2023-12-21T10:30:56.789Z"
  }
}
```

## 🛠️ 기술 스택

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose), Supabase
- **Authentication**: JWT, OAuth (Naver, Kakao)
- **File Upload**: Multer
- **Documentation**: Swagger
- **Testing**: Jest, Supertest

## 📁 프로젝트 구조

```
src/
├── config/          # 설정 파일
├── controllers/     # 컨트롤러
├── middlewares/     # 미들웨어
├── models/          # 데이터 모델
├── routes/          # 라우터
├── services/        # 비즈니스 로직
├── utils/           # 유틸리티 함수
└── tests/           # 테스트 코드
```

## 🚀 시작하기

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
`.env` 파일을 생성하고 다음 내용을 추가하세요:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
CLOVA_API_KEY=your_clova_api_key
```

### 3. 서버 실행
```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

### 4. 테스트 실행
```bash
npm test
```

## 📚 API 문서

서버 실행 후 다음 URL에서 Swagger API 문서를 확인할 수 있습니다:
- http://localhost:3000/api-docs

## 🧪 테스트

### 이미지 업로드 테스트
`test-upload.html` 파일을 브라우저에서 열어 이미지 업로드 기능을 테스트할 수 있습니다.

## 🔧 개발 가이드

### 새로운 기능 추가
1. `src/services/`에 비즈니스 로직 구현
2. `src/controllers/`에 HTTP 요청 처리 로직 구현
3. `src/routes/`에 API 엔드포인트 정의
4. `src/index.js`에 라우터 연결
5. Swagger 문서 작성

### 에러 처리
- 모든 에러는 적절한 HTTP 상태코드와 함께 JSON 응답 반환
- 에러 코드와 상세 메시지를 포함하여 클라이언트가 적절히 처리할 수 있도록 함

## 📝 라이센스

ISC License

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
