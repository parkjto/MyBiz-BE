/**
 * 스토어 컨트롤러
 * 7단계 플로우: 검색 → 선택 → Place ID 추출 → 상태 확인 → 저장 → 크롤링 → AI 분석
 */

const NaverLocalService = require('../services/naverLocalService');
const PlaceIdExtractionService = require('../services/placeIdExtractionService');
const ReviewCrawlerService = require('../services/reviewCrawlerService');
const supabase = require('../utils/supabaseClient');

class StoresController {
  constructor() {
    console.log('[DEBUG] StoresController constructor 시작');
    
    this.naverLocalService = new NaverLocalService();
    this.placeIdService = new PlaceIdExtractionService();
    this.reviewCrawler = new ReviewCrawlerService();
    
    // 메서드들을 this에 바인딩
    this.searchStores = this.searchStores.bind(this);
    this.selectStore = this.selectStore.bind(this);
    this.extractPlaceId = this.extractPlaceId.bind(this);
    this.getPlaceIdExtractionStatus = this.getPlaceIdExtractionStatus.bind(this);
    this.saveStore = this.saveStore.bind(this);
    this.crawlReviews = this.crawlReviews.bind(this);
    this.analyzeReviews = this.analyzeReviews.bind(this);
    this.executeFullFlow = this.executeFullFlow.bind(this);
    
    console.log('[DEBUG] StoresController constructor 완료');
  }

