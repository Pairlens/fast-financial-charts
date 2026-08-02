import type { SyncIndicatorComputeFn } from '../../../types'

export const computeVWMA: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(1, Number(params.period ?? 20))
  if (bars.length < period) {
    return []
  }

  const values: Array<{ ts: number; value: number }> = []

  for (let index = period - 1; index < bars.length; index += 1) {
    let sumPriceVolume = 0
    let sumVolume = 0
    for (let j = index - period + 1; j <= index; j += 1) {
      sumPriceVolume += bars[j].close * bars[j].volume
      sumVolume += bars[j].volume
    }
    values.push({
      ts: bars[index].ts,
      value: sumVolume === 0 ? bars[index].close : sumPriceVolume / sumVolume,
    })
  }

  return values
}
