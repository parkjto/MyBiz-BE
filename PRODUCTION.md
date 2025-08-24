# 🚀 MyBiz Backend - 프로덕션 배포 가이드

## 📋 **사전 요구사항**

- Node.js 18.18+ 
- PM2 (프로세스 관리자)
- 환경변수 설정 완료

## 🔧 **설치 및 설정**

### 1. 의존성 설치
```bash
npm install
npm install -g pm2  # PM2 전역 설치
```

### 2. 환경변수 설정
```bash
cp .env.example .env
# .env 파일에 실제 API 키 및 설정값 입력
```

### 3. 로그 디렉토리 생성
```bash
mkdir -p logs
```

## 🚀 **실행 방법**

### 개발 환경
```bash
npm run dev          # nodemon으로 개발 서버 실행
```

### 프로덕션 환경
```bash
npm run prod         # 프로덕션 모드로 실행
npm run pm2:start    # PM2로 클러스터 모드 실행
npm run pm2:stop     # PM2 프로세스 중지
npm run pm2:restart  # PM2 프로세스 재시작
```

## 📊 **PM2 모니터링**

```bash
pm2 monit           # 실시간 모니터링
pm2 logs            # 로그 확인
pm2 status          # 프로세스 상태 확인
pm2 restart all     # 모든 프로세스 재시작
```

## 🔌 **API 엔드포인트**

### 이미지 처리
- `POST /api/ad/enhance-image` - 스마트 이미지 보정
- `POST /api/ad/generate-with-image` - 이미지 업로드 + 보정 + 광고 생성

### 광고 생성
- `POST /api/ad/generate` - 텍스트 기반 광고 문구 생성
- `POST /api/ad/generate-from-image` - 이미지 URL 기반 광고 생성

### 기타
- `GET /health` - 헬스체크
- `GET /api-docs` - API 문서 (Swagger)

## 🛡️ **보안 설정**

- CORS 설정: `middlewares/common.js`에서 조정
- Rate Limiting: 분당 100요청 제한
- Helmet: 보안 헤더 자동 설정
- 파일 업로드: 5MB 제한, 이미지 파일만 허용

## 📈 **성능 최적화**

- 이미지 최대 크기: 1600px
- WebP 형식 변환 (품질 88%)
- 메모리 기반 이미지 처리 (디스크 저장 없음)
- 클러스터 모드로 CPU 코어 활용

## 🔍 **로깅**

- Winston 로거 사용
- 로그 레벨: `info`, `warn`, `error`
- 로그 파일: `logs/combined.log`, `logs/error.log`

## 🚨 **문제 해결**

### 메모리 부족
```bash
pm2 restart mybiz-backend  # 프로세스 재시작
```

### 로그 확인
```bash
tail -f logs/combined.log  # 실시간 로그 확인
pm2 logs mybiz-backend     # PM2 로그 확인
```

### 프로세스 상태
```bash
pm2 status                 # 프로세스 상태 확인
pm2 monit                  # 실시간 모니터링
```

## 📝 **환경변수**

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `NODE_ENV` | 실행 환경 | `development` |
| `PORT` | 서버 포트 | `3000` |
| `OPENAI_API_KEY` | OpenAI API 키 | 필수 |
| `LOG_LEVEL` | 로그 레벨 | `info` |

## 🔄 **업데이트**

```bash
git pull origin main       # 코드 업데이트
npm install                 # 의존성 업데이트
npm run pm2:restart        # 프로세스 재시작
```

## 📞 **지원**

문제가 발생하면 로그를 확인하고 개발팀에 문의하세요.
