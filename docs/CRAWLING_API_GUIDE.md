# 🚀 네이버 리뷰 크롤링 API 가이드

## 📋 API 목록

### 1. 매장 검색 API
### 2. 매장명 기반 리뷰 크롤링 API
### 3. 크롤링 상태 확인 API
### 4. 크롤링 이력 조회 API
### 5. 안전한 크롤링 실행 API

---

## 🔍 1. 매장 검색 API

### 요청
```bash
curl -X GET "http://localhost:3000/api/reviews/search-stores?query=스타벅스 강남점&display=5"
```

### 요청 파라미터
| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|----------|------|------|------|--------|
| query | string | ✅ | 검색할 매장명이나 주소 | - |
| display | number | ❌ | 검색 결과 수 (1-10) | 5 |

### 응답 예시 (성공)
```json
{
  "success": true,
  "data": {
    "query": "스타벅스 강남점",
    "stores": [
      {
        "id": 0,
        "name": "스타벅스 강남점",
        "address": "서울 강남구 강남대로 396",
        "phone": "02-1234-5678",
        "category": "카페",
        "placeId": "1234567890",
        "coordinateId": null,
        "mapUrl": "https://map.naver.com/p/entry/place/1234567890",
        "coordinates": {
          "x": 127.123456,
          "y": 37.123456
        },
        "extractedAt": "2024-01-15T22:30:00.000Z",
        "hasPlaceId": true
      },
      {
        "id": 1,
        "name": "스타벅스 강남역점",
        "address": "서울 강남구 강남대로 456",
        "phone": "02-2345-6789",
        "category": "카페",
        "placeId": null,
        "coordinateId": "coord_2345678901",
        "mapUrl": "https://map.naver.com/p/entry/place/coord_2345678901",
        "coordinates": {
          "x": 127.234567,
          "y": 37.234567
        },
        "extractedAt": "2024-01-15T22:30:00.000Z",
        "hasPlaceId": true
      }
    ],
    "total": 2,
    "hasResults": true,
    "placeIdAvailable": true
  },
  "message": "2개의 매장을 찾았습니다."
}
```

### 응답 예시 (오류)
```json
{
  "success": false,
  "error": "검색어가 필요합니다.",
  "message": "매장명이나 주소를 입력해주세요."
}
```

---

## 🏪 2. 매장명 기반 리뷰 크롤링 API

### 요청
```bash
curl -X POST "http://localhost:3000/api/reviews/crawl-by-store" \
  -H "Content-Type: application/json" \
  -d '{
    "storeName": "스타벅스 강남점",
    "storeIndex": 0,
    "level": "intermediate",
    "maxReviews": 30
  }'
```

### 요청 파라미터
| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|----------|------|------|------|--------|
| storeName | string | ✅ | 검색할 매장명 | - |
| storeIndex | number | ❌ | 검색 결과에서 선택할 매장 인덱스 | 0 |
| level | string | ❌ | 크롤링 레벨 (basic/intermediate/advanced) | basic |
| maxReviews | number | ❌ | 최대 크롤링할 리뷰 수 | 레벨별 기본값 |

### 크롤링 레벨별 설정
| 레벨 | 리뷰 수 | 정확도 | 신뢰도 | 용도 |
|------|---------|--------|--------|------|
| basic | 10개 | 60-75% | 낮음 | 참고용만 |
| intermediate | 30개 | 75-85% | 보통 | 제한적 의사결정 |
| advanced | 100개 | 85-95% | 높음 | 신뢰할 수 있는 분석 |

### 응답 예시 (성공)
```json
{
  "success": true,
  "data": {
    "store": {
      "name": "스타벅스 강남점",
      "address": "서울 강남구 강남대로 396",
      "phone": "02-1234-5678",
      "category": "카페",
      "placeId": "1234567890",
      "mapUrl": "https://map.naver.com/p/entry/place/1234567890"
    },
    "reviews": [
      {
        "author": "사용자1",
        "content": "맛있어요!",
        "visitDate": "2024-01-15",
        "visitCount": "1",
        "photoCount": 0
      },
      {
        "author": "사용자2",
        "content": "분위기가 좋아요",
        "visitDate": "2024-01-14",
        "visitCount": "2",
        "photoCount": 1
      }
    ],
    "totalCount": 30,
    "crawledAt": "2024-01-15T22:30:00.000Z",
    "crawlingMethod": "중급 레벨",
    "analysis": {
      "level": "intermediate",
      "accuracy": "75-85%",
      "reliability": "보통",
      "warning": "📊 보통 수준의 분석입니다 (75-85%)",
      "recommendation": "참고용으로 활용하세요"
    },
    "crawlingHistory": {
      "dailyCount": 40,
      "sessionCount": 4,
      "lastSessionTime": "2024-01-15 오후 10:30:00"
    },
    "searchInfo": {
      "originalQuery": "스타벅스 강남점",
      "totalStoresFound": 2,
      "selectedStoreIndex": 0
    }
  },
  "message": "스타벅스 강남점에서 30개의 리뷰를 성공적으로 크롤링했습니다. (75-85% 정확도)"
}
```

