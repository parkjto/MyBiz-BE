# 챗봇 환경변수 설정

## .env 파일에 추가할 환경변수

```bash
# OpenAI API 설정
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL_TEXT=gpt-3.5-turbo
OPENAI_MODEL_VISION=gpt-4o
OPENAI_MODEL_IMAGE=dall-e-3

# Google Cloud Speech-to-Text 설정
GOOGLE_CLOUD_SPEECH_ENABLED=true
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_KEY_FILENAME=./google-cloud-key.json

# Supabase 설정
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# 서버 설정
PORT=4000
NODE_ENV=development

# CORS 설정
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

## Google Cloud 프로젝트 설정 단계

### 1. Google Cloud 프로젝트 생성
```bash
# Google Cloud Console에서 새 프로젝트 생성
# 또는 기존 프로젝트 ID 확인
gcloud projects list
```

### 2. Speech-to-Text API 활성화
```bash
# 프로젝트 설정
gcloud config set project YOUR_PROJECT_ID

# Speech-to-Text API 활성화
gcloud services enable speech.googleapis.com
```

### 3. 서비스 계정 생성 및 권한 부여
```bash
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

### 4. 환경변수 업데이트
```bash
# .env 파일에서 실제 값으로 교체
GOOGLE_CLOUD_PROJECT_ID=실제_프로젝트_ID
GOOGLE_CLOUD_KEY_FILENAME=./google-cloud-key.json
```

## 테스트 방법

### 1. 챗봇 상태 확인
```bash
curl http://localhost:4000/api/chatbot/status
```

### 2. 의도 분류 테스트
```bash
curl -X POST http://localhost:4000/api/chatbot/test-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"text": "매출 분석을 보여주세요"}'
```

### 3. 텍스트 메시지 처리 테스트
```bash
curl -X POST http://localhost:4000/api/chatbot/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"text": "매출 분석을 보여주세요", "userId": "test_user"}'
```
