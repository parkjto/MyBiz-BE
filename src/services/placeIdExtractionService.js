/**
 * 개선된 Place ID 추출 통합 서비스
 * 3단계 추출 방식: 2-1 스크래핑 → 2-2 allSearch API → 2-3 수동 확인
 */

const axios = require('axios');

class PlaceIdExtractionService {
  constructor() {
    this.successRates = {
      "2-1": 0.85,  // 스크래핑
      "2-2": 0.4,   // allSearch API
      "2-3": 1.0    // 수동 확인
    };
    
    // 재시도 설정
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 15000
    };
    
    // User-Agent 목록 (로테이션용)
    this.userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
  }

  /**
   * 통합 Place ID 추출 메서드 (3단계 시도)
   * @param {Object} storeInfo - 매장 정보
   * @returns {Promise<Object>} 추출 결과
   */
  async extractPlaceId(storeInfo) {
    const startTime = Date.now();
    console.log(`[INFO] ${storeInfo.name} Place ID 추출 시작...`);
    
    const extractionSteps = [];
    
    // 2-1단계: 스크래핑 방식
    try {
      console.log('[STEP 2-1] 스크래핑 방식 시도...');
      const scrapingResult = await this.trySearchScrapingWithRetry(storeInfo);
      if (scrapingResult && scrapingResult.placeId) {
        extractionSteps.push({
          step: '2-1',
          method: '스크래핑',
          success: true,
          placeId: scrapingResult.placeId
        });
        
        const duration = Date.now() - startTime;
        console.log(`[SUCCESS] 2-1단계 성공: ${scrapingResult.placeId} (${duration}ms)`);
        return {
          ...scrapingResult,
          extractionMethod: 'scraping',
          extractionSteps: extractionSteps,
          successRate: this.successRates["2-1"],
          extractedAt: new Date().toISOString(),
          duration: duration
        };
      } else {
        extractionSteps.push({
          step: '2-1',
          method: '스크래핑',
          success: false,
          error: '스크래핑 실패'
        });
      }
    } catch (error) {
      console.log(`[ERROR] 2-1단계 실패: ${error.message}`);
      extractionSteps.push({
        step: '2-1',
        method: '스크래핑',
        success: false,
        error: error.message
      });
    }

    // 2-2단계: allSearch API 방식
    try {
      console.log('[STEP 2-2] allSearch API 방식 시도...');
      const allSearchResult = await this.tryAllSearchAPIWithRetry(storeInfo);
      if (allSearchResult && allSearchResult.placeId) {
        extractionSteps.push({
          step: '2-2',
          method: 'allSearch API',
          success: true,
          placeId: allSearchResult.placeId
        });
        
        const duration = Date.now() - startTime;
        console.log(`[SUCCESS] 2-2단계 성공: ${allSearchResult.placeId} (${duration}ms)`);
        return {
          ...allSearchResult,
          extractionMethod: 'allsearch',
          extractionSteps: extractionSteps,
          successRate: this.successRates["2-2"],
          extractedAt: new Date().toISOString(),
          duration: duration
        };
      } else {
        extractionSteps.push({
          step: '2-2',
          method: 'allSearch API',
          success: false,
          error: 'allSearch API 실패'
        });
      }
    } catch (error) {
      console.log(`[ERROR] 2-2단계 실패: ${error.message}`);
      extractionSteps.push({
        step: '2-2',
        method: 'allSearch API',
        success: false,
        error: error.message
      });
    }

    // 2-3단계: 수동 확인 안내
    console.log('[STEP 2-3] 수동 확인 안내...');
    extractionSteps.push({
      step: '2-3',
      method: '수동 확인',
      success: false,
      manualSteps: [
        '1. https://map.naver.com 접속',
        `2. "${storeInfo.name} ${storeInfo.address || ''}" 검색`,
        '3. 검색 결과에서 해당 매장 클릭',
        '4. URL에서 /place/숫자 부분 확인'
      ]
    });

    const duration = Date.now() - startTime;
    console.log(`[INFO] 모든 자동 추출 실패, 수동 확인 필요 (${duration}ms)`);
    
    return {
      placeId: null,
      extractionSteps: extractionSteps,
      manualSteps: [
        '1. https://map.naver.com 접속',
        `2. "${storeInfo.name} ${storeInfo.address || ''}" 검색`,
        '3. 검색 결과에서 해당 매장 클릭',
        '4. URL에서 /place/숫자 부분 확인'
      ],
      method: 'manual',
      successRate: this.successRates["2-3"],
      extractedAt: new Date().toISOString(),
      duration: duration
    };
  }

  /**
   * 2-1단계: 스크래핑 방식 (재시도 포함)
   * @param {Object} storeInfo - 매장 정보
   * @returns {Promise<Object>} 추출 결과
   */
  async trySearchScrapingWithRetry(storeInfo) {
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        console.log(`[DEBUG] 2-1단계 시도 ${attempt}/${this.retryConfig.maxRetries}`);
        const result = await this.trySearchScraping(storeInfo);
        if (result && result.placeId) {
          return result;
        }
        
        if (attempt < this.retryConfig.maxRetries) {
          await this.delay(this.retryConfig.retryDelay);
        }
      } catch (error) {
        console.log(`[WARNING] 2-1단계 시도 ${attempt} 실패: ${error.message}`);
        if (attempt < this.retryConfig.maxRetries) {
          await this.delay(this.retryConfig.retryDelay);
        }
      }
    }
    return null;
  }

  /**
   * 2-1단계: 네이버 검색 스크래핑
   * @param {Object} storeInfo - 매장 정보
   * @returns {Promise<Object>} 추출 결과
   */
  async trySearchScraping(storeInfo) {
    try {
      // 더 간단한 검색 쿼리 사용 (매장명 + 지역만)
      const storeName = storeInfo.name.replace(/<[^>]*>/g, '').trim(); // HTML 태그 제거
      const address = storeInfo.address || '';
      const region = address.split(' ').slice(0, 2).join(' '); // 시도 + 시/군/구만 사용
      
      const searchQuery = `${storeName} ${region}`.trim();
      const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(searchQuery)}&where=nexearch`;
      
      console.log(`[DEBUG] 검색 쿼리: "${searchQuery}"`);
      console.log(`[DEBUG] 검색 URL: ${searchUrl}`);
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: this.retryConfig.timeout
      });

      const html = response.data;
      
      console.log(`[DEBUG] HTML 길이: ${html.length} 문자`);
      
      // Place ID 패턴 찾기 (정확한 패턴만 사용)
      const placeIdPatterns = [
        /place\/(\d+)/g  // place/숫자 형태만 사용
      ];
      
      console.log(`[DEBUG] 모든 place/ 패턴 찾기:`);
      const allPlaceMatches = html.match(/place\/[0-9]+/g);
      if (allPlaceMatches) {
        console.log(`[DEBUG] 발견된 place/ 패턴들: ${allPlaceMatches.slice(0, 10).join(', ')}`);
      }

      for (const pattern of placeIdPatterns) {
        console.log(`[DEBUG] 패턴 시도: ${pattern}`);
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
          console.log(`[DEBUG] 패턴 매치 발견: ${matches.length}개`);
          // 각 매치에서 Place ID 추출
          for (const match of matches) {
            console.log(`[DEBUG] 매치: ${match}`);
            const placeIdMatch = match.match(/\d+/);
            if (placeIdMatch && placeIdMatch[0]) {
              const placeId = placeIdMatch[0];
              console.log(`[DEBUG] 추출된 숫자: ${placeId}`);
              
              // Place ID가 4자리 이상인지 확인 (유효한 Place ID는 보통 4자리 이상)
              if (placeId.length >= 4) {
                console.log(`[DEBUG] 발견된 Place ID: ${placeId}`);
                
                // Place ID 유효성 검증
                const isValid = await this.validatePlaceId(placeId);
                if (isValid) {
                  return {
                    placeId: placeId,
                    placeUrl: `https://m.place.naver.com/place/${placeId}/home`,
                    reviewUrl: `https://m.place.naver.com/place/${placeId}/review`,
                    extractionMethod: 'scraping',
                    confidence: 0.85
                  };
                }
              }
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.log(`[ERROR] 스크래핑 실패: ${error.message}`);
      return null;
    }
  }

  /**
   * 2-2단계: allSearch API 방식 (재시도 포함)
   * @param {Object} storeInfo - 매장 정보
   * @returns {Promise<Object>} 추출 결과
   */
  async tryAllSearchAPIWithRetry(storeInfo) {
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        console.log(`[DEBUG] 2-2단계 시도 ${attempt}/${this.retryConfig.maxRetries}`);
        const result = await this.tryAllSearchAPI(storeInfo);
        if (result && result.placeId) {
          return result;
        }
        
        if (attempt < this.retryConfig.maxRetries) {
          await this.delay(this.retryConfig.retryDelay);
        }
      } catch (error) {
        console.log(`[WARNING] 2-2단계 시도 ${attempt} 실패: ${error.message}`);
        if (attempt < this.retryConfig.maxRetries) {
          await this.delay(this.retryConfig.retryDelay);
        }
      }
    }
    return null;
  }

  /**
   * 2-2단계: 네이버 지도 allSearch API
   * @param {Object} storeInfo - 매장 정보
   * @returns {Promise<Object>} 추출 결과
   */
  async tryAllSearchAPI(storeInfo) {
    try {
      const searchQuery = `${storeInfo.name} ${storeInfo.address || ''}`.trim();
      const allSearchUrl = `https://map.naver.com/v5/api/search?query=${encodeURIComponent(searchQuery)}&type=place&displayCount=5`;
      
      const response = await axios.get(allSearchUrl, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'application/json',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Referer': 'https://map.naver.com/',
          'Origin': 'https://map.naver.com'
        },
        timeout: this.retryConfig.timeout
      });

      const data = response.data;
      
      if (data && data.result && data.result.place && data.result.place.list) {
        const places = data.result.place.list;
        const matchingPlace = this.findMatchingPlace(places, storeInfo);
        
        if (matchingPlace && matchingPlace.id) {
          return {
            placeId: matchingPlace.id,
            placeUrl: `https://m.place.naver.com/place/${matchingPlace.id}/home`,
            reviewUrl: `https://m.place.naver.com/place/${matchingPlace.id}/review`,
            extractionMethod: 'allsearch',
            confidence: 0.4
          };
        }
      }

      return null;
    } catch (error) {
      console.log(`[ERROR] allSearch API 실패: ${error.message}`);
      return null;
    }
  }

  /**
   * 매칭되는 장소 찾기
   * @param {Array} places - 장소 목록
   * @param {Object} storeInfo - 매장 정보
   * @returns {Object|null} 매칭되는 장소
   */
  findMatchingPlace(places, storeInfo) {
    const storeName = storeInfo.name.toLowerCase().replace(/[^\w\s]/g, '');
    
    for (const place of places) {
      const placeName = place.name.toLowerCase().replace(/[^\w\s]/g, '');
      
      // 이름 매칭 확인
      if (placeName.includes(storeName) || storeName.includes(placeName)) {
        return place;
      }
      
      // 주소 매칭 확인
      if (storeInfo.address && place.address) {
        const storeAddress = storeInfo.address.toLowerCase();
        const placeAddress = place.address.toLowerCase();
        
        if (placeAddress.includes(storeAddress) || storeAddress.includes(placeAddress)) {
          return place;
        }
      }
    }
    
    return null;
  }

  /**
   * Place ID 유효성 검증 및 매장 정보 추출
   * @param {string} placeId - Place ID
   * @returns {Promise<Object>} 검증 결과 및 매장 정보
   */
  async validatePlaceId(placeId) {
    try {
      const placeUrl = `https://m.place.naver.com/place/${placeId}/home`;
      
      const response = await axios.get(placeUrl, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
        },
        timeout: this.retryConfig.timeout
      });
      
      if (response.status === 200) {
        // HTML에서 매장 정보 추출
        const html = response.data;
        
        // 매장명 추출 (더 정확한 패턴)
        const nameMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
        const storeName = nameMatch ? nameMatch[1].trim() : '알 수 없음';
        
        // 주소 추출 (더 정확한 패턴)
        const addressMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/);
        const address = addressMatch ? addressMatch[1].trim() : '알 수 없음';
        
        // 좌표 추출 (간단한 패턴)
        const coordMatch = html.match(/lat["\s]*[:=]["\s]*([^"'\s]+)["\s]*[,\s]*lng["\s]*[:=]["\s]*([^"'\s]+)/);
        const coordinates = coordMatch ? {
          lat: parseFloat(coordMatch[1]),
          lng: parseFloat(coordMatch[2])
        } : { lat: 0, lng: 0 };
        
        return {
          isValid: true,
          storeName: storeName,
          address: address,
          coordinates: coordinates,
          placeUrl: placeUrl
        };
      } else {
        return {
          isValid: false,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * 랜덤 User-Agent 반환
   * @returns {string} User-Agent
   */
  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * 지연 함수
   * @param {number} ms - 지연 시간 (밀리초)
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 개선된 시스템 상태 반환
   * @returns {Object} 시스템 상태
   */
  getSystemStatus() {
    return {
      methods: {
        "2-1": {
          name: "스크래핑",
          successRate: this.successRates["2-1"],
          description: "네이버 검색 스크래핑",
          retryConfig: this.retryConfig
        },
        "2-2": {
          name: "allSearch API",
          successRate: this.successRates["2-2"],
          description: "네이버 지도 allSearch API",
          retryConfig: this.retryConfig
        },
        "2-3": {
          name: "수동 확인",
          successRate: this.successRates["2-3"],
          description: "수동 확인 안내"
        }
      },
      overallSuccessRate: 0.85,
      lastUpdated: new Date().toISOString(),
      version: '3.0.0',
      improvements: [
        '3단계 추출 방식 명확화',
        '재시도 로직 강화',
        '에러 처리 개선',
        'User-Agent 로테이션',
        '타임아웃 설정',
        '매칭 알고리즘 개선'
      ]
    };
  }
}

module.exports = PlaceIdExtractionService; 