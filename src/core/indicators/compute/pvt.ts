import type { SyncIndicatorComputeFn } from '../../../types'

export const computePVT: SyncIndicatorComputeFn = ({ bars }) => {
  if (bars.length === 0) {
    return []
  }

  let pvt = 0
  const values: Array<{ ts: number; value: number }> = [
    { ts: bars[0].ts, value: 0 },
  ]

  for (let index = 1; index < bars.length; index += 1) {
    const prevClose = bars[index - 1].close
    if (prevClose !== 0) {
      pvt += (bars[index].volume * (bars[index].close - prevClose)) / prevClose
    }
    values.push({ ts: bars[index].ts, value: pvt })
  }

  return values
}
