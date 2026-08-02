import {
  DEFAULT_CHART_THEME,
  DEFAULT_INTERACTION_CONFIG,
  DEFAULT_PERFORMANCE_CONFIG,
} from './default-theme'
import type {
  ChartTheme,
  ChartThemeInput,
  InteractionConfig,
  PerformanceConfig,
} from '../../types'

export const resolveTheme = (theme?: ChartThemeInput): ChartTheme => {
  const indicator = {
    ...DEFAULT_CHART_THEME.indicator,
    ...(theme?.indicator ?? {}),
    macd: {
      ...DEFAULT_CHART_THEME.indicator.macd,
      ...(theme?.indicator?.macd ?? {}),
    },
    rsi: {
      ...DEFAULT_CHART_THEME.indicator.rsi,
      ...(theme?.indicator?.rsi ?? {}),
    },
    volume: {
      ...DEFAULT_CHART_THEME.indicator.volume,
      ...(theme?.indicator?.volume ?? {}),
    },
    stochastic: {
      ...DEFAULT_CHART_THEME.indicator.stochastic,
      ...(theme?.indicator?.stochastic ?? {}),
    },
    ichimoku: {
      ...DEFAULT_CHART_THEME.indicator.ichimoku,
      ...(theme?.indicator?.ichimoku ?? {}),
    },
    supertrend: {
      ...DEFAULT_CHART_THEME.indicator.supertrend,
      ...(theme?.indicator?.supertrend ?? {}),
    },
    adx: {
      ...DEFAULT_CHART_THEME.indicator.adx,
      ...(theme?.indicator?.adx ?? {}),
    },
    oscillator: {
      ...DEFAULT_CHART_THEME.indicator.oscillator,
      ...(theme?.indicator?.oscillator ?? {}),
    },
  }

  const layout = {
    ...DEFAULT_CHART_THEME.layout,
    ...(theme?.layout ?? {}),
  }

  return {
    ...DEFAULT_CHART_THEME,
    ...theme,
    indicator,
    layout,
  }
}

export const resolvePerformanceConfig = (
  performance?: Partial<PerformanceConfig>,
): PerformanceConfig => {
  return {
    ...DEFAULT_PERFORMANCE_CONFIG,
    ...performance,
  }
}

export const resolveInteractionConfig = (
  interaction?: Partial<InteractionConfig>,
): InteractionConfig => {
  return {
    ...DEFAULT_INTERACTION_CONFIG,
    ...interaction,
  }
}
