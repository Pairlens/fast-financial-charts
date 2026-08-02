import type { SyncIndicatorComputeFn } from '../../../types'

export const computeCMO: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(1, Number(params.period ?? 9))
  if (bars.length <= period) {
    return []
  }

  const values: Array<{ ts: number; value: number }> = []

  for (let index = period; index < bars.length; index += 1) {
    let sumGain = 0
    let sumLoss = 0

    for (let j = index - period + 1; j <= index; j += 1) {
      const delta = bars[j].close - bars[j - 1].close
      if (delta > 0) {
        sumGain += delta
      } else {
        sumLoss += Math.abs(delta)
      }
    }

    const total = sumGain + sumLoss
    values.push({
      ts: bars[index].ts,
      value: total === 0 ? 0 : (100 * (sumGain - sumLoss)) / total,
    })
  }

  return values
}
