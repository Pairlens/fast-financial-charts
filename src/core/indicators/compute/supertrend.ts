import { computeATR } from './atr'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeSuperTrend: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(2, Number(params.period ?? 10))
  const multiplier = Math.max(0.1, Number(params.multiplier ?? 3))

  const atrValues = computeATR({ bars, params: { period }, timeframeMs: 0 })
  if (atrValues.length === 0) {
    return []
  }

  const atrMap = new Map(atrValues.map((p) => [p.ts, Number(p.value)]))
  const values: Array<{ ts: number; value: number; direction: number }> = []

  let prevUpper = Infinity
  let prevLower = -Infinity
  let prevDirection = 1

  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index]
    const atr = atrMap.get(bar.ts)
    if (atr === undefined) {
      continue
    }

    const hl2 = (bar.high + bar.low) / 2
    let upper = hl2 + multiplier * atr
    let lower = hl2 - multiplier * atr

    upper =
      upper < prevUpper || bars[index - 1]?.close > prevUpper
        ? upper
        : prevUpper
    lower =
      lower > prevLower || bars[index - 1]?.close < prevLower
        ? lower
        : prevLower

    let direction: number
    if (prevDirection === 1) {
      direction = bar.close < lower ? -1 : 1
    } else {
      direction = bar.close > upper ? 1 : -1
    }

    values.push({
      ts: bar.ts,
      value: direction === 1 ? lower : upper,
      direction,
    })

    prevUpper = upper
    prevLower = lower
    prevDirection = direction
  }

  return values
}
