import { AdBlockerService } from './adBlockerService.js';
import delay from 'delay';

export class PopupHandlerService {
  
  static async setupPopupInterceptor(page) {
    // 1. 새 창(팝업) 차단
    page.on('popup', async (newPage) => {
      console.log('[INFO] 팝업 창 감지 및 차단');
      await newPage.close();
    });
    
    // 2. JavaScript alert/confirm 처리
    page.on('dialog', async (dialog) => {
      console.log('[INFO] 다이얼로그 감지:', dialog.message());
      await dialog.dismiss(); // 또는 dialog.accept()
    });
    
    // 3. DOM 변화 모니터링 (새로운 모달 등장 감지)
    await page.evaluateOnNewDocument(() => {
      // MutationObserver로 DOM 변화 감시
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element 노드
              // 팝업/광고 패턴 체크
              const isAd = (
                node.className?.includes('popup') ||
                node.className?.includes('modal') ||
                node.className?.includes('ad') ||
                node.className?.includes('광고') ||
                window.getComputedStyle(node).position === 'fixed'
              );
              
              if (isAd) {
                console.log('[INFO] 실시간 광고/팝업 감지:', node.className);
                // 즉시 제거 또는 닫기 버튼 클릭
                window.removePopupElement(node);
              }
            }
          });
        });
      });
      
      // 전체 문서 감시 시작
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // 팝업 제거 함수 전역 등록
      window.removePopupElement = (element) => {
        try {
          // 닫기 버튼 찾기
          const closeBtn = element.querySelector(`
            .close, .btn-close, [class*="닫기"], 
            button[aria-label="닫기"], .x-button
          `);
          
          if (closeBtn) {
            closeBtn.click();
          } else {
            element.remove();
          }
        } catch (error) {
          console.warn('[WARN] 팝업 제거 실패:', error);
        }
      };
    });
  }
  
  static async handleUnexpectedPopups(page, maxAttempts = 3) {
    let attempt = 0;
    
    while (attempt < maxAttempts) {
      try {
        // 현재 페이지 광고 검사
        const ads = await AdBlockerService.detectAds(page);
        
        if (ads && ads.length > 0) {
          console.log(`[INFO] ${ads.length}개 광고/팝업 감지 (시도 ${attempt + 1})`);
          
          // 모달/팝업 우선 처리 (클릭 차단 요소)
          const blockingAds = ads.filter(ad => ad.isModal);
          if (blockingAds.length > 0) {
            await AdBlockerService.removeAds(page, blockingAds);
            await delay(1000); // 제거 후 안정화
          }
          
          // 일반 광고 제거
          const remainingAds = ads.filter(ad => !ad.isModal);
          if (remainingAds.length > 0) {
            await AdBlockerService.removeAds(page, remainingAds);
          }
        }
        
        // 페이지 안정화 확인
        const isStable = await this.checkPageStability(page);
        if (isStable) {
          console.log('[INFO] 페이지 안정화 완료');
          break;
        }
        
        attempt++;
        await delay(2000);
        
      } catch (error) {
        console.warn(`[WARN] 팝업 처리 시도 ${attempt + 1} 실패:`, error.message);
        attempt++;
      }
    }
    
    if (attempt >= maxAttempts) {
      console.warn('[WARN] 최대 시도 횟수 초과, 팝업이 남아있을 수 있음');
    }
  }
  
  static async checkPageStability(page) {
    return await page.evaluate(() => {
      // 안정성 체크 조건들
      const checks = [
        // 1. 로딩 완료
        document.readyState === 'complete',
        
        // 2. 모달/팝업이 화면을 덮고 있지 않음
        !document.querySelector(`
          [style*="position: fixed"][style*="z-index"],
          .modal[style*="display: block"],
          .popup[style*="display: block"]
        `),
        
        // 3. 클릭 가능한 요소들이 접근 가능
        document.querySelectorAll('button, a, input').length > 0
      ];
      
      return checks.every(check => check);
    });
  }
  
  // 스마트플레이스 초기 진입 시 잦은 이벤트/배너 팝업을 우선적으로 닫는다
  static async closeSmartPlaceEntryPopups(page, rounds = 4, waitMs = 350) {
    for (let i = 0; i < rounds; i++) {
      try {
        await page.evaluate(() => {
          const normalize = (s) => (s || '').replace(/\s+/g, '').trim();
          const all = Array.from(document.querySelectorAll('*'));
          // "일주일 동안 보지 않기" 체크
          const notSee = all.find(el => normalize(el.textContent || '').includes('일주일동안보지않기'))
            || all.find(el => normalize(el.textContent || '').includes('일주일동안보지않기')); // 중복 안전
          if (notSee) {
            const cb = notSee.querySelector('input[type="checkbox"]') || document.querySelector('input[type="checkbox"]');
            if (cb) (cb).click();
          }
          // 닫기 버튼 패턴들
          const closeSelectors = [
            'button[aria-label="닫기"]', 'button[title="닫기"]', '[class*="close"]', '[class*="Close"]', '.btn-close',
            'button[aria-label*="close" i]', 'button:has(svg)', '[role="button"]:has(svg)'
          ];
          for (const sel of closeSelectors) {
            const btns = document.querySelectorAll(sel);
            if (btns && btns.length) { (btns[0]).dispatchEvent(new MouseEvent('click', { bubbles: true })); break; }
          }
          // 고정 오버레이 제거 (광고 배너성)
          const overlays = Array.from(document.querySelectorAll('div, section, aside'))
            .filter(el => {
              const st = window.getComputedStyle(el);
              return st.position === 'fixed' && (parseInt(st.zIndex || '0', 10) >= 1000 || st.backdropFilter || (st.backgroundColor || '').includes('rgba'));
            });
          overlays.forEach(el => { try { el.remove(); } catch(_) {} });
          document.body.style.overflow = 'auto';
        });
      } catch (_) {}
      try { await this.handleUnexpectedPopups(page, 1); } catch (_) {}
      await delay(waitMs);
    }
  }
}
