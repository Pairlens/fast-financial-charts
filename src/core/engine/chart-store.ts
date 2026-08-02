import { SeriesStore } from '../data/series-store'
import { timeframeToMilliseconds } from '../data/tick-aggregator'
import { clampViewport, viewportFromPreset } from '../data/viewport-slicer'
import {
  patchDrawing,
  removeDrawing,
  upsertDrawing,
} from '../drawings/commands'
import { createDefaultIndicatorRegistry } from '../indicators/registry'
import {
  resolveInteractionConfig,
  resolvePerformanceConfig,
  resolveTheme,
} from '../theme/resolve-theme'
import type { ClampViewportOptions } from '../data/viewport-slicer'
import type { PriceScaleMode } from '../../types/viewport'
import type {
  BarAppendUpdate,
  ChartEvent,
  ChartSnapshot,
  ChartSnapshotLite,
  ChartStateChangeReason,
  ChartTheme,
  ChartThemeInput,
  ChartType,
  ChartViewport,
  ChartViewportPreset,
  CompareMode,
  DrawingChangeReason,
  DrawingObject,
  DrawingStyleDefaults,
  DrawingToolType,
  FastFinancialChartProps,
  IndicatorComputation,
  IndicatorInstance,
  IndicatorInstanceInput,
  InteractionConfig,
  PerformanceConfig,
  SeriesReplaceUpdate,
  SnapshotOptions,
  TickUpdate,
  Timeframe,
} from '../../types'

export type ChartStoreState = {
  timeframe: Timeframe
  compareMode: CompareMode
  chartType: ChartType
  priceScaleMode: PriceScaleMode
  viewport: ChartViewport
  indicators: Array<IndicatorInstance>
  indicatorResults: Map<string, IndicatorComputation>
  drawings: Array<DrawingObject>
  selectedDrawingId: string | null
  activeTool: DrawingToolType | null
  activeToolMeta: Record<string, unknown> | null
  hoveredBarTs: number | null
}

export type ChartStoreDependencies = {
  props: Pick<
    FastFinancialChartProps,
    | 'series'
    | 'timeframe'
    | 'chartType'
    | 'compareMode'
    | 'priceScaleMode'
    | 'indicators'
    | 'drawings'
    | 'activeTool'
    | 'defaultViewport'
    | 'viewport'
    | 'theme'
    | 'performance'
    | 'interaction'
    | 'plugins'
    | 'timeScale'
  >
}

export type ChartStoreListener = {
  onStateChange?: (reason: ChartStateChangeReason) => void
  onEvent?: (event: ChartEvent) => void
  onDrawingsChange?: (
    drawings: Array<DrawingObject>,
    reason: DrawingChangeReason,
  ) => void
  onViewportChange?: (viewport: ChartViewport) => void
}

const defaultCompareMode: CompareMode = 'indexed'

const defaultChartType = 'candles' as const

const defaultSnapshotOptions: Required<SnapshotOptions> = {
  includeSeries: false,
  includeIndicatorValues: false,
}

const createIndicatorId = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `ind_${Math.random().toString(36).slice(2, 12)}`
}

const normalizeIndicatorInput = (
  input: IndicatorInstanceInput,
): IndicatorInstance => {
  const colors: Record<string, string> = {
    EMA: '#4aa8ff',
    SMA: '#ffb020',
    RSI: '#8b7dff',
    MACD: '#00d084',
    BollingerBands: '#f86f9f',
    VWAP: '#00c7f2',
    ATR: '#ff7f50',
    Volume: '#4aa8ff',
  }

  const defaultPane =
    input.type === 'RSI' ||
    input.type === 'MACD' ||
    input.type === 'ATR' ||
    input.type === 'Volume'
      ? 'separate'
      : 'overlay'

  // If a paneId is set, the pane field should reflect a non-overlay assignment
  const resolvedPane = input.paneId ? input.paneId : (input.pane ?? defaultPane)

  return {
    id: input.id ?? createIndicatorId(),
    type: input.type,
    seriesId: input.seriesId,
    params: input.params ?? {},
    pane: resolvedPane,
    ...(input.paneId ? { paneId: input.paneId } : {}),
    color: input.color ?? colors[input.type] ?? '#4aa8ff',
    visible: input.visible ?? true,
  }
}

