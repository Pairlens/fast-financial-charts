import type { SyncIndicatorComputeFn } from '../../../types'

export const computeChoppinessIndex: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(2, Number(params.period ?? 14))
  if (bars.length <= period) {
    return []
  }

  const values: Array<{ ts: number; value: number }> = []

  for (let index = period; index < bars.length; index += 1) {
    let atrSum = 0
    let highest = -Infinity
    let lowest = Infinity

    for (let j = index - period + 1; j <= index; j += 1) {
      const tr = Math.max(
        bars[j].high - bars[j].low,
        Math.abs(bars[j].high - bars[j - 1].close),
        Math.abs(bars[j].low - bars[j - 1].close),
      )
      atrSum += tr
      highest = Math.max(highest, bars[j].high)
      lowest = Math.min(lowest, bars[j].low)
    }

    const range = highest - lowest
    const ci =
      range === 0 ? 50 : (100 * Math.log10(atrSum / range)) / Math.log10(period)

    values.push({
      ts: bars[index].ts,
      value: Math.max(0, Math.min(100, ci)),
    })
  }

  return values
}
