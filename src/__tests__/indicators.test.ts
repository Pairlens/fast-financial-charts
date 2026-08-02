import { describe, expect, test } from 'bun:test'

import { computeAcceleratorOscillator } from '../core/indicators/compute/accelerator-oscillator'
import { computeAccumulativeSwingIndex } from '../core/indicators/compute/accumulative-swing-index'
import { computeAD } from '../core/indicators/compute/ad'
import { computeAveragePrice } from '../core/indicators/compute/average-price'
import { computeADX } from '../core/indicators/compute/adx'
import { computeALMA } from '../core/indicators/compute/alma'
import { computeAlligator } from '../core/indicators/compute/alligator'
import { computeAroon } from '../core/indicators/compute/aroon'
import { computeATR } from '../core/indicators/compute/atr'
import { computeAwesomeOscillator } from '../core/indicators/compute/awesome-oscillator'
import { computeBalanceOfPower } from '../core/indicators/compute/balance-of-power'
import { computeBBPercent } from '../core/indicators/compute/bb-percent'
import { computeBBWidth } from '../core/indicators/compute/bb-width'
import { computeCCI } from '../core/indicators/compute/cci'
import { computeChaikinOscillator } from '../core/indicators/compute/chaikin-oscillator'
import { computeChaikinVolatility } from '../core/indicators/compute/chaikin-volatility'
import { computeChandeKrollStop } from '../core/indicators/compute/chande-kroll-stop'
import { computeChoppinessIndex } from '../core/indicators/compute/choppiness-index'
import { computeCMF } from '../core/indicators/compute/cmf'
import { computeCMO } from '../core/indicators/compute/cmo'
import { computeConnorsRSI } from '../core/indicators/compute/connors-rsi'
import { computeCoppockCurve } from '../core/indicators/compute/coppock-curve'
import { computeDEMA } from '../core/indicators/compute/dema'
import { computeDirectionalMovement } from '../core/indicators/compute/directional-movement'
import { computeDonchianChannels } from '../core/indicators/compute/donchian'
import { computeDPO } from '../core/indicators/compute/dpo'
import { computeEaseOfMovement } from '../core/indicators/compute/ease-of-movement'
import { computeElderForceIndex } from '../core/indicators/compute/elder-force-index'
import { computeEMA } from '../core/indicators/compute/ema'
import { computeEMACross } from '../core/indicators/compute/ema-cross'
import { computeEnvelopes } from '../core/indicators/compute/envelopes'
import { computeFiftyTwoWeekHighLow } from '../core/indicators/compute/fifty-two-week-high-low'
import { computeFisherTransform } from '../core/indicators/compute/fisher-transform'
import { computeGuppyMMA } from '../core/indicators/compute/guppy-mma'
import { computeHistoricalVolatility } from '../core/indicators/compute/historical-volatility'
import { computeHMA } from '../core/indicators/compute/hma'
import { computeIchimoku } from '../core/indicators/compute/ichimoku'
import { computeKAMA } from '../core/indicators/compute/kama'
import { computeKeltnerChannels } from '../core/indicators/compute/keltner'
import { computeLSMA } from '../core/indicators/compute/lsma'
import { computeKlingerOscillator } from '../core/indicators/compute/klinger'
import { computeKST } from '../core/indicators/compute/kst'
import { computeLinearRegressionCurve } from '../core/indicators/compute/linear-regression-curve'
import { computeLinearRegressionSlope } from '../core/indicators/compute/linear-regression-slope'
import { computeMACross } from '../core/indicators/compute/ma-cross'
import { computeMAWithEMACross } from '../core/indicators/compute/ma-with-ema-cross'
import { computeMACD } from '../core/indicators/compute/macd'
import { computeMajorityRule } from '../core/indicators/compute/majority-rule'
import { computeMassIndex } from '../core/indicators/compute/mass-index'
import { computeMcGinleyDynamic } from '../core/indicators/compute/mcginley-dynamic'
import { computeMedianPrice } from '../core/indicators/compute/median-price'
import { computeMFI } from '../core/indicators/compute/mfi'
import { computeMomentum } from '../core/indicators/compute/momentum'
import { computeMovingAverageChannel } from '../core/indicators/compute/moving-average-channel'
import { computeMovingAverageHamming } from '../core/indicators/compute/moving-average-hamming'
import { computeMovingAverageMultiple } from '../core/indicators/compute/moving-average-multiple'
import { computeNetVolume } from '../core/indicators/compute/net-volume'
import { computeOBV } from '../core/indicators/compute/obv'
import { computeParabolicSAR } from '../core/indicators/compute/parabolic-sar'
import { computePivotPoints } from '../core/indicators/compute/pivot-points'
import { computePriceChannel } from '../core/indicators/compute/price-channel'
import { computePriceOscillator } from '../core/indicators/compute/price-oscillator'
import { computePVT } from '../core/indicators/compute/pvt'
import { computeRankCorrelationIndex } from '../core/indicators/compute/rank-correlation-index'
import { computeRelativeVolatilityIndex } from '../core/indicators/compute/relative-volatility-index'
import { computeROC } from '../core/indicators/compute/roc'
import { computeRSI } from '../core/indicators/compute/rsi'
import { computeRVI } from '../core/indicators/compute/rvi'
import { computeSMA } from '../core/indicators/compute/sma'
import { computeSMIErgodic } from '../core/indicators/compute/smi-ergodic'
import { computeSMMA } from '../core/indicators/compute/smma'
import { computeStandardDeviation } from '../core/indicators/compute/standard-deviation'
import { computeStochastic } from '../core/indicators/compute/stochastic'
import { computeStochRSI } from '../core/indicators/compute/stoch-rsi'
import { computeSuperTrend } from '../core/indicators/compute/supertrend'
import { computeTEMA } from '../core/indicators/compute/tema'
import { computeTRIX } from '../core/indicators/compute/trix'
import { computeTrendStrengthIndex } from '../core/indicators/compute/trend-strength-index'
import { computeTSI } from '../core/indicators/compute/tsi'
import { computeTypicalPrice } from '../core/indicators/compute/typical-price'
import { computeUltimateOscillator } from '../core/indicators/compute/ultimate-oscillator'
import { computeVortexIndicator } from '../core/indicators/compute/vortex'
import { computeVolumeOscillator } from '../core/indicators/compute/volume-oscillator'
import { computeVWMA } from '../core/indicators/compute/vwma'
import { computeWilliamsFractal } from '../core/indicators/compute/williams-fractal'
import { computeWilliamsR } from '../core/indicators/compute/williams-r'
import { computeWMA } from '../core/indicators/compute/wma'
import { computeZigZag } from '../core/indicators/compute/zigzag'
import { makeBars } from './fixtures'

