import { DARK_THEME_TOKENS } from './tokens'
import type {
  ChartTheme,
  InteractionConfig,
  PerformanceConfig,
} from '../../types'

export const DEFAULT_CHART_THEME: ChartTheme = DARK_THEME_TOKENS

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  maxFps: 60,
  enableHiDpi: true,
  indicatorWorker: true,
  viewportMinBars: 20,
}

export const DEFAULT_INTERACTION_CONFIG: InteractionConfig = {
  wheelZoom: true,
  dragPan: true,
  keyboardShortcuts: true,
  drawingSnap: false,
  drawingToolMode: 'sticky',
}
