import type { SyncIndicatorComputeFn } from '../../../types'

export const computeVortexIndicator: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(2, Number(params.period ?? 14))
  if (bars.length <= period) {
    return []
  }

  const values: Array<{ ts: number; plus: number; minus: number }> = []

  for (let index = period; index < bars.length; index += 1) {
    let sumTR = 0
    let sumVMPlus = 0
    let sumVMMinus = 0

    for (let j = index - period + 1; j <= index; j += 1) {
      sumTR += Math.max(
        bars[j].high - bars[j].low,
        Math.abs(bars[j].high - bars[j - 1].close),
        Math.abs(bars[j].low - bars[j - 1].close),
      )
      sumVMPlus += Math.abs(bars[j].high - bars[j - 1].low)
      sumVMMinus += Math.abs(bars[j].low - bars[j - 1].high)
    }

    values.push({
      ts: bars[index].ts,
      plus: sumTR === 0 ? 0 : sumVMPlus / sumTR,
      minus: sumTR === 0 ? 0 : sumVMMinus / sumTR,
    })
  }

  return values
}
