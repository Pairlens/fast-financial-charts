import type { SyncIndicatorComputeFn } from '../../../types'

export const computeWilliamsR: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(2, Number(params.period ?? 14))
  if (bars.length < period) {
    return []
  }

  const values: Array<{ ts: number; value: number }> = []

  for (let index = period - 1; index < bars.length; index += 1) {
    let highest = -Infinity
    let lowest = Infinity
    for (let j = index - period + 1; j <= index; j += 1) {
      highest = Math.max(highest, bars[j].high)
      lowest = Math.min(lowest, bars[j].low)
    }
    const range = highest - lowest
    values.push({
      ts: bars[index].ts,
      value: range === 0 ? -50 : ((highest - bars[index].close) / range) * -100,
    })
  }

  return values
}