describe('indicator computations', () => {
  const bars = makeBars(80)

  test('EMA and SMA produce expected output size', () => {
    const ema = computeEMA({
      bars,
      params: { period: 10 },
      timeframeMs: 60_000,
    })
    const sma = computeSMA({
      bars,
      params: { period: 10 },
      timeframeMs: 60_000,
    })

    expect(ema.length).toBe(71)
    expect(sma.length).toBe(71)
    expect(Number(ema[0].value)).toBeGreaterThan(0)
    expect(Number(sma[0].value)).toBeGreaterThan(0)
  })

  test('RSI stays in 0..100 range', () => {
    const rsi = computeRSI({
      bars,
      params: { period: 14 },
      timeframeMs: 60_000,
    })

    expect(rsi.length).toBeGreaterThan(0)
    for (const point of rsi) {
      const value = Number(point.value)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })

  test('MACD and ATR return structured values', () => {
    const macd = computeMACD({
      bars,
      params: {
        fast: 12,
        slow: 26,
        signal: 9,
      },
      timeframeMs: 60_000,
    })

    const atr = computeATR({
      bars,
      params: { period: 14 },
      timeframeMs: 60_000,
    })

    expect(macd.length).toBeGreaterThan(0)
    expect(Number(macd[0].macd)).toBeFinite()
    expect(Number(macd[0].signal)).toBeFinite()
    expect(Number(macd[0].histogram)).toBeFinite()

    expect(atr.length).toBeGreaterThan(0)
    expect(Number(atr[0].value)).toBeGreaterThan(0)
  })
})

describe('tier 1 indicators', () => {
  const bars = makeBars(120)

  test('Stochastic produces k and d in 0..100', () => {
    const result = computeStochastic({
      bars,
      params: { kPeriod: 14, dPeriod: 3, smooth: 3 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.k)).toBeGreaterThanOrEqual(0)
      expect(Number(point.k)).toBeLessThanOrEqual(100)
      expect(Number(point.d)).toBeGreaterThanOrEqual(0)
      expect(Number(point.d)).toBeLessThanOrEqual(100)
    }
  })

  test('StochRSI produces k and d in 0..100', () => {
    const result = computeStochRSI({
      bars,
      params: { rsiPeriod: 14, stochPeriod: 14, kSmooth: 3, dSmooth: 3 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.k)).toBeGreaterThanOrEqual(0)
      expect(Number(point.k)).toBeLessThanOrEqual(100)
      expect(Number(point.d)).toBeGreaterThanOrEqual(0)
      expect(Number(point.d)).toBeLessThanOrEqual(100)
    }
  })

  test('SuperTrend produces value and direction', () => {
    const result = computeSuperTrend({
      bars,
      params: { period: 10, multiplier: 3 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
      expect([1, -1]).toContain(Number(point.direction))
    }
  })

  test('Ichimoku produces all 5 components', () => {
    const result = computeIchimoku({
      bars,
      params: {
        tenkanPeriod: 9,
        kijunPeriod: 26,
        senkouBPeriod: 52,
        displacement: 26,
      },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.tenkan)).toBeFinite()
      expect(Number(point.kijun)).toBeFinite()
      expect(Number(point.senkouA)).toBeFinite()
      expect(Number(point.senkouB)).toBeFinite()
      expect(Number(point.chikou)).toBeFinite()
    }
  })

  test('ADX produces adx, plusDI, minusDI', () => {
    const result = computeADX({
      bars,
      params: { period: 14 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.adx)).toBeGreaterThanOrEqual(0)
      expect(Number(point.plusDI)).toBeGreaterThanOrEqual(0)
      expect(Number(point.minusDI)).toBeGreaterThanOrEqual(0)
    }
  })

  test('OBV produces cumulative values', () => {
    const result = computeOBV({ bars, params: {}, timeframeMs: 60_000 })

    expect(result.length).toBe(bars.length)
    expect(Number(result[0].value)).toBe(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('Donchian Channels produces upper/middle/lower', () => {
    const result = computeDonchianChannels({
      bars,
      params: { period: 20 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const upper = Number(point.upper)
      const middle = Number(point.middle)
      const lower = Number(point.lower)
      expect(upper).toBeGreaterThanOrEqual(middle)
      expect(middle).toBeGreaterThanOrEqual(lower)
    }
  })

  test('Keltner Channels produces upper/middle/lower', () => {
    const result = computeKeltnerChannels({
      bars,
      params: { period: 20, atrPeriod: 10, multiplier: 2 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const upper = Number(point.upper)
      const middle = Number(point.middle)
      const lower = Number(point.lower)
      expect(upper).toBeGreaterThanOrEqual(middle)
      expect(middle).toBeGreaterThanOrEqual(lower)
    }
  })
})

describe('tier 2 indicators', () => {
  const bars = makeBars(80)

  test('Williams %R stays in -100..0 range', () => {
    const result = computeWilliamsR({
      bars,
      params: { period: 14 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const value = Number(point.value)
      expect(value).toBeGreaterThanOrEqual(-100)
      expect(value).toBeLessThanOrEqual(0)
    }
  })

  test('Parabolic SAR produces value and direction', () => {
    const result = computeParabolicSAR({
      bars,
      params: { afStart: 0.02, afStep: 0.02, afMax: 0.2 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
      expect([1, -1]).toContain(Number(point.direction))
    }
  })

  test('MFI stays in 0..100 range', () => {
    const result = computeMFI({
      bars,
      params: { period: 14 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const value = Number(point.value)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })

  test('CMF produces bounded values', () => {
    const result = computeCMF({
      bars,
      params: { period: 20 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const value = Number(point.value)
      expect(value).toBeGreaterThanOrEqual(-1)
      expect(value).toBeLessThanOrEqual(1)
    }
  })

  test('A/D produces cumulative values', () => {
    const result = computeAD({ bars, params: {}, timeframeMs: 60_000 })

    expect(result.length).toBe(bars.length)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('ROC produces percentage values', () => {
    const result = computeROC({
      bars,
      params: { period: 12 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('WMA produces expected output size', () => {
    const result = computeWMA({
      bars,
      params: { period: 10 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBe(71)
    expect(Number(result[0].value)).toBeGreaterThan(0)
  })

  test('DEMA produces values', () => {
    const result = computeDEMA({
      bars,
      params: { period: 10 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    expect(Number(result[0].value)).toBeGreaterThan(0)
  })

  test('TEMA produces values', () => {
    const result = computeTEMA({
      bars,
      params: { period: 10 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    expect(Number(result[0].value)).toBeGreaterThan(0)
  })
})

describe('tier 3 indicators', () => {
  const bars = makeBars(80)

  test('Aroon produces aroonUp and aroonDown in 0..100', () => {
    const result = computeAroon({
      bars,
      params: { period: 25 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.aroonUp)).toBeGreaterThanOrEqual(0)
      expect(Number(point.aroonUp)).toBeLessThanOrEqual(100)
      expect(Number(point.aroonDown)).toBeGreaterThanOrEqual(0)
      expect(Number(point.aroonDown)).toBeLessThanOrEqual(100)
    }
  })

  test('Momentum produces values', () => {
    const result = computeMomentum({
      bars,
      params: { period: 10 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('CCI produces values', () => {
    const result = computeCCI({
      bars,
      params: { period: 20 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('Alligator produces jaw, teeth, lips', () => {
    const result = computeAlligator({
      bars,
      params: {},
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.jaw)).toBeFinite()
      expect(Number(point.teeth)).toBeFinite()
      expect(Number(point.lips)).toBeFinite()
    }
  })

  test('BB %B produces values', () => {
    const result = computeBBPercent({
      bars,
      params: { period: 20, stdDev: 2 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('TRIX produces value and signal', () => {
    const result = computeTRIX({
      bars,
      params: { period: 15, signal: 9 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
      expect(Number(point.signal)).toBeFinite()
    }
  })
})

describe('tier 4 indicators', () => {
  const bars = makeBars(120)

  test('HMA produces values', () => {
    const result = computeHMA({
      bars,
      params: { period: 9 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThan(0)
    }
  })

  test('VWMA produces values', () => {
    const result = computeVWMA({
      bars,
      params: { period: 20 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThan(0)
    }
  })

  test('ALMA produces values', () => {
    const result = computeALMA({
      bars,
      params: { period: 9, offset: 0.85, sigma: 6 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThan(0)
    }
  })

  test('KAMA produces values', () => {
    const result = computeKAMA({
      bars,
      params: { period: 10, fast: 2, slow: 30 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThan(0)
    }
  })

  test('Awesome Oscillator produces values', () => {
    const result = computeAwesomeOscillator({
      bars,
      params: { fast: 5, slow: 34 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('Choppiness Index stays in 0..100', () => {
    const result = computeChoppinessIndex({
      bars,
      params: { period: 14 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const value = Number(point.value)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })

  test('Fisher Transform produces value and signal', () => {
    const result = computeFisherTransform({
      bars,
      params: { period: 9 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
      expect(Number(point.signal)).toBeFinite()
    }
  })

  test('Vortex Indicator produces plus and minus', () => {
    const result = computeVortexIndicator({
      bars,
      params: { period: 14 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.plus)).toBeGreaterThanOrEqual(0)
      expect(Number(point.minus)).toBeGreaterThanOrEqual(0)
    }
  })

  test('Ultimate Oscillator stays in 0..100', () => {
    const result = computeUltimateOscillator({
      bars,
      params: { period1: 7, period2: 14, period3: 28 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const value = Number(point.value)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })

  test('Coppock Curve produces values', () => {
    const result = computeCoppockCurve({
      bars,
      params: { longPeriod: 14, shortPeriod: 11, wmaPeriod: 10 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('KST produces value and signal', () => {
    const result = computeKST({
      bars,
      params: { roc1: 10, roc2: 15, roc3: 20, roc4: 30 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
      expect(Number(point.signal)).toBeFinite()
    }
  })

  test('Elder Force Index produces values', () => {
    const result = computeElderForceIndex({
      bars,
      params: { period: 13 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('Klinger Oscillator produces value and signal', () => {
    const result = computeKlingerOscillator({
      bars,
      params: { fast: 34, slow: 55, signal: 13 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
      expect(Number(point.signal)).toBeFinite()
    }
  })

  test('BB Width produces positive values', () => {
    const result = computeBBWidth({
      bars,
      params: { period: 20, stdDev: 2 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThanOrEqual(0)
    }
  })

  test('Historical Volatility produces positive values', () => {
    const result = computeHistoricalVolatility({
      bars,
      params: { period: 20 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThanOrEqual(0)
    }
  })

  test('Pivot Points produces pp, r1-r3, s1-s3', () => {
    const result = computePivotPoints({
      bars,
      params: { method: 'standard' },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.pp)).toBeGreaterThan(0)
      expect(Number(point.r1)).toBeGreaterThanOrEqual(Number(point.pp))
      expect(Number(point.s1)).toBeLessThanOrEqual(Number(point.pp))
    }
  })

  test('DPO produces values', () => {
    const result = computeDPO({
      bars,
      params: { period: 20 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('Williams Fractal produces up and down fields', () => {
    const result = computeWilliamsFractal({
      bars,
      params: { period: 2 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(point).toHaveProperty('up')
      expect(point).toHaveProperty('down')
    }
  })

  test('ZigZag produces values', () => {
    const result = computeZigZag({
      bars,
      params: { deviation: 5 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThan(0)
    }
  })
})

describe('tier 5 indicators', () => {
  const bars = makeBars(150)

  test('SMMA produces values', () => {
    const result = computeSMMA({
      bars,
      params: { period: 7 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThan(0)
    }
  })

  test('LSMA produces values', () => {
    const result = computeLSMA({
      bars,
      params: { period: 25 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThan(0)
    }
  })

  test('McGinley Dynamic produces values', () => {
    const result = computeMcGinleyDynamic({
      bars,
      params: { period: 14 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThan(0)
    }
  })

  test('CMO produces bounded values', () => {
    const result = computeCMO({
      bars,
      params: { period: 9 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const value = Number(point.value)
      expect(value).toBeGreaterThanOrEqual(-101)
      expect(value).toBeLessThanOrEqual(101)
    }
  })

  test('RVI produces value and signal', () => {
    const result = computeRVI({
      bars,
      params: { period: 10, signal: 4 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
      expect(Number(point.signal)).toBeFinite()
    }
  })

  test('TSI produces value and signal', () => {
    const result = computeTSI({
      bars,
      params: { longPeriod: 25, shortPeriod: 13, signal: 7 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
      expect(Number(point.signal)).toBeFinite()
    }
  })

  test('SMI Ergodic produces value and signal', () => {
    const result = computeSMIErgodic({
      bars,
      params: { longPeriod: 20, shortPeriod: 5, signal: 5 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
      expect(Number(point.signal)).toBeFinite()
    }
  })

  test('Connors RSI stays in 0..100', () => {
    const result = computeConnorsRSI({
      bars,
      params: { rsiPeriod: 3, streakPeriod: 2, rankPeriod: 100 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const value = Number(point.value)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })

  test('Balance of Power stays in -1..1', () => {
    const result = computeBalanceOfPower({
      bars,
      params: { period: 14 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const value = Number(point.value)
      expect(value).toBeGreaterThanOrEqual(-1)
      expect(value).toBeLessThanOrEqual(1)
    }
  })

  test('PVT produces cumulative values', () => {
    const result = computePVT({ bars, params: {}, timeframeMs: 60_000 })

    expect(result.length).toBe(bars.length)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('Ease of Movement produces values', () => {
    const result = computeEaseOfMovement({
      bars,
      params: { period: 14 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('Volume Oscillator produces values', () => {
    const result = computeVolumeOscillator({
      bars,
      params: { fast: 5, slow: 10 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('Net Volume produces values', () => {
    const result = computeNetVolume({ bars, params: {}, timeframeMs: 60_000 })

    expect(result.length).toBe(bars.length)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('Standard Deviation produces positive values', () => {
    const result = computeStandardDeviation({
      bars,
      params: { period: 20 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThanOrEqual(0)
    }
  })

  test('Chaikin Volatility produces values', () => {
    const result = computeChaikinVolatility({
      bars,
      params: { emaPeriod: 10, rocPeriod: 10 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('Chaikin Oscillator produces values', () => {
    const result = computeChaikinOscillator({
      bars,
      params: { fast: 3, slow: 10 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('Mass Index produces positive values', () => {
    const result = computeMassIndex({
      bars,
      params: { emaPeriod: 9, sumPeriod: 25 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThan(0)
    }
  })

  test('Chande Kroll Stop produces stopLong and stopShort', () => {
    const result = computeChandeKrollStop({
      bars,
      params: { atrPeriod: 10, firstStop: 1, secondStop: 9 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.stopLong)).toBeGreaterThan(0)
      expect(Number(point.stopShort)).toBeGreaterThan(0)
    }
  })

  test('Relative Volatility Index produces bounded values', () => {
    const result = computeRelativeVolatilityIndex({
      bars,
      params: { period: 10, smoothPeriod: 14 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const value = Number(point.value)
      expect(value).toBeGreaterThanOrEqual(-1)
      expect(value).toBeLessThanOrEqual(101)
    }
  })

  test('Accelerator Oscillator produces values', () => {
    const result = computeAcceleratorOscillator({
      bars,
      params: { fast: 5, slow: 34, smoothPeriod: 5 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('Envelopes produces upper, lower, basis', () => {
    const result = computeEnvelopes({
      bars,
      params: { period: 20, deviation: 10 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const upper = Number(point.upper)
      const lower = Number(point.lower)
      const basis = Number(point.basis)
      expect(upper).toBeGreaterThanOrEqual(basis)
      expect(basis).toBeGreaterThanOrEqual(lower)
    }
  })
})

describe('tier 6 indicators', () => {
  const bars = makeBars(300)

  test('MA Cross produces fast and slow', () => {
    const result = computeMACross({
      bars,
      params: { fastPeriod: 9, slowPeriod: 21 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.fast)).toBeGreaterThan(0)
      expect(Number(point.slow)).toBeGreaterThan(0)
    }
  })

  test('EMA Cross produces fast and slow', () => {
    const result = computeEMACross({
      bars,
      params: { fastPeriod: 9, slowPeriod: 21 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.fast)).toBeGreaterThan(0)
      expect(Number(point.slow)).toBeGreaterThan(0)
    }
  })

  test('MA with EMA Cross produces sma and ema', () => {
    const result = computeMAWithEMACross({
      bars,
      params: { smaPeriod: 10, emaPeriod: 21 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.sma)).toBeGreaterThan(0)
      expect(Number(point.ema)).toBeGreaterThan(0)
    }
  })

  test('Moving Average Channel produces upper, lower, basis', () => {
    const result = computeMovingAverageChannel({
      bars,
      params: { period: 20 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const upper = Number(point.upper)
      const lower = Number(point.lower)
      const basis = Number(point.basis)
      expect(upper).toBeGreaterThanOrEqual(basis)
      expect(basis).toBeGreaterThanOrEqual(lower)
    }
  })

  test('Moving Average Multiple produces keyed MA values', () => {
    const result = computeMovingAverageMultiple({
      bars,
      params: { periods: '10,20,50' },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    const last = result[result.length - 1]
    expect(Number(last.ma_10)).toBeGreaterThan(0)
    expect(Number(last.ma_20)).toBeGreaterThan(0)
    expect(Number(last.ma_50)).toBeGreaterThan(0)
  })

  test('Guppy MMA produces 12 EMA lines', () => {
    const result = computeGuppyMMA({
      bars,
      params: {},
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    const last = result[result.length - 1]
    expect(Number(last.short_3)).toBeGreaterThan(0)
    expect(Number(last.short_15)).toBeGreaterThan(0)
    expect(Number(last.long_30)).toBeGreaterThan(0)
    expect(Number(last.long_60)).toBeGreaterThan(0)
  })

  test('Moving Average Hamming produces values', () => {
    const result = computeMovingAverageHamming({
      bars,
      params: { period: 20 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThan(0)
    }
  })

  test('Price Channel produces upper, lower, middle', () => {
    const result = computePriceChannel({
      bars,
      params: { period: 20 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const upper = Number(point.upper)
      const middle = Number(point.middle)
      const lower = Number(point.lower)
      expect(upper).toBeGreaterThanOrEqual(middle)
      expect(middle).toBeGreaterThanOrEqual(lower)
    }
  })

  test('Linear Regression Curve produces values', () => {
    const result = computeLinearRegressionCurve({
      bars,
      params: { period: 25 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThan(0)
    }
  })

  test('Linear Regression Slope produces values', () => {
    const result = computeLinearRegressionSlope({
      bars,
      params: { period: 25 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('Accumulative Swing Index produces cumulative values', () => {
    const result = computeAccumulativeSwingIndex({
      bars,
      params: {},
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('Price Oscillator produces values', () => {
    const result = computePriceOscillator({
      bars,
      params: { fast: 12, slow: 26 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.value)).toBeFinite()
    }
  })

  test('Directional Movement produces plusDI and minusDI', () => {
    const result = computeDirectionalMovement({
      bars,
      params: { period: 14 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      expect(Number(point.plusDI)).toBeGreaterThanOrEqual(0)
      expect(Number(point.minusDI)).toBeGreaterThanOrEqual(0)
    }
  })

  test('Average Price produces values', () => {
    const result = computeAveragePrice({
      bars,
      params: {},
      timeframeMs: 60_000,
    })

    expect(result.length).toBe(bars.length)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThan(0)
    }
  })

  test('Median Price produces values', () => {
    const result = computeMedianPrice({
      bars,
      params: {},
      timeframeMs: 60_000,
    })

    expect(result.length).toBe(bars.length)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThan(0)
    }
  })

  test('Typical Price produces values', () => {
    const result = computeTypicalPrice({
      bars,
      params: {},
      timeframeMs: 60_000,
    })

    expect(result.length).toBe(bars.length)
    for (const point of result) {
      expect(Number(point.value)).toBeGreaterThan(0)
    }
  })

  test('52 Week High/Low produces upper, lower, middle', () => {
    const result = computeFiftyTwoWeekHighLow({
      bars,
      params: { period: 50 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const upper = Number(point.upper)
      const middle = Number(point.middle)
      const lower = Number(point.lower)
      expect(upper).toBeGreaterThanOrEqual(middle)
      expect(middle).toBeGreaterThanOrEqual(lower)
    }
  })

  test('Trend Strength Index stays in 0..100', () => {
    const result = computeTrendStrengthIndex({
      bars,
      params: { period: 14 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const value = Number(point.value)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })

  test('Rank Correlation Index stays in -100..100', () => {
    const result = computeRankCorrelationIndex({
      bars,
      params: { period: 14 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const value = Number(point.value)
      expect(value).toBeGreaterThanOrEqual(-101)
      expect(value).toBeLessThanOrEqual(101)
    }
  })

  test('Majority Rule stays in 0..100', () => {
    const result = computeMajorityRule({
      bars,
      params: { period: 14 },
      timeframeMs: 60_000,
    })

    expect(result.length).toBeGreaterThan(0)
    for (const point of result) {
      const value = Number(point.value)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })
})
