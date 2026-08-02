import type { SyncIndicatorComputeFn } from '../../../types'

export const computeCMF: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(2, Number(params.period ?? 20))
  if (bars.length < period) {
    return []
  }

  const mfv = bars.map((bar) => {
    const range = bar.high - bar.low
    const mfm =
      range === 0 ? 0 : (bar.close - bar.low - (bar.high - bar.close)) / range
    return mfm * bar.volume
  })

  const values: Array<{ ts: number; value: number }> = []

  for (let index = period - 1; index < bars.length; index += 1) {
    let sumMfv = 0
    let sumVolume = 0
    for (let j = index - period + 1; j <= index; j += 1) {
      sumMfv += mfv[j]
      sumVolume += bars[j].volume
    }
    values.push({
      ts: bars[index].ts,
      value: sumVolume === 0 ? 0 : sumMfv / sumVolume,
    })
  }

  return values
}
