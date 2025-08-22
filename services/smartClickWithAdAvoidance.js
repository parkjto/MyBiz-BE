import { AdBlockerService } from './adBlockerService.js';
import { PopupHandlerService } from './popupHandlerService.js';
import delay from 'delay';

export class SmartClickWithAdAvoidance {
  
  static async clickWithAdHandling(page, target) {
    console.log('[INFO] 광고 회피 클릭 시작');
    
    // 1단계: 클릭 전 광고 정리
    await PopupHandlerService.handleUnexpectedPopups(page);
    
    // 2단계: 목표 요소 찾기
    const targetElement = await this.findTargetElement(page, target);
    if (!targetElement) {
      throw new Error('목표 요소를 찾을 수 없습니다');
    }
    
    // 3단계: 요소 주변 광고 체크
    const nearbyAds = await this.checkNearbyAds(page, targetElement);
            if (nearbyAds.length > 0) {
          console.log(`[WARN] 목표 요소 주변에 ${nearbyAds.length}개 광고 감지`);
          await AdBlockerService.removeAds(page, nearbyAds);
          await delay(1000);
        }
    
    // 4단계: 안전한 클릭 실행
    const clickResult = await this.performSafeClick(page, targetElement);
    
    // 5단계: 클릭 후 광고 처리
    await delay(2000); // 페이지 변화 대기
    await PopupHandlerService.handleUnexpectedPopups(page);
    
    return clickResult;
  }
  
  static async findTargetElement(page, targetInfo) {
    const strategies = [
      // 전략 1: href 속성으로 찾기
      async () => {
        if (targetInfo.href) {
          return await page.$(`a[href="${targetInfo.href}"]`);
        }
        return null;
      },
      
      // 전략 2: 클래스명으로 찾기
      async () => {
        if (targetInfo.className) {
          return await page.$(`.${targetInfo.className}`);
        }
        return null;
      },
      
      // 전략 3: 텍스트 내용으로 찾기
      async () => {
        if (targetInfo.text) {
          return await page.evaluate((text) => {
            const allElements = document.querySelectorAll('a, button, div, span');
            for (const el of allElements) {
              if (el.textContent?.trim().includes(text) && 
                  el.offsetParent !== null) {
                return el;
              }
            }
            return null;
          }, targetInfo.text);
        }
        return null;
      },
      
      // 전략 4: CSS 선택자로 찾기
      async () => {
        if (targetInfo.selector) {
          return await page.$(targetInfo.selector);
        }
        return null;
      }
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        const element = await strategies[i]();
        if (element) {
          console.log(`[INFO] 요소 발견 (전략 ${i + 1})`);
          return element;
        }
              } catch (error) {
          console.warn(`[WARN] 전략 ${i + 1} 실패:`, error.message);
        }
    }

    return null;
  }
  
  static async checkNearbyAds(page, targetElement) {
    return await page.evaluate((target) => {
      const nearbyAds = [];
      const targetRect = target.getBoundingClientRect();
      
      // 목표 요소 주변 범위 (50px 여유)
      const searchArea = {
        left: targetRect.left - 50,
        top: targetRect.top - 50,
        right: targetRect.right + 50,
        bottom: targetRect.bottom + 50
      };
      
      // 광고 요소들 체크
      const adSelectors = ['.ad', '.popup', '.modal', '[class*="광고"]'];
      adSelectors.forEach(selector => {
        const ads = document.querySelectorAll(selector);
        ads.forEach(ad => {
          if (ad.offsetParent !== null) {
            const adRect = ad.getBoundingClientRect();
            
            // 겹치는 영역 체크
            const isOverlapping = !(
              adRect.right < searchArea.left ||
              adRect.left > searchArea.right ||
              adRect.bottom < searchArea.top ||
              adRect.top > searchArea.bottom
            );
            
            if (isOverlapping) {
              nearbyAds.push({
                element: ad,
                selector,
                rect: adRect
              });
            }
          }
        });
      });
      
      return nearbyAds;
    }, targetElement);
  }
  
  static async performSafeClick(page, targetElement) {
    const clickMethods = [
      // 방법 1: 기본 클릭 (광고 체크 포함)
      async () => {
        // 클릭 직전 광고 재확인
        const lastMinuteAds = await AdBlockerService.detectAds(page);
        const blockingAds = lastMinuteAds ? lastMinuteAds.filter(ad => ad.isModal) : [];
        
        if (blockingAds && blockingAds.length > 0) {
          await AdBlockerService.removeAds(page, blockingAds);
          await delay(500);
        }
        
        await targetElement.click();
        return { method: 'basic', success: true };
      },
      
      // 방법 2: JavaScript 클릭 (광고 무시)
      async () => {
        await page.evaluate((el) => {
          // 광고 레이어 임시 숨김
          const overlays = document.querySelectorAll(`
            [style*="position: fixed"], .popup, .modal, .overlay
          `);
          overlays.forEach(overlay => {
            overlay.style.display = 'none';
          });
          
          el.click();
          
          // 광고 레이어 복원 (필요시)
          setTimeout(() => {
            overlays.forEach(overlay => {
              overlay.style.display = '';
            });
          }, 100);
          
        }, targetElement);
        
        return { method: 'javascript', success: true };
      },
      
      // 방법 3: 좌표 클릭 (정확한 위치)
      async () => {
        const box = await targetElement.boundingBox();
        if (!box) throw new Error('요소의 위치를 가져올 수 없습니다');
        
        // 광고가 덮고 있어도 강제 클릭
        await page.mouse.click(
          box.x + box.width / 2, 
          box.y + box.height / 2,
          { button: 'left' }
        );
        
        return { method: 'coordinate', success: true };
      }
    ];
    
    // 각 방법 순차 시도
    for (let i = 0; i < clickMethods.length; i++) {
      try {
        console.log(`[INFO] 클릭 방법 ${i + 1} 시도`);
        const result = await clickMethods[i]();
        console.log(`[INFO] 클릭 성공: ${result.method}`);
        return result;
        
              } catch (error) {
          console.warn(`[WARN] 클릭 방법 ${i + 1} 실패:`, error.message);
          if (i === clickMethods.length - 1) {
            throw new Error('모든 클릭 방법 실패');
          }
        }
    }
  }
}
