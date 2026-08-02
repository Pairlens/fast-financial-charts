import type { SyncIndicatorComputeFn } from '../../../types'

export const computeTrendStrengthIndex: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(1, Number(params.period ?? 14))
  if (bars.length < period + 1) {
    return []
  }

  const values: Array<{ ts: number; value: number }> = []

  for (let i = period; i < bars.length; i += 1) {
    let upCount = 0

    for (let j = i - period + 1; j <= i; j += 1) {
      if (bars[j].close > bars[j - 1].close) {
        upCount += 1
      }
    }

    values.push({
      ts: bars[i].ts,
      value: (upCount / period) * 100,
    })
  }

  return values
}
