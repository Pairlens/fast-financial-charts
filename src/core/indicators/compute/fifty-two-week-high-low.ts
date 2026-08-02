import type { SyncIndicatorComputeFn } from '../../../types'

export const computeFiftyTwoWeekHighLow: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(1, Number(params.period ?? 252))
  if (bars.length < period) {
    return []
  }

  const values: Array<{
    ts: number
    upper: number
    lower: number
    middle: number
  }> = []

  for (let i = period - 1; i < bars.length; i += 1) {
    let upper = -Infinity
    let lower = Infinity

    for (let j = i - period + 1; j <= i; j += 1) {
      if (bars[j].high > upper) upper = bars[j].high
      if (bars[j].low < lower) lower = bars[j].low
    }

    values.push({
      ts: bars[i].ts,
      upper,
      lower,
      middle: (upper + lower) / 2,
    })
  }

  return values
}