### 응답 예시 (매장을 찾을 수 없음)
```json
{
  "success": false,
  "error": "매장을 찾을 수 없습니다.",
  "message": "\"존재하지 않는 매장\" 매장을 찾을 수 없습니다. 매장명을 다시 확인해주세요."
}
```

### 응답 예시 (크롤링 제한)
```json
{
  "success": false,
  "error": "크롤링 제한",
  "message": "현재 크롤링이 제한되어 있습니다.",
  "data": {
    "status": {
      "canCrawl": false,
      "reason": "세션 간 대기 시간이 필요합니다."
    },
    "nextBestTime": "2024-01-15 오후 10:00:00",
    "selectedStore": {
      "name": "스타벅스 강남점",
      "address": "서울 강남구 강남대로 396",
      "placeId": "1234567890"
    }
  }
}
```

---

## 📊 3. 크롤링 상태 확인 API

### 요청
```bash
curl -X GET "http://localhost:3000/api/reviews/crawling-status?requestedReviews=30"
```

### 요청 파라미터
| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|----------|------|------|------|--------|
| requestedReviews | number | ❌ | 요청할 리뷰 수 | 10 |

### 응답 예시 (크롤링 가능)
```json
{
  "success": true,
  "data": {
    "status": "크롤링 가능",
    "statusCode": "success",
    "canCrawl": true,
    "currentTime": "2024-01-15 22:30:00",
    "timeRecommendation": "✅ 오프피크 시간대입니다. 크롤링에 적합합니다.",
    "dayRecommendation": "✅ 주말입니다. 더 많은 크롤링이 가능합니다.",
    "limits": {
      "dailyCount": 10,
      "dailyLimit": 50,
      "remainingDaily": 40,
      "usagePercentage": 20,
      "maxReviewsPerSession": 20
    },
    "recommendations": {
      "suggestedReviews": 30,
      "suggestedDelay": 3000,
      "riskAssessment": "안전",
      "nextBestTime": "현재 시간이 최적입니다.",
      "tips": ["새벽 시간대(02:00-05:00)에 크롤링하면 가장 안전합니다."]
    }
  },
  "message": "크롤링을 시작할 수 있습니다."
}
```

### 응답 예시 (크롤링 제한)
```json
{
  "success": true,
  "data": {
    "status": "크롤링 제한됨",
    "statusCode": "time_restricted",
    "canCrawl": false,
    "currentTime": "2024-01-15 14:30:00",
    "timeRecommendation": "⚠️ 업무 시간대입니다. 크롤링을 최소화하세요.",
    "dayRecommendation": "⚠️ 평일입니다. 업무 시간대를 피해 크롤링하세요.",
    "limits": {
      "dailyCount": 0,
      "dailyLimit": 50,
      "remainingDaily": 50,
      "usagePercentage": 0,
      "maxReviewsPerSession": 20
    },
    "recommendations": {
      "suggestedReviews": 10,
      "suggestedDelay": 3000,
      "riskAssessment": "위험",
      "nextBestTime": "2024-01-15 오후 10:00:00",
      "tips": ["업무 시간대에는 크롤링을 최소화하여 안전하게 사용하세요."]
    }
  },
  "message": "크롤링이 제한되어 있습니다: 현재는 업무 시간대입니다. 오후 10시 이후에 크롤링하세요."
}
```

---

## 📈 4. 크롤링 이력 조회 API

### 요청
```bash
curl -X GET "http://localhost:3000/api/reviews/crawling-history"
```

### 응답 예시
```json
{
  "success": true,
  "data": {
    "dailyCount": 25,
    "dailyLimit": 50,
    "remainingDaily": 25,
    "sessionCount": 3,
    "maxSessionsPerDay": 10,
    "lastSessionTime": "2024-01-15 오후 2:30:00",
    "usagePercentage": 50,
    "status": "보통",
    "nextResetTime": "7시간 30분 후"
  },
  "message": "크롤링 이력이 조회되었습니다."
}
```

### 상태 설명
- `안전`: 50% 미만 사용
- `보통`: 50-70% 사용
- `주의`: 70-90% 사용
- `위험`: 90% 이상 사용

---

## 🚀 5. 안전한 크롤링 실행 API

### 요청
```bash
curl -X POST "http://localhost:3000/api/reviews/crawl" \
  -H "Content-Type: application/json" \
  -d '{
    "placeId": "1234567890",
    "maxReviews": 30,
    "level": "intermediate"
  }'
```

