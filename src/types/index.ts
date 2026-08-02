import type { CSSProperties, ReactNode } from 'react'

import type { CustomSeriesDefinition, CustomSeriesInput } from './custom-series'
import type {
  BarAppendUpdate,
  ChartSeriesInput,
  ChartType,
  SeriesReplaceUpdate,
  TickUpdate,
  Timeframe,
} from './data'
import type {
  DrawingChangeReason,
  DrawingObject,
  DrawingShapeDefinition,
  DrawingStyleDefaults,
  DrawingToolType,
} from './drawings'
import type {
  IndicatorDefinition,
  IndicatorInstance,
  IndicatorInstanceInput,
} from './indicators'
import type { ChartSnapshotLite, FastFinancialChartRef } from './mcp'
import type { PaneInput } from './panes'
import type { SeriesPrimitiveInput } from './primitives'
import type {
  ChartContextMenuPayload,
  ChartEvent,
  ChartHudPayload,
  ChartThemeInput,
  ChartTopBarPayload,
  CrosshairConfig,
  InteractionConfig,
  LocaleConfig,
  MouseEventParams,
  PerformanceConfig,
  SizeChangePayload,
  VisibleTimeRangeChangePayload,
  WatermarkConfig,
} from './theme'
import type {
  ChartViewport,
  ChartViewportPreset,
  CompareMode,
  PriceScaleConfig,
  PriceScaleMode,
  TimeScaleConfig,
} from './viewport'

export * from './data'
export * from './viewport'
export * from './indicators'
export * from './drawings'
export * from './mcp'
export * from './theme'
export * from './panes'
export * from './primitives'
export * from './custom-series'

export type ChartControlledConfig = {
  viewport?: boolean
  drawings?: boolean
  indicators?: boolean
}

export type ChartPluginConfig = {
  indicators?: Array<IndicatorDefinition>
  drawings?: Array<DrawingShapeDefinition>
  primitives?: Array<SeriesPrimitiveInput>
  customSeries?: Array<CustomSeriesDefinition>
}

export type BaselineConfig = {
  baseValue: number
  topFillColor?: string
  bottomFillColor?: string
  topLineColor?: string
  bottomLineColor?: string
  lineWidth?: number
}

export type HistogramConfig = {
  baseValue?: number
}

export type FastFinancialChartProps = {
  series: Array<ChartSeriesInput>
  timeframe: Timeframe
  chartType?: ChartType
  compareMode?: CompareMode
  priceScaleMode?: PriceScaleMode
  priceScale?: PriceScaleConfig
  timeScale?: TimeScaleConfig
  baselineConfig?: BaselineConfig
  histogramConfig?: HistogramConfig
  watermark?: WatermarkConfig
  crosshairConfig?: CrosshairConfig
  localization?: LocaleConfig
  indicators?: Array<IndicatorInstanceInput>
  drawings?: Array<DrawingObject>
  /** Last-used style per tool, applied to newly created drawings. */
  drawingStyleDefaults?: DrawingStyleDefaults
  activeTool?: DrawingToolType | null
  viewport?: ChartViewport
  defaultViewport?: ChartViewportPreset
  theme?: ChartThemeInput
  performance?: Partial<PerformanceConfig>
  interaction?: Partial<InteractionConfig>
  controlled?: ChartControlledConfig
  plugins?: ChartPluginConfig
  /** User pane configurations for multi-pane layouts */
  panes?: Array<PaneInput>
  /** Custom series instances to render */
  customSeries?: Array<CustomSeriesInput>
  snapshotThrottleMs?: number
  className?: string
  style?: CSSProperties
  onViewportChange?: (next: ChartViewport) => void
  onDrawingsChange?: (
    next: Array<DrawingObject>,
    reason: DrawingChangeReason,
  ) => void
  onActiveToolChange?: (tool: DrawingToolType | null) => void
  onRequestTextInput?: (drawingId: string, currentText: string) => void
  onEvent?: (event: ChartEvent) => void
  onContextMenu?: (payload: ChartContextMenuPayload) => void
  onHudUpdate?: (payload: ChartHudPayload) => void
  onClick?: (params: MouseEventParams) => void
  onDblClick?: (params: MouseEventParams) => void
  onCrosshairMove?: (params: MouseEventParams) => void
  onVisibleTimeRangeChange?: (payload: VisibleTimeRangeChangePayload) => void
  onSizeChange?: (payload: SizeChangePayload) => void
  onSnapshot?: (snapshot: ChartSnapshotLite) => void
  onReady?: (ref: FastFinancialChartRef) => void
  renderContextMenu?: (context: ChartContextMenuPayload) => ReactNode
  renderTopBar?: (context: ChartTopBarPayload) => ReactNode
  renderHud?: (context: ChartHudPayload) => ReactNode
  renderIndicatorPaneHeader?: (
    indicators: Array<IndicatorInstance>,
  ) => ReactNode
}

export type FastFinancialChartControllerInput = {
  applyTick: (update: TickUpdate) => void
  applyTicks: (updates: Array<TickUpdate>) => void
  appendBar: (update: BarAppendUpdate) => void
  setSeries: (update: SeriesReplaceUpdate) => void
}
