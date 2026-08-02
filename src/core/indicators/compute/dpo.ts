import { computeSMA } from './sma'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeDPO: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(2, Number(params.period ?? 20))
  const shift = Math.floor(period / 2) + 1

  const sma = computeSMA({ bars, params: { period }, timeframeMs: 0 })
  if (sma.length === 0) {
    return []
  }

  const smaMap = new Map(sma.map((p) => [p.ts, Number(p.value)]))
  const values: Array<{ ts: number; value: number }> = []

  for (let index = 0; index < bars.length; index += 1) {
    const shiftedIndex = index + shift
    if (shiftedIndex >= bars.length) {
      break
    }
    const smaValue = smaMap.get(bars[shiftedIndex]?.ts)
    if (smaValue !== undefined) {
      values.push({
        ts: bars[index].ts,
        value: bars[index].close - smaValue,
      })
    }
  }

  return values
}