### 요청 파라미터
| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|----------|------|------|------|--------|
| placeId | string | ✅ | 네이버 플레이스 ID | - |
| maxReviews | number | ❌ | 최대 크롤링할 리뷰 수 | 10 |
| level | string | ❌ | 크롤링 레벨 | basic |

### 응답 예시 (성공)
```json
{
  "success": true,
  "data": {
    "placeId": "1234567890",
    "reviews": [
      {
        "author": "사용자1",
        "content": "맛있어요!",
        "visitDate": "2024-01-15",
        "visitCount": "1",
        "photoCount": 0
      }
    ],
    "totalCount": 30,
    "crawledAt": "2024-01-15T22:30:00.000Z",
    "crawlingMethod": "중급 레벨",
    "crawlingHistory": {
      "dailyCount": 40,
      "sessionCount": 4,
      "lastSessionTime": "2024-01-15 오후 10:30:00"
    }
  },
  "message": "30개의 리뷰를 성공적으로 크롤링했습니다."
}
```

### 응답 예시 (제한됨)
```json
{
  "success": false,
  "error": "크롤링 제한",
  "message": "현재 크롤링이 제한되어 있습니다.",
  "data": {
    "status": {
      "canCrawl": false,
      "reason": "일일 크롤링 제한에 도달했습니다."
    },
    "nextBestTime": "내일 오전 12시"
  }
}
```

---

## 💡 프론트엔드 사용 예시

### 1. 매장 검색 후 리뷰 크롤링 (권장 방식)

```javascript
// 1단계: 매장 검색
const searchStores = async (storeName) => {
  try {
    const response = await fetch(`/api/reviews/search-stores?query=${encodeURIComponent(storeName)}`);
    const data = await response.json();
    
    if (data.success) {
      console.log('검색된 매장들:', data.data.stores);
      return data.data.stores;
    } else {
      console.error('매장 검색 실패:', data.message);
      return [];
    }
  } catch (error) {
    console.error('매장 검색 오류:', error);
    return [];
  }
};

// 2단계: 선택한 매장의 리뷰 크롤링
const crawlReviews = async (storeName, storeIndex = 0, level = 'intermediate') => {
  try {
    const response = await fetch('/api/reviews/crawl-by-store', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        storeName,
        storeIndex,
        level
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('크롤링 성공:', data.data);
      return data.data;
    } else {
      console.error('크롤링 실패:', data.message);
      return null;
    }
  } catch (error) {
    console.error('크롤링 오류:', error);
    return null;
  }
};

// 사용 예시
const analyzeStoreReviews = async () => {
  // 1. 매장 검색
  const stores = await searchStores('스타벅스 강남점');
  
  if (stores.length === 0) {
    alert('매장을 찾을 수 없습니다.');
    return;
  }
  
  // 2. 첫 번째 매장 선택하여 리뷰 크롤링
  const result = await crawlReviews('스타벅스 강남점', 0, 'intermediate');
  
  if (result) {
    console.log('매장 정보:', result.store);
    console.log('리뷰 개수:', result.totalCount);
    console.log('분석 정확도:', result.analysis.accuracy);
    console.log('경고 메시지:', result.analysis.warning);
  }
};
```

### 2. 크롤링 상태 확인

```javascript
const checkCrawlingStatus = async (requestedReviews = 30) => {
  try {
    const response = await fetch(`/api/reviews/crawling-status?requestedReviews=${requestedReviews}`);
    const data = await response.json();
    
    if (data.success) {
      if (data.data.canCrawl) {
        console.log('크롤링 가능:', data.data.status);
        return true;
      } else {
        console.log('크롤링 제한:', data.data.status);
        console.log('다음 최적 시간:', data.data.recommendations.nextBestTime);
        return false;
      }
    }
  } catch (error) {
    console.error('상태 확인 오류:', error);
    return false;
  }
};
```

---

## ⚠️ 주의사항

1. **크롤링 제한 준수**: 일일 50개, 세션당 20개 제한을 반드시 준수하세요.
2. **시간대 고려**: 업무시간(09:00-18:00)에는 크롤링을 최소화하세요.
3. **정확도 한계**: 소표본 분석의 한계를 인지하고 적절한 용도로만 활용하세요.
4. **에러 처리**: 네트워크 오류나 크롤링 실패에 대한 적절한 에러 처리를 구현하세요.

---

## 🔧 개발자 정보

- **Base URL**: `http://localhost:3000`
- **API Prefix**: `/api/reviews`
- **Content-Type**: `application/json`
- **인증**: 현재 인증 없음 (추후 JWT 토큰 기반 인증 예정) 