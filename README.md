# MyBiz Backend - 네이버 로컬 API 통합 소셜 로그인 시스템

네이버 로컬 API를 활용한 소셜 로그인 및 매장 정보 자동 완성 시스템입니다.

## 🚀 주요 기능

### 1. 소셜 로그인 (카카오/네이버)
- 카카오 OAuth 로그인
- 네이버 OAuth 로그인
- 회원가입 시 매장 정보 자동 완성

### 2. 매장 정보 자동 완성
- 네이버 로컬 API를 활용한 매장 검색
- 매장명과 전화번호로 정확한 매장 정보 매칭
- place_id 자동 추출

### 3. 리뷰 크롤링 준비
- place_id를 활용한 리뷰 크롤링 준비
- 크롤링 상태 관리

## 📁 프로젝트 구조

```
src/
├── config/
│   ├── db.js          # Supabase 연결 설정
│   └── config.js      # 환경 변수 설정
├── controllers/
│   ├── authController.js      # 인증 컨트롤러
│   └── reviewsController.js   # 리뷰 컨트롤러
├── middlewares/
│   ├── authMiddleware.js      # JWT 인증 미들웨어
│   ├── loggerMiddleware.js    # 로깅 미들웨어
│   └── validateMiddleware.js  # 입력 검증 미들웨어
├── models/
│   └── user.js        # 사용자 모델
├── routes/
│   ├── auth.js        # 인증 라우터
│   └── reviews.js     # 리뷰 라우터
├── services/
│   ├── authService.js         # 인증 서비스
│   ├── naverLocalService.js   # 네이버 로컬 API 서비스
│   └── reviewService.js       # 리뷰 서비스
└── utils/
    └── supabaseClient.js      # Supabase 클라이언트
```

## 🛠 설치 및 설정

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`env.example` 파일을 참고하여 `.env` 파일을 생성하세요:

```bash
# Database Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# Kakao OAuth Configuration
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback

# Naver OAuth Configuration (로컬 API와 동일한 클라이언트 ID 사용)
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
NAVER_REDIRECT_URI=http://localhost:3000/auth/naver/callback

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 3. 네이버 API 설정
1. [네이버 개발자 센터](https://developers.naver.com/)에서 애플리케이션 등록
2. OAuth 2.0 설정 (로그인 오픈 API 서비스)
3. 검색 API 서비스 설정 (로컬 API는 OAuth와 동일한 클라이언트 ID 사용)

## 📋 API 엔드포인트

### 인증 관련 API

#### 1. 카카오 로그인
```http
POST /api/auth/kakao/login
Content-Type: application/json

{
  "code": "카카오 인가 코드",
  "storeName": "매장명",        // 선택사항
  "phoneNumber": "010-1234-5678" // 선택사항
}
```

#### 2. 네이버 로그인
```http
POST /api/auth/naver/login
Content-Type: application/json

{
  "code": "네이버 인가 코드",
  "state": "네이버 state",
  "storeName": "매장명",        // 선택사항
  "phoneNumber": "010-1234-5678" // 선택사항
}
```

#### 3. 매장 정보 검색
```http
POST /api/auth/store/search
Content-Type: application/json

{
  "storeName": "매장명",
  "phoneNumber": "010-1234-5678"
}
```

#### 4. 매장 정보 확인 및 저장
```http
POST /api/auth/store/confirm
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "storeInfo": {
    "name": "매장명",
    "address": "매장 주소",
    "roadAddress": "도로명 주소",
    "phone": "010-1234-5678",
    "placeId": "12345678"
  }
}
```

#### 5. 매장 정보 조회
```http
GET /api/auth/store/info
Authorization: Bearer {JWT_TOKEN}
```

### 리뷰 관련 API

#### 1. 크롤링 준비 상태 확인
```http
GET /api/reviews/crawling/ready
Authorization: Bearer {JWT_TOKEN}
```

#### 2. 리뷰 크롤링 시작
```http
POST /api/reviews/crawling/start
Authorization: Bearer {JWT_TOKEN}
```

#### 3. 크롤링된 리뷰 조회
```http
GET /api/reviews/crawled
Authorization: Bearer {JWT_TOKEN}
```

## 🔄 사용 플로우

### 1. 소셜 로그인 + 매장 정보 자동 완성
1. 사용자가 소셜 로그인 시 매장명과 전화번호 입력
2. 네이버 로컬 API로 매장 정보 검색
3. 매장 정보 자동 완성 및 place_id 추출
4. 사용자에게 매장 정보 확인 요청
5. 사용자 확인 후 매장 정보 저장

### 2. 리뷰 크롤링 준비
1. 사용자 매장 정보 확인
2. place_id 존재 여부 확인
3. 리뷰 크롤링 준비 상태 반환
4. 크롤링 시작 (실제 크롤링 로직은 별도 구현 필요)

## 🗄 데이터베이스 스키마

### users 테이블
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255),
  nickname VARCHAR(255),
  profile_image TEXT,
  
  -- 소셜 로그인 정보
  kakao_id VARCHAR(255),
  naver_id VARCHAR(255),
  
  -- 매장 정보
  store_name VARCHAR(255),
  store_address TEXT,
  store_road_address TEXT,
  store_phone VARCHAR(20),
  store_category VARCHAR(255),
  place_id VARCHAR(255),
  store_info_verified BOOLEAN DEFAULT FALSE,
  
  -- 시스템 정보
  is_new_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔧 개발 가이드

### 새로운 기능 추가 시
1. **서비스 레이어**: 비즈니스 로직 구현
2. **컨트롤러 레이어**: HTTP 요청/응답 처리
3. **라우터 레이어**: 엔드포인트 정의
4. **모델 레이어**: 데이터베이스 쿼리 (필요시)

### 에러 처리
- 모든 API는 일관된 에러 응답 형식 사용
- 서비스 레이어에서 비즈니스 로직 에러 처리
- 컨트롤러에서 HTTP 상태 코드 관리

### 보안
- JWT 토큰 기반 인증
- 입력값 검증 (Joi 사용)
- 환경 변수로 민감 정보 관리

## 🚀 배포

### 1. 환경 변수 설정
프로덕션 환경에 맞는 환경 변수 설정

### 2. 데이터베이스 마이그레이션
Supabase에서 스키마 생성 및 마이그레이션

### 3. 서버 실행
```bash
npm start
```

## 📝 TODO

- [ ] 실제 리뷰 크롤링 로직 구현 (Puppeteer/Cheerio)
- [ ] 리뷰 데이터 저장 및 관리
- [ ] 크롤링 스케줄링 기능
- [ ] 에러 로깅 및 모니터링
- [ ] API 요청 제한 (Rate Limiting)
- [ ] 캐싱 시스템 구현

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 생성해주세요. 