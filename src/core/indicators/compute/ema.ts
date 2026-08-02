import type { SyncIndicatorComputeFn } from '../../../types'

export const computeEMA: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(1, Number(params.period ?? 20))
  if (bars.length < period) {
    return []
  }

  const multiplier = 2 / (period + 1)
  let ema =
    bars.slice(0, period).reduce((sum, bar) => sum + bar.close, 0) / period

  const values = [
    {
      ts: bars[period - 1].ts,
      value: ema,
    },
  ]

  for (let index = period; index < bars.length; index += 1) {
    ema = bars[index].close * multiplier + ema * (1 - multiplier)

    values.push({
      ts: bars[index].ts,
      value: ema,
    })
  }

  return values
}
