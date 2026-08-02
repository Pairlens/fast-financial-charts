import type { SyncIndicatorComputeFn } from '../../../types'

export const computeMovingAverageChannel: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(1, Number(params.period ?? 20))

  if (bars.length < period) return []

  const values: Array<{
    ts: number
    upper: number
    lower: number
    basis: number
  }> = []

  let highSum = 0
  let lowSum = 0

  for (let i = 0; i < bars.length; i += 1) {
    highSum += bars[i].high
    lowSum += bars[i].low

    if (i >= period) {
      highSum -= bars[i - period].high
      lowSum -= bars[i - period].low
    }

    if (i >= period - 1) {
      const upper = highSum / period
      const lower = lowSum / period

      values.push({
        ts: bars[i].ts,
        upper,
        lower,
        basis: (upper + lower) / 2,
      })
    }
  }

  return values
}
