import type { SyncIndicatorComputeFn } from '../../../types'

export const computeZigZag: SyncIndicatorComputeFn = ({ bars, params }) => {
  const deviation = Math.max(0.1, Number(params.deviation ?? 5))

  if (bars.length < 2) {
    return []
  }

  const threshold = deviation / 100

  // Find swing points
  type Pivot = { index: number; ts: number; value: number; isHigh: boolean }
  const pivots: Array<Pivot> = []

  let lastPivot: Pivot =
    bars[0].close >= bars[1].close
      ? { index: 0, ts: bars[0].ts, value: bars[0].high, isHigh: true }
      : { index: 0, ts: bars[0].ts, value: bars[0].low, isHigh: false }

  for (let index = 1; index < bars.length; index += 1) {
    if (lastPivot.isHigh) {
      if (bars[index].high > lastPivot.value) {
        lastPivot = {
          index,
          ts: bars[index].ts,
          value: bars[index].high,
          isHigh: true,
        }
      } else if (bars[index].low < lastPivot.value * (1 - threshold)) {
        pivots.push(lastPivot)
        lastPivot = {
          index,
          ts: bars[index].ts,
          value: bars[index].low,
          isHigh: false,
        }
      }
    } else {
      if (bars[index].low < lastPivot.value) {
        lastPivot = {
          index,
          ts: bars[index].ts,
          value: bars[index].low,
          isHigh: false,
        }
      } else if (bars[index].high > lastPivot.value * (1 + threshold)) {
        pivots.push(lastPivot)
        lastPivot = {
          index,
          ts: bars[index].ts,
          value: bars[index].high,
          isHigh: true,
        }
      }
    }
  }

  pivots.push(lastPivot)

  // Interpolate between pivots for every bar
  if (pivots.length < 2) {
    return []
  }

  const values: Array<{ ts: number; value: number }> = []
  let pivotIdx = 0

  for (let index = 0; index < bars.length; index += 1) {
    while (
      pivotIdx < pivots.length - 2 &&
      pivots[pivotIdx + 1].index <= index
    ) {
      pivotIdx += 1
    }

    const p1 = pivots[pivotIdx]
    const p2 = pivots[Math.min(pivotIdx + 1, pivots.length - 1)]

    if (index <= p1.index) {
      values.push({ ts: bars[index].ts, value: p1.value })
    } else if (index >= p2.index) {
      values.push({ ts: bars[index].ts, value: p2.value })
    } else {
      const ratio = (index - p1.index) / (p2.index - p1.index)
      values.push({
        ts: bars[index].ts,
        value: p1.value + ratio * (p2.value - p1.value),
      })
    }
  }

  return values
}
