import type { SyncIndicatorComputeFn } from '../../../types'

export const computeFisherTransform: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(2, Number(params.period ?? 9))
  if (bars.length < period) {
    return []
  }

  let prevFisher = 0
  let prevValue = 0
  const values: Array<{ ts: number; value: number; signal: number }> = []

  for (let index = period - 1; index < bars.length; index += 1) {
    let highest = -Infinity
    let lowest = Infinity
    for (let j = index - period + 1; j <= index; j += 1) {
      const midPrice = (bars[j].high + bars[j].low) / 2
      highest = Math.max(highest, midPrice)
      lowest = Math.min(lowest, midPrice)
    }

    const midPrice = (bars[index].high + bars[index].low) / 2
    const range = highest - lowest
    const rawValue = range === 0 ? 0 : ((midPrice - lowest) / range - 0.5) * 2

    // Smooth and clamp
    const smoothed = Math.max(
      -0.999,
      Math.min(0.999, 0.66 * rawValue + 0.67 * prevValue),
    )
    const fisher =
      0.5 * Math.log((1 + smoothed) / (1 - smoothed)) + 0.5 * prevFisher

    values.push({
      ts: bars[index].ts,
      value: fisher,
      signal: prevFisher,
    })

    prevValue = smoothed
    prevFisher = fisher
  }

  return values
}
