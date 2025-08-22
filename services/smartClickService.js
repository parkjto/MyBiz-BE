import { logger } from '../utils/logger.js';
import delay from 'delay';

export class SmartClickService {
  
  // 안전한 클릭 구현 - 여러 방법으로 시도
  static async safeClick(page, targetInfo) {
    logger.info('🎯 안전한 클릭 시도:', targetInfo);
    
    // 1단계: 요소 찾기
    const element = await this.findElement(page, targetInfo);
    
    if (!element) {
      throw new Error(`클릭할 요소를 찾을 수 없습니다: ${JSON.stringify(targetInfo)}`);
    }

    // 2단계: 요소 상태 확인
    const elementInfo = await page.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return {
        isVisible: rect.width > 0 && rect.height > 0,
        isEnabled: !el.disabled,
        isClickable: el.offsetParent !== null,
        tagName: el.tagName.toLowerCase(),
        text: el.textContent?.trim(),
        href: el.href || '',
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        }
      };
    }, element);

    logger.info('📊 클릭할 요소 정보:', elementInfo);

    if (!elementInfo.isVisible || !elementInfo.isClickable) {
      throw new Error('요소가 클릭 가능한 상태가 아닙니다');
    }

    // 3단계: 스크롤하여 요소를 화면에 표시
    await page.evaluate((el) => {
      el.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
    }, element);

    await delay(1000); // 스크롤 완료 대기

    // 4단계: 클릭 시도 (여러 방법)
    const clickMethods = [
      // 방법 1: 일반 클릭
      async () => await element.click(),
      
      // 방법 2: JavaScript 클릭
      async () => await page.evaluate((el) => el.click(), element),
      
      // 방법 3: 마우스 위치 클릭
      async () => {
        const box = await element.boundingBox();
        if (box) {
          await page.mouse.click(
            box.x + box.width / 2, 
            box.y + box.height / 2
          );
        }
      },
      
      // 방법 4: 포커스 후 엔터키
      async () => {
        await element.focus();
        await page.keyboard.press('Enter');
      }
    ];

    for (let i = 0; i < clickMethods.length; i++) {
      try {
        logger.info(`🖱️ 클릭 시도 ${i + 1}/4`);
        await clickMethods[i]();
        
        // 클릭 후 변화 확인
        await delay(1500);
        
        logger.info(`✅ 클릭 방법 ${i + 1} 성공`);
        return {
          success: true,
          method: i + 1,
          elementInfo
        };
        
      } catch (error) {
        logger.warn(`❌ 클릭 방법 ${i + 1} 실패:`, error.message);
        if (i === clickMethods.length - 1) {
          throw new Error('모든 클릭 방법이 실패했습니다');
        }
      }
    }
  }

  // 요소 찾기 - 다양한 방법으로 시도
  static async findElement(page, targetInfo) {
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
          logger.info(`✅ 요소 발견 (전략 ${i + 1})`);
          return element;
        }
      } catch (error) {
        logger.warn(`⚠️ 전략 ${i + 1} 실패:`, error.message);
      }
    }

    return null;
  }

  // 텍스트로 요소 찾기 (정확한 매칭)
  static async findByText(page, searchText) {
    return await page.evaluate((text) => {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.textContent?.trim() === text && 
            el.offsetParent !== null) {
          return el;
        }
      }
      return null;
    }, searchText);
  }

  // 부분 텍스트로 요소 찾기
  static async findByPartialText(page, searchText) {
    return await page.evaluate((text) => {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.textContent?.includes(text) && 
            el.offsetParent !== null) {
          return el;
        }
      }
      return null;
    }, searchText);
  }
}
