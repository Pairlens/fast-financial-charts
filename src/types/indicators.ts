import type { ChartBar, ChartSeriesInput } from './data'
import type { ChartTheme } from './theme'
import type { ChartViewport, CompareMode } from './viewport'

export type BuiltInIndicatorType =
  | 'EMA'
  | 'SMA'
  | 'RSI'
  | 'MACD'
  | 'BollingerBands'
  | 'VWAP'
  | 'ATR'
  | 'Volume'
  // Tier 1
  | 'Stochastic'
  | 'StochRSI'
  | 'SuperTrend'
  | 'Ichimoku'
  | 'ADX'
  | 'OBV'
  | 'DonchianChannels'
  | 'KeltnerChannels'
  // Tier 2
  | 'WilliamsR'
  | 'ParabolicSAR'
  | 'MFI'
  | 'CMF'
  | 'AD'
  | 'ROC'
  | 'WMA'
  | 'DEMA'
  | 'TEMA'
  // Tier 3
  | 'Aroon'
  | 'Momentum'
  | 'CCI'
  | 'Alligator'
  | 'BBPercent'
  | 'TRIX'
  // Tier 4
  | 'HMA'
  | 'VWMA'
  | 'ALMA'
  | 'KAMA'
  | 'AwesomeOscillator'
  | 'ChoppinessIndex'
  | 'FisherTransform'
  | 'VortexIndicator'
  | 'UltimateOscillator'
  | 'CoppockCurve'
  | 'KST'
  | 'ElderForceIndex'
  | 'KlingerOscillator'
  | 'BBWidth'
  | 'HistoricalVolatility'
  | 'PivotPoints'
  | 'DPO'
  | 'WilliamsFractal'
  | 'ZigZag'
  // Tier 5
  | 'SMMA'
  | 'LSMA'
  | 'McGinleyDynamic'
  | 'CMO'
  | 'RVI'
  | 'TSI'
  | 'SMIErgodic'
  | 'ConnorsRSI'
  | 'BalanceOfPower'
  | 'PVT'
  | 'EaseOfMovement'
  | 'VolumeOscillator'
  | 'NetVolume'
  | 'StandardDeviation'
  | 'ChaikinVolatility'
  | 'ChaikinOscillator'
  | 'MassIndex'
  | 'ChandeKrollStop'
  | 'RelativeVolatilityIndex'
  | 'AcceleratorOscillator'
  | 'Envelopes'
  // Tier 6
  | 'MACross'
  | 'EMACross'
  | 'MAWithEMACross'
  | 'MovingAverageChannel'
  | 'MovingAverageMultiple'
  | 'GuppyMMA'
  | 'MovingAverageHamming'
  | 'PriceChannel'
  | 'LinearRegressionCurve'
  | 'LinearRegressionSlope'
  | 'AccumulativeSwingIndex'
  | 'PriceOscillator'
  | 'DirectionalMovement'
  | 'AveragePrice'
  | 'MedianPrice'
  | 'TypicalPrice'
  | 'FiftyTwoWeekHighLow'
  | 'TrendStrengthIndex'
  | 'RankCorrelationIndex'
  | 'MajorityRule'

export type IndicatorType = BuiltInIndicatorType | `custom:${string}`

/**
 * Where an indicator renders:
 * - `'overlay'` — on the main chart pane (e.g. EMA, Bollinger)
 * - `'separate'` — in the default separate pane (legacy; auto-assigned)
 * - A PaneId string — in a specific user-created pane
 */
export type IndicatorPane = 'overlay' | 'separate' | (string & {})

export type IndicatorParams = Record<string, boolean | number | string>

export type IndicatorValuePoint = {
  ts: number
  value?: number
  [key: string]: boolean | number | string | undefined
}

export type IndicatorInstanceInput = {
  id?: string
  type: IndicatorType
  seriesId: string
  params?: IndicatorParams
  pane?: IndicatorPane
  /** Explicit pane assignment (overrides `pane` when set to a PaneId) */
  paneId?: string
  color?: string
  visible?: boolean
}

export type IndicatorInstance = {
  id: string
  type: IndicatorType
  seriesId: string
  params: IndicatorParams
  pane: IndicatorPane
  /** Explicit pane assignment (set when indicator is assigned to a user-created pane) */
  paneId?: string
  color: string
  visible: boolean
}

export type IndicatorComputeContext = {
  bars: Array<ChartBar>
  params: IndicatorParams
  timeframeMs: number
}

/**
 * Synchronous compute function — the contract for built-in indicators, which
 * run inside the indicator worker (workers can't await host-side runtimes).
 */
export type SyncIndicatorComputeFn = (
  context: IndicatorComputeContext,
) => Array<IndicatorValuePoint>

/**
 * Indicator compute function. Registry-defined `custom:*` indicators may
 * return a Promise (e.g. values produced by an external Python runtime);
 * they are awaited on the main thread instead of the indicator worker.
 */
export type IndicatorComputeFn = (
  context: IndicatorComputeContext,
) => Array<IndicatorValuePoint> | Promise<Array<IndicatorValuePoint>>

export type IndicatorPresenterContext = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  viewport: ChartViewport
  bars: Array<ChartBar>
  values: Array<IndicatorValuePoint>
  indicator: IndicatorInstance
  compareMode: CompareMode
  theme: ChartTheme
}

export type IndicatorPresenter = (context: IndicatorPresenterContext) => void

export type IndicatorDefinition = {
  type: IndicatorType
  pane: IndicatorPane
  compute: IndicatorComputeFn
  presenter: IndicatorPresenter
  supportsIncremental: boolean
  backend?: 'canvas2d' | 'webgl'
}

export type IndicatorComputation = {
  indicator: IndicatorInstance
  values: Array<IndicatorValuePoint>
  computedAt: number
}

export type IndicatorMap = Map<string, IndicatorComputation>

export type IndicatorWorkerRequest = {
  requestId: string
  indicator: IndicatorInstance
  bars: Array<ChartBar>
  timeframeMs: number
}

export type IndicatorWorkerResponse = {
  requestId: string
  indicatorId: string
  values: Array<IndicatorValuePoint>
  error?: string
}

export type IndicatorWorkerLike = {
  compute: (request: IndicatorWorkerRequest) => Promise<IndicatorWorkerResponse>
  dispose: () => void
}

export type SeriesWithIndicators = {
  series: ChartSeriesInput
  indicators: Array<IndicatorComputation>
}
