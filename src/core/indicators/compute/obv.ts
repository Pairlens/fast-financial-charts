import type { SyncIndicatorComputeFn } from '../../../types'

export const computeOBV: SyncIndicatorComputeFn = ({ bars }) => {
  if (bars.length === 0) {
    return []
  }

  let obv = 0
  const values: Array<{ ts: number; value: number }> = [
    { ts: bars[0].ts, value: 0 },
  ]

  for (let index = 1; index < bars.length; index += 1) {
    if (bars[index].close > bars[index - 1].close) {
      obv += bars[index].volume
    } else if (bars[index].close < bars[index - 1].close) {
      obv -= bars[index].volume
    }
    values.push({ ts: bars[index].ts, value: obv })
  }

  return values
}
