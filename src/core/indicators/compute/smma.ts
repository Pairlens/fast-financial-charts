import type { SyncIndicatorComputeFn } from '../../../types'

export const computeSMMA: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(1, Number(params.period ?? 7))
  if (bars.length < period) {
    return []
  }

  let smma = 0
  for (let index = 0; index < period; index += 1) {
    smma += bars[index].close
  }
  smma /= period

  const values: Array<{ ts: number; value: number }> = [
    {
      ts: bars[period - 1].ts,
      value: smma,
    },
  ]

  for (let index = period; index < bars.length; index += 1) {
    smma = (smma * (period - 1) + bars[index].close) / period

    values.push({
      ts: bars[index].ts,
      value: smma,
    })
  }

  return values
}
