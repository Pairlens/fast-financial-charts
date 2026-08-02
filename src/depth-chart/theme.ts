import type { ChartTheme } from '../types'
import type { DepthChartTheme, DepthChartThemeInput } from './types'

export const DARK_DEPTH_THEME: DepthChartTheme = {
  background: 'transparent',
  grid: 'rgba(128, 128, 128, 0.08)',
  axisText: 'rgba(160, 160, 160, 0.7)',
  crosshair: 'rgba(160, 160, 160, 0.4)',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSizeAxis: 10,
  fontSizeLabel: 9,
  bid: {
    stroke: '#22c55e',
    fillTop: 'rgba(34, 197, 94, 0.25)',
    fillBottom: 'rgba(34, 197, 94, 0.03)',
  },
  ask: {
    stroke: '#ef4444',
    fillTop: 'rgba(239, 68, 68, 0.25)',
    fillBottom: 'rgba(239, 68, 68, 0.03)',
  },
  spread: {
    line: 'rgba(160, 160, 160, 0.25)',
    text: 'rgba(160, 160, 160, 0.6)',
  },
  tooltip: {
    background: 'rgba(15, 15, 20, 0.95)',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#f8fafc',
    mutedText: 'rgba(160, 160, 160, 0.7)',
  },
  padding: {
    top: 20,
    bottom: 24,
    left: 50,
    right: 12,
  },
}

export const LIGHT_DEPTH_THEME: DepthChartTheme = {
  background: 'transparent',
  grid: 'rgba(128, 128, 128, 0.12)',
  axisText: 'rgba(100, 100, 110, 0.8)',
  crosshair: 'rgba(100, 100, 110, 0.4)',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSizeAxis: 10,
  fontSizeLabel: 9,
  bid: {
    stroke: '#16a34a',
    fillTop: 'rgba(22, 163, 74, 0.2)',
    fillBottom: 'rgba(22, 163, 74, 0.02)',
  },
  ask: {
    stroke: '#dc2626',
    fillTop: 'rgba(220, 38, 38, 0.2)',
    fillBottom: 'rgba(220, 38, 38, 0.02)',
  },
  spread: {
    line: 'rgba(100, 100, 110, 0.25)',
    text: 'rgba(100, 100, 110, 0.6)',
  },
  tooltip: {
    background: 'rgba(255, 255, 255, 0.95)',
    border: 'rgba(0, 0, 0, 0.1)',
    text: '#111827',
    mutedText: 'rgba(100, 100, 110, 0.7)',
  },
  padding: {
    top: 20,
    bottom: 24,
    left: 50,
    right: 12,
  },
}

/** Deep-merge a partial theme input onto a base theme. */
export function resolveDepthChartTheme(
  base: DepthChartTheme,
  input?: DepthChartThemeInput,
): DepthChartTheme {
  if (!input) return base
  return {
    background: input.background ?? base.background,
    grid: input.grid ?? base.grid,
    axisText: input.axisText ?? base.axisText,
    crosshair: input.crosshair ?? base.crosshair,
    fontFamily: input.fontFamily ?? base.fontFamily,
    fontSizeAxis: input.fontSizeAxis ?? base.fontSizeAxis,
    fontSizeLabel: input.fontSizeLabel ?? base.fontSizeLabel,
    bid: { ...base.bid, ...input.bid },
    ask: { ...base.ask, ...input.ask },
    spread: { ...base.spread, ...input.spread },
    tooltip: { ...base.tooltip, ...input.tooltip },
    padding: { ...base.padding, ...input.padding },
  }
}

/**
 * Derive a depth chart theme from a main ChartTheme.
 * Maps upCandle → bid, downCandle → ask, and uses shared font/grid tokens.
 */
export function createDepthChartThemeFromChart(
  chartTheme: ChartTheme,
): DepthChartTheme {
  return {
    background: 'transparent',
    grid: hexToRgba(chartTheme.grid, 0.3),
    axisText: hexToRgba(chartTheme.axisText, 0.7),
    crosshair: hexToRgba(chartTheme.crosshair, 0.4),
    fontFamily: chartTheme.fontFamilyMono,
    fontSizeAxis: chartTheme.fontSizeAxis - 1,
    fontSizeLabel: chartTheme.fontSizeAxis - 2,
    bid: {
      stroke: chartTheme.upCandle,
      fillTop: hexToRgba(chartTheme.upCandle, 0.25),
      fillBottom: hexToRgba(chartTheme.upCandle, 0.03),
    },
    ask: {
      stroke: chartTheme.downCandle,
      fillTop: hexToRgba(chartTheme.downCandle, 0.25),
      fillBottom: hexToRgba(chartTheme.downCandle, 0.03),
    },
    spread: {
      line: hexToRgba(chartTheme.axisText, 0.25),
      text: hexToRgba(chartTheme.axisText, 0.6),
    },
    tooltip: {
      background: hexToRgba(
        chartTheme.hudBg.replace(/[a-f0-9]{2}$/i, ''),
        0.95,
      ),
      border: hexToRgba(chartTheme.hudText, 0.1),
      text: chartTheme.hudText,
      mutedText: hexToRgba(chartTheme.axisText, 0.7),
    },
    padding: {
      top: 20,
      bottom: 24,
      left: 50,
      right: 12,
    },
  }
}

function hexToRgba(hex: string, alpha: number): string {
  // Already rgba? Return as-is
  if (hex.startsWith('rgba')) return hex
  if (hex.startsWith('rgb(')) {
    return hex.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
  }
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
