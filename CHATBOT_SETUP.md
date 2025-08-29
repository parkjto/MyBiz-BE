# 챗봇 설정 가이드

## 환경변수 설정

### 1. OpenAI API 설정
```bash
# OpenAI API 키 (GPT-3.5-turbo 사용 권장)
OPENAI_API_KEY=your_openai_api_key_here

# 사용할 AI 모델 설정
OPENAI_MODEL_TEXT=gpt-3.5-turbo
```

### 2. Google Cloud Speech-to-Text 설정 (음성 인식용)
```bash
# Google Cloud Speech-to-Text 활성화
GOOGLE_CLOUD_SPEECH_ENABLED=true

# Google Cloud 프로젝트 ID
GOOGLE_CLOUD_PROJECT_ID=your_project_id

# 서비스 계정 키 파일 경로
GOOGLE_CLOUD_KEY_FILENAME=./google-cloud-key.json
```

### 3. Supabase 설정 (데이터베이스)
```bash
# Supabase 프로젝트 URL
SUPABASE_URL=your_supabase_url

# Supabase 서비스 롤 키
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Supabase 익명 키
SUPABASE_ANON_KEY=your_anon_key
```

## 설치 및 설정 단계

### 1. Google Cloud Speech-to-Text 설정
```bash
# Google Cloud CLI 설치
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# 프로젝트 설정
gcloud config set project YOUR_PROJECT_ID

# Speech-to-Text API 활성화
gcloud services enable speech.googleapis.com

# 서비스 계정 생성
gcloud iam service-accounts create speech-recognition \
    --display-name="Speech Recognition Service Account"

# 서비스 계정에 권한 부여
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:speech-recognition@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/speech.client"

# 키 파일 생성
gcloud iam service-accounts keys create google-cloud-key.json \
    --iam-account=speech-recognition@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 2. 필요한 패키지 설치
```bash
# Google Cloud Speech 패키지
npm install @google-cloud/speech

# 기타 필요한 패키지들
npm install express cors helmet dotenv
```

### 3. 음성 인식 테스트
```bash
# 음성 인식 서비스 상태 확인
curl http://localhost:4000/api/chatbot/status

# 의도 분류 테스트
curl -X POST http://localhost:4000/api/chatbot/test-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"text": "매출 분석을 보여주세요"}'
```

## API 엔드포인트

### 챗봇 메시지 처리
- **POST** `/api/chatbot/message` - 텍스트 메시지 처리
- **POST** `/api/chatbot/voice` - 음성 명령 처리
- **GET** `/api/chatbot/status` - 챗봇 상태 확인
- **POST** `/api/chatbot/test-intent` - 의도 분류 테스트

### 요청 예시

#### 텍스트 메시지
```json
{
  "text": "매출 분석을 보여주세요",
  "userId": "user123"
}
```

#### 음성 명령
```json
{
  "audioBuffer": "base64_encoded_audio_data",
  "userId": "user123"
}
```

### 응답 예시

#### 네비게이션 응답
```json
{
  "success": true,
  "data": {
    "type": "navigation",
    "intent": "sales_analysis",
    "screen": "sales",
    "priority": "high",
    "message": "매출 분석 화면으로 이동합니다. 최근 30일간 총 매출: 1,500,000원, 일평균: 50,000원",
    "data": {
      "total_sales": 1500000,
      "average_daily": 50000,
      "trend": "increasing",
      "data_count": 30
    }
  }
}
```

#### 일반 응답
```json
{
  "success": true,
  "data": {
    "type": "response",
    "intent": "general_chat",
    "screen": null,
    "priority": "low",
    "message": "안녕하세요! 소상공인을 위한 AI 어시스턴트입니다. 무엇을 도와드릴까요?"
  }
}
```

## 지원하는 의도 (Intent)

1. **sales_analysis** - 매출 분석
   - 키워드: "매출 분석", "매출 보여", "매출 확인", "매출 조회"
   
2. **review_analysis** - 리뷰 분석
   - 키워드: "리뷰 분석", "리뷰 보여", "리뷰 확인", "리뷰 조회"
   
3. **improvement_suggestion** - 매출 개선 방안
   - 키워드: "매출 올리", "매출 증가", "어떻게 해야", "방법 알려"
   
4. **ad_generation** - 광고 생성
   - 키워드: "광고 만들", "포스터 만들", "홍보물", "광고 생성"
   
5. **store_info** - 스토어 정보
   - 키워드: "매장 정보", "스토어 정보", "가게 정보", "위치 알려"
   
6. **general_chat** - 일반 대화
   - 키워드: "안녕", "반가워", "고마워", "도움", "질문"

## 무료 구현 전략

### 1. OpenAI API
- GPT-3.5-turbo 사용 (월 $5 크레딧으로 충분)
- 토큰 사용량 최적화를 위한 프롬프트 최적화

### 2. Google Cloud Speech-to-Text
- 무료 크레딧 활용 (신규 사용자 $300)
- 월 60분 무료 (월 1,000,000자)

### 3. Supabase
- 무료 플랜: 500MB 데이터베이스, 2GB 대역폭
- 월 50,000 API 호출 무료

### 4. 호스팅
- Vercel Functions (월 100,000 요청 무료)
- Netlify Functions (월 125,000 요청 무료)

## 개발 우선순위

### 1주차
- [x] 기본 챗봇 서비스 구현
- [x] 의도 분류 시스템
- [x] 기본 API 엔드포인트

### 2주차
- [ ] Google Cloud Speech-to-Text 연동
- [ ] 음성 인식 테스트
- [ ] 에러 처리 개선

### 3주차
- [ ] Flutter 프론트엔드 연동
- [ ] 실시간 음성 스트리밍
- [ ] 성능 최적화

### 4주차
- [ ] 통합 테스트
- [ ] 문서화
- [ ] 배포 및 모니터링
