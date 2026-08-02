import { INDICATOR_COMPUTE_DISPATCH } from './compute/dispatch'
import { adPresenter } from './presenters/ad-presenter'
import { adxPresenter } from './presenters/adx-presenter'
import { alligatorPresenter } from './presenters/alligator-presenter'
import { aroonPresenter } from './presenters/aroon-presenter'
import { atrPresenter } from './presenters/atr-presenter'
import { awesomeOscillatorPresenter } from './presenters/awesome-oscillator-presenter'
import {
  donchianPresenter,
  fiftyTwoWeekPresenter,
  keltnerPresenter,
  priceChannelPresenter,
} from './presenters/band-presenter'
import { chandeKrollStopPresenter } from './presenters/chande-kroll-stop-presenter'
import { directionalMovementPresenter } from './presenters/directional-movement-presenter'
import { choppinessPresenter } from './presenters/choppiness-presenter'
import { bollingerPresenter } from './presenters/bollinger-presenter'
import { emaPresenter } from './presenters/ema-presenter'
import { envelopesPresenter } from './presenters/envelopes-presenter'
import { guppyPresenter } from './presenters/guppy-presenter'
import { ichimokuPresenter } from './presenters/ichimoku-presenter'
import {
  emaCrossPresenter,
  maCrossPresenter,
  maWithEmaCrossPresenter,
} from './presenters/ma-cross-presenter'
import { macdPresenter } from './presenters/macd-presenter'
import { massIndexPresenter } from './presenters/mass-index-presenter'
import { mfiPresenter } from './presenters/mfi-presenter'
import { multiMaPresenter } from './presenters/multi-ma-presenter'
import { obvPresenter } from './presenters/obv-presenter'
import { parabolicSarPresenter } from './presenters/parabolic-sar-presenter'
import { pivotPointsPresenter } from './presenters/pivot-points-presenter'
import { rsiPresenter } from './presenters/rsi-presenter'
import {
  fisherPresenter,
  klingerPresenter,
  kstPresenter,
  rviPresenter,
  smiErgodicPresenter,
  tsiPresenter,
} from './presenters/signal-line-presenter'
import { smaPresenter } from './presenters/sma-presenter'
import { stochRsiPresenter } from './presenters/stoch-rsi-presenter'
import { stochasticPresenter } from './presenters/stochastic-presenter'
import { supertrendPresenter } from './presenters/supertrend-presenter'
import { trixPresenter } from './presenters/trix-presenter'
import { ultimateOscillatorPresenter } from './presenters/ultimate-oscillator-presenter'
import { volumePresenter } from './presenters/volume-presenter'
import { vortexPresenter } from './presenters/vortex-presenter'
import { vwapPresenter } from './presenters/vwap-presenter'
import { williamsFractalPresenter } from './presenters/williams-fractal-presenter'
import { williamsRPresenter } from './presenters/williams-r-presenter'
import { zigzagPresenter } from './presenters/zigzag-presenter'
import {
  bbPercentPresenter,
  bbWidthPresenter,
  bopPresenter,
  cciPresenter,
  chaikinOscPresenter,
  chaikinVolPresenter,
  cmfPresenter,
  cmoPresenter,
  coppockPresenter,
  dpoPresenter,
  elderForcePresenter,
  eomPresenter,
  historicalVolPresenter,
  linRegSlopePresenter,
  momentumPresenter,
  netVolumePresenter,
  priceOscPresenter,
  rankCorrelationPresenter,
  rocPresenter,
  stdDevPresenter,
  volumeOscPresenter,
} from './presenters/zero-line-presenter'
import type { IndicatorDefinition, IndicatorInstance } from '../../types'

export class DefaultIndicatorRegistry {
  private readonly definitions = new Map<
    IndicatorInstance['type'],
    IndicatorDefinition
  >()

  register(definition: IndicatorDefinition): void {
    this.definitions.set(definition.type, definition)
  }

  remove(type: IndicatorInstance['type']): boolean {
    return this.definitions.delete(type)
  }

  get(type: IndicatorInstance['type']): IndicatorDefinition | undefined {
    return this.definitions.get(type)
  }

  all(): Array<IndicatorDefinition> {
    return Array.from(this.definitions.values())
  }

