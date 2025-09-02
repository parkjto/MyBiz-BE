export function sanitizeOcr(raw) {
  return String(raw)
    .replace(/[^\S\r\n]+/g, ' ') // 이상 공백
    .replace(/답글 쓰기|담글 쓰기|영수증|결제 내역|방문일|전체|작성일|리뷰 분석|고객 만족도 분석/gi, '')
    .replace(/AD|광고/gi, '')
    .replace(/_{2,}|-{2,}|=+|~+|…+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
