import type { SyncIndicatorComputeFn } from '../../../types'

export const computeWilliamsFractal: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(2, Number(params.period ?? 2))

  if (bars.length < 2 * period + 1) {
    return []
  }

  const values: Array<{ ts: number; up: number; down: number }> = []

  for (let index = period; index < bars.length - period; index += 1) {
    let isUpFractal = true
    let isDownFractal = true

    for (let j = 1; j <= period; j += 1) {
      if (
        bars[index].high <= bars[index - j].high ||
        bars[index].high <= bars[index + j].high
      ) {
        isUpFractal = false
      }
      if (
        bars[index].low >= bars[index - j].low ||
        bars[index].low >= bars[index + j].low
      ) {
        isDownFractal = false
      }
    }

    values.push({
      ts: bars[index].ts,
      up: isUpFractal ? bars[index].high : NaN,
      down: isDownFractal ? bars[index].low : NaN,
    })
  }

  return values
}
