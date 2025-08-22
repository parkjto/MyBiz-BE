# MyBiz 백엔드 API 프론트엔드 연동 가이드

## 🚀 개요

이 문서는 MyBiz 백엔드 API를 프론트엔드에서 사용하기 위한 연동 가이드입니다. 
카카오/네이버 소셜 로그인, 스토어 관리, 리뷰 스크래핑, AI 분석 등의 기능을 포함합니다.

## 🔐 인증 시스템

### JWT 토큰 기반 인증
- 모든 보호된 API는 `Authorization: Bearer {token}` 헤더가 필요합니다
- 토큰은 로그인 성공 시 발급되며 7일간 유효합니다

### 응답 형식
```json
{
  "success": true/false,
  "data": {...} | "message": "...",
  "error": "에러 메시지" // 실패 시에만
}
```

## 📱 소셜 로그인

### 1. 카카오 로그인

#### 1-1. 로그인 URL 생성
```javascript
// GET /api/auth/kakao/auth-url
const response = await fetch('/api/auth/kakao/auth-url');
const { authUrl } = await response.json();

// 사용자를 카카오 로그인 페이지로 리다이렉트
window.location.href = authUrl;
```

#### 1-2. 카카오 콜백 처리
```javascript
// 카카오 로그인 완료 후 리다이렉트된 페이지에서
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

if (code) {
  // 로그인 API 호출
  const loginResponse = await fetch('/api/auth/kakao/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code })
  });
  
  const { token, user } = await loginResponse.json();
  
  // 토큰을 로컬 스토리지에 저장
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(user));
  
  // 메인 페이지로 이동
  window.location.href = '/dashboard';
}
```

### 2. 네이버 로그인

#### 2-1. 로그인 URL 생성
```javascript
// GET /api/auth/naver/auth-url
const response = await fetch('/api/auth/naver/auth-url');
const { authUrl } = await response.json();

// 사용자를 네이버 로그인 페이지로 리다이렉트
window.location.href = authUrl;
```

#### 2-2. 네이버 콜백 처리
```javascript
// 네이버 로그인 완료 후 리다이렉트된 페이지에서
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

if (code) {
  // 로그인 API 호출
  const loginResponse = await fetch('/api/auth/naver/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code })
  });
  
  const { token, user } = await loginResponse.json();
  
  // 토큰을 로컬 스토리지에 저장
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(user));
  
  // 메인 페이지로 이동
  window.location.href = '/dashboard';
}
```

## 🏪 스토어 관리

### 1. 스토어 목록 조회
```javascript
// GET /api/stores
const response = await fetch('/api/stores', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json',
  }
});

const { data: stores, count } = await response.json();
```

### 2. 스토어 생성
```javascript
// POST /api/stores
const response = await fetch('/api/stores', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    store_name: '테스트 카페',
    address: '서울시 강남구 테헤란로 123',
    category: '카페',
    phone: '02-1234-5678'
  })
});

const { data: newStore } = await response.json();
```

### 3. 스토어 수정
```javascript
// PATCH /api/stores/{id}
const response = await fetch(`/api/stores/${storeId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    store_name: '수정된 카페명',
    phone: '02-9876-5432'
  })
});

const { data: updatedStore } = await response.json();
```

### 4. 스토어 삭제
```javascript
// DELETE /api/stores/{id}
const response = await fetch(`/api/stores/${storeId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
  }
});

const { message } = await response.json();
```

## 🔍 리뷰 스크래핑

### 1. 리뷰 스크래핑 시작
```javascript
// POST /api/scraper/reviews
const response = await fetch('/api/scraper/reviews', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userStoreId: storeId // 스토어 ID
  })
});

const { data: scrapingResult } = await response.json();
```

### 2. 네이버 세션 설정
```javascript
// POST /api/scraper/session
const response = await fetch('/api/scraper/session', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userStoreId: storeId,
    cookies: naverCookies, // 네이버 로그인 쿠키
    expiresAt: expiresAt   // 만료 시간
  })
});

const { message } = await response.json();
```

## 🤖 AI 리뷰 분석

### 1. 리뷰 분석 실행
```javascript
// POST /api/reviews/analysis/analyze
const response = await fetch('/api/reviews/analysis/analyze', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    reviewId: reviewId // 분석할 리뷰 ID
  })
});

const { data: analysisResult } = await response.json();
```

## 🛠️ 유틸리티 함수

### 1. API 호출 헬퍼 함수
```javascript
class ApiClient {
  constructor() {
    this.baseUrl = 'http://localhost:3000/api';
    this.token = localStorage.getItem('authToken');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'API 요청 실패');
      }
      
      return data;
    } catch (error) {
      console.error('API 요청 에러:', error);
      throw error;
    }
  }

  // GET 요청
  async get(endpoint) {
    return this.request(endpoint);
  }

  // POST 요청
  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // PUT 요청
  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  // PATCH 요청
  async patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  // DELETE 요청
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

// 사용 예시
const api = new ApiClient();

// 스토어 목록 조회
const stores = await api.get('/stores');

// 새 스토어 생성
const newStore = await api.post('/stores', {
  store_name: '새로운 카페',
  address: '서울시 강남구'
});
```

### 2. 인증 상태 관리
```javascript
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
  }

  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.user;
  }

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  async logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });
    } catch (error) {
      console.error('로그아웃 에러:', error);
    } finally {
      this.clearAuth();
      window.location.href = '/login';
    }
  }
}

// 사용 예시
const auth = new AuthManager();

if (!auth.isAuthenticated()) {
  window.location.href = '/login';
}

// 로그아웃
await auth.logout();
```

## 📋 에러 처리

### 1. 공통 에러 처리
```javascript
function handleApiError(error) {
  if (error.message.includes('토큰')) {
    // 토큰 만료 또는 유효하지 않음
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return;
  }

  if (error.message.includes('권한')) {
    // 권한 없음
    alert('해당 작업을 수행할 권한이 없습니다.');
    return;
  }

  // 기타 에러
  console.error('API 에러:', error);
  alert(`오류가 발생했습니다: ${error.message}`);
}
```

### 2. API 응답 검증
```javascript
function validateApiResponse(response) {
  if (!response.success) {
    throw new Error(response.error || response.message || '알 수 없는 오류');
  }
  return response;
}

// 사용 예시
try {
  const response = await api.get('/stores');
  const validatedResponse = validateApiResponse(response);
  return validatedResponse.data;
} catch (error) {
  handleApiError(error);
}
```

## 🔒 보안 고려사항

1. **토큰 보안**: JWT 토큰을 안전하게 저장하고 전송
2. **HTTPS**: 프로덕션 환경에서는 반드시 HTTPS 사용
3. **입력 검증**: 모든 사용자 입력에 대한 클라이언트/서버 측 검증
4. **CORS**: 허용된 도메인에서만 API 접근 가능

## 📚 추가 리소스

- **Swagger 문서**: `http://localhost:3000/api-docs/`
- **API 상태 확인**: `http://localhost:3000/health`
- **에러 코드**: 각 API 응답의 `error` 필드 참조

## 🚀 시작하기

1. 환경 변수 설정 확인
2. 백엔드 서버 실행
3. 위의 코드 예시를 참고하여 프론트엔드 구현
4. API 테스트 및 디버깅

---

**문의사항**: 개발 중 문제가 발생하면 로그를 확인하고 백엔드 팀에 문의하세요.
