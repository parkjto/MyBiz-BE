/**
 * Place ID 추출 통합 서비스
 * 모든 Place ID 추출 로직을 하나의 서비스로 통합
 */

const axios = require('axios');

class PlaceIdExtractionService {
  constructor() {
    this.successRates = {
      allsearch: 0.3,
      scraping: 0.8,
      manual: 1.0
    };
  }

  /**
   * 통합 Place ID 추출 메서드
   * @param {Object} storeInfo - 매장 정보
   * @returns {Promise<Object>} 추출 결과
   */
  async extractPlaceId(storeInfo) {
    console.log(`🔍 ${storeInfo.name} Place ID 추출 시작...`);
    
    // 방법 1: 네이버 검색 스크래핑 (가장 안정적)
    try {
      const scrapingResult = await this.trySearchScraping(storeInfo);
      if (scrapingResult && scrapingResult.placeId) {
        console.log(`✅ 스크래핑 성공: ${scrapingResult.placeId}`);
        return {
          ...scrapingResult,
          extractionMethod: 'scraping',
          successRate: this.successRates.scraping,
          extractedAt: new Date().toISOString()
        };
      }
    } catch (error) {
      console.log(`❌ 스크래핑 실패: ${error.message}`);
    }

    // 방법 2: allSearch API (빠르지만 제한적)
    try {
      const allSearchResult = await this.tryAllSearchAPI(storeInfo);
      if (allSearchResult && allSearchResult.placeId) {
        console.log(`✅ allSearch 성공: ${allSearchResult.placeId}`);
        return {
          ...allSearchResult,
          extractionMethod: 'allsearch',
          successRate: this.successRates.allsearch,
          extractedAt: new Date().toISOString()
        };
      }
    } catch (error) {
      console.log(`❌ allSearch 실패: ${error.message}`);
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
      successRate: this.successRates.manual,
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * 네이버 검색 스크래핑으로 Place ID 추출
   * @param {Object} storeInfo - 매장 정보
   * @returns {Promise<Object|null>} 추출 결과
   */
  async trySearchScraping(storeInfo) {
    try {
      const searchQuery = `${storeInfo.name} ${storeInfo.district || ''}`.trim();
      console.log(`🔍 네이버 검색 스크래핑: "${searchQuery}"`);
      
      const searchUrl = `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(searchQuery)}&sm=top_hty&fbm=0&ie=utf8`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        timeout: 10000
      });
      
      if (response.status === 200) {
        const html = response.data;
        
        // Place ID 패턴 검색
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
      console.log(`❌ 스크래핑 실패: ${error.message}`);
      return null;
    }
  }

  /**
   * allSearch API로 Place ID 추출
   * @param {Object} storeInfo - 매장 정보
   * @returns {Promise<Object|null>} 추출 결과
   */
  async tryAllSearchAPI(storeInfo) {
    const searchPatterns = [
      storeInfo.name,
      `${storeInfo.name} ${storeInfo.district || ''}`,
      storeInfo.address || ''
    ].filter(pattern => pattern.trim().length > 0);
    
    console.log(`🔍 allSearch API 시도:`, searchPatterns);
    
    for (const pattern of searchPatterns) {
      try {
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
              'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
            },
            timeout: 5000
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
        console.log(`⚠️ allSearch 패턴 실패: ${error.message}`);
        continue;
      }
    }
    
    return null;
  }

  /**
   * 매칭되는 장소 찾기
   * @param {Array} places - 장소 목록
   * @param {Object} storeInfo - 매장 정보
   * @returns {Object|null} 매칭된 장소
   */
  findMatchingPlace(places, storeInfo) {
    const storeName = storeInfo.name.toLowerCase();
    const storeAddress = (storeInfo.address || '').toLowerCase();
    
    for (const place of places) {
      const placeName = (place.name || '').toLowerCase();
      const placeAddress = (place.address || '').toLowerCase();
      
      // 이름 매칭 확인
      if (placeName.includes(storeName) || storeName.includes(placeName)) {
        return place;
      }
      
      // 주소 매칭 확인
      if (placeAddress.includes(storeAddress) || storeAddress.includes(placeAddress)) {
        return place;
      }
    }
    
    return null;
  }

  /**
   * Place ID 검증
   * @param {string} placeId - 검증할 Place ID
   * @returns {Promise<Object>} 검증 결과
   */
  async validatePlaceId(placeId) {
    try {
      const placeUrl = `https://m.place.naver.com/place/${placeId}/home`;
      
      const response = await axios.get(placeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 5000
      });
      
      const isValid = response.status === 200;
      
      return {
        isValid,
        placeId,
        placeUrl,
        reviewUrl: `https://m.place.naver.com/place/${placeId}/review`,
        storeInfo: {
          name: isValid ? '검증된 매장' : '알 수 없음',
          address: isValid ? '주소 정보는 별도 조회 필요' : '알 수 없음'
        }
      };
      
    } catch (error) {
      return {
        isValid: false,
        placeId,
        placeUrl: `https://m.place.naver.com/place/${placeId}/home`,
        reviewUrl: `https://m.place.naver.com/place/${placeId}/review`,
        storeInfo: {
          name: '알 수 없음',
          address: '알 수 없음'
        }
      };
    }
  }

  /**
   * 지연 함수
   * @param {number} ms - 지연 시간 (밀리초)
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 시스템 상태 반환
   * @returns {Object} 시스템 상태
   */
  getSystemStatus() {
    return {
      methods: {
        scraping: {
          successRate: this.successRates.scraping,
          description: '네이버 검색 스크래핑'
        },
        allsearch: {
          successRate: this.successRates.allsearch,
          description: '네이버 지도 allSearch API'
        },
        manual: {
          successRate: this.successRates.manual,
          description: '수동 확인'
        }
      },
      overallSuccessRate: 0.8,
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = PlaceIdExtractionService; 