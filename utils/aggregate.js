export function aggregate(items) {
  const s = { 긍정: 0, 보통: 0, 부정: 0 }
  const pros = new Map()
  const cons = new Map()

  for (const r of items) {
    if (s[r.감정] != null) s[r.감정]++
    ;(r.장점키워드 || []).forEach(k => pros.set(k, (pros.get(k) || 0) + 1))
    ;(r.단점키워드 || []).forEach(k => cons.set(k, (cons.get(k) || 0) + 1))
  }

  const total = Math.max(1, items.length)
  const sentimentStats = {
    긍정: Math.round((s.긍정 / total) * 100),
    보통: Math.round((s.보통 / total) * 100),
    부정: Math.round((s.부정 / total) * 100)
  }

  const topN = (m) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, ratio: Math.round((count / total) * 100) }))

  return { sentimentStats, pros: topN(pros), cons: topN(cons) }
}
