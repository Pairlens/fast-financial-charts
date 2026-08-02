import type { SyncIndicatorComputeFn } from '../../../types'

export const computeATR: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(2, Number(params.period ?? 14))
  if (bars.length <= period) {
    return []
  }

  const trueRanges: Array<number> = []

  for (let index = 1; index < bars.length; index += 1) {
    const current = bars[index]
    const previous = bars[index - 1]
    trueRanges.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close),
      ),
    )
  }

  let atr =
    trueRanges.slice(0, period).reduce((sum, range) => sum + range, 0) / period
  const values: Array<{ ts: number; value: number }> = [
    {
      ts: bars[period].ts,
      value: atr,
    },
  ]

  for (let index = period; index < trueRanges.length; index += 1) {
    atr = (atr * (period - 1) + trueRanges[index]) / period
    values.push({
      ts: bars[index + 1].ts,
      value: atr,
    })
  }

  return values
}
