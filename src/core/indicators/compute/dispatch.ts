import { computeAcceleratorOscillator } from './accelerator-oscillator'
import { computeAccumulativeSwingIndex } from './accumulative-swing-index'
import { computeAD } from './ad'
import { computeAveragePrice } from './average-price'
import { computeADX } from './adx'
import { computeALMA } from './alma'
import { computeAlligator } from './alligator'
import { computeAroon } from './aroon'
import { computeATR } from './atr'
import { computeAwesomeOscillator } from './awesome-oscillator'
import { computeBalanceOfPower } from './balance-of-power'
import { computeBBPercent } from './bb-percent'
import { computeBBWidth } from './bb-width'
import { computeBollingerBands } from './bollinger'
import { computeCCI } from './cci'
import { computeChaikinOscillator } from './chaikin-oscillator'
import { computeChaikinVolatility } from './chaikin-volatility'
import { computeChandeKrollStop } from './chande-kroll-stop'
import { computeChoppinessIndex } from './choppiness-index'
import { computeCMF } from './cmf'
import { computeCMO } from './cmo'
import { computeConnorsRSI } from './connors-rsi'
import { computeCoppockCurve } from './coppock-curve'
import { computeDEMA } from './dema'
import { computeDirectionalMovement } from './directional-movement'
import { computeDonchianChannels } from './donchian'
import { computeDPO } from './dpo'
import { computeEaseOfMovement } from './ease-of-movement'
import { computeElderForceIndex } from './elder-force-index'
import { computeEMA } from './ema'
import { computeEMACross } from './ema-cross'
import { computeEnvelopes } from './envelopes'
import { computeFiftyTwoWeekHighLow } from './fifty-two-week-high-low'
import { computeFisherTransform } from './fisher-transform'
import { computeGuppyMMA } from './guppy-mma'
import { computeHistoricalVolatility } from './historical-volatility'
import { computeHMA } from './hma'
import { computeIchimoku } from './ichimoku'
import { computeKAMA } from './kama'
import { computeKeltnerChannels } from './keltner'
import { computeLSMA } from './lsma'
import { computeLinearRegressionCurve } from './linear-regression-curve'
import { computeLinearRegressionSlope } from './linear-regression-slope'
import { computeKlingerOscillator } from './klinger'
import { computeKST } from './kst'
import { computeMACross } from './ma-cross'
import { computeMAWithEMACross } from './ma-with-ema-cross'
import { computeMACD } from './macd'
import { computeMajorityRule } from './majority-rule'
import { computeMassIndex } from './mass-index'
import { computeMcGinleyDynamic } from './mcginley-dynamic'
import { computeMedianPrice } from './median-price'
import { computeMFI } from './mfi'
import { computeMomentum } from './momentum'
import { computeMovingAverageChannel } from './moving-average-channel'
import { computeMovingAverageHamming } from './moving-average-hamming'
import { computeMovingAverageMultiple } from './moving-average-multiple'
import { computeNetVolume } from './net-volume'
import { computeOBV } from './obv'
import { computeParabolicSAR } from './parabolic-sar'
import { computePivotPoints } from './pivot-points'
import { computePriceChannel } from './price-channel'
import { computePriceOscillator } from './price-oscillator'
import { computePVT } from './pvt'
import { computeRankCorrelationIndex } from './rank-correlation-index'
import { computeRelativeVolatilityIndex } from './relative-volatility-index'
import { computeROC } from './roc'
import { computeRSI } from './rsi'
import { computeRVI } from './rvi'
import { computeSMA } from './sma'
import { computeSMIErgodic } from './smi-ergodic'
import { computeSMMA } from './smma'
import { computeStandardDeviation } from './standard-deviation'
import { computeStochastic } from './stochastic'
import { computeStochRSI } from './stoch-rsi'
import { computeSuperTrend } from './supertrend'
import { computeTEMA } from './tema'
import { computeTRIX } from './trix'
import { computeTrendStrengthIndex } from './trend-strength-index'
import { computeTSI } from './tsi'
import { computeTypicalPrice } from './typical-price'
import { computeUltimateOscillator } from './ultimate-oscillator'
import { computeVortexIndicator } from './vortex'
import { computeVWAP } from './vwap'
import { computeVolumeOscillator } from './volume-oscillator'
import { computeVWMA } from './vwma'
import { computeWilliamsFractal } from './williams-fractal'
import { computeWilliamsR } from './williams-r'
import { computeWMA } from './wma'
import { computeZigZag } from './zigzag'
import type { SyncIndicatorComputeFn } from '../../../types'

