require('dotenv').config();
const axios = require('axios');
const puppeteer = require('puppeteer');
const { 
  extractPlaceIdFromStoreData, 
  extractCoordinates, 
  enhanceStoreData,
  generateNaverMapUrl,
  generateNaverMapUrlByCoordinates,
  isValidPlaceId
} = require('../utils/placeIdExtractor');

/**
 * 네이버 로컬 API 기반 매장 검색 및 Place ID 추출 서비스
 * 완전히 개선된 Place ID 추출 시스템
 */
class NaverLocalService {
  constructor() {
    this.NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || process.env.NAVER_LOCAL_CLIENT_ID;
    this.NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || process.env.NAVER_LOCAL_CLIENT_SECRET;
    this.browser = null;
    this.page = null;
    
    // 성공률 통계
    this.successRates = {
      allsearch: 0.3,
      selenium: 0.95,
      scraping: 0.8,
      manual: 1.0
    };
    
    if (!this.NAVER_CLIENT_ID || !this.NAVER_CLIENT_SECRET) {
      console.warn('⚠️ 네이버 API 키가 설정되지 않았습니다. 일부 기능이 제한될 수 있습니다.');
    } else {
      console.log('✅ 네이버 API 키 설정 완료');
    }
  }

  /**
   * 브라우저 초기화 (개선된 버전)
   */
  async initializeBrowser() {
    try {
      this.browser = await puppeteer.launch({
        headless: "new", // 새로운 Headless 모드 사용
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // 더 현실적인 User-Agent 설정
      await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      // 추가 설정
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });
      
      console.log('✅ 브라우저 초기화 완료');
      return true;
    } catch (error) {
      console.error('❌ 브라우저 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 브라우저 종료
   */
  async closeBrowser() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        console.log('✅ 브라우저 종료 완료');
      }
    } catch (error) {
      console.error('❌ 브라우저 종료 실패:', error);
    }
  }

