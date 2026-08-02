import type { SyncIndicatorComputeFn } from '../../../types'

export const computeAccumulativeSwingIndex: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const limitMove = Math.max(0, Number(params.limitMove ?? 0))

  if (bars.length < 2) {
    return []
  }

  const values: Array<{ ts: number; value: number }> = []
  let asi = 0

  for (let i = 1; i < bars.length; i += 1) {
    const C = bars[i].close
    const Cy = bars[i - 1].close
    const O = bars[i].open
    const Oy = bars[i - 1].open
    const H = bars[i].high
    const L = bars[i].low

    const absHCy = Math.abs(H - Cy)
    const absLCy = Math.abs(L - Cy)
    const absHL = Math.abs(H - L)

    const K = Math.max(absHCy, absLCy)
    const TR = Math.max(absHCy, absLCy, absHL)

    const T = limitMove > 0 ? limitMove : TR

    // Guard against division by zero
    if (TR === 0 || T === 0) {
      values.push({ ts: bars[i].ts, value: asi })
      continue
    }

    const SI =
      (50 * ((C - Cy + 0.5 * (C - O) + 0.25 * (Cy - Oy)) * (K / T))) / TR

    asi += SI

    values.push({
      ts: bars[i].ts,
      value: asi,
    })
  }

  return values
}
