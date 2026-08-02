import type { SyncIndicatorComputeFn } from '../../../types'

export const computeRelativeVolatilityIndex: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const period = Math.max(2, Number(params.period ?? 10))
  const smoothPeriod = Math.max(1, Number(params.smoothPeriod ?? 14))

  if (bars.length < period + smoothPeriod) {
    return []
  }

  // Step 1 & 2: Compute stdDev of close over period, then split into upVol / downVol
  const upVol: Array<number> = []
  const downVol: Array<number> = []
  const timestamps: Array<number> = []

  for (let index = period; index < bars.length; index += 1) {
    // Standard deviation of close over last `period` bars
    let sum = 0
    for (let j = index - period + 1; j <= index; j += 1) {
      sum += bars[j].close
    }
    const mean = sum / period

    let variance = 0
    for (let j = index - period + 1; j <= index; j += 1) {
      variance += Math.pow(bars[j].close - mean, 2)
    }
    const stdDev = Math.sqrt(variance / period)

    if (bars[index].close > bars[index - 1].close) {
      upVol.push(stdDev)
      downVol.push(0)
    } else {
      upVol.push(0)
      downVol.push(stdDev)
    }
    timestamps.push(bars[index].ts)
  }

  if (upVol.length < smoothPeriod) {
    return []
  }

  // Step 3: Smooth upVol and downVol with EMA
  const emaMultiplier = 2 / (smoothPeriod + 1)

  let smoothUp = 0
  let smoothDown = 0
  for (let index = 0; index < smoothPeriod; index += 1) {
    smoothUp += upVol[index]
    smoothDown += downVol[index]
  }
  smoothUp /= smoothPeriod
  smoothDown /= smoothPeriod

  const values: Array<{ ts: number; value: number }> = []
  const total = smoothUp + smoothDown
  values.push({
    ts: timestamps[smoothPeriod - 1],
    value: total === 0 ? 50 : (100 * smoothUp) / total,
  })

  for (let index = smoothPeriod; index < upVol.length; index += 1) {
    smoothUp = upVol[index] * emaMultiplier + smoothUp * (1 - emaMultiplier)
    smoothDown =
      downVol[index] * emaMultiplier + smoothDown * (1 - emaMultiplier)

    const denom = smoothUp + smoothDown
    values.push({
      ts: timestamps[index],
      value: denom === 0 ? 50 : (100 * smoothUp) / denom,
    })
  }

  return values
}
