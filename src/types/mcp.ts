import type {
  BarAppendUpdate,
  ChartBar,
  ChartSeriesInput,
  ChartType,
  SeriesReplaceUpdate,
  TickUpdate,
  Timeframe,
} from './data'
import type { DrawingObject, DrawingToolType } from './drawings'
import type {
  IndicatorComputation,
  IndicatorDefinition,
  IndicatorInstance,
  IndicatorInstanceInput,
  IndicatorPane,
  IndicatorParams,
  IndicatorType,
} from './indicators'
import type { CustomSeriesBar, CustomSeriesInput } from './custom-series'
import type { SeriesPrimitiveInput } from './primitives'
import type {
  ChartEvent,
  ChartTheme,
  ChartThemeInput,
  PerformanceConfig,
} from './theme'
import type { ChartViewport, CompareMode, PriceScaleMode } from './viewport'

export type SnapshotOptions = {
  includeSeries?: boolean
  includeIndicatorValues?: boolean
}

export type ChartSnapshotLite = {
  timeframe: Timeframe
  compareMode: CompareMode
  chartType: ChartType
  priceScaleMode: PriceScaleMode
  viewport: ChartViewport
  indicators: Array<IndicatorInstance>
  drawings: Array<DrawingObject>
  selectedDrawingId: string | null
  activeTool: DrawingToolType | null
  hoveredBarTs: number | null
  performance: PerformanceConfig
  theme: ChartTheme
  seriesCount: number
  // Populated by the engine (undo/redo stacks live there, not in the store);
  // absent on store-built snapshots.
  canUndo?: boolean
  canRedo?: boolean
}

