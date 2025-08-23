# MyBiz 매출 분석 API - 프론트엔드 연동 가이드

## 🔐 인증 설정

### JWT 토큰 획득
```javascript
// 카카오/네이버 로그인 후 JWT 토큰 받기
const response = await fetch('/api/auth/kakao/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: '인가코드' })
});

const { token } = await response.json();
// 이 토큰을 모든 API 호출에 사용
```

## 📊 매출 분석 API 연동

### 1. CSV 업로드
```javascript
const uploadCSV = async (file, token) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/sales/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  return await response.json();
};

// 사용 예시
const fileInput = document.getElementById('csvFile');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const result = await uploadCSV(file, token);
  console.log('업로드 결과:', result);
});
```

### 2. 하이라이트 분석
```javascript
const getHighlights = async (startDate, endDate, token) => {
  const response = await fetch(
    `/api/sales/highlights?start=${startDate}&end=${endDate}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return await response.json();
};

// 사용 예시
const highlights = await getHighlights('2025-01-01', '2025-06-30', token);
console.log('총매출:', highlights.data.totalRevenue);
console.log('Top3:', highlights.data.top3);
console.log('최대성장:', highlights.data.maxGrowth);
```

### 3. 수익성(ROI) 분석
```javascript
const getProfitability = async (startDate, endDate, profitRate = 0.7, token) => {
  const response = await fetch(
    `/api/sales/profitability?start=${startDate}&end=${endDate}&rate=${profitRate}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return await response.json();
};

// 사용 예시
const roi = await getProfitability('2025-01-01', '2025-06-30', 0.7, token);
console.log('총매출:', roi.data.totalRevenue);
console.log('수익률:', roi.data.profitRate);
console.log('메뉴별:', roi.data.items);
```

### 4. 시간대별 분석
```javascript
const getTimeAnalysis = async (startDate, endDate, token) => {
  const [hourly, weekday] = await Promise.all([
    fetch(`/api/sales/time-of-day?start=${startDate}&end=${endDate}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),
    fetch(`/api/sales/weekday?start=${startDate}&end=${endDate}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json())
  ]);
  
  return { hourly: hourly.data, weekday: weekday.data };
};
```

### 5. 월별 상세 분석
```javascript
const getMonthlyDetails = async (year, month, token) => {
  const [weekly, summary] = await Promise.all([
    fetch(`/api/sales/weekly-by-month?year=${year}&month=${month}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),
    fetch(`/api/sales/month-summary?year=${year}&month=${month}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json())
  ]);
  
  return { weekly: weekly.data, summary: summary.data };
};
```

## 📈 차트 연동 예제

### Flutter 차트 예시
```dart
// 월별 라인차트
LineChart(
  LineChartData(
    spots: monthlyData.map((data) => 
      FlSpot(data.monthIndex, data.total / 1000000) // 백만원 단위
    ).toList(),
    titles: FlTitlesData(
      leftTitles: SideTitles(
        showTitles: true,
        getTitles: (value) => '${value.toInt()}백만원'
      )
    )
  )
)

// 카테고리 파이차트
PieChart(
  PieChartData(
    sections: categoryData.map((data) => 
      PieChartSectionData(
        value: data.pct, 
        color: getCategoryColor(data.category), 
        title: '${data.category}\n${data.pct}%'
      )
    ).toList()
  )
)

// 베스트셀러 바차트
BarChart(
  BarChartData(
    barGroups: bestsellerData.asMap().entries.map((entry) => 
      BarChartGroupData(
        x: entry.key,
        barRods: [BarChartRodData(y: entry.value.total / 10000)] // 만원 단위
      )
    ).toList()
  )
)
```

### React 차트 예시
```javascript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const MonthlyChart = ({ data }) => (
  <LineChart width={600} height={300} data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip formatter={(value) => `${(value/10000).toFixed(0)}만원`} />
    <Legend />
    <Line type="monotone" dataKey="total" stroke="#8884d8" />
  </LineChart>
);
```

## 🎯 음성 명령 연동

### 음성 → API 매핑
```javascript
const voiceCommandHandler = async (command, token) => {
  const lowerCommand = command.toLowerCase();
  
  if (lowerCommand.includes('베스트셀러') || lowerCommand.includes('잘팔린')) {
    const limit = lowerCommand.match(/\d+/)?.[0] || 10;
    return await getBestsellers('2025-01-01', '2025-06-30', limit, token);
  }
  
  if (lowerCommand.includes('수익성') || lowerCommand.includes('roi')) {
    return await getProfitability('2025-01-01', '2025-06-30', 0.7, token);
  }
  
  if (lowerCommand.includes('하이라이트') || lowerCommand.includes('요약')) {
    return await getHighlights('2025-01-01', '2025-06-30', token);
  }
  
  if (lowerCommand.includes('시간대') || lowerCommand.includes('혼잡')) {
    return await getTimeAnalysis('2025-01-01', '2025-06-30', token);
  }
  
  return { error: '명령을 이해할 수 없습니다' };
};

// 사용 예시
const result = await voiceCommandHandler('베스트셀러 3개 알려줘', token);
```

## 🚀 성능 최적화

### 캐싱 전략
```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5분

const getCachedData = async (key, fetchFunction) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchFunction();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
};

// 사용 예시
const highlights = await getCachedData(
  `highlights_${startDate}_${endDate}`,
  () => getHighlights(startDate, endDate, token)
);
```

### 에러 처리
```javascript
const apiCall = async (url, options) => {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      if (response.status === 401) {
        // 토큰 만료, 재로그인 필요
        throw new Error('인증이 만료되었습니다');
      }
      throw new Error(`API 오류: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API 호출 실패:', error);
    throw error;
  }
};
```

## 📱 모바일 최적화

### 반응형 UI 패턴
```javascript
// 화면 크기에 따른 차트 크기 조정
const getChartSize = () => {
  const width = window.innerWidth;
  if (width < 768) return { width: width - 40, height: 200 }; // 모바일
  if (width < 1024) return { width: 600, height: 300 }; // 태블릿
  return { width: 800, height: 400 }; // 데스크톱
};

// 터치 제스처 지원
const addTouchSupport = (chartElement) => {
  let startX = 0;
  chartElement.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  });
  
  chartElement.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    
    if (Math.abs(diff) > 50) {
      // 스와이프 제스처 처리
      if (diff > 0) {
        // 왼쪽 스와이프: 다음 기간
        loadNextPeriod();
      } else {
        // 오른쪽 스와이프: 이전 기간
        loadPrevPeriod();
      }
    }
  });
};
```

## 🔧 개발 환경 설정

### 환경변수
```bash
# .env
REACT_APP_API_BASE_URL=http://localhost:3000
REACT_APP_UPLOAD_MAX_SIZE=20971520 # 20MB
```

### API 클라이언트 설정
```javascript
// apiClient.js
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = null;
  }
  
  setToken(token) {
    this.token = token;
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        ...options.headers
      }
    };
    
    return await fetch(url, config);
  }
}

export const apiClient = new ApiClient(process.env.REACT_APP_API_BASE_URL);
```

이제 프론트엔드에서 MyBiz 매출 분석 API를 완벽하게 활용할 수 있습니다! 🚀
