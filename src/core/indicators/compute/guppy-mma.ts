import type { SyncIndicatorComputeFn } from '../../../types'

const SHORT_PERIODS = [3, 5, 8, 10, 12, 15] as const
const LONG_PERIODS = [30, 35, 40, 45, 50, 60] as const
const ALL_PERIODS = [...SHORT_PERIODS, ...LONG_PERIODS] as const
const MAX_PERIOD = 60

export const computeGuppyMMA: SyncIndicatorComputeFn = ({ bars }) => {
  if (bars.length < MAX_PERIOD) {
    return []
  }

  // Compute all 12 EMA series
  const emas = new Map<number, Array<number>>()

  for (const period of ALL_PERIODS) {
    const k = 2 / (period + 1)
    const series: Array<number> = []

    // Seed with SMA of first N bars
    let ema = 0
    for (let j = 0; j < period; j += 1) {
      ema += bars[j].close
    }
    ema /= period
    series.push(ema)

    // Continue with EMA formula
    for (let index = period; index < bars.length; index += 1) {
      ema = bars[index].close * k + ema * (1 - k)
      series.push(ema)
    }

    emas.set(period, series)
  }

  // Output from index MAX_PERIOD - 1 onward (where all 12 EMAs are available)
  const values: Array<{ ts: number; [key: string]: number | undefined }> = []

  for (let index = MAX_PERIOD - 1; index < bars.length; index += 1) {
    const point: { ts: number; [key: string]: number | undefined } = {
      ts: bars[index].ts,
    }

    for (const period of SHORT_PERIODS) {
      // EMA series for this period starts at bar index (period - 1)
      // So the EMA value at bar index `index` is at series index (index - period + 1)
      const seriesIdx = index - period + 1
      const series = emas.get(period)!
      if (seriesIdx >= 0 && seriesIdx < series.length) {
        point[`short_${period}`] = series[seriesIdx]
      }
    }

    for (const period of LONG_PERIODS) {
      const seriesIdx = index - period + 1
      const series = emas.get(period)!
      if (seriesIdx >= 0 && seriesIdx < series.length) {
        point[`long_${period}`] = series[seriesIdx]
      }
    }

    values.push(point)
  }

  return values
}