export type ChartCommand =
  | { type: 'addIndicator'; payload: IndicatorInstanceInput }
  | { type: 'removeIndicator'; payload: { id: string } }
  | { type: 'removeAllIndicators'; payload?: Record<string, never> }
  | { type: 'addDrawing'; payload: Omit<DrawingObject, 'id'> & { id?: string } }
  | {
      type: 'updateDrawing'
      payload: { id: string; patch: Partial<DrawingObject> }
    }
  | { type: 'removeDrawing'; payload: { id: string } }
  | { type: 'clearDrawings'; payload?: Record<string, never> }
  // Wholesale replace of the drawing set (persistence restore, pair switch).
  // resetHistory clears the undo/redo stacks so undo can't resurrect the
  // previous symbol's drawings across a restore boundary.
  | {
      type: 'setDrawings'
      payload: { drawings: Array<DrawingObject>; resetHistory?: boolean }
    }
  | { type: 'setViewport'; payload: ChartViewport }
  | { type: 'scrollToLatest'; payload?: { bars?: number } }
  | { type: 'setCompareMode'; payload: { compareMode: CompareMode } }
  | {
      type: 'setChartType'
      payload: {
        chartType: ChartType
      }
    }
  | { type: 'getVisibleData'; payload?: { limit?: number } }
  | { type: 'getChartState'; payload?: Record<string, never> }
  | { type: 'getIndicatorValue'; payload: { id: string; ts?: number } }
  | { type: 'getDrawingState'; payload?: Record<string, never> }
  | { type: 'applyTick'; payload: TickUpdate }
  | { type: 'applyTicks'; payload: { updates: Array<TickUpdate> } }
  | { type: 'appendBar'; payload: BarAppendUpdate }
  | { type: 'replaceSeries'; payload: SeriesReplaceUpdate }
  // TradingView-style best bid/ask quote lines. Imperative like applyTicks —
  // quotes update at book cadence and must not churn React props. null clears.
  | { type: 'setQuoteLines'; payload: { bid: number; ask: number } | null }
  | {
      type: 'setActiveTool'
      payload: {
        tool: DrawingToolType | null
        meta?: Record<string, unknown>
      }
    }
  | { type: 'getCapabilities'; payload?: Record<string, never> }
  | { type: 'subscribeEvents'; payload: { events: Array<ChartEvent['type']> } }
  | {
      type: 'unsubscribeEvents'
      payload: { events: Array<ChartEvent['type']> }
    }
  | { type: 'screenshot'; payload?: Record<string, never> }
  | { type: 'undo'; payload?: Record<string, never> }
  | { type: 'redo'; payload?: Record<string, never> }
  | {
      type: 'updateIndicator'
      payload: {
        id: string
        params?: IndicatorParams
        color?: string
        visible?: boolean
        pane?: IndicatorPane
      }
    }
  | { type: 'setTheme'; payload: { theme: ChartThemeInput } }
  | { type: 'setPriceScaleMode'; payload: { mode: PriceScaleMode } }
  | { type: 'fitContent'; payload?: Record<string, never> }
  | {
      type: 'scrollToPosition'
      payload: { barIndex: number; animated?: boolean }
    }
  | { type: 'priceToCoordinate'; payload: { price: number } }
  | { type: 'coordinateToPrice'; payload: { y: number } }
  | { type: 'timeToCoordinate'; payload: { ts: number } }
  | { type: 'coordinateToTime'; payload: { x: number } }
  | {
      type: 'getData'
      payload?: { seriesId?: string; limit?: number; offset?: number }
    }
  | { type: 'getDataByIndex'; payload: { index: number; seriesId?: string } }
  | { type: 'popBars'; payload: { count: number; seriesId?: string } }
  | { type: 'getSeriesOrder'; payload?: Record<string, never> }
  | { type: 'setSeriesOrder'; payload: { orderedIds: Array<string> } }
  | {
      type: 'takeScreenshot'
      payload?: { includeCrosshair?: boolean; includeOverlays?: boolean }
    }
  | {
      type: 'addPane'
      payload?: {
        id?: string
        stretchFactor?: number
        minHeight?: number
        label?: string
      }
    }
  | { type: 'removePane'; payload: { id: string } }
  | { type: 'swapPanes'; payload: { paneId1: string; paneId2: string } }
  | {
      type: 'updatePane'
      payload: {
        id: string
        patch: { stretchFactor?: number; minHeight?: number; label?: string }
      }
    }
  | { type: 'getPaneLayout'; payload?: Record<string, never> }
  | { type: 'addPrimitive'; payload: SeriesPrimitiveInput }
  | { type: 'removePrimitive'; payload: { id: string } }
  | { type: 'listPrimitives'; payload?: Record<string, never> }
  | { type: 'addCustomSeries'; payload: CustomSeriesInput }
  | { type: 'removeCustomSeries'; payload: { id: string } }
  | {
      type: 'updateCustomSeriesData'
      payload: { id: string; bars: Array<CustomSeriesBar> }
    }
  | { type: 'listCustomSeries'; payload?: Record<string, never> }

export type ChartCommandResult = {
  ok: boolean
  result?: unknown
  error?: string
}

export type ChartSnapshot = {
  timeframe: ChartSnapshotLite['timeframe']
  compareMode: ChartSnapshotLite['compareMode']
  chartType: ChartSnapshotLite['chartType']
  viewport: ChartSnapshotLite['viewport']
  series: Array<ChartSeriesInput>
  indicators: ChartSnapshotLite['indicators']
  indicatorResults: Array<IndicatorComputation>
  drawings: ChartSnapshotLite['drawings']
  selectedDrawingId: ChartSnapshotLite['selectedDrawingId']
  activeTool: ChartSnapshotLite['activeTool']
  hoveredBarTs: ChartSnapshotLite['hoveredBarTs']
  performance: ChartSnapshotLite['performance']
  theme: ChartSnapshotLite['theme']
  canUndo?: ChartSnapshotLite['canUndo']
  canRedo?: ChartSnapshotLite['canRedo']
}

export type ChartCapabilities = {
  chartTypes: Array<ChartType>
  compareModes: Array<'indexed' | 'price' | 'dual-axis'>
  priceScaleModes: Array<PriceScaleMode>
  drawingTools: Array<string>
  indicatorTypes: Array<string>
  mcpTools: Array<string>
}

export type MCPToolSchema = {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: Array<string>
    additionalProperties?: boolean
  }
}