  // ===== 1단계: 매장 검색 =====
  async searchStores(req, res) {
    try {
      const { query, display = 10 } = req.body;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: '검색어를 입력해주세요.'
        });
      }

      console.log(`[INFO] 1단계 - 매장 검색 시작: "${query}"`);
      
      // 네이버 로컬 API로 검색
      const searchResult = await this.naverLocalService.searchStore(query, display);
      
      if (!searchResult.success) {
        return res.status(500).json({
          success: false,
          message: '매장 검색에 실패했습니다.',
          error: searchResult.error
        });
      }

      return res.json({
        success: true,
        data: {
          query: query,
          totalCount: searchResult.data.length,
          stores: searchResult.data,
          searchedAt: new Date().toISOString()
        },
        message: `${searchResult.data.length}개의 매장을 찾았습니다.`
      });

    } catch (error) {
      console.error('[ERROR] 매장 검색 실패:', error);
      return res.status(500).json({
        success: false,
        message: '매장 검색 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }

  // ===== 2단계: 사용자 매장 선택 =====
  async selectStore(req, res) {
    try {
      const { selectedIndex } = req.body;
      
      if (selectedIndex === undefined || selectedIndex < 0) {
        return res.status(400).json({
          success: false,
          message: '유효한 매장 인덱스를 선택해주세요.'
        });
      }

      // 세션에서 검색 결과를 가져오거나, 임시로 저장된 검색 결과 사용
      // 실제 구현에서는 세션 관리나 임시 저장소를 사용해야 함
      const searchResults = req.session?.searchResults || [];
      
      if (selectedIndex >= searchResults.length) {
        return res.status(400).json({
          success: false,
          message: '선택한 인덱스가 검색 결과 범위를 벗어났습니다.'
        });
      }

      const selectedStore = searchResults[selectedIndex];
      
      console.log(`[INFO] 2단계 - 매장 선택: "${selectedStore.title}" (인덱스: ${selectedIndex})`);

      return res.json({
        success: true,
        data: {
          selectedStore: selectedStore,
          selectedIndex: selectedIndex,
          selectedAt: new Date().toISOString()
        },
        message: `매장이 선택되었습니다: ${selectedStore.title}`
      });

    } catch (error) {
      console.error('[ERROR] 매장 선택 실패:', error);
      return res.status(500).json({
        success: false,
        message: '매장 선택 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }

  // ===== 3단계: Place ID 추출 (다단계 시도) =====
  async extractPlaceId(req, res) {
    try {
      const { storeData } = req.body;
      
      if (!storeData || !storeData.title) {
        return res.status(400).json({
          success: false,
          message: '매장 정보가 필요합니다.'
        });
      }

      console.log(`[INFO] 3단계 - Place ID 추출 시작: "${storeData.title}"`);
      
      // 다단계 Place ID 추출 시도
      const extractionSteps = [];
      
      // 2-1단계: 스크래핑 방식
      try {
        console.log('[STEP 2-1] 스크래핑 방식 시도...');
        const scrapingResult = await this.placeIdService.trySearchScraping(storeData);
        if (scrapingResult && scrapingResult.placeId) {
          extractionSteps.push({
            step: '2-1',
            method: '스크래핑',
            success: true,
            placeId: scrapingResult.placeId
          });
          
          return res.json({
            success: true,
            data: {
              placeId: scrapingResult.placeId,
              placeUrl: scrapingResult.placeUrl,
              reviewUrl: scrapingResult.reviewUrl,
              extractionMethod: 'scraping',
              extractionSteps: extractionSteps,
              successRate: 0.85,
              confidence: 0.85,
              extractedAt: new Date().toISOString()
            },
            message: `Place ID를 성공적으로 추출했습니다: ${scrapingResult.placeId} (스크래핑 방식)`
          });
        } else {
          extractionSteps.push({
            step: '2-1',
            method: '스크래핑',
            success: false,
            error: '스크래핑 실패'
          });
        }
      } catch (error) {
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
        const allSearchResult = await this.placeIdService.tryAllSearchAPI(storeData);
        if (allSearchResult && allSearchResult.placeId) {
          extractionSteps.push({
            step: '2-2',
            method: 'allSearch API',
            success: true,
            placeId: allSearchResult.placeId
          });
          
          return res.json({
            success: true,
            data: {
              placeId: allSearchResult.placeId,
              placeUrl: allSearchResult.placeUrl,
              reviewUrl: allSearchResult.reviewUrl,
              extractionMethod: 'allsearch',
              extractionSteps: extractionSteps,
              successRate: 0.4,
              confidence: 0.4,
              extractedAt: new Date().toISOString()
            },
            message: `Place ID를 성공적으로 추출했습니다: ${allSearchResult.placeId} (allSearch API 방식)`
          });
        } else {
          extractionSteps.push({
            step: '2-2',
            method: 'allSearch API',
            success: false,
            error: 'allSearch API 실패'
          });
        }
      } catch (error) {
        extractionSteps.push({
          step: '2-2',
          method: 'allSearch API',
          success: false,
          error: error.message
        });
      }

      // 2-3단계: 수동 확인 안내
      extractionSteps.push({
        step: '2-3',
        method: '수동 확인',
        success: false,
        manualSteps: [
          '1. https://map.naver.com 접속',
          `2. "${storeData.title} ${storeData.address || ''}" 검색`,
          '3. 검색 결과에서 해당 매장 클릭',
          '4. URL에서 /place/숫자 부분 확인'
        ]
      });

      return res.status(404).json({
        success: false,
        data: {
          extractionSteps: extractionSteps,
          manualSteps: [
            '1. https://map.naver.com 접속',
            `2. "${storeData.title} ${storeData.address || ''}" 검색`,
            '3. 검색 결과에서 해당 매장 클릭',
            '4. URL에서 /place/숫자 부분 확인'
          ],
          method: 'manual',
          successRate: 1.0
        },
        message: '자동 추출에 실패했습니다. 수동으로 확인해주세요.'
      });

    } catch (error) {
      console.error('[ERROR] Place ID 추출 실패:', error);
      return res.status(500).json({
        success: false,
        message: 'Place ID 추출 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }

  // ===== 4단계: Place ID 추출 상태 확인 =====
  async getPlaceIdExtractionStatus(req, res) {
    try {
      const status = this.placeIdService.getSystemStatus();
      
      return res.json({
        success: true,
        data: {
          methods: {
            "2-1": {
              name: "스크래핑",
              successRate: status.methods.scraping.successRate,
              description: status.methods.scraping.description
            },
            "2-2": {
              name: "allSearch API",
              successRate: status.methods.allsearch.successRate,
              description: status.methods.allsearch.description
            },
            "2-3": {
              name: "수동 확인",
              successRate: status.methods.manual.successRate,
              description: status.methods.manual.description
            }
          },
          overallSuccessRate: status.overallSuccessRate,
          lastUpdated: status.lastUpdated
        },
        message: 'Place ID 추출 시스템 상태 확인 완료'
      });

    } catch (error) {
      console.error('[ERROR] 상태 확인 실패:', error);
      return res.status(500).json({
        success: false,
        message: '상태 확인 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }

  // ===== 5단계: 매장 정보 저장 =====
  async saveStore(req, res) {
    try {
      const { storeData } = req.body;
      
      if (!storeData || !storeData.title) {
        return res.status(400).json({
          success: false,
          message: '매장 정보가 필요합니다.'
        });
      }

      console.log(`[INFO] 5단계 - 매장 저장 시작: "${storeData.title}"`);
      
      const storeToSave = {
        store_name: storeData.title ? storeData.title.replace(/<[^>]+>/g, '') : '',
        address: storeData.address,
        road_address: storeData.roadAddress,
        phone: storeData.telephone,
        category: storeData.category,
        coordinates_x: storeData.mapx,
        coordinates_y: storeData.mapy,
        place_id: storeData.placeId,
        map_url: storeData.placeUrl,
        coordinate_id: null,
        manual_check_url: storeData.reviewUrl,
        is_primary: false,
        is_verified: false,
        extracted_at: storeData.placeId ? new Date().toISOString() : null
        // created_at, updated_at은 Supabase가 자동으로 처리
      };

      const { data, error } = await supabase
        .from('stores')
        .insert([storeToSave])
        .select()
        .single();

      if (error) {
        console.error('[ERROR] DB 저장 실패:', error);
        return res.status(500).json({
          success: false,
          message: '매장 저장에 실패했습니다.',
          error: error.message
        });
      }

      console.log(`[INFO] 5단계 - 매장 저장 완료: ID ${data.id}`);

      return res.json({
        success: true,
        data: {
          storeId: data.id,
          store: {
            id: data.id,
            name: data.store_name,
            place_id: data.place_id
          },
          savedAt: new Date().toISOString()
        },
        message: '매장 정보가 성공적으로 저장되었습니다.'
      });

    } catch (error) {
      console.error('[ERROR] 매장 저장 실패:', error);
      return res.status(500).json({
        success: false,
        message: '매장 저장 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }

  // ===== 6단계: 리뷰 크롤링 요청 =====
  async crawlReviews(req, res) {
    try {
      const { storeId, level = 'basic' } = req.body;
      
      if (!storeId) {
        return res.status(400).json({
          success: false,
          message: '매장 ID가 필요합니다.'
        });
      }

      console.log(`[INFO] 6단계 - 리뷰 크롤링 시작: 매장 ID ${storeId}, 레벨 ${level}`);
      
      // 저장된 매장 정보 조회
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (storeError || !store) {
        return res.status(404).json({
          success: false,
          message: '매장을 찾을 수 없습니다.',
          error: storeError?.message
        });
      }

      let placeId = store.place_id;
      if (!placeId) {
        // Place ID가 없으면 추출 시도
        const placeIdResult = await this.placeIdService.extractPlaceId({
          name: store.store_name,
          address: store.address,
          district: store.category
        });
        placeId = placeIdResult.placeId;
      }

      if (!placeId) {
        return res.status(400).json({
          success: false,
          message: 'Place ID를 찾을 수 없습니다.'
        });
      }

      // 크롤링 실행
      let crawlingResult;
      switch (level) {
        case 'basic':
          crawlingResult = await this.reviewCrawler.crawlBasicLevel(placeId);
          break;
        case 'intermediate':
          crawlingResult = await this.reviewCrawler.crawlIntermediateLevel(placeId);
          break;
        case 'advanced':
          crawlingResult = await this.reviewCrawler.crawlAdvancedLevel(placeId);
          break;
        default:
          crawlingResult = await this.reviewCrawler.crawlBasicLevel(placeId);
      }

      if (!crawlingResult.success) {
        return res.status(500).json({
          success: false,
          message: '리뷰 크롤링에 실패했습니다.',
          error: crawlingResult.error
        });
      }

      // 크롤링 결과 저장
      const reviewData = {
        store_id: storeId,
        place_id: placeId,
        level: level,
        reviews: crawlingResult.data.reviews,
        total_count: crawlingResult.data.reviews.length,
        analysis_level: crawlingResult.data.level,
        accuracy: crawlingResult.data.accuracy,
        crawled_at: new Date().toISOString()
        // created_at은 Supabase가 자동으로 처리
      };

      const { data: savedReview, error: reviewError } = await supabase
        .from('reviews')
        .insert([reviewData])
        .select()
        .single();

      if (reviewError) {
        console.error('[ERROR] 리뷰 저장 실패:', reviewError);
        return res.status(500).json({
          success: false,
          message: '리뷰 저장에 실패했습니다.',
          error: reviewError.message
        });
      }

      console.log(`[INFO] 6단계 - 리뷰 크롤링 완료: ${crawlingResult.data.reviews.length}개 리뷰`);

      return res.json({
        success: true,
        data: {
          reviewId: savedReview.id,
          storeId: storeId,
          placeId: placeId,
          level: level,
          reviews: crawlingResult.data.reviews,
          totalCount: crawlingResult.data.reviews.length,
          crawledAt: new Date().toISOString()
        },
        message: `${crawlingResult.data.reviews.length}개의 리뷰를 성공적으로 크롤링했습니다.`
      });

    } catch (error) {
      console.error('[ERROR] 리뷰 크롤링 실패:', error);
      return res.status(500).json({
        success: false,
        message: '리뷰 크롤링 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }

  // ===== 7단계: AI 분석 =====
  async analyzeReviews(req, res) {
    try {
      const { reviewId } = req.body;
      
      if (!reviewId) {
        return res.status(400).json({
          success: false,
          message: '리뷰 ID가 필요합니다.'
        });
      }

      console.log(`[INFO] 7단계 - AI 분석 시작: 리뷰 ID ${reviewId}`);
      
      // 크롤링된 리뷰 조회
      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', reviewId)
        .single();

      if (reviewError || !review) {
        return res.status(404).json({
          success: false,
          message: '리뷰를 찾을 수 없습니다.',
          error: reviewError?.message
        });
      }

      // AI 분석 수행
      const analysisResult = await this.performAIAnalysis(review.reviews);
      
      // 분석 결과 저장
      const analysisData = {
        review_id: reviewId,
        store_id: review.store_id,
        sentiment_overall: analysisResult.sentiment.overall,
        sentiment_positive: analysisResult.sentiment.positive,
        sentiment_negative: analysisResult.sentiment.negative,
        keywords: analysisResult.keywords,
        satisfaction_score: analysisResult.satisfactionScore,
        improvement_points: analysisResult.improvementPoints,
        summary: analysisResult.summary,
        analyzed_at: new Date().toISOString()
        // created_at은 Supabase가 자동으로 처리
      };

      const { data: savedAnalysis, error: analysisError } = await supabase
        .from('review_analyses')
        .insert([analysisData])
        .select()
        .single();

      if (analysisError) {
        console.error('[ERROR] 분석 결과 저장 실패:', analysisError);
        return res.status(500).json({
          success: false,
          message: '분석 결과 저장에 실패했습니다.',
          error: analysisError.message
        });
      }

      console.log(`[INFO] 7단계 - AI 분석 완료: 분석 ID ${savedAnalysis.id}`);

      return res.json({
        success: true,
        data: {
          analysisId: savedAnalysis.id,
          reviewId: reviewId,
          storeId: review.store_id,
          sentiment: analysisResult.sentiment,
          keywords: analysisResult.keywords,
          satisfactionScore: analysisResult.satisfactionScore,
          improvementPoints: analysisResult.improvementPoints,
          summary: analysisResult.summary,
          analyzedAt: new Date().toISOString()
        },
        message: '리뷰 AI 분석이 완료되었습니다.'
      });

    } catch (error) {
      console.error('[ERROR] AI 분석 실패:', error);
      return res.status(500).json({
        success: false,
        message: 'AI 분석 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }

  // ===== 전체 플로우 실행 =====
  async executeFullFlow(req, res) {
    try {
      const { query, selectedStoreIndex = 0, level = 'basic' } = req.body;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: '검색어를 입력해주세요.'
        });
      }

      console.log(`[INFO] 전체 플로우 시작: "${query}" (선택 인덱스: ${selectedStoreIndex})`);
      
      // 1단계: 매장 검색
      console.log(`[STEP 1] 매장 검색 시작...`);
      const searchResult = await this.searchStoresInternal(query);
      if (!searchResult.success) {
        return res.status(500).json(searchResult);
      }
      
      const stores = searchResult.data.stores;
      if (stores.length === 0) {
        return res.status(404).json({
          success: false,
          message: '검색 결과가 없습니다.'
        });
      }
      
      // 선택된 매장이 범위를 벗어나는 경우 첫 번째 매장 사용
      const selectedStore = stores[selectedStoreIndex] || stores[0];
      console.log(`[STEP 1] 매장 검색 완료: ${stores.length}개 결과, 선택된 매장: ${selectedStore.title}`);
      
      // 2단계: 매장 선택 (세션에 저장)
      console.log(`[STEP 2] 매장 선택 완료: ${selectedStore.title}`);
      
      // 3단계: Place ID 추출
      console.log(`[STEP 3] Place ID 추출 시작...`);
      const placeIdResult = await this.extractPlaceIdInternal(selectedStore);
      if (!placeIdResult.success) {
        return res.status(500).json(placeIdResult);
      }
      
      console.log(`[STEP 3] Place ID 추출 완료: ${placeIdResult.data.placeId}`);
      
      // 5단계: 매장 저장
      console.log(`[STEP 5] 매장 저장 시작...`);
      const saveResult = await this.saveStoreInternal({
        ...selectedStore,
        placeId: placeIdResult.data.placeId,
        placeUrl: placeIdResult.data.placeUrl,
        reviewUrl: placeIdResult.data.reviewUrl
      });
      if (!saveResult.success) {
        return res.status(500).json(saveResult);
      }
      
      console.log(`[STEP 5] 매장 저장 완료: ID ${saveResult.data.storeId}`);
      
      // 6단계: 리뷰 크롤링
      console.log(`[STEP 6] 리뷰 크롤링 시작...`);
      const reviewResult = await this.crawlReviewsInternal(saveResult.data.storeId, level);
      if (!reviewResult.success) {
        return res.status(500).json(reviewResult);
      }
      
      console.log(`[STEP 6] 리뷰 크롤링 완료: ${reviewResult.data.reviews.length}개 리뷰`);
      
      // 7단계: AI 분석
      console.log(`[STEP 7] AI 분석 시작...`);
      const analysisResult = await this.analyzeReviewsInternal(reviewResult.data.reviewId);
      if (!analysisResult.success) {
        return res.status(500).json(analysisResult);
      }
      
      console.log(`[STEP 7] AI 분석 완료`);
      
      console.log(`[SUCCESS] 전체 플로우 완료: 매장 ID ${saveResult.data.storeId}`);
      
      return res.json({
        success: true,
        data: {
          searchResult: {
            query: query,
            totalCount: stores.length,
            selectedStore: selectedStore,
            selectedStoreIndex: selectedStoreIndex
          },
          storeId: saveResult.data.storeId,
          reviewId: reviewResult.data.reviewId,
          analysisId: analysisResult.data.analysisId,
          analysis: analysisResult.data,
          completedAt: new Date().toISOString()
        },
        message: '전체 플로우가 성공적으로 완료되었습니다.'
      });

    } catch (error) {
      console.error('[ERROR] 전체 플로우 실패:', error);
      return res.status(500).json({
        success: false,
        message: '전체 플로우 실행 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }

  // ===== 내부 메서드들 (전체 플로우용) =====
  async searchStoresInternal(query) {
    const searchResult = await this.naverLocalService.searchStore(query, 10);
    if (!searchResult.success) {
      return { success: false, error: searchResult.error };
    }
    
    return {
      success: true,
      data: {
        query: query,
        totalCount: searchResult.data.length,
        stores: searchResult.data
      }
    };
  }

  async extractPlaceIdInternal(storeData) {
    const result = await this.placeIdService.extractPlaceId({
      name: storeData.title,
      address: storeData.address,
      district: storeData.category
    });
    
    if (result.placeId) {
      return {
        success: true,
        data: {
          placeId: result.placeId,
          placeUrl: result.placeUrl,
          reviewUrl: result.reviewUrl
        }
      };
    } else {
      return {
        success: false,
        error: 'Place ID 추출에 실패했습니다.'
      };
    }
  }

  async saveStoreInternal(storeData) {
    const storeToSave = {
      store_name: storeData.title ? storeData.title.replace(/<[^>]+>/g, '') : '',
      address: storeData.address,
      road_address: storeData.roadAddress,
      phone: storeData.telephone,
      category: storeData.category,
      coordinates_x: storeData.mapx,
      coordinates_y: storeData.mapy,
      place_id: storeData.placeId,
      map_url: storeData.placeUrl,
      coordinate_id: null,
      manual_check_url: storeData.reviewUrl,
      is_primary: false,
      is_verified: false,
      extracted_at: storeData.placeId ? new Date().toISOString() : null
      // created_at, updated_at은 Supabase가 자동으로 처리
    };

    const { data, error } = await supabase
      .from('stores')
      .insert([storeToSave])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { storeId: data.id, store: data }
    };
  }

  async crawlReviewsInternal(storeId, level) {
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return { success: false, error: '매장을 찾을 수 없습니다.' };
    }

    let placeId = store.place_id;
    if (!placeId) {
      const placeIdResult = await this.placeIdService.extractPlaceId({
        name: store.store_name,
        address: store.address,
        district: store.category
      });
      placeId = placeIdResult.placeId;
    }

    if (!placeId) {
      return { success: false, error: 'Place ID를 찾을 수 없습니다.' };
    }

    let crawlingResult;
    switch (level) {
      case 'basic':
        crawlingResult = await this.reviewCrawler.crawlBasicLevel(placeId);
        break;
      case 'intermediate':
        crawlingResult = await this.reviewCrawler.crawlIntermediateLevel(placeId);
        break;
      case 'advanced':
        crawlingResult = await this.reviewCrawler.crawlAdvancedLevel(placeId);
        break;
      default:
        crawlingResult = await this.reviewCrawler.crawlBasicLevel(placeId);
    }

    if (!crawlingResult.success) {
      return { success: false, error: crawlingResult.error };
    }

    const reviewData = {
      store_id: storeId,
      place_id: placeId,
      level: level,
      reviews: crawlingResult.data.reviews,
      total_count: crawlingResult.data.reviews.length,
      analysis_level: crawlingResult.data.level,
      accuracy: crawlingResult.data.accuracy,
      crawled_at: new Date().toISOString()
      // created_at은 Supabase가 자동으로 처리
    };

    const { data: savedReview, error: reviewError } = await supabase
      .from('reviews')
      .insert([reviewData])
      .select()
      .single();

    if (reviewError) {
      return { success: false, error: reviewError.message };
    }

    return {
      success: true,
      data: {
        reviewId: savedReview.id,
        storeId: storeId,
        placeId: placeId,
        level: level,
        reviews: crawlingResult.data.reviews,
        totalCount: crawlingResult.data.reviews.length
      }
    };
  }

  async analyzeReviewsInternal(reviewId) {
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return { success: false, error: '리뷰를 찾을 수 없습니다.' };
    }

    const analysisResult = await this.performAIAnalysis(review.reviews);
    
    const analysisData = {
      review_id: reviewId,
      store_id: review.store_id,
      sentiment_overall: analysisResult.sentiment.overall,
      sentiment_positive: analysisResult.sentiment.positive,
      sentiment_negative: analysisResult.sentiment.negative,
      keywords: analysisResult.keywords,
      satisfaction_score: analysisResult.satisfactionScore,
      improvement_points: analysisResult.improvementPoints,
      summary: analysisResult.summary,
      analyzed_at: new Date().toISOString()
      // created_at은 Supabase가 자동으로 처리
    };

    const { data: savedAnalysis, error: analysisError } = await supabase
      .from('review_analyses')
      .insert([analysisData])
      .select()
      .single();

    if (analysisError) {
      return { success: false, error: analysisError.message };
    }

    return {
      success: true,
      data: {
        analysisId: savedAnalysis.id,
        reviewId: reviewId,
        storeId: review.store_id,
        sentiment: analysisResult.sentiment,
        keywords: analysisResult.keywords,
        satisfactionScore: analysisResult.satisfactionScore,
        improvementPoints: analysisResult.improvementPoints,
        summary: analysisResult.summary
      }
    };
  }

  // ===== AI 분석 헬퍼 메서드들 =====
  async performAIAnalysis(reviews) {
    const allText = reviews.map(review => review.content).join(' ');
    
    return {
      sentiment: this.analyzeSentiment(allText),
      keywords: this.extractKeywords(allText),
      satisfactionScore: this.calculateSatisfactionScore(reviews),
      improvementPoints: this.extractImprovementPoints(reviews),
      summary: `리뷰 분석 결과, 전반적으로 ${this.analyzeSentiment(allText).overall} 평가를 받고 있습니다.`
    };
  }

  extractKeywords(text) {
    // 간단한 키워드 추출 로직 (실제로는 더 정교한 AI 모델 사용)
    const commonKeywords = ['맛', '서비스', '친절', '깔끔', '위생', '가격', '분위기', '위치'];
    const foundKeywords = commonKeywords.filter(keyword => 
      text.includes(keyword)
    );
    return foundKeywords.length > 0 ? foundKeywords : ['서비스', '품질', '만족도'];
  }

  analyzeSentiment(text) {
    // 간단한 감성 분석 로직 (실제로는 더 정교한 AI 모델 사용)
    const positiveWords = ['좋', '맛있', '친절', '깔끔', '만족', '추천'];
    const negativeWords = ['나쁘', '별로', '실망', '불친절', '더럽'];
    
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      return { overall: '긍정적', positive: positiveCount, negative: negativeCount };
    } else if (negativeCount > positiveCount) {
      return { overall: '부정적', positive: positiveCount, negative: negativeCount };
    } else {
      return { overall: '중립적', positive: positiveCount, negative: negativeCount };
    }
  }

  calculateSatisfactionScore(reviews) {
    // 간단한 만족도 점수 계산 (실제로는 더 정교한 알고리즘 사용)
    const totalReviews = reviews.length;
    if (totalReviews === 0) return 50;
    
    const positiveReviews = reviews.filter(review => 
      this.analyzeSentiment(review.content).overall === '긍정적'
    ).length;
    
    return Math.round((positiveReviews / totalReviews) * 100);
  }

  extractImprovementPoints(reviews) {
    // 개선점 추출 로직 (실제로는 더 정교한 AI 모델 사용)
    const improvementKeywords = ['느리', '비싸', '작', '덜', '부족'];
    const improvementPoints = [];
    
    reviews.forEach(review => {
      improvementKeywords.forEach(keyword => {
        if (review.content.includes(keyword) && !improvementPoints.includes(keyword)) {
          improvementPoints.push(keyword);
        }
      });
    });
    
    return improvementPoints.length > 0 ? improvementPoints : ['서비스 개선'];
  }
}

module.exports = StoresController; 