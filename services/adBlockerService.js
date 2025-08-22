export class AdBlockerService {
  
  static async detectAds(page) {
    return await page.evaluate(() => {
      const ads = [];
      
      // 1. 일반적인 광고 선택자들
      const commonAdSelectors = [
        '.ad', '.ads', '.advertisement', '.banner', 
        '[class*="광고"]', '[class*="ad-"]', '[data-ad]',
        '.popup', '.modal', '.overlay', '[role="dialog"]',
        '.interstitial', '.sponsored', '[data-sponsored]'
      ];
      
      commonAdSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.offsetParent !== null) { // 보이는 요소만
            ads.push({
              type: 'common',
              selector,
              element: el,
              rect: el.getBoundingClientRect(),
              zIndex: window.getComputedStyle(el).zIndex,
              isModal: window.getComputedStyle(el).position === 'fixed'
            });
          }
        });
      });
      
      // 2. 네이버 특화 광고 패턴
      const naverAdPatterns = [
        // 네이버 광고 특징
        '[class*="area_ad"]', '[id*="ad_"]', '.ad_area',
        '.banner_area', '.popup_layer', '.layer_popup',
        // 스마트플레이스 특화
        '.smartplace_ad', '[data-module="ad"]',
        '.business_ad', '.place_ad'
      ];
      
      naverAdPatterns.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.offsetParent !== null) {
            ads.push({
              type: 'naver',
              selector,
              element: el,
              rect: el.getBoundingClientRect(),
              isModal: window.getComputedStyle(el).position === 'fixed'
            });
          }
        });
      });
      
      // 3. 의심스러운 요소 휴리스틱 검사
      const suspiciousElements = document.querySelectorAll('*');
      Array.from(suspiciousElements).forEach(el => {
        const style = window.getComputedStyle(el);
        const text = el.textContent?.toLowerCase();
        
        // 광고 의심 조건들
        const isSuspicious = (
          // 위치가 fixed이고 z-index가 높음
          (style.position === 'fixed' && parseInt(style.zIndex) > 1000) ||
          // 광고 관련 텍스트 포함
          (text?.includes('광고') || text?.includes('ad') || text?.includes('sponsored')) ||
          // 크기가 화면 전체를 덮음
          (el.offsetWidth === window.innerWidth && el.offsetHeight === window.innerHeight)
        );
        
        if (isSuspicious && el.offsetParent !== null) {
          ads.push({
            type: 'suspicious',
            element: el,
            reason: '휴리스틱 감지',
            rect: el.getBoundingClientRect(),
            isModal: style.position === 'fixed'
          });
        }
      });
      
      return ads;
    });
  }
  
  static async removeAds(page, ads) {
    const removedCount = await page.evaluate((adList) => {
      let removed = 0;
      
      adList.forEach(ad => {
        try {
          if (ad.element) {
            // 1. 닫기 버튼 찾아서 클릭
            const closeButtons = ad.element.querySelectorAll(`
              .close, .btn-close, [class*="닫기"], [class*="close"],
              button[aria-label="닫기"], button[title="닫기"],
              .x-button, [data-dismiss], .popup-close
            `);
            
            if (closeButtons.length > 0) {
              closeButtons[0].click();
              removed++;
              return;
            }
            
            // 2. 직접 제거
            ad.element.remove();
            removed++;
            
          }
        } catch (error) {
          console.warn('광고 제거 실패:', error);
        }
      });
      
      return removed;
    }, ads);
    
    console.log(`[INFO] 광고 제거 완료: ${removedCount}개`);
    return removedCount;
  }
}
