import { computeEMA } from './ema'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeMACD: SyncIndicatorComputeFn = ({ bars, params }) => {
  const fast = Math.max(2, Number(params.fast ?? 12))
  const slow = Math.max(fast + 1, Number(params.slow ?? 26))
  const signalPeriod = Math.max(2, Number(params.signal ?? 9))

  const fastValues = computeEMA({
    bars,
    params: { period: fast },
    timeframeMs: 0,
  })
  const slowValues = computeEMA({
    bars,
    params: { period: slow },
    timeframeMs: 0,
  })
  const slowMap = new Map(
    slowValues.map((value) => [value.ts, Number(value.value ?? 0)]),
  )

  const macdLine = fastValues
    .filter((value) => slowMap.has(value.ts))
    .map((value) => ({
      ts: value.ts,
      value: Number(value.value ?? 0) - Number(slowMap.get(value.ts) ?? 0),
    }))

  if (macdLine.length < signalPeriod) {
    return []
  }

  let signal =
    macdLine
      .slice(0, signalPeriod)
      .reduce((sum, value) => sum + value.value, 0) / signalPeriod
  const multiplier = 2 / (signalPeriod + 1)
  const values: Array<{
    ts: number
    macd: number
    signal: number
    histogram: number
  }> = []

  for (let index = signalPeriod - 1; index < macdLine.length; index += 1) {
    if (index > signalPeriod - 1) {
      signal = macdLine[index].value * multiplier + signal * (1 - multiplier)
    }

    values.push({
      ts: macdLine[index].ts,
      macd: macdLine[index].value,
      signal,
      histogram: macdLine[index].value - signal,
    })
  }

  return values
}