export const INDICATOR_COMPUTE_DISPATCH: Record<
  string,
  SyncIndicatorComputeFn
> = {
  EMA: computeEMA,
  SMA: computeSMA,
  RSI: computeRSI,
  MACD: computeMACD,
  BollingerBands: computeBollingerBands,
  VWAP: computeVWAP,
  ATR: computeATR,
  Volume: ({ bars }) => bars.map((bar) => ({ ts: bar.ts, value: bar.volume })),
  // Tier 1
  Stochastic: computeStochastic,
  StochRSI: computeStochRSI,
  SuperTrend: computeSuperTrend,
  Ichimoku: computeIchimoku,
  ADX: computeADX,
  OBV: computeOBV,
  DonchianChannels: computeDonchianChannels,
  KeltnerChannels: computeKeltnerChannels,
  // Tier 2
  WilliamsR: computeWilliamsR,
  ParabolicSAR: computeParabolicSAR,
  MFI: computeMFI,
  CMF: computeCMF,
  AD: computeAD,
  ROC: computeROC,
  WMA: computeWMA,
  DEMA: computeDEMA,
  TEMA: computeTEMA,
  // Tier 3
  Aroon: computeAroon,
  Momentum: computeMomentum,
  CCI: computeCCI,
  Alligator: computeAlligator,
  BBPercent: computeBBPercent,
  TRIX: computeTRIX,
  // Tier 4
  HMA: computeHMA,
  VWMA: computeVWMA,
  ALMA: computeALMA,
  KAMA: computeKAMA,
  AwesomeOscillator: computeAwesomeOscillator,
  ChoppinessIndex: computeChoppinessIndex,
  FisherTransform: computeFisherTransform,
  VortexIndicator: computeVortexIndicator,
  UltimateOscillator: computeUltimateOscillator,
  CoppockCurve: computeCoppockCurve,
  KST: computeKST,
  ElderForceIndex: computeElderForceIndex,
  KlingerOscillator: computeKlingerOscillator,
  BBWidth: computeBBWidth,
  HistoricalVolatility: computeHistoricalVolatility,
  PivotPoints: computePivotPoints,
  DPO: computeDPO,
  WilliamsFractal: computeWilliamsFractal,
  ZigZag: computeZigZag,
  // Tier 5
  SMMA: computeSMMA,
  LSMA: computeLSMA,
  McGinleyDynamic: computeMcGinleyDynamic,
  CMO: computeCMO,
  RVI: computeRVI,
  TSI: computeTSI,
  SMIErgodic: computeSMIErgodic,
  ConnorsRSI: computeConnorsRSI,
  BalanceOfPower: computeBalanceOfPower,
  PVT: computePVT,
  EaseOfMovement: computeEaseOfMovement,
  VolumeOscillator: computeVolumeOscillator,
  NetVolume: computeNetVolume,
  StandardDeviation: computeStandardDeviation,
  ChaikinVolatility: computeChaikinVolatility,
  ChaikinOscillator: computeChaikinOscillator,
  MassIndex: computeMassIndex,
  ChandeKrollStop: computeChandeKrollStop,
  RelativeVolatilityIndex: computeRelativeVolatilityIndex,
  AcceleratorOscillator: computeAcceleratorOscillator,
  Envelopes: computeEnvelopes,
  // Tier 6
  MACross: computeMACross,
  EMACross: computeEMACross,
  MAWithEMACross: computeMAWithEMACross,
  MovingAverageChannel: computeMovingAverageChannel,
  MovingAverageMultiple: computeMovingAverageMultiple,
  GuppyMMA: computeGuppyMMA,
  MovingAverageHamming: computeMovingAverageHamming,
  PriceChannel: computePriceChannel,
  LinearRegressionCurve: computeLinearRegressionCurve,
  LinearRegressionSlope: computeLinearRegressionSlope,
  AccumulativeSwingIndex: computeAccumulativeSwingIndex,
  PriceOscillator: computePriceOscillator,
  DirectionalMovement: computeDirectionalMovement,
  AveragePrice: computeAveragePrice,
  MedianPrice: computeMedianPrice,
  TypicalPrice: computeTypicalPrice,
  FiftyTwoWeekHighLow: computeFiftyTwoWeekHighLow,
  TrendStrengthIndex: computeTrendStrengthIndex,
  RankCorrelationIndex: computeRankCorrelationIndex,
  MajorityRule: computeMajorityRule,
}
