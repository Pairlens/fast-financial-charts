import { computeEMA } from './ema'
import type { SyncIndicatorComputeFn } from '../../../types'

const emaFromValues = (
  values: Array<{ ts: number; value?: number }>,
  period: number,
) =>
  computeEMA({
    bars: values.map((p) => ({
      ts: p.ts,
      open: Number(p.value),
      high: Number(p.value),
      low: Number(p.value),
      close: Number(p.value),
      volume: 0,
    })),
    params: { period },
    timeframeMs: 0,
  })

export const computeTRIX: SyncIndicatorComputeFn = ({ bars, params }) => {
  const period = Math.max(2, Number(params.period ?? 15))
  const signalPeriod = Math.max(1, Number(params.signal ?? 9))

  const ema1 = computeEMA({ bars, params: { period }, timeframeMs: 0 })
  if (ema1.length === 0) {
    return []
  }

  const ema2 = emaFromValues(ema1, period)
  if (ema2.length === 0) {
    return []
  }

  const ema3 = emaFromValues(ema2, period)
  if (ema3.length < 2) {
    return []
  }

  // TRIX = percentage rate of change of triple EMA
  const trixLine: Array<{ ts: number; value: number }> = []
  for (let index = 1; index < ema3.length; index += 1) {
    const prev = Number(ema3[index - 1].value)
    const curr = Number(ema3[index].value)
    trixLine.push({
      ts: ema3[index].ts,
      value: prev === 0 ? 0 : ((curr - prev) / prev) * 10000,
    })
  }

  // Signal line = EMA of TRIX
  const signalValues = emaFromValues(trixLine, signalPeriod)
  const signalMap = new Map(signalValues.map((p) => [p.ts, Number(p.value)]))

  return trixLine.map((point) => ({
    ts: point.ts,
    value: point.value,
    signal: signalMap.get(point.ts) ?? point.value,
  }))
}
