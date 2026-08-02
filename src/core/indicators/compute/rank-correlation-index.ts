import type { SyncIndicatorComputeFn } from '../../../types'

function averageRanks(values: Array<number>): Array<number> {
  const n = values.length
  const indexed = values.map((v, i) => ({ v, i }))
  indexed.sort((a, b) => a.v - b.v)

  const ranks = new Array<number>(n)
  let pos = 0

  while (pos < n) {
    let end = pos + 1
    while (end < n && indexed[end].v === indexed[pos].v) {
      end += 1
    }

    // Average rank for ties (1-based)
    const avgRank = (pos + 1 + end) / 2
    for (let k = pos; k < end; k += 1) {
      ranks[indexed[k].i] = avgRank
    }

    pos = end
  }

  return ranks
}

export const computeRankCorrelationIndex: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(2, Number(params.period ?? 14))
  if (bars.length < period) {
    return []
  }

  const values: Array<{ ts: number; value: number }> = []

  for (let i = period - 1; i < bars.length; i += 1) {
    const closes: Array<number> = []
    for (let j = i - period + 1; j <= i; j += 1) {
      closes.push(bars[j].close)
    }

    const priceRanks = averageRanks(closes)
    const n = period
    let sumD2 = 0

    for (let k = 0; k < n; k += 1) {
      const timeRank = k + 1
      const d = priceRanks[k] - timeRank
      sumD2 += d * d
    }

    const rho = 1 - (6 * sumD2) / (n * (n * n - 1))
    values.push({
      ts: bars[i].ts,
      value: rho * 100,
    })
  }

  return values
}