export class ChartStore {
  private readonly listeners = new Set<ChartStoreListener>()

  readonly indicatorRegistry = createDefaultIndicatorRegistry()

  readonly seriesStore: SeriesStore

  private themeState: ChartTheme

  private performanceState: PerformanceConfig

  private interactionState: InteractionConfig

  private state: ChartStoreState

  private viewportClampOptions: ClampViewportOptions = {}

  private drawingStyleDefaultsState: DrawingStyleDefaults = {}

  constructor(dependencies: ChartStoreDependencies) {
    this.seriesStore = new SeriesStore(dependencies.props.series)
    this.themeState = resolveTheme(dependencies.props.theme)
    this.performanceState = resolvePerformanceConfig(
      dependencies.props.performance,
    )
    this.interactionState = resolveInteractionConfig(
      dependencies.props.interaction,
    )

    // Initialize viewport clamp options from timeScale before computing viewport
    const ts = dependencies.props.timeScale
    this.viewportClampOptions = {
      rightOffset: ts?.rightOffset,
      fixLeftEdge: ts?.fixLeftEdge,
      fixRightEdge: ts?.fixRightEdge,
    }

    const primaryBars = this.seriesStore.getPrimarySeriesRef()?.bars ?? []
    const initialViewport = this.resolveInitialViewport(
      primaryBars.length,
      dependencies.props.defaultViewport,
      dependencies.props.viewport,
      ts?.rightOffset,
    )
    this.state = {
      timeframe: dependencies.props.timeframe,
      compareMode: dependencies.props.compareMode ?? defaultCompareMode,
      chartType: dependencies.props.chartType ?? defaultChartType,
      priceScaleMode: dependencies.props.priceScaleMode ?? 'normal',
      viewport: initialViewport,
      indicators: (dependencies.props.indicators ?? []).map((input) =>
        normalizeIndicatorInput(input),
      ),
      indicatorResults: new Map(),
      drawings: (dependencies.props.drawings ?? []).slice(),
      selectedDrawingId: null,
      activeTool: dependencies.props.activeTool ?? null,
      activeToolMeta: null,
      hoveredBarTs: null,
    }

    for (const plugin of dependencies.props.plugins?.indicators ?? []) {
      this.indicatorRegistry.register(plugin)
    }
  }

  get theme(): ChartTheme {
    return this.themeState
  }

  get performance(): PerformanceConfig {
    return this.performanceState
  }

  get interaction(): InteractionConfig {
    return this.interactionState
  }

  get drawingStyleDefaults(): DrawingStyleDefaults {
    return this.drawingStyleDefaultsState
  }

  // Silent update: defaults only affect drawings created later, so no
  // state-change emit (nothing on screen changes).
  updateDrawingStyleDefaults(defaults?: DrawingStyleDefaults): void {
    this.drawingStyleDefaultsState = defaults ?? {}
  }