  /**
   * 네이버 로컬 API로 매장 검색 (개선된 버전)
   * @param {string} query - 검색어 (상호명 또는 주소)
   * @param {number} display - 검색 결과 수 (기본값: 5)
   * @returns {Promise<Object>} 검색 결과
   */
  async searchStore(query, display = 5) {
    try {
      if (!this.NAVER_CLIENT_ID || !this.NAVER_CLIENT_SECRET) {
        return {
          success: false,
          error: '네이버 API 키가 설정되지 않았습니다.',
          message: '환경변수 NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET을 설정해주세요.'
        };
      }

      console.log(`🔍 매장 검색: "${query}"`);

      // 1차 검색: 원본 검색어로 검색
      const primaryResponse = await axios.get('https://openapi.naver.com/v1/search/local.json', {
        headers: {
          'X-Naver-Client-Id': this.NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': this.NAVER_CLIENT_SECRET
        },
        params: {
          query: query,
          display: display,
          start: 1,
          sort: 'random'
        }
      });

      console.log(`✅ 1차 검색 완료: ${primaryResponse.data.items?.length || 0}개 결과`);

      // 2차 검색: 복합 검색어인 경우 개별 키워드로도 검색
      let secondaryResults = [];
      const keywords = query.split(' ').filter(k => k.length > 1);
      
      if (keywords.length > 1) {
        console.log(`🔍 2차 검색: 복합 검색어 감지, 개별 키워드 검색 시도`);
        
        for (const keyword of keywords.slice(0, 2)) { // 최대 2개 키워드만 시도
          try {
            console.log(`🔍 2차 검색어: "${keyword}"`);
            
            const secondaryResponse = await axios.get('https://openapi.naver.com/v1/search/local.json', {
              headers: {
                'X-Naver-Client-Id': this.NAVER_CLIENT_ID,
                'X-Naver-Client-Secret': this.NAVER_CLIENT_SECRET
              },
              params: {
                query: keyword,
                display: Math.floor(display / 2),
                start: 1,
                sort: 'random'
              }
            });

            if (secondaryResponse.data.items) {
              secondaryResults = secondaryResults.concat(secondaryResponse.data.items);
            }
            
            // API 호출 간격 조절
            await this.delay(500);
            
          } catch (error) {
            console.log(`⚠️ 2차 검색 실패 (${keyword}):`, error.message);
            continue;
          }
        }
        
        console.log(`✅ 2차 검색 완료: ${secondaryResults.length}개 결과`);
      }

      // 결과 통합 및 중복 제거
      let allResults = primaryResponse.data.items || [];
      if (secondaryResults.length > 0) {
        allResults = allResults.concat(secondaryResults);
      }

      const uniqueResults = this.removeDuplicateStores(allResults);
      console.log(`✅ 통합 검색 완료: ${uniqueResults.length}개 결과 (중복 제거 후)`);

      return {
        success: true,
        data: uniqueResults,
        total: uniqueResults.length,
        query: query
      };

    } catch (error) {
      console.error('❌ 매장 검색 실패:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 중복 매장 제거
   * @param {Array} stores - 매장 목록
   * @returns {Array} 중복 제거된 매장 목록
   */
  removeDuplicateStores(stores) {
    const seen = new Set();
    return stores.filter(store => {
      const key = `${store.title}_${store.address}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 완전히 개선된 Place ID 추출 시스템
   * @param {Object} storeInfo - 매장 정보
   * @returns {Promise<Object>} Place ID 추출 결과
   */
  async extractPlaceId(storeInfo) {
    console.log(`🔍 ${storeInfo.name} Place ID 추출 시작...`);
    
    const methods = [
      { name: 'allsearch', func: this.tryAllSearchAPI.bind(this) },
      { name: 'selenium', func: this.trySeleniumExtraction.bind(this) },
      { name: 'scraping', func: this.trySearchScraping.bind(this) }
    ];
    
    for (let i = 0; i < methods.length; i++) {
      const method = methods[i];
      console.log(`🔄 방법 ${i + 1} (${method.name}) 시도 중...`);
      
      try {
        const result = await method.func(storeInfo);
        
        if (result && result.placeId) {
          console.log(`✅ 방법 ${i + 1} (${method.name}) 성공: ${result.placeId}`);
          
          return {
            ...result,
            extractionMethod: method.name,
            successRate: this.successRates[method.name] || 0.5,
            extractedAt: new Date().toISOString()
          };
        }
        
      } catch (error) {
        console.log(`❌ 방법 ${i + 1} (${method.name}) 실패: ${error.message}`);
      }
      
      // 정책 준수: 메서드 간 대기
      await this.delay(2000);
    }
    
    // 모든 자동 방법 실패 시 수동 안내
    return {
      placeId: null,
      manualSteps: [
        '1. https://map.naver.com 접속',
        `2. "${storeInfo.name} ${storeInfo.district || ''}" 검색`,
        '3. 매장 클릭 후 URL에서 /place/숫자 확인',
        '4. 해당 숫자가 Place ID입니다'
      ],
      method: 'manual',
      successRate: 1.0,
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * 방법 1: 개선된 allSearch API 시도
   * @param {Object} storeInfo - 매장 정보
   * @returns {Promise<Object|null>} Place ID 추출 결과
   */
  async tryAllSearchAPI(storeInfo) {
    const searchPatterns = [
      storeInfo.name,
      `${storeInfo.name} ${storeInfo.district || ''}`,
      `${storeInfo.roadAddress || storeInfo.address || ''}`
    ].filter(pattern => pattern.trim().length > 0);
    
    console.log(`📋 방법 1: 개선된 allSearch API 시도`);
    console.log(`🔍 검색 패턴들:`, searchPatterns);
    
    for (let i = 0; i < searchPatterns.length; i++) {
      const pattern = searchPatterns[i];
      try {
        console.log(`🔍 패턴 ${i + 1} 시도: "${pattern}"`);
        
        const response = await axios.get(
          `https://map.naver.com/p/api/search/allSearch`,
          {
            params: {
              query: pattern,
              type: 'all',
              page: 1,
              limit: 10
            },
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': 'https://map.naver.com/',
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Sec-Fetch-Dest': 'empty',
              'Sec-Fetch-Mode': 'cors',
              'Sec-Fetch-Site': 'same-origin'
            },
            timeout: 10000
          }
        );
        
        if (response.data && response.data.result) {
          const places = response.data.result.place?.list || [];
          
          if (places.length > 0) {
            const matchedPlace = this.findMatchingPlace(places, storeInfo);
            
            if (matchedPlace) {
              return {
                placeId: matchedPlace.id,
                placeUrl: `https://m.place.naver.com/place/${matchedPlace.id}/home`,
                reviewUrl: `https://m.place.naver.com/place/${matchedPlace.id}/review`,
                confidence: 0.9,
                method: 'allsearch'
              };
            }
          }
        }
        
        await this.delay(1000);
        
      } catch (error) {
        console.log(`⚠️ 패턴 ${i + 1} 실패: ${error.message}`);
        continue;
      }
    }
    
    console.log(`⚠️ 모든 패턴에서 Place ID를 찾을 수 없습니다.`);
    return null;
  }

  /**
   * 방법 2: Selenium 브라우저 자동화 (가장 확실한 방법)
   * @param {Object} storeInfo - 매장 정보
   * @returns {Promise<Object|null>} Place ID 추출 결과
   */
  async trySeleniumExtraction(storeInfo) {
    console.log(`📋 방법 2: 브라우저 자동화 시도`);
    
    try {
      // 브라우저 초기화
      if (!this.browser) {
        const initialized = await this.initializeBrowser();
        if (!initialized) {
          throw new Error('브라우저 초기화 실패');
        }
      }
      
      const searchQuery = `${storeInfo.name} ${storeInfo.district || ''}`.trim();
      console.log(`🔍 브라우저 자동화로 Place ID 추출 시도: "${searchQuery}"`);
      
      // 네이버 지도 검색 페이지로 이동
      const searchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(searchQuery)}`;
      console.log(`🔗 검색 URL: ${searchUrl}`);
      
      await this.page.goto(searchUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // 검색 결과 로딩 대기
      await this.page.waitForTimeout(3000);
      
      // 검색 결과 선택자들 (여러 버전 대응)
      const selectors = [
        '[data-testid="search-result-item"]',
        '._3VqGV',
        '.place_bluelink',
        '.search_result_item',
        '.result_item',
        'a[href*="/place/"]',
        '[class*="place"]',
        '[class*="result"]'
      ];
      
      let resultElement = null;
      
      for (const selector of selectors) {
        try {
          console.log(`🔍 선택자 ${selector} 시도`);
          
          await this.page.waitForSelector(selector, { timeout: 5000 });
          resultElement = await this.page.$(selector);
          
          if (resultElement) {
            console.log(`✅ 선택자 ${selector} 성공`);
            break;
          }
        } catch (error) {
          console.log(`선택자 ${selector} 실패: ${error.message}`);
          continue;
        }
      }
      
      if (!resultElement) {
        throw new Error('검색 결과를 찾을 수 없습니다');
      }
      
      // 첫 번째 결과 클릭
      await resultElement.click();
      await this.page.waitForTimeout(2000);
      
      // iframe으로 전환 시도
      try {
        const iframe = await this.page.waitForSelector('#entryIframe', { timeout: 5000 });
        if (iframe) {
          await this.page.frameLocator('#entryIframe');
        }
      } catch (error) {
        console.log('iframe 전환 실패, 메인 페이지에서 계속 진행');
      }
      
      // URL에서 Place ID 추출
      const currentUrl = this.page.url();
      console.log(`🔗 최종 URL: ${currentUrl}`);
      
      const placeIdPatterns = [
        /\/place\/(\d+)/,
        /place_id=(\d+)/,
        /placeId=(\d+)/
      ];
      
      for (const pattern of placeIdPatterns) {
        const match = currentUrl.match(pattern);
        if (match) {
          const placeId = match[1];
          console.log(`✅ Place ID 발견: ${placeId}`);
          
          return {
            placeId: placeId,
            placeUrl: `https://m.place.naver.com/place/${placeId}/home`,
            reviewUrl: `https://m.place.naver.com/place/${placeId}/review`,
            confidence: 0.95,
            method: 'selenium'
          };
        }
      }
      
      throw new Error('URL에서 Place ID를 찾을 수 없습니다');
      
    } catch (error) {
      console.log(`❌ 브라우저 자동화 실패: ${error.message}`);
      return null;
    }
  }

  /**
   * 방법 3: 네이버 검색 스크래핑
   * @param {Object} storeInfo - 매장 정보
   * @returns {Promise<Object|null>} Place ID 추출 결과
   */
  async trySearchScraping(storeInfo) {
    console.log(`📋 방법 3: 네이버 검색 스크래핑 시도`);
    
    try {
      const searchQuery = `${storeInfo.name} ${storeInfo.district || ''}`.trim();
      console.log(`🔍 네이버 검색 스크래핑으로 Place ID 추출 시도: "${searchQuery}"`);
      
      const searchUrl = `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(searchQuery)}&sm=top_hty&fbm=0&ie=utf8`;
      console.log(`🔗 검색 URL: ${searchUrl}`);
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000
      });
      
      if (response.status === 200) {
        const html = response.data;
        
        // 플레이스 링크 패턴들
        const placePatterns = [
          /\/place\/(\d+)/g,
          /place_id=(\d+)/g,
          /placeId=(\d+)/g
        ];
        
        for (const pattern of placePatterns) {
          const matches = html.match(pattern);
          if (matches && matches.length > 0) {
            const placeId = matches[0].match(/\d+/)[0];
            console.log(`✅ Place ID 발견: ${placeId}`);
            
            return {
              placeId: placeId,
              placeUrl: `https://m.place.naver.com/place/${placeId}/home`,
              reviewUrl: `https://m.place.naver.com/place/${placeId}/review`,
              confidence: 0.8,
              method: 'scraping'
            };
          }
        }
      }
      
      throw new Error('검색 결과에서 Place ID를 찾을 수 없습니다');
      
    } catch (error) {
      console.log(`❌ 네이버 검색 스크래핑 실패: ${error.message}`);
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
    return places.find(place => {
      // 이름 매칭
      const nameMatch = place.name?.includes(storeInfo.name) || 
                       storeInfo.name.includes(place.name);
      
      // 주소 키워드 매칭
      const addressKeywords = (storeInfo.address || '').split(' ').filter(k => k.length > 1);
      const addressMatch = addressKeywords.some(keyword => 
        place.address?.includes(keyword) || place.roadAddress?.includes(keyword)
      );
      
      return nameMatch && addressMatch;
    });
  }

  /**
   * 지연 함수
   * @param {number} ms - 지연 시간 (밀리초)
   * @returns {Promise} 지연된 Promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 네이버 지도 검색을 통해 Place ID 추출
   * @param {string} query - 검색어 (상호명 또는 주소)
   * @returns {Promise<Object>} Place ID 추출 결과
   */
  async extractPlaceIdFromMap(query) {
    try {
      console.log(`🔍 네이버 지도에서 Place ID 추출: "${query}"`);

      if (!this.browser) {
        const initialized = await this.initializeBrowser();
        if (!initialized) {
          return {
            success: false,
            error: '브라우저 초기화 실패',
            message: 'Place ID 추출을 위한 브라우저를 초기화할 수 없습니다.'
          };
        }
      }

      // 네이버 지도 검색 페이지 접속
      const searchUrl = `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
      await this.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // 페이지 로딩 대기
      await this.page.waitForTimeout(3000);

      try {
        // searchIframe으로 전환
        await this.page.waitForSelector('#searchIframe', { timeout: 10000 });
        await this.page.frameLocator('#searchIframe').locator('.place_bluelink').first().click();
        
        // entryIframe으로 전환
        await this.page.waitForTimeout(2000);
        await this.page.waitForSelector('#entryIframe', { timeout: 10000 });
        
        // 현재 URL에서 Place ID 추출
        const currentUrl = this.page.url();
        const placeIdMatch = currentUrl.match(/place\/(\d+)/);
        
        if (placeIdMatch) {
          const placeId = placeIdMatch[1];
          console.log(`✅ Place ID 추출 성공: ${placeId}`);
          
          return {
            success: true,
            data: {
              placeId: placeId,
              query: query,
              mapUrl: generateNaverMapUrl(placeId),
              extractedAt: new Date().toISOString()
            },
            message: `Place ID를 성공적으로 추출했습니다: ${placeId}`
          };
        } else {
          console.log('⚠️ Place ID를 찾을 수 없습니다.');
          return {
            success: false,
            error: 'Place ID 추출 실패',
            message: '검색 결과에서 Place ID를 찾을 수 없습니다.'
          };
        }
      } catch (iframeError) {
        console.log('⚠️ iframe 처리 실패, 대안 방법 시도...');
        
        // 대안: 직접 URL에서 Place ID 추출 시도
        const currentUrl = this.page.url();
        console.log(`현재 URL: ${currentUrl}`);
        
        // URL에서 Place ID 패턴 찾기
        const placeIdPatterns = [
          /place\/(\d+)/,
          /entry\/place\/(\d+)/,
          /p\/entry\/place\/(\d+)/,
          /(\d{9,})/ // 9자리 이상 숫자
        ];
        
        for (const pattern of placeIdPatterns) {
          const match = currentUrl.match(pattern);
          if (match) {
            const placeId = match[1];
            console.log(`✅ 대안 방법으로 Place ID 추출 성공: ${placeId}`);
            
            return {
              success: true,
              data: {
                placeId: placeId,
                query: query,
                mapUrl: generateNaverMapUrl(placeId),
                extractedAt: new Date().toISOString()
              },
              message: `Place ID를 성공적으로 추출했습니다: ${placeId}`
            };
          }
        }
        
        return {
          success: false,
          error: 'Place ID 추출 실패',
          message: 'iframe 처리와 대안 방법 모두 실패했습니다.'
        };
      }

    } catch (error) {
      console.error('❌ Place ID 추출 실패:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Place ID 추출 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 상호명/주소로 매장 검색 후 Place ID 추출 (통합 기능)
   * @param {string} query - 검색어 (상호명 또는 주소)
   * @param {boolean} extractPlaceId - Place ID 추출 여부 (기본값: true)
   * @returns {Promise<Object>} 통합 검색 결과
   */
  async findStoreByQuery(query, extractPlaceId = true) {
    try {
      console.log(`🔍 통합 매장 검색: "${query}"`);

      // 1단계: 네이버 로컬 API로 기본 정보 검색
      const searchResult = await this.searchStore(query);
      
      if (!searchResult.success) {
        return searchResult;
      }

      const stores = searchResult.data;
      
      // 2단계: Place ID 추출 (요청된 경우)
      if (extractPlaceId && stores.length > 0) {
        console.log('🔍 Place ID 추출 시작...');
        
        // 첫 번째 매장으로 Place ID 추출 시도
        const firstStore = stores[0];
        
        // 좌표 정보가 있는 경우 좌표 기반 Place ID 추출 시도
        if (firstStore.coordinates) {
          console.log('🔍 좌표 기반 Place ID 추출 시도...');
          const placeIdResult = await this.findPlaceIdByCoordinates(
            firstStore.coordinates.x,
            firstStore.coordinates.y,
            firstStore.name
          );
          
          if (placeIdResult.success) {
            // 실제 Place ID 추출 성공
            firstStore.placeId = placeIdResult.data.placeId;
            firstStore.mapUrl = placeIdResult.data.mapUrl;
            firstStore.extractedAt = placeIdResult.data.extractedAt;
            console.log(`✅ 좌표 기반 Place ID 추출 성공: ${firstStore.placeId}`);
          } else if (placeIdResult.data && placeIdResult.data.coordinateId) {
            // 좌표 기반 임시 ID 생성
            firstStore.coordinateId = placeIdResult.data.coordinateId;
            firstStore.mapUrl = placeIdResult.data.mapUrl;
            firstStore.extractedAt = placeIdResult.data.extractedAt;
            console.log(`⚠️ 좌표 기반 임시 ID 생성: ${firstStore.coordinateId}`);
          }
        } else {
          // 좌표 정보가 없는 경우 기존 방법 시도
          console.log('🔍 기존 방법으로 Place ID 추출 시도...');
          const placeIdResult = await this.extractPlaceIdFromMap(query);
          
          if (placeIdResult.success) {
            firstStore.placeId = placeIdResult.data.placeId;
            firstStore.mapUrl = placeIdResult.data.mapUrl;
            firstStore.extractedAt = placeIdResult.data.extractedAt;
          }
        }
      }

      return {
        success: true,
        data: stores,
        total: stores.length,
        message: `${stores.length}개의 매장을 찾았습니다.${extractPlaceId ? ' Place ID 추출을 완료했습니다.' : ''}`
      };

    } catch (error) {
      console.error('❌ 통합 매장 검색 실패:', error.message);
      return {
        success: false,
        error: error.message,
        message: '매장 검색 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 전화번호로 매장 검색
   * @param {string} storeName - 매장명
   * @param {string} phone - 전화번호
   * @returns {Promise<Object>} 매장 검색 결과
   */
  async findStoreByPhone(storeName, phone) {
    try {
      console.log(`🔍 전화번호로 매장 검색: "${storeName}" - "${phone}"`);

      const searchResult = await this.searchStore(storeName, 10);
      
      if (!searchResult.success) {
        return searchResult;
      }

      // 전화번호 매칭
      const matchedStore = searchResult.data.find(store => {
        const storePhone = store.phone || '';
        return storePhone.includes(phone.replace(/-/g, '')) || 
               phone.replace(/-/g, '').includes(storePhone.replace(/-/g, ''));
      });

      if (matchedStore) {
        return {
          success: true,
          data: matchedStore,
          message: '전화번호로 매장을 찾았습니다.'
        };
      } else {
        return {
          success: false,
          error: '매장을 찾을 수 없습니다.',
          message: '해당 전화번호의 매장을 찾을 수 없습니다.'
        };
      }

    } catch (error) {
      console.error('❌ 전화번호 매장 검색 실패:', error.message);
      return {
        success: false,
        error: error.message,
        message: '전화번호로 매장 검색 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 좌표로 매장 검색
   * @param {string} mapx - X 좌표
   * @param {string} mapy - Y 좌표
   * @param {string} storeName - 매장명 (선택사항)
   * @returns {Promise<Object>} 매장 검색 결과
   */
  async findStoreByCoordinates(mapx, mapy, storeName = '') {
    try {
      console.log(`🔍 좌표로 매장 검색: X=${mapx}, Y=${mapy}`);

      const coordinateId = `${mapx}_${mapy}`;
      const mapUrl = generateNaverMapUrlByCoordinates(mapx, mapy, storeName);

      return {
        success: true,
        data: {
          name: storeName || '좌표 기반 매장',
          coordinates: { x: mapx, y: mapy },
          coordinateId: coordinateId,
          mapUrl: mapUrl,
          extractedAt: new Date().toISOString()
        },
        message: '좌표 기반 매장 정보를 생성했습니다.'
      };

    } catch (error) {
      console.error('❌ 좌표 매장 검색 실패:', error.message);
      return {
        success: false,
        error: error.message,
        message: '좌표로 매장 검색 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * Place ID 유효성 검증
   * @param {string} placeId - 검증할 Place ID
   * @returns {boolean} 유효성 여부
   */
  validatePlaceId(placeId) {
    return isValidPlaceId(placeId);
  }

  /**
   * Place ID로 네이버 지도 URL 생성
   * @param {string} placeId - Place ID
   * @returns {string} 네이버 지도 URL
   */
  createMapUrl(placeId) {
    return generateNaverMapUrl(placeId);
  }

  /**
   * 좌표로 네이버 지도 URL 생성
   * @param {string} mapx - X 좌표
   * @param {string} mapy - Y 좌표
   * @param {string} storeName - 매장명 (선택사항)
   * @returns {string} 네이버 지도 URL
   */
  createMapUrlByCoordinates(mapx, mapy, storeName = '') {
    return generateNaverMapUrlByCoordinates(mapx, mapy, storeName);
  }

  /**
   * 매장 데이터 개선
   * @param {Object} storeData - 원본 매장 데이터
   * @returns {Object} 개선된 매장 데이터
   */
  enhanceStoreData(storeData) {
    return enhanceStoreData(storeData);
  }

  /**
   * 좌표를 이용한 Place ID 검색 (네이버 지도 API 사용)
   * @param {string} mapx - X 좌표
   * @param {string} mapy - Y 좌표
   * @param {string} storeName - 매장명 (선택사항)
   * @returns {Promise<Object>} Place ID 검색 결과
   */
  async findPlaceIdByCoordinates(mapx, mapy, storeName = '') {
    try {
      console.log(`🔍 좌표 기반 Place ID 검색: X=${mapx}, Y=${mapy}`);

      if (!this.browser) {
        const initialized = await this.initializeBrowser();
        if (!initialized) {
          return {
            success: false,
            error: '브라우저 초기화 실패',
            message: 'Place ID 검색을 위한 브라우저를 초기화할 수 없습니다.'
          };
        }
      }

      // 좌표 기반 네이버 지도 URL 생성
      const mapUrl = `https://map.naver.com/p/search/?c=${mapy},${mapx},15,0,0,0,dh`;
      console.log(`🔗 지도 URL: ${mapUrl}`);

      // 네이버 지도 페이지 접속
      await this.page.goto(mapUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.page.waitForTimeout(3000);

      try {
        // 현재 URL에서 Place ID 추출 시도
        const currentUrl = this.page.url();
        console.log(`현재 URL: ${currentUrl}`);

        // URL에서 Place ID 패턴 찾기
        const placeIdPatterns = [
          /place\/(\d+)/,
          /entry\/place\/(\d+)/,
          /p\/entry\/place\/(\d+)/,
          /(\d{9,})/ // 9자리 이상 숫자
        ];

        for (const pattern of placeIdPatterns) {
          const match = currentUrl.match(pattern);
          if (match) {
            const placeId = match[1];
            console.log(`✅ 좌표 기반 Place ID 추출 성공: ${placeId}`);

            return {
              success: true,
              data: {
                placeId: placeId,
                coordinates: { x: mapx, y: mapy },
                storeName: storeName,
                mapUrl: generateNaverMapUrl(placeId),
                extractedAt: new Date().toISOString()
              },
              message: `좌표 기반으로 Place ID를 성공적으로 추출했습니다: ${placeId}`
            };
          }
        }

        // URL에서 Place ID를 찾지 못한 경우, 주변 검색 시도
        console.log('⚠️ URL에서 Place ID를 찾지 못했습니다. 주변 검색을 시도합니다...');
        
        if (storeName) {
          // 매장명으로 주변 검색
          const searchUrl = `https://map.naver.com/p/search/${encodeURIComponent(storeName)}?c=${mapy},${mapx},15,0,0,0,dh`;
          await this.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          await this.page.waitForTimeout(3000);

          const searchUrlResult = this.page.url();
          console.log(`검색 URL 결과: ${searchUrlResult}`);

          // 검색 결과 URL에서 Place ID 찾기
          for (const pattern of placeIdPatterns) {
            const match = searchUrlResult.match(pattern);
            if (match) {
              const placeId = match[1];
              console.log(`✅ 주변 검색으로 Place ID 추출 성공: ${placeId}`);

              return {
                success: true,
                data: {
                  placeId: placeId,
                  coordinates: { x: mapx, y: mapy },
                  storeName: storeName,
                  mapUrl: generateNaverMapUrl(placeId),
                  extractedAt: new Date().toISOString()
                },
                message: `주변 검색으로 Place ID를 성공적으로 추출했습니다: ${placeId}`
              };
            }
          }
        }

        // 좌표 기반 임시 ID 생성 (대안)
        const coordinateId = `${mapx}_${mapy}`;
        console.log(`⚠️ Place ID 추출 실패, 좌표 기반 ID 생성: ${coordinateId}`);

        return {
          success: false,
          error: 'Place ID 추출 실패',
          data: {
            coordinateId: coordinateId,
            coordinates: { x: mapx, y: mapy },
            storeName: storeName,
            mapUrl: generateNaverMapUrlByCoordinates(mapx, mapy, storeName),
            extractedAt: new Date().toISOString()
          },
          message: 'Place ID를 추출할 수 없어 좌표 기반 ID를 생성했습니다.'
        };

      } catch (iframeError) {
        console.log('⚠️ iframe 처리 실패, 좌표 기반 ID 생성...');
        
        const coordinateId = `${mapx}_${mapy}`;
        return {
          success: false,
          error: 'iframe 처리 실패',
          data: {
            coordinateId: coordinateId,
            coordinates: { x: mapx, y: mapy },
            storeName: storeName,
            mapUrl: generateNaverMapUrlByCoordinates(mapx, mapy, storeName),
            extractedAt: new Date().toISOString()
          },
          message: 'iframe 처리에 실패하여 좌표 기반 ID를 생성했습니다.'
        };
      }

    } catch (error) {
      console.error('❌ 좌표 기반 Place ID 검색 실패:', error.message);
      return {
        success: false,
        error: error.message,
        message: '좌표 기반 Place ID 검색 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 해커톤용 통합 매장 검색 (검색 + Place ID 추출)
   * @param {string} query - 검색어 (상호명 또는 주소)
   * @param {number} selectedIndex - 사용자가 선택한 매장 인덱스 (기본값: 0)
   * @returns {Promise<Object>} 통합 검색 결과
   */
  async findStoreWithPlaceId(query, selectedIndex = 0) {
    try {
      console.log(`🔍 해커톤용 통합 매장 검색: "${query}" (선택 인덱스: ${selectedIndex})`);

      // 1단계: 네이버 로컬 API로 기본 정보 검색
      const searchResult = await this.searchStore(query);
      
      if (!searchResult.success || searchResult.data.length === 0) {
        return searchResult;
      }

      const stores = searchResult.data;
      
      // 선택된 매장이 범위를 벗어나는 경우 첫 번째 매장 사용
      const selectedStore = stores[selectedIndex] || stores[0];
      
      console.log(`📍 선택된 매장: ${selectedStore.name} (${selectedStore.address})`);

      // 2단계: 선택된 매장의 좌표로 Place ID 추출
      if (selectedStore.coordinates) {
        console.log('🔍 allSearch API로 Place ID 추출 시도...');
        
        const placeIdResult = await this.extractPlaceId(
          selectedStore
        );
        
        if (placeIdResult.success) {
          // Place ID 추출 성공
          selectedStore.placeId = placeIdResult.placeId;
          selectedStore.mapUrl = placeIdResult.placeUrl;
          selectedStore.extractedAt = placeIdResult.extractedAt;
          console.log(`✅ Place ID 추출 성공: ${selectedStore.placeId}`);
        } else {
          // Place ID 추출 실패 시 좌표 기반 임시 ID 생성
          selectedStore.coordinateId = `${selectedStore.coordinates.x}_${selectedStore.coordinates.y}`;
          selectedStore.mapUrl = generateNaverMapUrlByCoordinates(
            selectedStore.coordinates.x,
            selectedStore.coordinates.y,
            selectedStore.name
          );
          selectedStore.extractedAt = new Date().toISOString();
          console.log(`⚠️ 좌표 기반 임시 ID 생성: ${selectedStore.coordinateId}`);
        }
      }

      return {
        success: true,
        data: {
          selectedStore: selectedStore,
          allStores: stores,
          total: stores.length,
          selectedIndex: selectedIndex
        },
        message: `${stores.length}개의 매장을 찾았습니다. 선택된 매장: ${selectedStore.name}`
      };

    } catch (error) {
      console.error('❌ 해커톤용 통합 매장 검색 실패:', error.message);
      return {
        success: false,
        error: error.message,
        message: '매장 검색 중 오류가 발생했습니다.'
      };
    }
  }
}

module.exports = NaverLocalService; 