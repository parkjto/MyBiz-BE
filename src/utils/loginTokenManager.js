// 간단한 로그인 토큰 매니저
// 메모리 기반으로 로그아웃된 토큰을 관리

class LoginTokenManager {
  constructor() {
    // 로그아웃된 토큰들을 저장하는 Set
    this.blacklistedTokens = new Set();
    
    // 24시간마다 만료된 토큰 정리 (선택사항)
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 24 * 60 * 60 * 1000);
  }

  // 토큰을 블랙리스트에 추가 (로그아웃 시)
  addToBlacklist(token) {
    if (token) {
      this.blacklistedTokens.add(token);
      console.log('토큰이 블랙리스트에 추가되었습니다.');
    }
  }

  // 토큰이 블랙리스트에 있는지 확인
  isBlacklisted(token) {
    return this.blacklistedTokens.has(token);
  }

  // 블랙리스트에서 토큰 제거 (선택사항)
  removeFromBlacklist(token) {
    this.blacklistedTokens.delete(token);
  }

  // 만료된 토큰 정리 (선택사항)
  cleanupExpiredTokens() {
    // 현재는 단순한 구현이므로 모든 토큰을 유지
    // 필요시 JWT 만료시간 체크 로직 추가 가능
    console.log('토큰 블랙리스트 정리 완료');
  }

  // 블랙리스트 상태 확인 (디버깅용)
  getBlacklistStatus() {
    return {
      totalBlacklistedTokens: this.blacklistedTokens.size,
      isActive: true
    };
  }
}

// 싱글톤 인스턴스 생성
const loginTokenManager = new LoginTokenManager();

module.exports = loginTokenManager;