  subscribe(listener: ChartStoreListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emitStateChange(reason: ChartStateChangeReason): void {
    for (const listener of this.listeners) {
      listener.onStateChange?.(reason)
    }

    this.emitEvent({
      type: 'stateChange',
      payload: { reason },
    })
  }

  emitEvent(event: ChartEvent): void {
    for (const listener of this.listeners) {
      listener.onEvent?.(event)
    }
  }

  private emitDrawingsChange(reason: DrawingChangeReason): void {
    const drawings = this.state.drawings.slice()
    for (const listener of this.listeners) {
      listener.onDrawingsChange?.(drawings, reason)
    }

    this.emitEvent({
      type: 'drawingsChange',
      payload: {
        drawings,
        reason,
      },
    })
  }

  private emitViewportChange(): void {
    const viewport = { ...this.state.viewport }
    for (const listener of this.listeners) {
      listener.onViewportChange?.(viewport)
    }
  }

  private resolveInitialViewport(
    barsLength: number,
    preset?: ChartViewportPreset,
    controlledViewport?: ChartViewport,
    rightOffset?: number,
  ): ChartViewport {
    if (controlledViewport) {
      return controlledViewport
    }

    if (preset) {
      return viewportFromPreset(barsLength, preset, rightOffset ?? 0)
    }

    return viewportFromPreset(
      barsLength,
      {
        type: 'last-bars',
        bars: 120,
      },
      rightOffset ?? 0,
    )
  }

  getStateRef(): Readonly<ChartStoreState> {
    return this.state
  }

  getState(): ChartStoreState {
    return {
      ...this.state,
      viewport: { ...this.state.viewport },
      indicators: this.state.indicators.slice(),
      indicatorResults: new Map(this.state.indicatorResults),
      drawings: this.state.drawings.slice(),
    }
  }

  getTimeframeMs(): number {
    return timeframeToMilliseconds(this.state.timeframe)
  }

  setHoveredBar(ts: number | null): void {
    this.state.hoveredBarTs = ts
  }

  setActiveTool(
    tool: DrawingToolType | null,
    meta?: Record<string, unknown> | null,
  ): void {
    this.state.activeTool = tool
    this.state.activeToolMeta = meta ?? null
    this.emitStateChange('tool')
  }

  setSelectedDrawingId(id: string | null): void {
    if (this.state.selectedDrawingId === id) return
    this.state.selectedDrawingId = id
    const drawing = id
      ? (this.state.drawings.find((d) => d.id === id) ?? null)
      : null
    this.emitEvent({
      type: 'selectionChange',
      payload: { drawingId: id, drawing },
    })
    this.emitStateChange('selection')
  }

  setViewport(nextViewport: ChartViewport): void {
    const primaryBars = this.seriesStore.getPrimarySeriesRef()?.bars ?? []
    this.state.viewport = clampViewport(
      nextViewport,
      primaryBars.length,
      this.performanceState.viewportMinBars,
      this.viewportClampOptions,
    )
    this.emitViewportChange()
    this.emitStateChange('viewport')
  }

  scrollToLatest(bars?: number): void {
    const primaryBars = this.seriesStore.getPrimarySeriesRef()?.bars ?? []
    const totalBars = primaryBars.length
    if (totalBars === 0) {
      return
    }

    const rightOffset = this.viewportClampOptions.rightOffset ?? 0
    const span =
      bars ?? this.state.viewport.endIndex - this.state.viewport.startIndex + 1
    const endIndex = totalBars - 1 + rightOffset
    const startIndex = Math.max(0, endIndex - Math.max(1, span) + 1)

    this.state.viewport = {
      startIndex,
      endIndex,
    }

    this.emitViewportChange()
    this.emitStateChange('viewport')
  }

  setCompareMode(compareMode: CompareMode): void {
    if (this.state.compareMode === compareMode) {
      return
    }

    this.state.compareMode = compareMode
    this.emitStateChange('data')
  }

  setChartType(type: ChartStoreState['chartType']): void {
    if (this.state.chartType === type) {
      return
    }

    this.state.chartType = type
    this.emitStateChange('data')
  }

  setTimeframe(timeframe: Timeframe): void {
    if (this.state.timeframe === timeframe) {
      return
    }

    this.state.timeframe = timeframe
  }

  setPriceScaleMode(mode: PriceScaleMode): void {
    if (this.state.priceScaleMode === mode) {
      return
    }

    this.state.priceScaleMode = mode
    this.emitStateChange('data')
  }

  replaceSeries(update: SeriesReplaceUpdate): boolean {
    const replaced = this.seriesStore.replaceSeriesIfChanged(update)
    if (!replaced) {
      return false
    }

    const primaryBars = this.seriesStore.getPrimarySeriesRef()?.bars ?? []
    this.state.viewport = clampViewport(
      this.state.viewport,
      primaryBars.length,
      this.performanceState.viewportMinBars,
      this.viewportClampOptions,
    )

    this.emitStateChange('data')
    return true
  }

  appendBar(update: BarAppendUpdate): void {
    this.seriesStore.appendBar(update)
    this.emitStateChange('data')
  }

  applyTick(
    update: TickUpdate,
    options?: { autoScroll?: boolean },
  ): { appended: boolean; changedIndex: number } {
    const autoScroll = options?.autoScroll ?? true
    const result = this.seriesStore.applyTick(update, this.state.timeframe)

    if (result.appended && autoScroll) {
      const span = this.state.viewport.endIndex - this.state.viewport.startIndex
      this.scrollToLatest(span + 1)
    }

    this.emitStateChange('data')

    return result
  }

  applyTicks(
    updates: Array<TickUpdate>,
    options?: { autoScroll?: boolean },
  ): { appended: number; changed: number } {
    const autoScroll = options?.autoScroll ?? true
    let appended = 0

    for (const update of updates) {
      const result = this.seriesStore.applyTick(update, this.state.timeframe)
      if (result.appended) {
        appended += 1
      }
    }

    if (appended > 0 && autoScroll) {
      const span = this.state.viewport.endIndex - this.state.viewport.startIndex
      this.scrollToLatest(span + 1)
    }

    this.emitStateChange('data')

    return {
      appended,
      changed: updates.length,
    }
  }

  setIndicators(nextIndicators: Array<IndicatorInstanceInput>): void {
    this.state.indicators = nextIndicators.map((indicator) =>
      normalizeIndicatorInput(indicator),
    )
    this.emitEvent({
      type: 'indicatorsChange',
      payload: {
        indicators: this.state.indicators.slice(),
      },
    })
    this.emitStateChange('indicator-config')
  }

  addIndicator(indicator: IndicatorInstanceInput): IndicatorInstance {
    const normalized = normalizeIndicatorInput(indicator)
    this.state.indicators = [...this.state.indicators, normalized]
    this.emitEvent({
      type: 'indicatorsChange',
      payload: {
        indicators: this.state.indicators.slice(),
      },
    })
    this.emitStateChange('indicator-config')
    return normalized
  }

  removeIndicator(id: string): void {
    this.state.indicators = this.state.indicators.filter(
      (indicator) => indicator.id !== id,
    )
    this.state.indicatorResults.delete(id)
    this.emitEvent({
      type: 'indicatorsChange',
      payload: {
        indicators: this.state.indicators.slice(),
      },
    })
    this.emitStateChange('indicator-config')
  }

  updateIndicator(
    id: string,
    patch: {
      params?: Record<string, boolean | number | string>
      color?: string
      visible?: boolean
      pane?: string
      paneId?: string
    },
  ): void {
    const index = this.state.indicators.findIndex((ind) => ind.id === id)
    if (index === -1) return
    const existing = this.state.indicators[index]
    this.state.indicators = [
      ...this.state.indicators.slice(0, index),
      {
        ...existing,
        ...(patch.params !== undefined
          ? { params: { ...existing.params, ...patch.params } }
          : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
        ...(patch.visible !== undefined ? { visible: patch.visible } : {}),
        ...(patch.pane !== undefined ? { pane: patch.pane } : {}),
        ...(patch.paneId !== undefined
          ? { paneId: patch.paneId, pane: patch.paneId }
          : {}),
      },
      ...this.state.indicators.slice(index + 1),
    ]
    this.state.indicatorResults.delete(id)
    this.emitEvent({
      type: 'indicatorsChange',
      payload: {
        indicators: this.state.indicators.slice(),
      },
    })
    this.emitStateChange('indicator-config')
  }

  removeAllIndicators(): void {
    this.state.indicators = []
    this.state.indicatorResults.clear()
    this.emitEvent({
      type: 'indicatorsChange',
      payload: {
        indicators: [],
      },
    })
    this.emitStateChange('indicator-config')
  }

  setIndicatorComputations(computations: Array<IndicatorComputation>): void {
    // Zero-indicator charts recompute on every live tick; emitting
    // 'indicators' for an empty→empty transition triggers layout/overlay
    // work downstream for no visible change.
    if (computations.length === 0 && this.state.indicatorResults.size === 0) {
      return
    }
    this.state.indicatorResults.clear()
    for (const computation of computations) {
      this.state.indicatorResults.set(computation.indicator.id, computation)
    }
    this.emitStateChange('indicators')
  }

  setDrawing(drawing: DrawingObject): void {
    this.state.drawings = upsertDrawing(this.state.drawings, drawing)
    this.emitDrawingsChange('update')
    this.emitStateChange('drawings')
  }

  addDrawing(drawing: DrawingObject): void {
    this.state.drawings = [...this.state.drawings, drawing]
    this.emitDrawingsChange('add')
    this.emitStateChange('drawings')
  }

  setDrawings(drawings: Array<DrawingObject>): void {
    this.state.drawings = drawings.slice()
    this.state.selectedDrawingId = null
    this.emitDrawingsChange('replace')
    this.emitStateChange('drawings')
  }

  patchDrawing(id: string, patch: Partial<DrawingObject>): void {
    this.state.drawings = patchDrawing(this.state.drawings, id, patch)
    this.emitDrawingsChange('update')
    this.emitStateChange('drawings')
  }

  removeDrawing(id: string): void {
    this.state.drawings = removeDrawing(this.state.drawings, id)
    if (this.state.selectedDrawingId === id) {
      this.state.selectedDrawingId = null
    }
    this.emitDrawingsChange('remove')
    this.emitStateChange('drawings')
  }

  clearDrawings(): void {
    if (
      this.state.drawings.length === 0 &&
      this.state.selectedDrawingId === null
    ) {
      return
    }

    this.state.drawings = []
    this.state.selectedDrawingId = null
    this.emitDrawingsChange('clear')
    this.emitStateChange('drawings')
  }

  updateTheme(theme?: ChartThemeInput): void {
    this.themeState = resolveTheme(theme)
    this.emitStateChange('theme')
  }

  updatePerformanceConfig(performance?: Partial<PerformanceConfig>): void {
    this.performanceState = resolvePerformanceConfig(performance)
    this.emitStateChange('interaction')
  }

  updateInteractionConfig(interaction?: Partial<InteractionConfig>): void {
    this.interactionState = resolveInteractionConfig(interaction)
    this.emitStateChange('interaction')
  }

  updateViewportClampOptions(options: ClampViewportOptions): void {
    this.viewportClampOptions = options
  }

  /** Signal that data has been externally modified (e.g. bars popped). */
  markDataChanged(): void {
    this.emitStateChange('data')
  }

  executeResult(result: unknown): { ok: true; result: unknown } {
    return {
      ok: true as const,
      result,
    }
  }

  getSnapshotLite(): ChartSnapshotLite {
    return {
      timeframe: this.state.timeframe,
      compareMode: this.state.compareMode,
      chartType: this.state.chartType,
      priceScaleMode: this.state.priceScaleMode,
      viewport: { ...this.state.viewport },
      indicators: this.state.indicators.slice(),
      drawings: this.state.drawings.slice(),
      selectedDrawingId: this.state.selectedDrawingId,
      activeTool: this.state.activeTool,
      hoveredBarTs: this.state.hoveredBarTs,
      performance: this.performanceState,
      theme: this.themeState,
      seriesCount: this.seriesStore.getSeriesRefs().length,
    }
  }

  getSnapshot(options?: SnapshotOptions): ChartSnapshot | ChartSnapshotLite {
    const resolved: Required<SnapshotOptions> = {
      ...defaultSnapshotOptions,
      ...options,
    }

    if (!resolved.includeSeries && !resolved.includeIndicatorValues) {
      return this.getSnapshotLite()
    }

    return {
      timeframe: this.state.timeframe,
      compareMode: this.state.compareMode,
      chartType: this.state.chartType,
      priceScaleMode: this.state.priceScaleMode,
      viewport: { ...this.state.viewport },
      series: resolved.includeSeries ? this.seriesStore.getSeries() : [],
      indicators: this.state.indicators.slice(),
      indicatorResults: resolved.includeIndicatorValues
        ? Array.from(this.state.indicatorResults.values())
        : [],
      drawings: this.state.drawings.slice(),
      selectedDrawingId: this.state.selectedDrawingId,
      activeTool: this.state.activeTool,
      hoveredBarTs: this.state.hoveredBarTs,
      performance: this.performanceState,
      theme: this.themeState,
    }
  }
}
