# 🔍 카카오 로그인 API 테스트 가이드

## 📋 **목차**
1. [환경 설정](#1-환경-설정)
2. [서버 실행](#2-서버-실행)
3. [API 테스트 순서](#3-api-테스트-순서)
4. [브라우저 테스트](#4-브라우저-테스트)
5. [Swagger UI 테스트](#5-swagger-ui-테스트)
6. [cURL 테스트](#6-curl-테스트)
7. [문제 해결](#7-문제-해결)

---

## 🚀 **1. 환경 설정**

### **1.1 환경 변수 파일 생성**

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 입력하세요:

```bash
# 서버 설정
PORT=3000
NODE_ENV=development

# JWT 설정
JWT_SECRET=mybiz_jwt_secret_key_2024

# 카카오 OAuth 설정
KAKAO_CLIENT_ID=your_actual_kakao_client_id
KAKAO_REDIRECT_URI=http://localhost:3000/api/auth/kakao/callback

# Supabase 설정
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **1.2 카카오 개발자 계정 설정**

1. [Kakao Developers](https://developers.kakao.com/) 접속
2. 애플리케이션 생성
3. **플랫폼 > Web** 설정:
   - 사이트 도메인: `http://localhost:3000`
   - Redirect URI: `http://localhost:3000/api/auth/kakao/callback`
4. **카카오 로그인** 활성화
5. **동의항목** 설정 (닉네임, 프로필 사진, 이메일)

---

## 🖥️ **2. 서버 실행**

### **2.1 의존성 설치**

```bash
npm install
```

### **2.2 서버 시작**

```bash
# 개발 모드 (자동 재시작)
npm run dev

# 또는 프로덕션 모드
npm start
```

**성공 메시지:**
```
MyBiz 백엔드 서버가 http://localhost:3000 에서 실행 중입니다.
Swagger 문서: http://localhost:3000/api-docs
```

---

## 🧪 **3. API 테스트 순서**

### **테스트 플로우:**
```
1. 환경 확인 → 2. 카카오 로그인 URL 생성 → 3. 카카오 로그인 실행 → 4. 콜백 처리 → 5. 로그인 API 호출 → 6. 프로필 조회
```

---

## 🌐 **4. 브라우저 테스트**

### **4.1 서버 상태 확인**

브라우저에서 접속:
```
http://localhost:3000/
```

**예상 응답:**
```
MyBiz 백엔드 서버가 정상적으로 동작 중입니다!
```

### **4.2 Swagger API 문서 확인**

```
http://localhost:3000/api-docs
```

- 모든 API 엔드포인트 문서 확인
- **인증** 섹션에서 카카오 로그인 API 확인

### **4.3 환경 설정 확인**

```
GET http://localhost:3000/api/auth/test
```

**브라우저에서 직접 접속:**
```
http://localhost:3000/api/auth/test
```

**예상 응답:**
```json
{
  "message": "카카오 로그인 API 테스트",
  "environment": {
    "KAKAO_CLIENT_ID": "설정됨",
    "KAKAO_REDIRECT_URI": "http://localhost:3000/api/auth/kakao/callback",
    "JWT_SECRET": "설정됨"
  },
  "endpoints": {
    "authUrl": "GET /api/auth/kakao/auth-url - 카카오 로그인 URL 생성",
    "callback": "GET /api/auth/kakao/callback - 카카오 콜백 처리",
    "login": "POST /api/auth/kakao/login - 인가 코드로 로그인",
    "profile": "GET /api/auth/profile - 사용자 프로필 조회 (JWT 필요)",
    "logout": "POST /api/auth/logout - 로그아웃"
  }
}
```

### **4.4 카카오 로그인 URL 받기**

```
GET http://localhost:3000/api/auth/kakao/auth-url
```

**브라우저에서 직접 접속:**
```
http://localhost:3000/api/auth/kakao/auth-url
```

**예상 응답:**
```json
{
  "authUrl": "https://kauth.kakao.com/oauth/authorize?client_id=...&redirect_uri=...&response_type=code",
  "clientId": "your_client_id",
  "redirectUri": "http://localhost:3000/api/auth/kakao/callback",
  "message": "프론트엔드에서 이 authUrl로 리다이렉트하여 카카오 로그인을 시작하세요."
}
```

### **4.5 카카오 로그인 실행**

1. 위에서 받은 `authUrl`을 **새 탭**에서 열기
2. 카카오 계정으로 로그인
3. 권한 동의 (닉네임, 프로필 사진, 이메일)
4. 콜백 페이지에서 **인가 코드** 확인

### **4.6 콜백 테스트**

```
GET http://localhost:3000/api/auth/kakao/callback?code=YOUR_AUTHORIZATION_CODE
```

**브라우저에서 직접 접속:**
```
http://localhost:3000/api/auth/kakao/callback?code=실제_인가_코드
```

**예상 응답:**
```json
{
  "success": true,
  "message": "카카오 인가 코드를 성공적으로 받았습니다.",
  "code": "실제_인가_코드",
  "instructions": {
    "step1": "이 인가 코드를 복사하세요",
    "step2": "POST /api/auth/kakao/login API를 호출하세요",
    "step3": "Request Body에 {\"code\": \"위의_인가_코드\"}를 입력하세요"
  }
}
```

---

## 📚 **5. Swagger UI 테스트**

### **5.1 Swagger UI 접속**

```
http://localhost:3000/api-docs
```

### **5.2 POST /api/auth/kakao/login 테스트**

1. **인증** 섹션에서 **POST /api/auth/kakao/login** 찾기
2. **Try it out** 클릭
3. **Request Body** 입력:

```json
{
  "code": "실제_인가_코드"
}
```

4. **Execute** 클릭

**예상 응답:**
```json
{
  "success": true,
  "message": "카카오 로그인 성공",
  "isNewUser": false,
  "user": {
    "id": "uuid-here",
    "kakao_id": 123456789,
    "email": "user@example.com",
    "nickname": "사용자닉네임",
    "profile_image_url": "https://example.com/profile.jpg",
    "created_at": "2024-01-15T22:30:00.000Z",
    "last_login_at": "2024-01-15T22:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### **5.3 GET /api/auth/profile 테스트**

1. **Authorize** 버튼 클릭
2. **Bearer 토큰**에 JWT 입력: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
3. **Try it out** → **Execute**

---

## 💻 **6. cURL 테스트**

### **6.1 환경 확인**

```bash
curl -X GET "http://localhost:3000/api/auth/test"
```

### **6.2 카카오 로그인 URL 받기**

```bash
curl -X GET "http://localhost:3000/api/auth/kakao/auth-url"
```

### **6.3 로그인 API 호출**

```bash
curl -X POST "http://localhost:3000/api/auth/kakao/login" \
  -H "Content-Type: application/json" \
  -d '{"code": "실제_인가_코드"}'
```

### **6.4 프로필 조회**

```bash
curl -X GET "http://localhost:3000/api/auth/profile" \
  -H "Authorization: Bearer 실제_JWT_토큰"
```

---

## 🔧 **7. 문제 해결**

### **7.1 자주 발생하는 오류**

| 오류 | 원인 | 해결 방법 |
|------|------|-----------|
| `서버 연결 오류` | 서버가 실행되지 않음 | `npm run dev` 실행 확인 |
| `환경변수 오류` | .env 파일 설정 누락 | 환경변수 설정 확인 |
| `CORS 오류` | 브라우저 보안 정책 | 서버 CORS 설정 확인 |
| `인가 코드 만료` | 10분 초과 | 새로운 인가 코드 발급 |
| `JWT 검증 실패` | 토큰 형식 오류 | Bearer 형식 확인 |

### **7.2 디버깅 명령어**

```bash
# 서버 로그 확인
npm run dev

# 포트 사용 확인
lsof -i :3000

# 환경변수 확인
echo $KAKAO_CLIENT_ID

# 서버 상태 확인
curl http://localhost:3000/
```

### **7.3 로그 확인**

서버 콘솔에서 다음 로그들을 확인하세요:

```
✅ 정상 실행:
MyBiz 백엔드 서버가 http://localhost:3000 에서 실행 중입니다.
Swagger 문서: http://localhost:3000/api-docs

❌ 오류 발생:
카카오 로그인 에러: [에러 상세 내용]
```

---

## 📱 **8. 모바일 테스트**

### **8.1 로컬 네트워크 접속**

같은 Wi-Fi 네트워크에서:
```
http://[컴퓨터_IP]:3000/api/auth/test
```

### **8.2 IP 주소 확인**

```bash
# macOS/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

---

## 🎯 **9. 테스트 체크리스트**

- [ ] 서버 실행 확인
- [ ] 환경변수 설정 확인
- [ ] Swagger UI 접속 확인
- [ ] 환경 확인 API 호출
- [ ] 카카오 로그인 URL 생성
- [ ] 카카오 로그인 실행
- [ ] 인가 코드 수신
- [ ] 로그인 API 호출
- [ ] JWT 토큰 발급
- [ ] 프로필 조회 API 호출

---

## 📞 **10. 추가 지원**

문제가 발생하면 다음을 확인하세요:

1. **서버 로그** 확인
2. **환경변수** 설정 상태
3. **카카오 개발자** 설정
4. **네트워크** 연결 상태
5. **브라우저 개발자 도구** 콘솔

---

**🎉 이제 카카오 로그인 API를 체계적으로 테스트할 수 있습니다!**
