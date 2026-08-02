import { computeEMA } from './ema'
import type { SyncIndicatorComputeFn } from '../../../types'

export const computeKlingerOscillator: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const fastPeriod = Math.max(2, Number(params.fast ?? 34))
  const slowPeriod = Math.max(fastPeriod + 1, Number(params.slow ?? 55))
  const signalPeriod = Math.max(1, Number(params.signal ?? 13))

  if (bars.length < 2) {
    return []
  }

  // Volume Force = Volume * |2*(dm/cm) - 1| * trend * 100
  const vf: Array<{
    ts: number
    close: number
    open: number
    high: number
    low: number
    volume: number
  }> = []
  let prevCm = 0

  for (let index = 1; index < bars.length; index += 1) {
    const hlc = bars[index].high + bars[index].low + bars[index].close
    const prevHlc =
      bars[index - 1].high + bars[index - 1].low + bars[index - 1].close
    const dm = bars[index].high - bars[index].low
    const trend = hlc >= prevHlc ? 1 : -1

    const cm =
      trend ===
      (index > 1 &&
      bars[index - 1].high + bars[index - 1].low + bars[index - 1].close >=
        bars[Math.max(0, index - 2)].high +
          bars[Math.max(0, index - 2)].low +
          bars[Math.max(0, index - 2)].close
        ? 1
        : -1)
        ? prevCm + dm
        : dm

    const force =
      cm === 0
        ? 0
        : bars[index].volume * Math.abs(2 * (dm / cm) - 1) * trend * 100

    vf.push({
      ts: bars[index].ts,
      open: force,
      high: force,
      low: force,
      close: force,
      volume: 0,
    })

    prevCm = cm
  }

  const fastEma = computeEMA({
    bars: vf,
    params: { period: fastPeriod },
    timeframeMs: 0,
  })
  const slowEma = computeEMA({
    bars: vf,
    params: { period: slowPeriod },
    timeframeMs: 0,
  })

  if (fastEma.length === 0 || slowEma.length === 0) {
    return []
  }

  const slowMap = new Map(slowEma.map((p) => [p.ts, Number(p.value)]))
  const kvoLine = fastEma
    .filter((p) => slowMap.has(p.ts))
    .map((p) => ({
      ts: p.ts,
      open: 0,
      high: 0,
      low: 0,
      close: Number(p.value) - slowMap.get(p.ts)!,
      volume: 0,
    }))

  const signalEma = computeEMA({
    bars: kvoLine,
    params: { period: signalPeriod },
    timeframeMs: 0,
  })
  const signalMap = new Map(signalEma.map((p) => [p.ts, Number(p.value)]))

  return kvoLine.map((p) => ({
    ts: p.ts,
    value: p.close,
    signal: signalMap.get(p.ts) ?? p.close,
  }))
}
