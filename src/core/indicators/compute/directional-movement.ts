import type { SyncIndicatorComputeFn } from '../../../types'

export const computeDirectionalMovement: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(2, Number(params.period ?? 14))
  if (bars.length <= period) {
    return []
  }

  const trueRanges: Array<number> = []
  const plusDM: Array<number> = []
  const minusDM: Array<number> = []

  for (let i = 1; i < bars.length; i += 1) {
    const curr = bars[i]
    const prev = bars[i - 1]

    trueRanges.push(
      Math.max(
        curr.high - curr.low,
        Math.abs(curr.high - prev.close),
        Math.abs(curr.low - prev.close),
      ),
    )

    const upMove = curr.high - prev.high
    const downMove = prev.low - curr.low

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0)
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0)
  }

  // Seed Wilder smoothing with sum of first `period` values
  let smoothedTR = trueRanges.slice(0, period).reduce((a, b) => a + b, 0)
  let smoothedPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0)
  let smoothedMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0)

  const values: Array<{ ts: number; plusDI: number; minusDI: number }> = []

  for (let i = period; i < trueRanges.length; i += 1) {
    if (i > period) {
      smoothedTR = smoothedTR - smoothedTR / period + trueRanges[i]
      smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDM[i]
      smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDM[i]
    }

    const plusDI = smoothedTR === 0 ? 0 : (smoothedPlusDM / smoothedTR) * 100
    const minusDI = smoothedTR === 0 ? 0 : (smoothedMinusDM / smoothedTR) * 100

    values.push({
      ts: bars[i + 1].ts,
      plusDI,
      minusDI,
    })
  }

  return values
}
