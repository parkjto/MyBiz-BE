const axios = require('axios');
const userModel = require('../models/user');

/**
 * 네이버 플레이스 리뷰 크롤링을 위한 기본 URL 생성
 * @param {string} placeId - 네이버 플레이스 ID
 * @returns {string} 리뷰 페이지 URL
 */
function generateReviewUrl(placeId) {
  return `https://pcmap.place.naver.com/place/${placeId}/review/visitor`;
}

/**
 * 사용자의 place_id 조회
 * @param {string|number} userId - 사용자 ID
 * @returns {Promise<string|null>} place_id 또는 null
 */
async function getUserPlaceId(userId) {
  try {
    const user = await userModel.getUserById(userId);
    return user?.place_id || null;
  } catch (error) {
    console.error('사용자 place_id 조회 실패:', error);
    return null;
  }
}

/**
 * 리뷰 크롤링 준비 상태 확인
 * @param {string|number} userId - 사용자 ID
 * @returns {Promise<object>} 크롤링 준비 상태
 */
async function checkReviewCrawlingReady(userId) {
  try {
    const user = await userModel.getUserById(userId);
    
    if (!user) {
      return {
        ready: false,
        message: '사용자를 찾을 수 없습니다.'
      };
    }

    if (!user.place_id) {
      return {
        ready: false,
        message: '매장 정보가 등록되지 않았습니다. 먼저 매장 정보를 등록해주세요.'
      };
    }

    if (!user.store_info_verified) {
      return {
        ready: false,
        message: '매장 정보가 확인되지 않았습니다. 매장 정보를 확인해주세요.'
      };
    }

    return {
      ready: true,
      placeId: user.place_id,
      storeName: user.store_name,
      reviewUrl: generateReviewUrl(user.place_id),
      message: '리뷰 크롤링 준비 완료'
    };
  } catch (error) {
    console.error('리뷰 크롤링 준비 상태 확인 실패:', error);
    return {
      ready: false,
      message: '서버 오류가 발생했습니다.'
    };
  }
}

/**
 * 리뷰 크롤링 시작 (실제 크롤링 로직은 별도 구현 필요)
 * @param {string|number} userId - 사용자 ID
 * @returns {Promise<object>} 크롤링 결과
 */
async function startReviewCrawling(userId) {
  try {
    // 크롤링 준비 상태 확인
    const readyStatus = await checkReviewCrawlingReady(userId);
    
    if (!readyStatus.ready) {
      return {
        success: false,
        message: readyStatus.message
      };
    }

    // TODO: 실제 리뷰 크롤링 로직 구현
    // 1. Puppeteer 또는 Cheerio를 사용한 웹 스크래핑
    // 2. 리뷰 데이터 파싱 및 저장
    // 3. 크롤링 상태 업데이트

    return {
      success: true,
      message: '리뷰 크롤링이 시작되었습니다.',
      data: {
        placeId: readyStatus.placeId,
        storeName: readyStatus.storeName,
        reviewUrl: readyStatus.reviewUrl,
        status: 'crawling_started'
      }
    };
  } catch (error) {
    console.error('리뷰 크롤링 시작 실패:', error);
    return {
      success: false,
      message: '리뷰 크롤링 시작에 실패했습니다.'
    };
  }
}

/**
 * 크롤링된 리뷰 데이터 조회 (예시)
 * @param {string|number} userId - 사용자 ID
 * @returns {Promise<object>} 리뷰 데이터
 */
async function getCrawledReviews(userId) {
  try {
    const placeId = await getUserPlaceId(userId);
    
    if (!placeId) {
      return {
        success: false,
        message: 'place_id가 없습니다.'
      };
    }

    // TODO: 실제 리뷰 데이터 조회 로직 구현
    // Supabase에서 크롤링된 리뷰 데이터 조회

    return {
      success: true,
      data: {
        placeId,
        reviews: [], // 실제 크롤링된 리뷰 데이터
        totalCount: 0,
        lastCrawledAt: null
      }
    };
  } catch (error) {
    console.error('크롤링된 리뷰 조회 실패:', error);
    return {
      success: false,
      message: '리뷰 데이터 조회에 실패했습니다.'
    };
  }
}

module.exports = {
  getUserPlaceId,
  checkReviewCrawlingReady,
  startReviewCrawling,
  getCrawledReviews,
  generateReviewUrl
}; 