  registerDefaults(): void {
    this.register({
      type: 'EMA',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.EMA,
      presenter: emaPresenter,
      supportsIncremental: true,
    })

    this.register({
      type: 'SMA',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.SMA,
      presenter: smaPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'VWAP',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.VWAP,
      presenter: vwapPresenter,
      supportsIncremental: true,
    })

    this.register({
      type: 'BollingerBands',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.BollingerBands,
      presenter: bollingerPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'RSI',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.RSI,
      presenter: rsiPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'MACD',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.MACD,
      presenter: macdPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'ATR',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.ATR,
      presenter: atrPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'Volume',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.Volume,
      presenter: volumePresenter,
      supportsIncremental: true,
    })

    // Tier 1
    this.register({
      type: 'Stochastic',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.Stochastic,
      presenter: stochasticPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'StochRSI',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.StochRSI,
      presenter: stochRsiPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'SuperTrend',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.SuperTrend,
      presenter: supertrendPresenter,
      supportsIncremental: true,
    })

    this.register({
      type: 'Ichimoku',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.Ichimoku,
      presenter: ichimokuPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'ADX',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.ADX,
      presenter: adxPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'OBV',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.OBV,
      presenter: obvPresenter,
      supportsIncremental: true,
    })

    this.register({
      type: 'DonchianChannels',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.DonchianChannels,
      presenter: donchianPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'KeltnerChannels',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.KeltnerChannels,
      presenter: keltnerPresenter,
      supportsIncremental: false,
    })

    // Tier 2
    this.register({
      type: 'WilliamsR',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.WilliamsR,
      presenter: williamsRPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'ParabolicSAR',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.ParabolicSAR,
      presenter: parabolicSarPresenter,
      supportsIncremental: true,
    })

    this.register({
      type: 'MFI',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.MFI,
      presenter: mfiPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'CMF',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.CMF,
      presenter: cmfPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'AD',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.AD,
      presenter: adPresenter,
      supportsIncremental: true,
    })

    this.register({
      type: 'ROC',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.ROC,
      presenter: rocPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'WMA',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.WMA,
      presenter: smaPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'DEMA',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.DEMA,
      presenter: emaPresenter,
      supportsIncremental: true,
    })

    this.register({
      type: 'TEMA',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.TEMA,
      presenter: emaPresenter,
      supportsIncremental: true,
    })

    // Tier 3
    this.register({
      type: 'Aroon',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.Aroon,
      presenter: aroonPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'Momentum',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.Momentum,
      presenter: momentumPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'CCI',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.CCI,
      presenter: cciPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'Alligator',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.Alligator,
      presenter: alligatorPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'BBPercent',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.BBPercent,
      presenter: bbPercentPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'TRIX',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.TRIX,
      presenter: trixPresenter,
      supportsIncremental: false,
    })

    // Tier 4
    this.register({
      type: 'HMA',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.HMA,
      presenter: smaPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'VWMA',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.VWMA,
      presenter: smaPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'ALMA',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.ALMA,
      presenter: smaPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'KAMA',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.KAMA,
      presenter: emaPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'AwesomeOscillator',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.AwesomeOscillator,
      presenter: awesomeOscillatorPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'ChoppinessIndex',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.ChoppinessIndex,
      presenter: choppinessPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'FisherTransform',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.FisherTransform,
      presenter: fisherPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'VortexIndicator',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.VortexIndicator,
      presenter: vortexPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'UltimateOscillator',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.UltimateOscillator,
      presenter: ultimateOscillatorPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'CoppockCurve',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.CoppockCurve,
      presenter: coppockPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'KST',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.KST,
      presenter: kstPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'ElderForceIndex',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.ElderForceIndex,
      presenter: elderForcePresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'KlingerOscillator',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.KlingerOscillator,
      presenter: klingerPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'BBWidth',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.BBWidth,
      presenter: bbWidthPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'HistoricalVolatility',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.HistoricalVolatility,
      presenter: historicalVolPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'PivotPoints',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.PivotPoints,
      presenter: pivotPointsPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'DPO',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.DPO,
      presenter: dpoPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'WilliamsFractal',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.WilliamsFractal,
      presenter: williamsFractalPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'ZigZag',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.ZigZag,
      presenter: zigzagPresenter,
      supportsIncremental: false,
    })

    // Tier 5
    this.register({
      type: 'SMMA',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.SMMA,
      presenter: smaPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'LSMA',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.LSMA,
      presenter: smaPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'McGinleyDynamic',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.McGinleyDynamic,
      presenter: emaPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'CMO',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.CMO,
      presenter: cmoPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'RVI',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.RVI,
      presenter: rviPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'TSI',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.TSI,
      presenter: tsiPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'SMIErgodic',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.SMIErgodic,
      presenter: smiErgodicPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'ConnorsRSI',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.ConnorsRSI,
      presenter: rsiPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'BalanceOfPower',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.BalanceOfPower,
      presenter: bopPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'PVT',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.PVT,
      presenter: obvPresenter,
      supportsIncremental: true,
    })

    this.register({
      type: 'EaseOfMovement',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.EaseOfMovement,
      presenter: eomPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'VolumeOscillator',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.VolumeOscillator,
      presenter: volumeOscPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'NetVolume',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.NetVolume,
      presenter: netVolumePresenter,
      supportsIncremental: true,
    })

    this.register({
      type: 'StandardDeviation',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.StandardDeviation,
      presenter: stdDevPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'ChaikinVolatility',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.ChaikinVolatility,
      presenter: chaikinVolPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'ChaikinOscillator',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.ChaikinOscillator,
      presenter: chaikinOscPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'MassIndex',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.MassIndex,
      presenter: massIndexPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'ChandeKrollStop',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.ChandeKrollStop,
      presenter: chandeKrollStopPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'RelativeVolatilityIndex',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.RelativeVolatilityIndex,
      presenter: rsiPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'AcceleratorOscillator',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.AcceleratorOscillator,
      presenter: awesomeOscillatorPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'Envelopes',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.Envelopes,
      presenter: envelopesPresenter,
      supportsIncremental: false,
    })

    // Tier 6
    this.register({
      type: 'MACross',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.MACross,
      presenter: maCrossPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'EMACross',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.EMACross,
      presenter: emaCrossPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'MAWithEMACross',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.MAWithEMACross,
      presenter: maWithEmaCrossPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'MovingAverageChannel',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.MovingAverageChannel,
      presenter: envelopesPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'MovingAverageMultiple',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.MovingAverageMultiple,
      presenter: multiMaPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'GuppyMMA',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.GuppyMMA,
      presenter: guppyPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'MovingAverageHamming',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.MovingAverageHamming,
      presenter: smaPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'PriceChannel',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.PriceChannel,
      presenter: priceChannelPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'LinearRegressionCurve',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.LinearRegressionCurve,
      presenter: smaPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'LinearRegressionSlope',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.LinearRegressionSlope,
      presenter: linRegSlopePresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'AccumulativeSwingIndex',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.AccumulativeSwingIndex,
      presenter: obvPresenter,
      supportsIncremental: true,
    })

    this.register({
      type: 'PriceOscillator',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.PriceOscillator,
      presenter: priceOscPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'DirectionalMovement',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.DirectionalMovement,
      presenter: directionalMovementPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'AveragePrice',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.AveragePrice,
      presenter: smaPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'MedianPrice',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.MedianPrice,
      presenter: smaPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'TypicalPrice',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.TypicalPrice,
      presenter: smaPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'FiftyTwoWeekHighLow',
      pane: 'overlay',
      compute: INDICATOR_COMPUTE_DISPATCH.FiftyTwoWeekHighLow,
      presenter: fiftyTwoWeekPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'TrendStrengthIndex',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.TrendStrengthIndex,
      presenter: rsiPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'RankCorrelationIndex',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.RankCorrelationIndex,
      presenter: rankCorrelationPresenter,
      supportsIncremental: false,
    })

    this.register({
      type: 'MajorityRule',
      pane: 'separate',
      compute: INDICATOR_COMPUTE_DISPATCH.MajorityRule,
      presenter: rsiPresenter,
      supportsIncremental: false,
    })
  }
}

export const createDefaultIndicatorRegistry = (): DefaultIndicatorRegistry => {
  const registry = new DefaultIndicatorRegistry()
  registry.registerDefaults()
  return registry
}
