# MyBiz 백엔드 프로젝트 구조 안내

## 폴더 및 파일 구조

```
mybiz-backend/
├── config/           # 환경설정 및 DB 연결 관련 파일
│   ├── config.js     # 환경변수 및 DB 연결 코드
│   ├── db.js         # DB 연결 관련 추가 설정(선택)
│   └── README.md     # config 폴더 설명
├── controllers/      # 비즈니스 로직 분리
│   ├── adsController.js
│   ├── reviewsController.js
│   ├── salesController.js
│   └── controllers.js
├── models/           # DB 모델(스키마) 분리
│   ├── user.js
│   ├── sales.js
│   ├── review.js
│   └── models.js
├── routes/           # API 라우트 분리
│   ├── ads.js
│   ├── reviews.js
│   ├── sales.js
│   └── routes.js
├── index.js          # 서버 진입점(메인 파일)
├── .env              # 환경변수 파일(비공개)
├── .env.example      # 환경변수 예시 파일
├── package.json      # 프로젝트 의존성 및 스크립트
└── README.md         # 프로젝트 설명 파일
```

## 각 폴더/파일 역할
- **config/**: 환경설정, DB 연결 등 프로젝트 설정 관련 파일 관리
- **controllers/**: 각 기능별 비즈니스 로직 구현
- **models/**: MongoDB 등 DB 스키마 및 모델 정의
- **routes/**: API 엔드포인트(라우트) 분리
- **index.js**: Express 서버의 메인 진입점
- **.env**: 실제 환경변수(비공개, 배포 시 제외)
- **.env.example**: 환경변수 예시(공개)
- **package.json**: 의존성 및 실행 스크립트 관리
- **README.md**: 프로젝트 구조 및 사용법 안내

## 사용 예시
- 서버 실행: `node index.js`
- API 문서 확인: `http://localhost:3000/api-docs`

---

이 구조를 기반으로 기능별 확장, 유지보수, 협업이 용이합니다.


## ⚠️ Supabase RLS(행 수준 보안) 정책 안내

- 개발 단계에서는 ads 등 주요 테이블에 대해 RLS 정책을 `using (true)`로 설정하여 누구나 select(조회) 가능하도록 허용합니다.
- 운영(프로덕션) 배포 전에는 반드시 인증 기반 또는 최소 권한 정책으로 변경해야 합니다.
  - 예: 인증된 사용자만 조회 가능, 사용자별 데이터 제한 등
- RLS 정책 미강화 시 데이터 유출 위험이 있으니, 배포 전 반드시 정책을 점검하세요.
