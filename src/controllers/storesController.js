const NaverLocalService = require('../services/naverLocalService');
const PlaceIdExtractionService = require('../services/placeIdExtractionService');

class StoresController {
  constructor() {
    console.log('🔧 StoresController 생성자 호출');
    
    // naverLocalService 인스턴스 생성
    this.naverLocalService = new NaverLocalService();
    
    // 통합 Place ID 추출 서비스 생성
    this.placeIdService = new PlaceIdExtractionService();
    
    // 메서드들을 this에 바인딩
    this.searchStores = this.searchStores.bind(this);
    this.extractPlaceId = this.extractPlaceId.bind(this);
    this.findStoreByQuery = this.findStoreByQuery.bind(this);
    this.findStoreWithSelection = this.findStoreWithSelection.bind(this);
    this.extractPlaceIdByCoordinates = this.extractPlaceIdByCoordinates.bind(this);
    this.extractPlaceIdForSelectedStore = this.extractPlaceIdForSelectedStore.bind(this);
    this.manualPlaceIdCheck = this.manualPlaceIdCheck.bind(this);
    this.getPlaceIdExtractionStatus = this.getPlaceIdExtractionStatus.bind(this);
    this.validatePlaceId = this.validatePlaceId.bind(this);
  }

  /**
   * 매장 검색
   * @param {Object} req - Express 요청 객체
   * @param {Object} res - Express 응답 객체
   */
  async searchStores(req, res) {
    try {
      const { query, display = 5 } = req.query;
      
      console.log('🔍 매장 검색 요청:', { query, display });
      
      // 필수 파라미터 검증
      if (!query || query.trim() === '') {
        return res.status(400).json({
          success: false,
          error: '검색어가 필요합니다.',
          message: '검색어를 입력해주세요.'
        });
      }

      // 매장 검색 실행
      const result = await this.naverLocalService.searchStore(query.trim(), parseInt(display));
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      
    } catch (error) {
      console.error('❌ 매장 검색 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: '매장 검색 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * Place ID 추출 (통합 서비스 사용)
   * @param {Object} req - Express 요청 객체
   * @param {Object} res - Express 응답 객체
   */
  async extractPlaceId(req, res) {
    try {
      const { name, address, roadAddress, district, x, y } = req.body;
      
      console.log('🔍 Place ID 추출 요청:', { name, address, district });
      
      // 필수 파라미터 검증
      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: '매장명이 필요합니다.',
          message: '매장명을 입력해주세요.'
        });
      }

      // 매장 정보 구성
      const storeInfo = {
        name: name.trim(),
        address: address || '',
        roadAddress: roadAddress || '',
        district: district || '',
        x: x || '',
        y: y || ''
      };

      // 통합 Place ID 추출 서비스 사용
      const result = await this.placeIdService.extractPlaceId(storeInfo);
      
      if (result.placeId) {
        // 성공 응답
        res.status(200).json({
          success: true,
          data: result,
          message: `Place ID를 성공적으로 추출했습니다: ${result.placeId}`
        });
      } else {
        // 실패 응답 (수동 안내 포함)
        res.status(404).json({
          success: false,
          data: result,
          message: '자동 추출에 실패했습니다. 수동으로 확인해주세요.'
        });
      }
      
    } catch (error) {
      console.error('❌ Place ID 추출 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Place ID 추출 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * Place ID 추출 상태 확인
   * @param {Object} req - Express 요청 객체
   * @param {Object} res - Express 응답 객체
   */
  async getPlaceIdExtractionStatus(req, res) {
    try {
      const status = this.placeIdService.getSystemStatus();
      
      res.status(200).json({
        success: true,
        data: status,
        message: 'Place ID 추출 시스템 상태 확인 완료'
      });
      
    } catch (error) {
      console.error('❌ 상태 확인 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: '시스템 상태 확인 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * Place ID 검증
   * @param {Object} req - Express 요청 객체
   * @param {Object} res - Express 응답 객체
   */
  async validatePlaceId(req, res) {
    try {
      const { placeId } = req.body;
      
      console.log('🔍 Place ID 검증 요청:', { placeId });
      
      // 필수 파라미터 검증
      if (!placeId || placeId.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Place ID가 필요합니다.',
          message: 'Place ID를 입력해주세요.'
        });
      }

      // Place ID 검증 실행
      const result = await this.placeIdService.validatePlaceId(placeId.trim());
      
      res.status(200).json({
        success: true,
        data: result,
        message: result.isValid ? 'Place ID가 유효합니다.' : 'Place ID가 유효하지 않습니다.'
      });
      
    } catch (error) {
      console.error('❌ Place ID 검증 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Place ID 검증 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 통합 매장 검색 (검색 + Place ID 추출)
   * @param {Object} req - Express 요청 객체
   * @param {Object} res - Express 응답 객체
   */
  async findStoreByQuery(req, res) {
    try {
      const { query, extractPlaceId = true } = req.body;
      
      console.log('🔍 통합 매장 검색 요청:', { query, extractPlaceId });
      
      // 필수 파라미터 검증
      if (!query || query.trim() === '') {
        return res.status(400).json({
          success: false,
          error: '검색어가 필요합니다.',
          message: '검색어를 입력해주세요.'
        });
      }

      // 통합 매장 검색 실행
      const result = await this.naverLocalService.findStoreByQuery(query.trim(), extractPlaceId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      
    } catch (error) {
      console.error('❌ 통합 매장 검색 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: '매장 검색 중 오류가 발생했습니다.'
      });
    } finally {
      // 브라우저 종료
      await this.naverLocalService.closeBrowser();
    }
  }

  /**
   * 통합 매장 검색 (검색 + 선택된 매장의 Place ID 추출)
   * @param {Object} req - Express 요청 객체
   * @param {Object} res - Express 응답 객체
   */
  async findStoreWithSelection(req, res) {
    try {
      const { query, selectedIndex = 0 } = req.body;
      
      console.log('🔍 통합 매장 검색 요청:', { query, selectedIndex });
      
      // 필수 파라미터 검증
      if (!query || query.trim() === '') {
        return res.status(400).json({
          success: false,
          error: '검색어가 필요합니다.',
          message: '검색어를 입력해주세요.'
        });
      }

      // 통합 매장 검색 실행
      const result = await this.naverLocalService.findStoreWithPlaceId(query.trim(), parseInt(selectedIndex));
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      
    } catch (error) {
      console.error('❌ 해커톤용 통합 매장 검색 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: '매장 검색 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 선택된 매장의 Place ID 추출 (사용자 선택 기반)
   * @param {Object} req - Express 요청 객체
   * @param {Object} res - Express 응답 객체
   */
  async extractPlaceIdForSelectedStore(req, res) {
    try {
      const { query, selectedIndex = 0, extractPlaceId = true } = req.body;
      
      console.log('🔍 선택된 매장 Place ID 추출 요청:', { query, selectedIndex, extractPlaceId });
      
      // 필수 파라미터 검증
      if (!query || query.trim() === '') {
        return res.status(400).json({
          success: false,
          error: '검색어가 필요합니다.',
          message: '검색어를 입력해주세요.'
        });
      }

      // 1단계: 매장 검색
      const searchResult = await this.naverLocalService.searchStore(query.trim(), 10);
      
      if (!searchResult.success || searchResult.data.length === 0) {
        return res.status(400).json({
          success: false,
          error: '매장을 찾을 수 없습니다.',
          message: '검색 결과가 없습니다.'
        });
      }

      const stores = searchResult.data;
      const selectedIndexNum = parseInt(selectedIndex);
      
      // 선택된 인덱스가 범위를 벗어나는 경우 첫 번째 매장 사용
      const selectedStore = stores[selectedIndexNum] || stores[0];
      
      console.log(`📍 선택된 매장: ${selectedStore.name} (${selectedStore.address})`);

      // 2단계: 선택된 매장의 좌표로 Place ID 추출
      let placeIdResult = null;
      
      if (extractPlaceId && selectedStore.coordinates) {
        console.log('🔍 선택된 매장의 좌표로 Place ID 추출 시도...');
        
        placeIdResult = await this.naverLocalService.extractPlaceIdByAllSearch(
          selectedStore.name,
          selectedStore.coordinates.x,
          selectedStore.coordinates.y,
          {
            name: selectedStore.name,
            address: selectedStore.address,
            roadAddress: selectedStore.roadAddress
          }
        );
        
        if (placeIdResult.success) {
          // Place ID 추출 성공
          selectedStore.placeId = placeIdResult.data.placeId;
          selectedStore.mapUrl = placeIdResult.data.mapUrl;
          selectedStore.extractedAt = placeIdResult.data.extractedAt;
          console.log(`✅ Place ID 추출 성공: ${selectedStore.placeId}`);
        } else {
          // Place ID 추출 실패 시 좌표 기반 임시 ID 생성
          selectedStore.coordinateId = `${selectedStore.coordinates.x}_${selectedStore.coordinates.y}`;
          selectedStore.mapUrl = `https://map.naver.com/p/search/${encodeURIComponent(selectedStore.name)}?c=${selectedStore.coordinates.y},${selectedStore.coordinates.x},15,0,0,0,dh`;
          selectedStore.extractedAt = new Date().toISOString();
          selectedStore.manualCheckUrl = `https://map.naver.com/v5/search/${encodeURIComponent(selectedStore.name)}%20${encodeURIComponent(selectedStore.address.split(' ').slice(-2).join(' '))}`;
          console.log(`⚠️ 좌표 기반 임시 ID 생성: ${selectedStore.coordinateId}`);
          console.log(`📝 수동 확인 URL: ${selectedStore.manualCheckUrl}`);
        }
      }

      // 3단계: 결과 반환
      const result = {
        success: true,
        data: {
          selectedStore: selectedStore,
          allStores: stores,
          total: stores.length,
          selectedIndex: selectedIndexNum,
          placeIdExtraction: placeIdResult ? {
            success: placeIdResult.success,
            message: placeIdResult.message
          } : null
        },
        message: `${stores.length}개의 매장을 찾았습니다. 선택된 매장: ${selectedStore.name}`
      };

      if (placeIdResult && placeIdResult.success) {
        result.message += ` (Place ID: ${selectedStore.placeId})`;
      }

      res.status(200).json(result);
      
    } catch (error) {
      console.error('❌ 선택된 매장 Place ID 추출 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Place ID 추출 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 좌표 기반 Place ID 추출 (allSearch API)
   * @param {Object} req - Express 요청 객체
   * @param {Object} res - Express 응답 객체
   */
  async extractPlaceIdByCoordinates(req, res) {
    try {
      const { query, mapx, mapy } = req.body;
      
      console.log('🔍 좌표 기반 Place ID 추출 요청:', { query, mapx, mapy });
      
      // 필수 파라미터 검증
      if (!query || !mapx || !mapy) {
        return res.status(400).json({
          success: false,
          error: '필수 파라미터가 누락되었습니다.',
          message: '매장명과 좌표를 모두 입력해주세요.'
        });
      }

      // 좌표 기반 Place ID 추출 실행
      const result = await this.naverLocalService.extractPlaceIdByAllSearch(
        query.trim(), 
        mapx.toString(), 
        mapy.toString(),
        {
          name: query.trim(),
          address: '',
          roadAddress: ''
        }
      );
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      
    } catch (error) {
      console.error('❌ 좌표 기반 Place ID 추출 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Place ID 추출 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 수동 Place ID 확인 안내
   * @param {Object} req - Express 요청 객체
   * @param {Object} res - Express 응답 객체
   */
  async manualPlaceIdCheck(req, res) {
    try {
      const { query, selectedIndex = 0 } = req.body;
      
      console.log('📝 수동 Place ID 확인 안내 요청:', { query, selectedIndex });
      
      // 필수 파라미터 검증
      if (!query || query.trim() === '') {
        return res.status(400).json({
          success: false,
          error: '검색어가 필요합니다.',
          message: '검색어를 입력해주세요.'
        });
      }

      // 1단계: 매장 검색
      const searchResult = await this.naverLocalService.searchStore(query.trim(), 10);
      
      if (!searchResult.success || searchResult.data.length === 0) {
        return res.status(400).json({
          success: false,
          error: '매장을 찾을 수 없습니다.',
          message: '검색 결과가 없습니다.'
        });
      }

      const stores = searchResult.data;
      const selectedIndexNum = parseInt(selectedIndex);
      
      // 선택된 인덱스가 범위를 벗어나는 경우 첫 번째 매장 사용
      const selectedStore = stores[selectedIndexNum] || stores[0];
      
      console.log(`📍 수동 확인 대상 매장: ${selectedStore.name} (${selectedStore.address})`);

      // 수동 확인 URL 생성
      const searchQuery = `${selectedStore.name} ${selectedStore.address.split(' ').slice(-2).join(' ')}`;
      const searchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(searchQuery)}`;

      // 수동 확인 단계 안내 (더 상세한 버전)
      const manualCheckSteps = [
        `1. ${searchUrl} 접속`,
        `2. '${selectedStore.name}' 검색 결과 확인`,
        `3. 검색 결과에서 '${selectedStore.name}' 클릭`,
        `4. URL에서 /place/숫자 부분 확인 (예: /place/1234567890)`,
        `5. 확인된 Place ID를 개발팀에 전달`,
        `6. 또는 다음 URL들도 시도해보세요:`,
        `   - https://m.place.naver.com/place/숫자/home`,
        `   - https://map.naver.com/p/entry/place/숫자`
      ];

      // Place ID 확인을 위한 추가 정보
      const placeIdInfo = {
        expectedFormat: "숫자로만 구성 (예: 1234567890)",
        urlPatterns: [
          "https://m.place.naver.com/place/{placeId}/home",
          "https://m.place.naver.com/place/{placeId}/review",
          "https://map.naver.com/p/entry/place/{placeId}"
        ],
        verificationSteps: [
          "1. Place ID를 URL에 넣어서 접속 가능한지 확인",
          "2. 매장 정보가 올바른지 확인",
          "3. 리뷰 페이지가 정상적으로 로드되는지 확인"
        ]
      };

      const result = {
        success: true,
        data: {
          storeInfo: {
            name: selectedStore.name,
            address: selectedStore.address,
            roadAddress: selectedStore.roadAddress,
            coordinates: selectedStore.coordinates
          },
          manualCheckSteps: manualCheckSteps,
          placeIdInfo: placeIdInfo,
          searchUrl: searchUrl,
          alternativeUrls: [
            `https://map.naver.com/v5/search/${encodeURIComponent(selectedStore.name)}`,
            `https://map.naver.com/v5/search/${encodeURIComponent(selectedStore.name)}%20${encodeURIComponent(selectedStore.address.split(' ').slice(-1)[0])}`,
            `https://map.naver.com/p/search/${encodeURIComponent(selectedStore.name)}?c=${selectedStore.coordinates.y},${selectedStore.coordinates.x},15,0,0,0,dh`
          ],
          troubleshooting: {
            commonIssues: [
              "Place ID가 숫자가 아닌 경우 → 잘못된 정보입니다",
              "URL 접속이 안 되는 경우 → Place ID가 잘못되었습니다",
              "매장 정보가 다른 경우 → 다른 매장의 Place ID입니다",
              "리뷰 페이지가 없는 경우 → 해당 매장은 리뷰가 없습니다"
            ],
            contactInfo: "개발팀: support@mybiz.com"
          }
        },
        message: `수동 확인 방법을 안내합니다. 매장: ${selectedStore.name}`
      };

      res.status(200).json(result);
      
    } catch (error) {
      console.error('❌ 수동 Place ID 확인 안내 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: '수동 확인 안내 중 오류가 발생했습니다.'
      });
    }
  }
}

module.exports = new StoresController(); 