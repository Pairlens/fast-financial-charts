export {
  createDefaultIndicatorRegistry,
  DefaultIndicatorRegistry,
} from './core/indicators/registry'
export { computeEMA } from './core/indicators/compute/ema'
export { computeSMA } from './core/indicators/compute/sma'
export { computeRSI } from './core/indicators/compute/rsi'
export { computeMACD } from './core/indicators/compute/macd'
export { computeBollingerBands } from './core/indicators/compute/bollinger'
export { computeVWAP } from './core/indicators/compute/vwap'
export { computeATR } from './core/indicators/compute/atr'
export { INDICATOR_COMPUTE_DISPATCH } from './core/indicators/compute/dispatch'
export {
  computeCustomIndicator,
  isCustomIndicatorType,
} from './core/indicators/custom-compute'
export {
  createCustomIndicatorPresenter,
  resolveCustomSeriesColor,
} from './core/indicators/presenters/custom-series-presenter'
export type {
  CustomRenderSeriesSpec,
  CustomRenderSpec,
} from './core/indicators/presenters/custom-series-presenter'
