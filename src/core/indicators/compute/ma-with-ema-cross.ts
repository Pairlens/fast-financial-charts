import type { SyncIndicatorComputeFn } from '../../../types'

export const computeMAWithEMACross: SyncIndicatorComputeFn = ({
  bars,
  params,
}) => {
  const smaPeriod = Math.max(1, Number(params.smaPeriod ?? 10))
  const emaPeriod = Math.max(1, Number(params.emaPeriod ?? 21))

  const minBars = Math.max(smaPeriod, emaPeriod)
  if (bars.length < minBars) return []

  // Precompute rolling SMA of close
  let smaSum = 0
  const smaValues: Array<number> = []

  for (let i = 0; i < bars.length; i += 1) {
    smaSum += bars[i].close
    if (i >= smaPeriod) {
      smaSum -= bars[i - smaPeriod].close
    }
    if (i >= smaPeriod - 1) {
      smaValues[i] = smaSum / smaPeriod
    }
  }

  // Precompute EMA of close
  const emaK = 2 / (emaPeriod + 1)
  let ema = 0
  for (let i = 0; i < emaPeriod; i += 1) {
    ema += bars[i].close
  }
  ema /= emaPeriod

  const emaValues: Array<number> = []
  emaValues[emaPeriod - 1] = ema

  for (let i = emaPeriod; i < bars.length; i += 1) {
    ema = bars[i].close * emaK + ema * (1 - emaK)
    emaValues[i] = ema
  }

  // Output from the bar where both can be computed
  const startIndex = minBars - 1
  const values: Array<{ ts: number; sma: number; ema: number }> = []

  for (let i = startIndex; i < bars.length; i += 1) {
    if (smaValues[i] !== undefined && emaValues[i] !== undefined) {
      values.push({
        ts: bars[i].ts,
        sma: smaValues[i],
        ema: emaValues[i],
      })
    }
  }

  return values
}
