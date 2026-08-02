import type { SyncIndicatorComputeFn } from '../../../types'

export const computeSMA: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(1, Number(params.period ?? 20))
  const values: Array<{ ts: number; value: number }> = []

  if (bars.length < period) {
    return values
  }

  let rollingSum = 0

  for (let index = 0; index < bars.length; index += 1) {
    rollingSum += bars[index].close

    if (index >= period) {
      rollingSum -= bars[index - period].close
    }

    if (index >= period - 1) {
      values.push({
        ts: bars[index].ts,
        value: rollingSum / period,
      })
    }
  }

  return values
}