export type ScreenshotOptions = {
  /** Include the crosshair layer in the screenshot (default true) */
  includeCrosshair?: boolean
  /** Include indicator overlays in the screenshot (default true) */
  includeOverlays?: boolean
  /** Output format (default 'dataUrl') */
  format?: 'dataUrl'
}

export type FastFinancialChartRef = {
  applyTick: (update: TickUpdate) => void
  applyTicks: (updates: Array<TickUpdate>) => void
  appendBar: (update: BarAppendUpdate) => void
  setSeries: (update: SeriesReplaceUpdate) => void
  executeCommand: (command: ChartCommand) => ChartCommandResult
  getSnapshot: (options?: SnapshotOptions) => ChartSnapshot | ChartSnapshotLite
  getMcpSchema: () => Array<MCPToolSchema>
  subscribe: (listener: (event: ChartEvent) => void) => () => void
  getCapabilities: () => ChartCapabilities
  /** Show all data in the viewport */
  fitContent: () => void
  /** Scroll to a bar index with optional animation */
  scrollToPosition: (barIndex: number, animated?: boolean) => void
  /** Convert a price value to Y pixel coordinate (null if not computable) */
  priceToCoordinate: (price: number) => number | null
  /** Convert a Y pixel coordinate to price value (null if not computable) */
  coordinateToPrice: (y: number) => number | null
  /** Convert a timestamp to X pixel coordinate (null if bar not found) */
  timeToCoordinate: (ts: number) => number | null
  /** Convert an X pixel coordinate to timestamp (null if no bars) */
  coordinateToTime: (x: number) => number | null
  /** Get all bars for a series (or primary series if no id provided) */
  data: (seriesId?: string) => Array<ChartBar>
  /** Get a specific bar by index */
  dataByIndex: (index: number, seriesId?: string) => ChartBar | null
  /** Remove the last N bars from a series */
  pop: (count: number, seriesId?: string) => number
  /** Get the current series rendering order */
  seriesOrder: () => Array<string>
  /** Set the series rendering order */
  setSeriesOrder: (orderedIds: Array<string>) => void
  /** Take a screenshot with options */
  takeScreenshot: (options?: ScreenshotOptions) => { dataUrl: string }
  /** Add a new user pane below the main chart */
  addPane: (input?: {
    id?: string
    stretchFactor?: number
    minHeight?: number
    label?: string
  }) => string
  /** Remove a user pane by id */
  removePane: (paneId: string) => boolean
  /** Swap the positions of two user panes */
  swapPanes: (paneId1: string, paneId2: string) => boolean
  /** Get the current pane layout and configurations */
  getPaneLayout: () => { panes: ReadonlyArray<unknown>; layout: unknown }
  /** Add a series primitive for custom Canvas2D rendering */
  addPrimitive: (input: SeriesPrimitiveInput) => string
  /** Remove a series primitive by id */
  removePrimitive: (id: string) => boolean
  /** List all registered primitives */
  listPrimitives: () => Array<{
    id: string
    seriesId: string
    zOrder: string
    visible: boolean
  }>
  /** Add a custom series instance */
  addCustomSeries: (input: CustomSeriesInput) => string
  /** Remove a custom series instance by id */
  removeCustomSeries: (id: string) => boolean
  /** Update bars for a custom series instance */
  updateCustomSeriesData: (id: string, bars: Array<CustomSeriesBar>) => boolean
  /** List all custom series instances */
  listCustomSeries: () => Array<{
    id: string
    type: string
    label?: string
    visible: boolean
    barCount: number
  }>
  /** Register an indicator definition at runtime (e.g. a `custom:*` indicator with an async compute) */
  registerIndicatorDefinition: (definition: IndicatorDefinition) => void
  /** Unregister an indicator definition by type (returns false when not registered) */
  unregisterIndicatorDefinition: (type: IndicatorType) => boolean
}

export type ChartMCP = {
  getSchema: () => Array<MCPToolSchema>
  execute: (toolName: string, params: unknown) => unknown
  bindController: (ref: FastFinancialChartRef | null) => void
}
