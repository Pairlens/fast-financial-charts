import type { SyncIndicatorComputeFn } from '../../../types'

export const computePriceChannel: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(2, Number(params.period ?? 20))
  if (bars.length < period) {
    return []
  }

  const values: Array<{
    ts: number
    upper: number
    middle: number
    lower: number
  }> = []

  for (let index = period - 1; index < bars.length; index += 1) {
    let highest = -Infinity
    let lowest = Infinity

    for (let j = index - period + 1; j <= index; j += 1) {
      highest = Math.max(highest, bars[j].high)
      lowest = Math.min(lowest, bars[j].low)
    }

    values.push({
      ts: bars[index].ts,
      upper: highest,
      lower: lowest,
      middle: (highest + lowest) / 2,
    })
  }

  return values
}
