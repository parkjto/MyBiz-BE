require('dotenv').config();
const axios = require('axios');

/**
 * 네이버 로컬 API 기반 매장 검색 및 Place ID 추출 서비스
 * Place ID 추출 시스템
 */
class NaverLocalService {
  constructor() {
    this.NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || process.env.NAVER_LOCAL_CLIENT_ID;
    this.NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || process.env.NAVER_LOCAL_CLIENT_SECRET;
    
    // 성공률 통계
    this.successRates = {
      allsearch: 0.3,
      manual: 1.0
    };
    
    if (!this.NAVER_CLIENT_ID || !this.NAVER_CLIENT_SECRET) {
      console.warn('[WARNING] 네이버 API 키가 설정되지 않았습니다. 일부 기능이 제한될 수 있습니다.');
    } else {
      console.log('[INFO] 네이버 API 키 설정 완료');
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

      console.log(`[INFO] 매장 검색: "${query}"`);

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

      console.log(`[SUCCESS] 1차 검색 완료: ${primaryResponse.data.items?.length || 0}개 결과`);

      // 2차 검색: 복합 검색어인 경우 개별 키워드로도 검색
      let secondaryResults = [];
      const keywords = query.split(' ').filter(k => k.length > 1);
      
      if (keywords.length > 1) {
        console.log(`[INFO] 2차 검색: 복합 검색어 감지, 개별 키워드 검색 시도`);
        
        for (const keyword of keywords.slice(0, 2)) { // 최대 2개 키워드만 시도
          try {
            console.log(`[INFO] 2차 검색어: "${keyword}"`);
            
            const secondaryResponse = await axios.get('https://openapi.naver.com/v1/search/local.json', {
              headers: {
                'X-Naver-Client-Id': this.NAVER_CLIENT_ID,
                'X-Naver-Client-Secret': this.NAVER_CLIENT_SECRET
              },
              params: {
                query: keyword,
                display: Math.min(3, display),
                start: 1,
                sort: 'random'
              }
            });

            if (secondaryResponse.data.items) {
              secondaryResults.push(...secondaryResponse.data.items);
              console.log(`[SUCCESS] 2차 검색어 "${keyword}": ${secondaryResponse.data.items.length}개 결과`);
            }
          } catch (error) {
            console.log(`[WARNING] 2차 검색어 "${keyword}" 실패: ${error.message}`);
          }
        }
      }

      // 모든 결과 합치기
      let allResults = [...(primaryResponse.data.items || [])];
      if (secondaryResults.length > 0) {
        allResults = [...allResults, ...secondaryResults];
      }

      // 중복 제거 및 데이터 정리
      const uniqueResults = this.removeDuplicateStores(allResults);
      const enhancedResults = uniqueResults.map(store => this.enhanceStoreData(store));

      console.log(`[SUCCESS] 최종 검색 결과: ${enhancedResults.length}개`);

      return {
        success: true,
        data: enhancedResults,
        message: `${enhancedResults.length}개의 매장을 찾았습니다.`
      };

    } catch (error) {
      console.error('[ERROR] 매장 검색 실패:', error);
      return {
        success: false,
        error: error.message,
        message: '매장 검색 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 중복 매장 제거
   * @param {Array} stores - 매장 목록
   * @returns {Array} 중복이 제거된 매장 목록
   */
  removeDuplicateStores(stores) {
    const seen = new Set();
    return stores.filter(store => {
      const key = `${store.title}-${store.address}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Place ID 추출 시스템
   * @param {Object} storeInfo - 매장 정보
   * @returns {Promise<Object>} Place ID 추출 결과
   */
  async extractPlaceId(storeInfo) {
    console.log(`🔍 ${storeInfo.name} Place ID 추출 시작...`);
    
    const methods = [
      { name: 'allsearch', func: this.tryAllSearchAPI.bind(this) }
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
      
      // 정책 준수: 메서드 간 대기 (축소)
      await this.delay(500);
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
    try {
      console.log(`🔍 allSearch API로 Place ID 추출 시도: "${storeInfo.name}"`);
      
      // 네이버 지도 allSearch API 호출
      const searchQuery = `${storeInfo.name} ${storeInfo.district || ''}`.trim();
      const searchUrl = `https://map.naver.com/p/api/search?query=${encodeURIComponent(searchQuery)}&type=place&page=1&display=10`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      if (response.data && response.data.result && response.data.result.place) {
        const places = response.data.result.place.list || [];
        
        if (places.length > 0) {
          // 매칭되는 장소 찾기
          const matchingPlace = this.findMatchingPlace(places, storeInfo);
          
          if (matchingPlace && matchingPlace.id) {
            console.log(`✅ allSearch API 성공: ${matchingPlace.id}`);
            
            return {
              placeId: matchingPlace.id,
              placeUrl: `https://m.place.naver.com/place/${matchingPlace.id}/home`,
              reviewUrl: `https://m.place.naver.com/place/${matchingPlace.id}/review`,
              confidence: 0.4,
              method: 'allsearch'
            };
          }
        }
      }
      
      console.log('⚠️ allSearch API에서 매칭되는 장소를 찾을 수 없습니다.');
      return null;
      
    } catch (error) {
      console.log(`❌ allSearch API 실패: ${error.message}`);
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
   * 네이버 지도 URL 생성
   * @param {string} placeId - Place ID
   * @returns {string} 네이버 지도 URL
   */
  createMapUrl(placeId) {
    return `https://map.naver.com/p/api/search?query=${encodeURIComponent(placeId)}&type=place&page=1&display=10`;
  }

  /**
   * 좌표 기반 네이버 지도 URL 생성
   * @param {string} mapx - X 좌표
   * @param {string} mapy - Y 좌표
   * @param {string} storeName - 매장명
   * @returns {string} 네이버 지도 URL
   */
  createMapUrlByCoordinates(mapx, mapy, storeName) {
    return `https://map.naver.com/p/api/search?query=${encodeURIComponent(storeName)}&type=place&page=1&display=10`;
  }

  /**
   * 매장 데이터 개선
   * @param {Object} storeData - 원본 매장 데이터
   * @returns {Object} 개선된 매장 데이터
   */
  enhanceStoreData(storeData) {
    return storeData; // 기존 데이터를 그대로 반환
  }

  /**
   * Place ID 유효성 검증
   * @param {string} placeId - 검증할 Place ID
   * @returns {boolean} 유효성 여부
   */
  validatePlaceId(placeId) {
    // Place ID는 숫자로 구성되어야 합니다.
    return /^[0-9]+$/.test(placeId);
  }

  /**
   * 좌표를 이용한 매장 검색
   * @param {string} mapx - X 좌표
   * @param {string} mapy - Y 좌표
   * @param {string} storeName - 매장명 (선택사항)
   * @returns {Promise<Object>} 검색 결과
   */
  async findStoreByCoordinates(mapx, mapy, storeName = '') {
    try {
      console.log(`🔍 좌표 기반 매장 검색: X=${mapx}, Y=${mapy}`);
      
      // 좌표 기반 네이버 지도 URL 생성
      const mapUrl = this.createMapUrlByCoordinates(mapx, mapy, storeName);
      
      return {
        success: true,
        data: {
          coordinates: { x: mapx, y: mapy },
          storeName: storeName,
          mapUrl: mapUrl,
          coordinateId: `${mapx}_${mapy}`,
          searchedAt: new Date().toISOString()
        },
        message: '좌표 기반 매장 검색이 완료되었습니다.'
      };
      
    } catch (error) {
      console.error('[ERROR] 좌표 기반 매장 검색 실패:', error);
      return {
        success: false,
        error: error.message,
        message: '좌표 기반 매장 검색 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 통합 매장 검색 및 Place ID 추출
   * @param {string} query - 검색어
   * @param {number} selectedIndex - 선택된 매장 인덱스
   * @returns {Promise<Object>} 통합 검색 결과
   */
  async findStoreWithPlaceId(query, selectedIndex = 0) {
    try {
      console.log(`🔍 해커톤용 통합 매장 검색: "${query}" (선택 인덱스: ${selectedIndex})`);
      
      // 1단계: 매장 검색
      const searchResult = await this.searchStore(query, 10);
      if (!searchResult.success) {
        return searchResult;
      }
      
      const stores = searchResult.data;
      if (stores.length === 0) {
        return {
          success: false,
          error: '검색 결과가 없습니다.',
          message: '검색 결과가 없습니다.'
        };
      }
      
      // 선택된 매장이 범위를 벗어나는 경우 첫 번째 매장 사용
      const selectedStore = stores[selectedIndex] || stores[0];
      console.log(`📍 선택된 매장: ${selectedStore.title} (${selectedStore.address})`);

      // 2단계: 선택된 매장의 좌표로 Place ID 추출
      if (selectedStore.mapx && selectedStore.mapy) {
        console.log('🔍 allSearch API로 Place ID 추출 시도...');
        
        const placeIdResult = await this.extractPlaceId(
          selectedStore
        );
        
        if (placeIdResult.placeId) {
          // Place ID 추출 성공
          selectedStore.placeId = placeIdResult.placeId;
          selectedStore.mapUrl = placeIdResult.placeUrl;
          selectedStore.extractedAt = placeIdResult.extractedAt;
          console.log(`✅ Place ID 추출 성공: ${selectedStore.placeId}`);
        } else {
          // Place ID 추출 실패 시 좌표 기반 임시 ID 생성
          selectedStore.coordinateId = `${selectedStore.mapx}_${selectedStore.mapy}`;
          selectedStore.mapUrl = this.createMapUrlByCoordinates(
            selectedStore.mapx,
            selectedStore.mapy,
            selectedStore.title
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
        message: `${stores.length}개의 매장을 찾았습니다. 선택된 매장: ${selectedStore.title}`
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