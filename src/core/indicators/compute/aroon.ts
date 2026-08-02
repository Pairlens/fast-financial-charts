import type { SyncIndicatorComputeFn } from '../../../types'

export const computeAroon: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(2, Number(params.period ?? 25))
  if (bars.length <= period) {
    return []
  }

  const values: Array<{ ts: number; aroonUp: number; aroonDown: number }> = []

  for (let index = period; index < bars.length; index += 1) {
    let highestIdx = index - period
    let lowestIdx = index - period

    for (let j = index - period; j <= index; j += 1) {
      if (bars[j].high >= bars[highestIdx].high) {
        highestIdx = j
      }
      if (bars[j].low <= bars[lowestIdx].low) {
        lowestIdx = j
      }
    }

    const daysSinceHigh = index - highestIdx
    const daysSinceLow = index - lowestIdx

    values.push({
      ts: bars[index].ts,
      aroonUp: ((period - daysSinceHigh) / period) * 100,
      aroonDown: ((period - daysSinceLow) / period) * 100,
    })
  }

  return values
}
