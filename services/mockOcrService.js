/**
 * 실제 이미지 파일 없이도 테스트할 수 있는 모킹 OCR 서비스
 * OCR → GPT → DB 저장 플로우를 완전히 테스트할 수 있습니다.
 */

class MockOcrService {
  constructor() {
    console.log('[INFO] MockOcrService 초기화 완료');
  }

  /**
   * 모킹된 OCR 텍스트 반환
   */
  async processImage(imagePath) {
    console.log(`[DEBUG] Mock OCR 처리 시작: ${imagePath}`);
    
    // 이미지 경로에 따라 다른 텍스트 반환
    if (imagePath.includes('positive')) {
      return this.getPositiveReviewText();
    } else if (imagePath.includes('negative')) {
      return this.getNegativeReviewText();
    } else if (imagePath.includes('mixed')) {
      return this.getMixedReviewText();
    } else {
      return this.getDefaultReviewText();
    }
  }

  /**
   * 긍정적인 리뷰 텍스트
   */
  getPositiveReviewText() {
    return `
    리뷰 작성자: 김철수
    작성일: 2024.01.15
    
    정말 맛있는 음식점이었습니다!
    음식이 정말 맛있고 서비스도 친절합니다.
    분위기도 좋고 깔끔해서 편안하게 식사할 수 있었어요.
    가격도 합리적이고 양도 충분합니다.
    다음에 또 방문하고 싶어요!
    
    장점: 맛있음, 친절, 깔끔, 편안, 합리적
    단점: 없음
    `;
  }

  /**
   * 부정적인 리뷰 텍스트
   */
  getNegativeReviewText() {
    return `
    리뷰 작성자: 박민수
    작성일: 2024.01.13
    
    기대했던 것과 많이 달랐습니다.
    음식이 너무 짜고 직원들이 불친절했습니다.
    대기시간도 길고 분위기도 별로였어요.
    가격도 비싸고 양도 적습니다.
    다시는 안 갈 것 같아요.
    
    장점: 없음
    단점: 짜다, 불친절, 대기시간, 비싸다, 적다
    `;
  }

  /**
   * 혼재된 리뷰 텍스트
   */
  getMixedReviewText() {
    return `
    리뷰 작성자: 이영희
    작성일: 2024.01.14
    
    전반적으로 괜찮았습니다.
    가격대비 괜찮고 분위기도 좋습니다.
    음식 맛은 보통이지만 서비스는 친절해요.
    다만 대기시간이 좀 길었고 좌석이 좁습니다.
    한 번쯤은 방문해볼 만합니다.
    
    장점: 가격대비, 분위기, 친절
    단점: 대기시간, 좁다
    `;
  }

  /**
   * 기본 리뷰 텍스트
   */
  getDefaultReviewText() {
    return `
    리뷰 작성자: 홍길동
    작성일: 2024.01.16
    
    평범한 식당이었습니다.
    음식 맛은 보통이고 서비스도 보통입니다.
    특별한 장점이나 단점은 없어요.
    가격도 적당하고 분위기도 보통입니다.
    필요할 때 방문할 수 있는 곳입니다.
    
    장점: 없음
    단점: 없음
    `;
  }

  /**
   * 긴 이미지 분할 처리 모킹
   */
  async _processImageWithSplitting(filePath) {
    console.log(`[DEBUG] Mock 이미지 분할 처리: ${filePath}`);
    const text = await this.processImage(filePath);
    return text + '\n\n(긴 이미지 분할 처리 완료)';
  }

  /**
   * 회색 글씨 최적화 모킹
   */
  async optimizeForGrayText(filePath) {
    console.log(`[DEBUG] Mock 회색 글씨 최적화: ${filePath}`);
    const text = await this.processImage(filePath);
    return text + '\n\n(회색 글씨 최적화 완료)';
  }

  /**
   * 서비스 정리
   */
  async cleanup() {
    console.log('[INFO] MockOcrService 정리 완료');
  }

  /**
   * 설정 조회
   */
  getConfig() {
    return {
      service: 'MockOcrService',
      status: 'active',
      mode: 'mock',
      features: [
        'OCR 텍스트 생성 모킹',
        '다양한 리뷰 타입 지원',
        '긴 이미지 분할 모킹',
        '회색 글씨 최적화 모킹'
      ]
    };
  }
}

export default MockOcrService;
