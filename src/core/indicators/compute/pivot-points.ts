import type { SyncIndicatorComputeFn } from '../../../types'

export const computePivotPoints: SyncIndicatorComputeFn = ({
  bars,
  params,
  timeframeMs,
}) => {
  const method = String(params.method ?? 'standard')

  if (bars.length < 2) {
    return []
  }

  // Group bars by session (UTC day for crypto, or use timeframe to determine sessions)
  // For simplicity, use the previous bar's HLC to compute pivot levels for the current bar
  const values: Array<{
    ts: number
    pp: number
    r1: number
    r2: number
    r3: number
    s1: number
    s2: number
    s3: number
  }> = []

  // Use a rolling lookback to find the previous session's H/L/C
  // For intraday: use previous day. For daily+: use previous bar.
  const msPerDay = 86_400_000
  const isIntraday = timeframeMs > 0 && timeframeMs < msPerDay

  if (isIntraday) {
    // Group by UTC day
    const days = new Map<number, { high: number; low: number; close: number }>()

    for (const bar of bars) {
      const dayKey = Math.floor(bar.ts / msPerDay)
      const existing = days.get(dayKey)
      if (existing) {
        existing.high = Math.max(existing.high, bar.high)
        existing.low = Math.min(existing.low, bar.low)
        existing.close = bar.close
      } else {
        days.set(dayKey, { high: bar.high, low: bar.low, close: bar.close })
      }
    }

    const sortedDays = Array.from(days.entries()).sort((a, b) => a[0] - b[0])

    for (const bar of bars) {
      const barDay = Math.floor(bar.ts / msPerDay)
      const dayIdx = sortedDays.findIndex(([d]) => d === barDay)
      if (dayIdx < 1) {
        continue
      }

      const prev = sortedDays[dayIdx - 1][1]
      const pivots = calcPivots(prev.high, prev.low, prev.close, method)
      values.push({ ts: bar.ts, ...pivots })
    }
  } else {
    // Daily or higher: use previous bar
    for (let index = 1; index < bars.length; index += 1) {
      const prev = bars[index - 1]
      const pivots = calcPivots(prev.high, prev.low, prev.close, method)
      values.push({ ts: bars[index].ts, ...pivots })
    }
  }

  return values
}

function calcPivots(
  high: number,
  low: number,
  close: number,
  method: string,
): {
  pp: number
  r1: number
  r2: number
  r3: number
  s1: number
  s2: number
  s3: number
} {
  const pp = (high + low + close) / 3

  if (method === 'woodie') {
    const wPP = (high + low + 2 * close) / 4
    return {
      pp: wPP,
      r1: 2 * wPP - low,
      r2: wPP + high - low,
      r3: high + 2 * (wPP - low),
      s1: 2 * wPP - high,
      s2: wPP - high + low,
      s3: low - 2 * (high - wPP),
    }
  }

  if (method === 'camarilla') {
    const range = high - low
    return {
      pp,
      r1: close + (range * 1.1) / 12,
      r2: close + (range * 1.1) / 6,
      r3: close + (range * 1.1) / 4,
      s1: close - (range * 1.1) / 12,
      s2: close - (range * 1.1) / 6,
      s3: close - (range * 1.1) / 4,
    }
  }

  if (method === 'fibonacci') {
    const range = high - low
    return {
      pp,
      r1: pp + 0.382 * range,
      r2: pp + 0.618 * range,
      r3: pp + range,
      s1: pp - 0.382 * range,
      s2: pp - 0.618 * range,
      s3: pp - range,
    }
  }

  // Standard
  return {
    pp,
    r1: 2 * pp - low,
    r2: pp + high - low,
    r3: high + 2 * (pp - low),
    s1: 2 * pp - high,
    s2: pp - high + low,
    s3: low - 2 * (high - pp),
  }
}
