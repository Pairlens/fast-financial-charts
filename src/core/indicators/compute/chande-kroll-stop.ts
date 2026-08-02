import type { SyncIndicatorComputeFn } from '../../../types'

export const computeChandeKrollStop: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const p = Math.max(1, Number(params.atrPeriod ?? 10))
  const q = Math.max(0.1, Number(params.firstStop ?? 1))
  const stopLength = Math.max(1, Number(params.secondStop ?? 9))

  const minBars = p + stopLength
  if (bars.length < minBars) {
    return []
  }

  // Step 1: Compute True Range and ATR (SMA of TR) inline
  const tr: Array<number> = [bars[0].high - bars[0].low]

  for (let index = 1; index < bars.length; index += 1) {
    const current = bars[index]
    const previous = bars[index - 1]
    tr.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close),
      ),
    )
  }

  // ATR as SMA of TR over p periods
  const atr: Array<number> = new Array(bars.length).fill(0)
  let trSum = 0

  for (let index = 0; index < bars.length; index += 1) {
    trSum += tr[index]
    if (index >= p) {
      trSum -= tr[index - p]
    }
    if (index >= p - 1) {
      atr[index] = trSum / p
    }
  }

  // Step 2: First stops
  const firstHighStop: Array<number> = new Array(bars.length).fill(0)
  const firstLowStop: Array<number> = new Array(bars.length).fill(0)

  for (let index = p - 1; index < bars.length; index += 1) {
    let highestHigh = -Infinity
    let lowestLow = Infinity
    for (let j = index - p + 1; j <= index; j += 1) {
      highestHigh = Math.max(highestHigh, bars[j].high)
      lowestLow = Math.min(lowestLow, bars[j].low)
    }
    firstHighStop[index] = highestHigh - q * atr[index]
    firstLowStop[index] = lowestLow + q * atr[index]
  }

  // Step 3: Stop short = highest of firstHighStop over stopLength bars
  //         Stop long = lowest of firstLowStop over stopLength bars
  const values: Array<{ ts: number; stopLong: number; stopShort: number }> = []
  const startIndex = p - 1 + stopLength - 1

  for (let index = startIndex; index < bars.length; index += 1) {
    let highestFirstHigh = -Infinity
    let lowestFirstLow = Infinity
    for (let j = index - stopLength + 1; j <= index; j += 1) {
      highestFirstHigh = Math.max(highestFirstHigh, firstHighStop[j])
      lowestFirstLow = Math.min(lowestFirstLow, firstLowStop[j])
    }
    values.push({
      ts: bars[index].ts,
      stopLong: lowestFirstLow,
      stopShort: highestFirstHigh,
    })
  }

  return values
}
