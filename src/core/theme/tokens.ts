import type { ChartTheme } from '../../types'

export type ThemePreset = 'dark' | 'light'

export const DARK_THEME_TOKENS: ChartTheme = {
  background: '#0b1118',
  grid: '#1c2430',
  axisText: '#8ea0bc',
  axisBackground: '#111925',
  upCandle: '#00d084',
  downCandle: '#ff4f64',
  crosshair: '#4aa8ff',
  selection: '#4aa8ff66',
  drawingHandle: '#f8fafc',
  hudBg: '#111925dd',
  hudText: '#f8fafc',
  fontFamilyMono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSizeAxis: 11,
  fontSizeHud: 10,
  menuZ: 50,
  indicator: {
    macd: {
      signal: '#ffb020',
      histogramUp: '#00d08455',
      histogramDown: '#ff4f6460',
      zeroLine: '#8ea0bc55',
    },
    rsi: {
      guide: '#8b7dff55',
    },
    volume: {
      up: '#00d08455',
      down: '#ff4f6455',
    },
    stochastic: {
      signal: '#ffb020',
      guide: '#8b7dff55',
    },
    ichimoku: {
      tenkan: '#2196f3',
      kijun: '#e91e63',
      senkouA: '#4caf50',
      senkouB: '#f44336',
      chikou: '#9c27b0',
      cloudBullish: '#4caf5022',
      cloudBearish: '#f4433622',
    },
    supertrend: {
      up: '#00d084',
      down: '#ff4f64',
    },
    adx: {
      plusDI: '#00d084',
      minusDI: '#ff4f64',
      guide: '#8ea0bc55',
    },
    oscillator: {
      zeroLine: '#8ea0bc55',
    },
  },
  layout: {
    priceAxisWidth: 74,
    timeAxisHeight: 22,
    gridRows: 6,
    gridColumns: 8,
  },
}

export const LIGHT_THEME_TOKENS: ChartTheme = {
  background: '#ffffff',
  grid: '#e5e7eb',
  axisText: '#6b7280',
  axisBackground: '#f9fafb',
  upCandle: '#16a34a',
  downCandle: '#dc2626',
  crosshair: '#2563eb',
  selection: '#2563eb44',
  drawingHandle: '#1f2937',
  hudBg: '#f9fafbee',
  hudText: '#111827',
  fontFamilyMono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSizeAxis: 11,
  fontSizeHud: 10,
  menuZ: 50,
  indicator: {
    macd: {
      signal: '#d97706',
      histogramUp: '#16a34a55',
      histogramDown: '#dc262660',
      zeroLine: '#9ca3af55',
    },
    rsi: {
      guide: '#7c3aed55',
    },
    volume: {
      up: '#16a34a55',
      down: '#dc262655',
    },
    stochastic: {
      signal: '#d97706',
      guide: '#7c3aed55',
    },
    ichimoku: {
      tenkan: '#1976d2',
      kijun: '#c2185b',
      senkouA: '#388e3c',
      senkouB: '#d32f2f',
      chikou: '#7b1fa2',
      cloudBullish: '#388e3c22',
      cloudBearish: '#d32f2f22',
    },
    supertrend: {
      up: '#16a34a',
      down: '#dc2626',
    },
    adx: {
      plusDI: '#16a34a',
      minusDI: '#dc2626',
      guide: '#9ca3af55',
    },
    oscillator: {
      zeroLine: '#9ca3af55',
    },
  },
  layout: {
    priceAxisWidth: 74,
    timeAxisHeight: 22,
    gridRows: 6,
    gridColumns: 8,
  },
}

/** @deprecated Use DARK_THEME_TOKENS instead */
export const THEME_TOKENS = DARK_THEME_TOKENS

export const getThemePreset = (preset: ThemePreset): ChartTheme =>
  preset === 'light' ? LIGHT_THEME_TOKENS : DARK_THEME_TOKENS
