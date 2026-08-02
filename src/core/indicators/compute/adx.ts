import type { SyncIndicatorComputeFn } from '../../../types'

export const computeADX: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(2, Number(params.period ?? 14))
  if (bars.length <= period * 2) {
    return []
  }

  const trueRanges: Array<number> = []
  const plusDM: Array<number> = []
  const minusDM: Array<number> = []

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

    const upMove = current.high - previous.high
    const downMove = previous.low - current.low

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0)
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0)
  }

  // Smoothed sums (Wilder's smoothing)
  let smoothedTR = trueRanges.slice(0, period).reduce((a, b) => a + b, 0)
  let smoothedPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0)
  let smoothedMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0)

  const dxValues: Array<number> = []
  const values: Array<{
    ts: number
    adx: number
    plusDI: number
    minusDI: number
  }> = []

  for (let index = period; index < trueRanges.length; index += 1) {
    if (index > period) {
      smoothedTR = smoothedTR - smoothedTR / period + trueRanges[index]
      smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDM[index]
      smoothedMinusDM =
        smoothedMinusDM - smoothedMinusDM / period + minusDM[index]
    }

    const pdi = smoothedTR === 0 ? 0 : (smoothedPlusDM / smoothedTR) * 100
    const mdi = smoothedTR === 0 ? 0 : (smoothedMinusDM / smoothedTR) * 100
    const diSum = pdi + mdi
    const dx = diSum === 0 ? 0 : (Math.abs(pdi - mdi) / diSum) * 100

    dxValues.push(dx)

    if (dxValues.length >= period) {
      let adx: number
      if (dxValues.length === period) {
        adx = dxValues.reduce((a, b) => a + b, 0) / period
      } else {
        const prevAdx = values[values.length - 1]?.adx ?? 0
        adx = (prevAdx * (period - 1) + dx) / period
      }

      values.push({
        ts: bars[index + 1].ts,
        adx,
        plusDI: pdi,
        minusDI: mdi,
      })
    }
  }

  return values
}
