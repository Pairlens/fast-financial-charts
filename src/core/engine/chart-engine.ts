import {
  inversePriceForMode,
  transformPriceForMode,
  valueToYScaled,
  yToValueScaled,
} from '../data/scales'
import { findBarIndexByTs } from '../data/binary-search'
import { isPriceTransformChartType } from '../data/price-transforms'
import { clampViewport, viewportFromPreset } from '../data/viewport-slicer'
import { createDefaultDrawingRegistry } from '../drawings/registry'
import { toDrawingPoint, toXFromTs, toYFromPrice } from '../drawings/transforms'
import { findDrawingById } from '../drawings/tools/select-tool'
import {
  computeCustomIndicator,
  isCustomIndicatorType,
} from '../indicators/custom-compute'
import { createIndicatorWorkerClient } from '../indicators/worker/worker-client'
import { createMcpToolSchemas } from '../mcp/schema'
import { renderBaselinePass } from '../render/canvas2d/baseline-pass'
import { renderGridPass } from '../render/canvas2d/grid-pass'
import { renderDrawingsPass } from '../render/canvas2d/drawings-pass'
import { renderMarkersPass } from '../render/canvas2d/markers-pass'
import { renderTextOverlayPass } from '../render/canvas2d/text-overlay-pass'
import {
  computeTimeAxisTicks,
  createTextMeasurer,
  timeAxisFont,
} from '../render/canvas2d/time-ticks'
import type { TimeAxisTick } from '../render/canvas2d/time-ticks'
import { renderUiOverlayPass } from '../render/canvas2d/ui-overlay-pass'
import { CustomSeriesRegistry } from '../custom-series/registry'
import { CustomSeriesStore } from '../custom-series/store'
import { createCoordinateHelpers } from '../primitives/coordinates'
import { PrimitiveRegistry } from '../primitives/registry'
import { computeMultiPaneLayout } from '../render/pane-layout'
import {
  attachContextLossHandler,
  clearWebGL,
  createWebGLContext,
  resizeWebGLCanvas,
} from '../render/webgl/context'
import {
  createPricePassState,
  renderPricePass,
} from '../render/webgl/passes/price-pass'
import { renderVolumePass } from '../render/webgl/passes/volume-pass'
import { AreaProgram } from '../render/webgl/programs/area-program'
import { BarProgram } from '../render/webgl/programs/bar-program'
import { CandleProgram } from '../render/webgl/programs/candle-program'
import { LineProgram } from '../render/webgl/programs/line-program'
import { ThickLineProgram } from '../render/webgl/programs/thick-line-program'
import { PaneManager } from './pane-manager'
import { resolveTickRenderFlags } from './tick-render-path'
import { RafScheduler } from './raf-scheduler'
import { DirtyFlags, hasDirtyFlag } from './dirty-flags'
import { ChartStore } from './chart-store'
import { CommandBus } from './command-bus'
import type { PricePassResult } from '../render/webgl/passes/price-pass'
import type { ContextLossHandler, WebGLContext } from '../render/webgl/context'
import type { DrawingTransformContext } from '../drawings/transforms'
import type {
  ChartBar,
  ChartCapabilities,
  ChartCommand,
  ChartCommandResult,
  ChartContextMenuPayload,
  ChartEvent,
  ChartHudPayload,
  ChartSnapshot,
  ChartSnapshotLite,
  ChartStateChangeReason,
  ChartViewport,
  DrawingObject,
  DrawingPoint,
  DrawingToolType,
  FastFinancialChartProps,
  IndicatorComputation,
  IndicatorDefinition,
  IndicatorInstance,
  IndicatorInstanceInput,
  IndicatorType,
  MCPToolSchema,
  MouseEventParams,
  NumericRange,
  PaneId,
  PaneInput,
  PrimitiveZOrder,
  ScreenshotOptions,
  SeriesPrimitiveInput,
  SeriesReplaceUpdate,
  SnapshotOptions,
  TickUpdate,
} from '../../types'
import type {
  CustomSeriesBar,
  CustomSeriesInput,
} from '../../types/custom-series'

type ChartEngineElements = {
  container: HTMLElement
  gridCanvas: HTMLCanvasElement
  mainCanvas: HTMLCanvasElement
  overlayCanvas: HTMLCanvasElement
  uiCanvas: HTMLCanvasElement
  indicatorCanvas: HTMLCanvasElement
  indicatorUiCanvas: HTMLCanvasElement
  indicatorContainer: HTMLElement
}

type ChartEngineCallbacks = {
  onSnapshot?: (snapshot: ChartSnapshotLite) => void
  onEvent?: FastFinancialChartProps['onEvent']
  onViewportChange?: FastFinancialChartProps['onViewportChange']
  onDrawingsChange?: FastFinancialChartProps['onDrawingsChange']
}

export type ChartEngineOptions = {
  elements: ChartEngineElements
  props: FastFinancialChartProps
  callbacks?: ChartEngineCallbacks
}

type PointerMode =
  | 'none'
  | 'pan'
  | 'draw'
  | 'multi-point-draw'
  | 'move-drawing'
  | 'resize-handle'
  | 'y-axis-zoom'
  | 'resize-pane'

type PointerDragState = {
  mode: PointerMode
  startX: number
  startY: number
  viewportStart: ChartViewport | null
  drawingStartPoint: DrawingPoint | null
  drawingId: string | null
  handleId: string | null
  originalDrawing: DrawingObject | null
  /** For multi-point tools: index of the next point to be placed. */
  multiPointIndex: number
}

const buildIndicatorRequestId = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `req_${Math.random().toString(36).slice(2, 10)}`
}

const findIndexByTimestamp = <T extends { ts: number }>(
  bars: Array<T>,
  ts: number,
): number => {
  let low = 0
  let high = bars.length - 1

  while (low <= high) {
    const mid = low + ((high - low) >> 1)
    const midTs = bars[mid]?.ts

    if (midTs === ts) {
      return mid
    }

    if (midTs < ts) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return -1
}

const cloneDrawing = (drawing: DrawingObject): DrawingObject => {
  // Use Record to avoid union narrowing issues with spread
  const obj = drawing as Record<string, unknown>
  const clone = { ...obj }
  if (Array.isArray(obj.points)) {
    clone.points = (obj.points as Array<DrawingPoint>).map((p) => ({ ...p }))
  }
  if (obj.point && typeof obj.point === 'object' && !Array.isArray(obj.point)) {
    const pt = obj.point as DrawingPoint
    clone.point = { ts: pt.ts, price: pt.price }
  }
  return clone as DrawingObject
}

const cloneDrawings = (
  drawings: Array<DrawingObject>,
): Array<DrawingObject> => {
  return drawings.map((drawing) => cloneDrawing(drawing))
}

const isLeftClick = (event: PointerEvent): boolean => event.button === 0

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tag = target.tagName
  return (
    target.isContentEditable ||
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT'
  )
}

const defaultControlledState: Required<
  NonNullable<FastFinancialChartProps['controlled']>
> = {
  viewport: false,
  drawings: false,
  indicators: false,
}

const isSameDefaultViewport = (
  left?: FastFinancialChartProps['defaultViewport'],
  right?: FastFinancialChartProps['defaultViewport'],
): boolean => {
  if (left === right) {
    return true
  }

  if (!left || !right || left.type !== right.type) {
    return false
  }

  if (left.type === 'last-bars' && right.type === 'last-bars') {
    return left.bars === right.bars
  }

  if (left.type === 'indices' && right.type === 'indices') {
    return (
      left.startIndex === right.startIndex && left.endIndex === right.endIndex
    )
  }

  return false
}

export class ChartEngine {
  private readonly elements: ChartEngineElements

  private readonly callbacks?: ChartEngineCallbacks

  private readonly store: ChartStore

  private readonly scheduler: RafScheduler

  private readonly commandBus: CommandBus

  private readonly drawingRegistry = createDefaultDrawingRegistry()

  private readonly webgl: WebGLContext

  private readonly candleProgram: CandleProgram

  private readonly barProgram: BarProgram

  private readonly lineProgram: LineProgram

  private readonly areaProgram: AreaProgram

  private readonly thickLineProgram: ThickLineProgram

  /** Per-engine price-pass render state (scratch buffers + cached fill counts) */
  private readonly pricePassState = createPricePassState()

  private readonly contextLossHandler: ContextLossHandler

  private readonly gridContext: CanvasRenderingContext2D

  private readonly overlayContext: CanvasRenderingContext2D

  private readonly uiContext: CanvasRenderingContext2D

  private readonly indicatorContext: CanvasRenderingContext2D

  private readonly indicatorUiContext: CanvasRenderingContext2D

  private readonly indicatorWorker: ReturnType<
    typeof createIndicatorWorkerClient
  >

  private readonly mcpSchema: Array<MCPToolSchema>

  private latestProps: FastFinancialChartProps

  private controlledState = { ...defaultControlledState }

  private snapshotThrottleMs = 100

  private lastSnapshotNotifyAt = 0

  private readonly externalEventListeners = new Set<
    (event: ChartEvent) => void
  >()

  private readonly mcpEventSubscriptions = new Map<
    string,
    Set<ChartEvent['type']>
  >()

  private readonly drawingUndoStack: Array<Array<DrawingObject>> = []

  private readonly drawingRedoStack: Array<Array<DrawingObject>> = []

  private previousDrawingsForHistory: Array<DrawingObject> = []

  private isApplyingDrawingHistory = false

  /**
   * Set to true during pointer drag operations on drawings (draw, move, resize).
   * While true, intermediate drawing updates are suppressed from the undo stack.
   * A single undo entry (the pre-drag snapshot) is pushed when the drag begins,
   * so that undo after the drag completes restores the state before the drag.
   */
  private isDraggingDrawing = false

  private dirtyFlags = DirtyFlags.ALL

  private resizeObserver: ResizeObserver | null = null

  private pointerDrag: PointerDragState = {
    mode: 'none',
    startX: 0,
    startY: 0,
    viewportStart: null,
    drawingStartPoint: null,
    drawingId: null,
    handleId: null,
    originalDrawing: null,
    multiPointIndex: 0,
  }

  private crosshair = {
    x: 0,
    y: 0,
    visible: false,
  }

  private hoveredDrawingId: string | null = null

  // Best bid/ask quote lines (TradingView "Bid and Ask" style), set
  // imperatively via setQuoteLines at book cadence. null = hidden.
  private quoteLines: { bid: number; ask: number } | null = null

  // Time-axis tick plan for the current frame, shared by the grid and overlay
  // passes so gridlines and labels stay on the same bars.
  private timeAxisTicks: Array<TimeAxisTick> = []

  private currentPriceRange: NumericRange = { min: 0, max: 1 }

  private priceRangeOverride: NumericRange | null = null

  private currentLayout = {
    width: 1,
    height: 1,
    mainHeight: 1,
    indicatorHeight: 0,
  }

  // DPR of the last applied resize; 0 forces the initial resize() through the
  // no-op guard (devicePixelRatio is never 0).
  private lastResizeDpr = 0

  private indicatorComputeTimer: ReturnType<typeof setTimeout> | null = null

  private indicatorComputeVersion = 0

  private readonly paneManager = new PaneManager()

  private readonly primitiveRegistry = new PrimitiveRegistry()

  private readonly customSeriesRegistry = new CustomSeriesRegistry()
  private readonly customSeriesStore = new CustomSeriesStore(
    this.customSeriesRegistry,
  )

  private yAxisZoom = {
    active: false,
    anchorY: 0,
    startRange: { min: 0, max: 1 } as NumericRange,
  }

  /** Cached bounding rect – invalidated on resize only (avoids per-frame layout recalc) */
  private cachedCanvasRect: DOMRect | null = null

  // ── Touch / pinch state ──

  private activeTouches = new Map<number, { x: number; y: number }>()

  private pinchStartDist = 0

  private pinchStartSpan = 0

  // ── Inertial scrolling ──

  private panVelocity = 0

  private inertiaRaf: number | null = null

  private lastPanX = 0

  private lastPanTime = 0

  // ── Double-click detection ──

  private lastClickTime = 0

  private lastClickX = 0

  private lastClickY = 0

  // ── Viewport animation ──

  private viewportAnimation: {
    startViewport: ChartViewport
    endViewport: ChartViewport
    startTime: number
    duration: number
    rafId: number
  } | null = null

  constructor(options: ChartEngineOptions) {
    this.elements = options.elements
    this.callbacks = options.callbacks
    this.latestProps = options.props
    this.controlledState = {
      ...defaultControlledState,
      ...(options.props.controlled ?? {}),
    }
    this.snapshotThrottleMs = options.props.snapshotThrottleMs ?? 100

    this.store = new ChartStore({
      props: {
        series: options.props.series,
        timeframe: options.props.timeframe,
        chartType: options.props.chartType,
        compareMode: options.props.compareMode,
        priceScaleMode:
          options.props.priceScale?.mode ?? options.props.priceScaleMode,
        indicators: options.props.indicators,
        drawings: options.props.drawings,
        activeTool: options.props.activeTool,
        defaultViewport: options.props.defaultViewport,
        viewport: options.props.viewport,
        theme: options.props.theme,
        performance: options.props.performance,
        interaction: options.props.interaction,
        plugins: options.props.plugins,
        timeScale: options.props.timeScale,
      },
    })
    this.store.updateDrawingStyleDefaults(options.props.drawingStyleDefaults)

    this.indicatorWorker = createIndicatorWorkerClient(
      this.store.performance.indicatorWorker,
    )

    for (const drawingPlugin of options.props.plugins?.drawings ?? []) {
      this.drawingRegistry.register(drawingPlugin)
    }

    // Initialize pane configurations from props
    if (options.props.panes && options.props.panes.length > 0) {
      this.paneManager.setPanes(options.props.panes)
    }

    // Initialize primitives from plugin config
    for (const primitive of options.props.plugins?.primitives ?? []) {
      this.primitiveRegistry.add(primitive)
    }

    // Initialize custom series definitions from plugin config
    for (const definition of options.props.plugins?.customSeries ?? []) {
      this.customSeriesRegistry.register(definition)
    }

    // Initialize custom series instances from props
    for (const series of options.props.customSeries ?? []) {
      this.customSeriesStore.add(series)
    }

    this.webgl = createWebGLContext(
      this.elements.mainCanvas,
      this.store.performance.enableHiDpi,
    )
    this.candleProgram = new CandleProgram(this.webgl.gl)
    this.barProgram = new BarProgram(this.webgl.gl)
    this.lineProgram = new LineProgram(this.webgl.gl)
    this.areaProgram = new AreaProgram(this.webgl.gl)
    this.thickLineProgram = new ThickLineProgram(this.webgl.gl)

    this.contextLossHandler = attachContextLossHandler(this.webgl, () => {
      // On context restore: re-create GPU programs and mark everything dirty
      this.candleProgram.recreate(this.webgl.gl)
      this.barProgram.recreate(this.webgl.gl)
      this.lineProgram.recreate(this.webgl.gl)
      this.areaProgram.recreate(this.webgl.gl)
      this.thickLineProgram.recreate(this.webgl.gl)
      this.resize()
      this.markDirty(DirtyFlags.ALL)
    })

    const gridContext = this.elements.gridCanvas.getContext('2d')
    const overlayContext = this.elements.overlayCanvas.getContext('2d')
    const uiContext = this.elements.uiCanvas.getContext('2d')
    const indicatorContext = this.elements.indicatorCanvas.getContext('2d')
    const indicatorUiContext = this.elements.indicatorUiCanvas.getContext('2d')

    if (
      !gridContext ||
      !overlayContext ||
      !uiContext ||
      !indicatorContext ||
      !indicatorUiContext
    ) {
      throw new Error('FastFinancialChart requires 2D overlay canvases')
    }

    this.gridContext = gridContext
    this.overlayContext = overlayContext
    this.uiContext = uiContext
    this.indicatorContext = indicatorContext
    this.indicatorUiContext = indicatorUiContext

    this.commandBus = new CommandBus(this.store, {
      getVisibleData: (snapshot, limit) => this.getVisibleData(snapshot, limit),
      screenshot: () => this.captureScreenshot(),
      getCapabilities: () => this.buildCapabilities(),
      subscribeEvents: (events) => this.subscribeMcpEvents(events),
      unsubscribeEvents: (events) => this.unsubscribeMcpEvents(events),
      undo: () => this.undoDrawings(),
      redo: () => this.redoDrawings(),
      resetDrawingHistory: () => this.resetDrawingHistory(),
    })

    this.mcpSchema = createMcpToolSchemas()

    this.scheduler = new RafScheduler({
      maxFps: this.store.performance.maxFps,
      onFrame: () => {
        this.renderFrame()
      },
    })

    this.store.subscribe({
      onStateChange: (reason) => {
        this.handleStoreStateChange(reason)
      },
      onEvent: (event) => {
        this.broadcastExternalEvent(event)
        this.callbacks?.onEvent?.(event)
      },
      onDrawingsChange: (drawings, reason) => {
        if (!this.isApplyingDrawingHistory && !this.isDraggingDrawing) {
          // Guard: skip push if the new state matches the top of the undo stack
          // (prevents duplicate entries when store fires multiple change events)
          const top = this.drawingUndoStack[this.drawingUndoStack.length - 1]
          const prev = this.previousDrawingsForHistory
          // Fast structural identity check: if the previous snapshot
          // reference is the same object as the undo stack top, it's a dupe.
          // This avoids expensive JSON.stringify comparisons.
          const isDuplicate = top === prev

          if (!isDuplicate) {
            // Structural sharing: push previous snapshot directly (already a detached clone)
            this.drawingUndoStack.push(this.previousDrawingsForHistory)
            if (this.drawingUndoStack.length > 200) {
              this.drawingUndoStack.shift()
            }
            this.drawingRedoStack.length = 0
          }
        }
        // Clone once for the next undo snapshot (always keep in sync)
        if (!this.isDraggingDrawing) {
          this.previousDrawingsForHistory = cloneDrawings(drawings)
        }
        this.callbacks?.onDrawingsChange?.(drawings, reason)
      },
      onViewportChange: (viewport) => {
        this.callbacks?.onViewportChange?.(viewport)
        this.emitVisibleTimeRangeChange(viewport)
      },
    })

    this.attachDomListeners()
    this.setupResizeObserver()
    this.previousDrawingsForHistory = cloneDrawings(
      this.store.getStateRef().drawings,
    )
    this.resize()
    this.scheduleIndicatorCompute(true)
  }

  private handleStoreStateChange(reason: ChartStateChangeReason): void {
    switch (reason) {
      case 'viewport':
        this.markDirty(DirtyFlags.VIEWPORT | DirtyFlags.OVERLAY | DirtyFlags.UI)
        return
      case 'drawings':
      case 'selection':
      case 'tool':
        this.markDirty(DirtyFlags.OVERLAY | DirtyFlags.UI)
        return
      case 'theme':
        this.markDirty(
          DirtyFlags.OVERLAY |
            DirtyFlags.UI |
            DirtyFlags.GEOMETRY |
            DirtyFlags.INDICATORS,
        )
        return
      case 'indicators':
      case 'indicator-config':
        this.markDirty(DirtyFlags.INDICATORS | DirtyFlags.OVERLAY)
        // Recalculate layout when indicators are added/removed to resize the
        // indicator container (it may need to appear or disappear).
        this.resize()
        if (reason === 'indicator-config') {
          this.scheduleIndicatorCompute()
        }
        return
      case 'data':
        this.markDirty(DirtyFlags.ALL)
        this.scheduleIndicatorCompute()
        return
      case 'interaction':
        this.markDirty(DirtyFlags.UI | DirtyFlags.OVERLAY)
        return
      case 'panes':
        this.resize()
        this.markDirty(DirtyFlags.INDICATORS | DirtyFlags.OVERLAY)
        return
    }
  }

  private broadcastExternalEvent(event: ChartEvent): void {
    for (const listener of this.externalEventListeners) {
      listener(event)
    }
  }

  private subscribeMcpEvents(events: Array<ChartEvent['type']>): {
    subscriptionId: string
  } {
    const subscriptionId = `sub_${Math.random().toString(36).slice(2, 9)}`
    this.mcpEventSubscriptions.set(subscriptionId, new Set(events))
    return { subscriptionId }
  }

  private unsubscribeMcpEvents(events: Array<ChartEvent['type']>): {
    removed: number
  } {
    let removed = 0

    for (const [id, eventSet] of this.mcpEventSubscriptions) {
      for (const event of events) {
        if (eventSet.delete(event)) {
          removed += 1
        }
      }
      if (eventSet.size === 0) {
        this.mcpEventSubscriptions.delete(id)
      }
    }

    return { removed }
  }

  private buildCapabilities(): ChartCapabilities {
    return {
      chartTypes: [
        'candles',
        'heikinAshi',
        'hollowCandles',
        'line',
        'stepLine',
        'area',
        'hlcArea',
        'bar',
        'highLow',
        'baseline',
        'histogram',
        'column',
        'renko',
        'lineBreak',
        'kagi',
        'pointFigure',
      ],
      compareModes: ['indexed', 'price', 'dual-axis'],
      priceScaleModes: ['normal', 'logarithmic', 'percentage', 'indexedTo100'],
      drawingTools: [
        'select',
        ...this.drawingRegistry.all().map((definition) => definition.type),
      ],
      indicatorTypes: this.store.indicatorRegistry
        .all()
        .map((definition) => definition.type),
      mcpTools: this.mcpSchema.map((tool) => tool.name),
    }
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.resize()
    })
    this.resizeObserver.observe(this.elements.container)
  }

  private getCanvasRect(): DOMRect {
    if (!this.cachedCanvasRect) {
      this.cachedCanvasRect = this.elements.uiCanvas.getBoundingClientRect()
    }
    return this.cachedCanvasRect
  }

  private resize(): void {
    this.cachedCanvasRect = null // invalidate cached rect on resize
    // Recompute DPR: the window may have moved to a monitor with a different
    // pixel ratio (which triggers a resize). Guarded for headless test envs.
    if (this.store.performance.enableHiDpi && typeof window !== 'undefined') {
      this.webgl.dpr = window.devicePixelRatio || 1
    }
    const width = Math.max(1, Math.floor(this.elements.container.clientWidth))
    const height = Math.max(1, Math.floor(this.elements.container.clientHeight))
    const layout = computeMultiPaneLayout(
      height,
      this.store.getStateRef().indicators,
      this.paneManager,
    )

    // No-op guard: assigning canvas.width/height resets the bitmap even when
    // the value is unchanged, leaving all canvases blank until the next rAF
    // repaint (a visible flicker frame). resize() is invoked on every
    // 'indicators' state change — which fires per indicator recompute, i.e.
    // per live tick — so skip the destructive canvas reset entirely unless
    // the container size, pane layout, or DPR actually changed.
    const prev = this.currentLayout
    if (
      prev.width === width &&
      prev.height === height &&
      prev.mainHeight === layout.mainHeight &&
      prev.indicatorHeight === layout.indicatorHeight &&
      this.lastResizeDpr === this.webgl.dpr
    ) {
      return
    }
    this.lastResizeDpr = this.webgl.dpr

    this.currentLayout = {
      width,
      height,
      mainHeight: layout.mainHeight,
      indicatorHeight: layout.indicatorHeight,
    }

    resizeWebGLCanvas(this.webgl, width, layout.mainHeight)

    const resize2dCanvas = (
      canvas: HTMLCanvasElement,
      canvasWidth: number,
      canvasHeight: number,
    ): void => {
      const dpr = this.webgl.dpr
      canvas.width = Math.max(1, Math.floor(canvasWidth * dpr))
      canvas.height = Math.max(1, Math.floor(canvasHeight * dpr))
      canvas.style.width = `${canvasWidth}px`
      canvas.style.height = `${canvasHeight}px`
    }

    resize2dCanvas(this.elements.gridCanvas, width, layout.mainHeight)
    resize2dCanvas(this.elements.overlayCanvas, width, layout.mainHeight)
    resize2dCanvas(this.elements.uiCanvas, width, layout.mainHeight)
    resize2dCanvas(
      this.elements.indicatorCanvas,
      width,
      Math.max(1, layout.indicatorHeight),
    )
    resize2dCanvas(
      this.elements.indicatorUiCanvas,
      width,
      Math.max(1, layout.indicatorHeight),
    )

    this.elements.indicatorContainer.style.height = `${layout.indicatorHeight}px`
    this.elements.indicatorContainer.style.display = layout.hasIndicatorPane
      ? 'block'
      : 'none'

    this.gridContext.setTransform(this.webgl.dpr, 0, 0, this.webgl.dpr, 0, 0)
    this.overlayContext.setTransform(this.webgl.dpr, 0, 0, this.webgl.dpr, 0, 0)
    this.uiContext.setTransform(this.webgl.dpr, 0, 0, this.webgl.dpr, 0, 0)
    this.indicatorContext.setTransform(
      this.webgl.dpr,
      0,
      0,
      this.webgl.dpr,
      0,
      0,
    )
    this.indicatorUiContext.setTransform(
      this.webgl.dpr,
      0,
      0,
      this.webgl.dpr,
      0,
      0,
    )

    // Emit sizeChange event
    const sizePayload = { width, height }
    this.store.emitEvent({ type: 'sizeChange', payload: sizePayload })
    this.latestProps.onSizeChange?.(sizePayload)

    this.markDirty(DirtyFlags.ALL)
  }

  private attachDomListeners(): void {
    this.elements.uiCanvas.addEventListener('pointermove', this.onPointerMove)
    this.elements.uiCanvas.addEventListener('pointerdown', this.onPointerDown)
    this.elements.uiCanvas.addEventListener('pointerup', this.onPointerUp)
    this.elements.uiCanvas.addEventListener('pointerleave', this.onPointerLeave)
    this.elements.uiCanvas.addEventListener('wheel', this.onWheel, {
      passive: false,
    })
    this.elements.uiCanvas.addEventListener('contextmenu', this.onContextMenu)
    this.elements.uiCanvas.addEventListener('touchstart', this.onTouchStart, {
      passive: false,
    })
    this.elements.uiCanvas.addEventListener('touchmove', this.onTouchMove, {
      passive: false,
    })
    this.elements.uiCanvas.addEventListener('touchend', this.onTouchEnd)
    window.addEventListener('keydown', this.onKeyDown)
  }

  private detachDomListeners(): void {
    this.elements.uiCanvas.removeEventListener(
      'pointermove',
      this.onPointerMove,
    )
    this.elements.uiCanvas.removeEventListener(
      'pointerdown',
      this.onPointerDown,
    )
    this.elements.uiCanvas.removeEventListener('pointerup', this.onPointerUp)
    this.elements.uiCanvas.removeEventListener(
      'pointerleave',
      this.onPointerLeave,
    )
    this.elements.uiCanvas.removeEventListener('wheel', this.onWheel)
    this.elements.uiCanvas.removeEventListener(
      'contextmenu',
      this.onContextMenu,
    )
    this.elements.uiCanvas.removeEventListener('touchstart', this.onTouchStart)
    this.elements.uiCanvas.removeEventListener('touchmove', this.onTouchMove)
    this.elements.uiCanvas.removeEventListener('touchend', this.onTouchEnd)
    window.removeEventListener('keydown', this.onKeyDown)
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const rect = this.getCanvasRect()
    const x = event.clientX - rect.left
    let y = event.clientY - rect.top

    const crosshairMode = this.latestProps.crosshairConfig?.mode ?? 'normal'
    const crosshairVisible = crosshairMode !== 'hidden'

    // Magnet mode: snap Y to nearest bar's close price
    // Skip when user is actively placing a drawing so they get free-form placement
    const currentTool = this.store.getStateRef().activeTool
    const isDrawingMode = currentTool != null && currentTool !== 'select'
    if (crosshairMode === 'magnet' && crosshairVisible && !isDrawingMode) {
      const bar = this.getBarAtX(x)
      if (bar) {
        const snappedY = this.priceToScreenY(bar.close)
        if (snappedY !== null) {
          y = snappedY
        }
      }
    }

    this.crosshair = { x, y, visible: crosshairVisible }

    const point = this.toDrawingPoint(x, y)

    const scrollEnabled =
      this.store.interaction.dragPan &&
      this.store.interaction.handleScroll?.pressedMouseMove !== false
    if (
      this.pointerDrag.mode === 'pan' &&
      scrollEnabled &&
      this.pointerDrag.viewportStart
    ) {
      const total = Math.max(
        1,
        this.pointerDrag.viewportStart.endIndex -
          this.pointerDrag.viewportStart.startIndex,
      )
      const deltaRatio = (x - this.pointerDrag.startX) / this.getPlotWidth()
      const shift = Math.round(-deltaRatio * total)

      // Track velocity for inertial scrolling
      const now = performance.now()
      const dt = now - this.lastPanTime
      if (dt > 0 && dt < 100) {
        const dx = x - this.lastPanX
        const barsPerPixel = total / this.getPlotWidth()
        this.panVelocity = -dx * barsPerPixel * (16 / dt) // normalize to ~16ms frame
      }
      this.lastPanX = x
      this.lastPanTime = now

      this.store.setViewport({
        startIndex: this.pointerDrag.viewportStart.startIndex + shift,
        endIndex: this.pointerDrag.viewportStart.endIndex + shift,
      })
    }

    if (this.pointerDrag.mode === 'resize-pane') {
      const ratio =
        (this.currentLayout.height - y) / Math.max(1, this.currentLayout.height)
      this.paneManager.setUserPanesRatio(ratio)
      this.resize()
      this.markDirty(DirtyFlags.ALL)
      return
    }

    if (
      this.pointerDrag.mode === 'y-axis-zoom' &&
      this.yAxisZoom.active &&
      this.store.interaction.handleScale?.axisPressedMouseMove !== false
    ) {
      const delta = y - this.yAxisZoom.anchorY
      const zoomScale = Math.exp(delta * 0.01)
      const start = this.yAxisZoom.startRange
      const center = (start.max + start.min) / 2
      const half = Math.max(1e-9, (start.max - start.min) * 0.5 * zoomScale)
      this.priceRangeOverride = {
        min: center - half,
        max: center + half,
      }
      this.markDirty(DirtyFlags.GEOMETRY | DirtyFlags.OVERLAY | DirtyFlags.UI)
      return
    }

    if (this.pointerDrag.mode === 'draw' && this.pointerDrag.drawingId) {
      const drawing = this.getDrawingById(this.pointerDrag.drawingId)
      if (!drawing) {
        return
      }

      this.updateDraftDrawing(drawing, point)
      this.markDirty(DirtyFlags.OVERLAY | DirtyFlags.UI)
      return
    }

    if (
      this.pointerDrag.mode === 'multi-point-draw' &&
      this.pointerDrag.drawingId
    ) {
      const drawing = this.getDrawingById(this.pointerDrag.drawingId)
      if (!drawing) return
      const definition = this.drawingRegistry.get(drawing.type)
      if (definition?.onGhostPreview) {
        const updated = definition.onGhostPreview(
          drawing,
          point,
          this.pointerDrag.multiPointIndex,
        )
        this.store.setDrawing(updated)
      }
      this.markDirty(DirtyFlags.OVERLAY | DirtyFlags.UI)
      return
    }

    if (
      this.pointerDrag.mode === 'move-drawing' &&
      this.pointerDrag.originalDrawing &&
      this.pointerDrag.drawingStartPoint
    ) {
      const updated = this.shiftDrawing(
        this.pointerDrag.originalDrawing,
        point.ts - this.pointerDrag.drawingStartPoint.ts,
        point.price - this.pointerDrag.drawingStartPoint.price,
      )
      this.store.setDrawing(updated)
      this.markDirty(DirtyFlags.OVERLAY | DirtyFlags.UI)
      return
    }

    if (
      this.pointerDrag.mode === 'resize-handle' &&
      this.pointerDrag.originalDrawing &&
      this.pointerDrag.handleId
    ) {
      const updated = this.resizeDrawing(
        this.pointerDrag.originalDrawing,
        this.pointerDrag.handleId,
        point,
      )
      this.store.setDrawing(updated)
      this.markDirty(DirtyFlags.OVERLAY | DirtyFlags.UI)
      return
    }

    const hoveredDrawing = this.pickDrawingAt(x, y)?.drawing ?? null
    this.hoveredDrawingId = hoveredDrawing?.id ?? null

    const hoveredBar = this.getBarAtX(x)
    this.store.setHoveredBar(hoveredBar?.ts ?? null)

    // Find nearest custom series bar at the hovered timestamp
    let hoveredCustomBar: CustomSeriesBar | null = null
    let hoveredCustomSeriesId: string | null = null
    if (hoveredBar) {
      const visibleCustom = this.customSeriesStore.visible()
      for (const instance of visibleCustom) {
        // Find bar with matching timestamp (binary search keeps hover cheap on large datasets)
        const bars = instance.computedBars
        const index = findIndexByTimestamp(bars, hoveredBar.ts)
        if (index !== -1) {
          hoveredCustomBar = bars[index] ?? null
          hoveredCustomSeriesId = instance.id
          break
        }
      }
    }

    const payload: ChartHudPayload = {
      hoveredBar,
      hoveredDrawing,
      hoveredCustomBar,
      hoveredCustomSeriesId,
    }

    this.store.emitEvent({
      type: 'hover',
      payload,
    })
    this.store.emitEvent({
      type: 'hudUpdate',
      payload,
    })

    // Emit crosshairMove event
    const crosshairParams = this.buildMouseEventParams(x, y)
    this.store.emitEvent({ type: 'crosshairMove', payload: crosshairParams })
    this.latestProps.onCrosshairMove?.(crosshairParams)

    this.markDirty(DirtyFlags.UI)
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.stopInertia()
    if (!isLeftClick(event)) {
      return
    }

    const rect = this.getCanvasRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const state = this.store.getStateRef()
    const point = this.toDrawingPoint(x, y)

    const hasSeparatePane =
      state.indicators.some(
        (indicator) => indicator.visible && indicator.pane === 'separate',
      ) || this.paneManager.getPaneCount() > 0
    if (hasSeparatePane && Math.abs(y - this.currentLayout.mainHeight) <= 6) {
      this.pointerDrag = {
        mode: 'resize-pane',
        startX: x,
        startY: y,
        viewportStart: null,
        drawingStartPoint: null,
        drawingId: null,
        handleId: null,
        originalDrawing: null,
        multiPointIndex: 0,
      }
      return
    }

    const priceAxisW = this.getEffectivePriceAxisWidth()
    if (priceAxisW > 0 && x >= this.currentLayout.width - priceAxisW) {
      this.pointerDrag = {
        mode: 'y-axis-zoom',
        startX: x,
        startY: y,
        viewportStart: null,
        drawingStartPoint: null,
        drawingId: null,
        handleId: null,
        originalDrawing: null,
        multiPointIndex: 0,
      }

      this.yAxisZoom = {
        active: true,
        anchorY: y,
        startRange: this.currentPriceRange,
      }
      return
    }

    // ── Multi-point click progression ──
    if (
      this.pointerDrag.mode === 'multi-point-draw' &&
      this.pointerDrag.drawingId
    ) {
      const drawing = this.getDrawingById(this.pointerDrag.drawingId)
      if (!drawing) return
      const definition = this.drawingRegistry.get(drawing.type)
      if (!definition?.onPointAdded) return

      const nextIndex = this.pointerDrag.multiPointIndex
      const updated = definition.onPointAdded(drawing, point, nextIndex)
      this.store.setDrawing(updated)
      this.pointerDrag.multiPointIndex = nextIndex + 1

      const totalNeeded = definition.pointCount ?? 2
      // For fixed-point tools: finalize when all points placed
      if (totalNeeded > 0 && nextIndex + 1 >= totalNeeded) {
        this.finalizeMultiPointDrawing()
      }

      this.markDirty(DirtyFlags.OVERLAY | DirtyFlags.UI)
      return
    }

    if (state.activeTool && state.activeTool !== 'select') {
      // Remove previous measure drawing (only one at a time)
      if (state.activeTool === 'measure') {
        const existing = state.drawings.find((d) => d.type === 'measure')
        if (existing) this.store.removeDrawing(existing.id)
      }

      const definition = this.drawingRegistry.get(state.activeTool)
      const pointCount = definition?.pointCount ?? 2
      const isMultiPoint = pointCount > 2 || pointCount === 0

      this.beginDrawingDrag()
      const drawing = this.createDrawing(state.activeTool, point)
      this.store.addDrawing(drawing)
      this.store.setSelectedDrawingId(drawing.id)

      if (isMultiPoint) {
        // Multi-point tool: enter sequential click mode
        // First point is already placed by createDefault.
        // multiPointIndex starts at 1 (next point to place).
        this.pointerDrag = {
          mode: 'multi-point-draw',
          startX: x,
          startY: y,
          viewportStart: null,
          drawingStartPoint: point,
          drawingId: drawing.id,
          handleId: null,
          originalDrawing: cloneDrawing(drawing),
          multiPointIndex: 1,
        }
      } else {
        this.pointerDrag = {
          mode: 'draw',
          startX: x,
          startY: y,
          viewportStart: null,
          drawingStartPoint: point,
          drawingId: drawing.id,
          handleId: null,
          originalDrawing: cloneDrawing(drawing),
          multiPointIndex: 0,
        }
      }

      this.markDirty(DirtyFlags.OVERLAY | DirtyFlags.UI)
      return
    }

    const hit = this.pickDrawingAt(x, y)

    if (hit) {
      this.store.setSelectedDrawingId(hit.drawing.id)
      if (hit.drawing.locked) {
        return
      }
      const originalDrawing = cloneDrawing(hit.drawing)

      this.beginDrawingDrag()
      this.pointerDrag = {
        mode: hit.handleId ? 'resize-handle' : 'move-drawing',
        startX: x,
        startY: y,
        viewportStart: null,
        drawingStartPoint: point,
        drawingId: hit.drawing.id,
        handleId: hit.handleId ?? null,
        originalDrawing,
        multiPointIndex: 0,
      }

      this.markDirty(DirtyFlags.OVERLAY | DirtyFlags.UI)
      return
    }

    this.store.setSelectedDrawingId(null)
    this.pointerDrag = {
      mode: 'pan',
      startX: x,
      startY: y,
      viewportStart: state.viewport,
      drawingStartPoint: null,
      drawingId: null,
      handleId: null,
      originalDrawing: null,
      multiPointIndex: 0,
    }
  }

  private resetPointerDrag(): void {
    if (this.isDraggingDrawing) {
      this.endDrawingDrag()
    }
    this.pointerDrag.mode = 'none'
    this.pointerDrag.startX = 0
    this.pointerDrag.startY = 0
    this.pointerDrag.viewportStart = null
    this.pointerDrag.drawingStartPoint = null
    this.pointerDrag.drawingId = null
    this.pointerDrag.handleId = null
    this.pointerDrag.originalDrawing = null
    this.pointerDrag.multiPointIndex = 0
  }

  /**
   * Begin a drawing drag operation. Pushes the pre-drag snapshot to the
   * undo stack and suppresses further undo recording until the drag ends.
   */
  private beginDrawingDrag(): void {
    this.isDraggingDrawing = true
    // Push the current (pre-drag) snapshot so undo restores to before the drag
    this.drawingUndoStack.push(this.previousDrawingsForHistory)
    if (this.drawingUndoStack.length > 200) {
      this.drawingUndoStack.shift()
    }
    this.drawingRedoStack.length = 0
  }

  /**
   * End a drawing drag operation. Updates the previous-drawings snapshot
   * to the final post-drag state so the next undo entry is accurate.
   */
  private endDrawingDrag(): void {
    this.isDraggingDrawing = false
    // Sync the snapshot to the post-drag state
    this.previousDrawingsForHistory = cloneDrawings(
      this.store.getStateRef().drawings,
    )
  }

  /**
   * Finalize a multi-point drawing creation. Handles single-use tool
   * deactivation and resets pointer drag state.
   */
  private finalizeMultiPointDrawing(): void {
    const completedDrawing = this.pointerDrag.drawingId
      ? this.getDrawingById(this.pointerDrag.drawingId)
      : null

    // Trim trailing ghost point for tools that use sequential-click creation.
    // Unlimited-point tools (pointCount=0) and N-point tools both add a ghost
    // preview point that needs to be removed on finalization.
    if (
      completedDrawing &&
      'points' in completedDrawing &&
      Array.isArray(completedDrawing.points)
    ) {
      const def = this.drawingRegistry.get(completedDrawing.type)
      const expected = def?.pointCount ?? 2
      const hasGhost =
        expected === 0
          ? completedDrawing.points.length > 2
          : completedDrawing.points.length > expected
      if (hasGhost) {
        this.store.patchDrawing(completedDrawing.id, {
          points: completedDrawing.points.slice(
            0,
            expected === 0 ? -1 : expected,
          ),
        } as Partial<DrawingObject>)
      }
    }

    const singleUseTools =
      this.store.interaction.drawingToolMode === 'single-use'

    if (singleUseTools && completedDrawing) {
      if (this.latestProps.activeTool !== undefined) {
        this.latestProps.onActiveToolChange?.(null)
      } else {
        this.store.setActiveTool(null)
        this.latestProps.onActiveToolChange?.(null)
      }
    }

    this.resetPointerDrag()
    this.markDirty(DirtyFlags.OVERLAY | DirtyFlags.UI)
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    // ── Double-click detection ──
    const now = performance.now()
    const rect = this.getCanvasRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const mouseParams = this.buildMouseEventParams(x, y)
    let isDoubleClick = false

    if (
      now - this.lastClickTime < 350 &&
      Math.abs(x - this.lastClickX) < 8 &&
      Math.abs(y - this.lastClickY) < 8
    ) {
      isDoubleClick = true
      // Emit dblclick event
      this.store.emitEvent({ type: 'dblclick', payload: mouseParams })
      this.latestProps.onDblClick?.(mouseParams)

      // Double-click on a text-bearing drawing → request text editing
      const dblClickHit = this.pickDrawingAt(x, y)
      if (
        dblClickHit?.drawing.type === 'text' ||
        dblClickHit?.drawing.type === 'callout'
      ) {
        this.latestProps.onRequestTextInput?.(
          dblClickHit.drawing.id,
          dblClickHit.drawing.content ?? '',
        )
      }
      // Double-click on price axis → reset Y scale
      else if (
        this.getEffectivePriceAxisWidth() > 0 &&
        x >= this.currentLayout.width - this.getEffectivePriceAxisWidth() &&
        this.store.interaction.handleScale?.axisDoubleClickReset !== false
      ) {
        this.priceRangeOverride = null
        this.markDirty(DirtyFlags.GEOMETRY)
      }
      // Double-click on chart area → fit viewport
      else {
        this.store.scrollToLatest()
      }
    }

    // Emit click event (single click only, not on double-click)
    if (!isDoubleClick) {
      this.store.emitEvent({ type: 'click', payload: mouseParams })
      this.latestProps.onClick?.(mouseParams)
    }

    this.lastClickTime = now
    this.lastClickX = x
    this.lastClickY = y

    // ── Inertial scrolling ──
    if (
      this.pointerDrag.mode === 'pan' &&
      Math.abs(this.panVelocity) > 0.5 &&
      this.store.interaction.kineticScroll?.mouse !== false
    ) {
      this.startInertia()
    }

    // ── Multi-point draw: clicks are handled in onPointerDown, not here ──
    if (this.pointerDrag.mode === 'multi-point-draw') {
      // For unlimited-point tools (polyline), double-click finalizes
      if (isDoubleClick && this.pointerDrag.drawingId) {
        this.finalizeMultiPointDrawing()
      }
      // Otherwise, do nothing on pointer up — the click progression continues
      return
    }

    // ── Drawing tool persistence behavior (sticky vs single-use) ──
    if (this.pointerDrag.mode === 'draw' && this.pointerDrag.drawingId) {
      const completedDrawingId = this.pointerDrag.drawingId
      const completedDrawing = this.getDrawingById(completedDrawingId)

      // Remove degenerate freehand drawings (click without drag → single point)
      if (
        completedDrawing &&
        (completedDrawing.type === 'brush' ||
          completedDrawing.type === 'highlighter') &&
        'points' in completedDrawing &&
        Array.isArray(completedDrawing.points) &&
        completedDrawing.points.length < 2
      ) {
        this.store.removeDrawing(completedDrawingId)
        this.resetPointerDrag()
        return
      }

      const singleUseTools =
        this.store.interaction.drawingToolMode === 'single-use'

      // Measure tool is always sticky (stays active for repeated measurements)
      if (singleUseTools && completedDrawing?.type !== 'measure') {
        // Support both controlled and uncontrolled activeTool usage.
        if (this.latestProps.activeTool !== undefined) {
          this.latestProps.onActiveToolChange?.(null)
        } else {
          this.store.setActiveTool(null)
          this.latestProps.onActiveToolChange?.(null)
        }
      }

      // For text drawings, request text input from the consumer
      if (completedDrawing?.type === 'text') {
        // Defer to next microtask so the drawing is fully committed
        queueMicrotask(() => {
          this.latestProps.onRequestTextInput?.(
            completedDrawingId,
            completedDrawing.content ?? 'Text',
          )
        })
      }
    }

    this.yAxisZoom.active = false
    this.resetPointerDrag()
  }

  private readonly onPointerLeave = (): void => {
    this.crosshair.visible = false
    this.yAxisZoom.active = false
    // Don't cancel multi-point drawings on mouse leave — user may re-enter
    if (this.pointerDrag.mode !== 'multi-point-draw') {
      this.resetPointerDrag()
    }
    this.markDirty(DirtyFlags.UI)
  }

  private startInertia(): void {
    if (this.inertiaRaf) cancelAnimationFrame(this.inertiaRaf)
    const decay = 0.92
    const step = (): void => {
      if (Math.abs(this.panVelocity) < 0.3) {
        this.panVelocity = 0
        this.inertiaRaf = null
        return
      }
      this.panVelocity *= decay
      const state = this.store.getStateRef()
      const vp = state.viewport
      const shift = Math.round(this.panVelocity)
      if (shift !== 0) {
        this.store.setViewport({
          startIndex: vp.startIndex + shift,
          endIndex: vp.endIndex + shift,
        })
      }
      this.inertiaRaf = requestAnimationFrame(step)
    }
    this.inertiaRaf = requestAnimationFrame(step)
  }

  private stopInertia(): void {
    if (this.inertiaRaf) {
      cancelAnimationFrame(this.inertiaRaf)
      this.inertiaRaf = null
    }
    this.panVelocity = 0
  }

  // ── Touch / pinch handlers ──

  private readonly onTouchStart = (event: TouchEvent): void => {
    this.stopInertia()
    for (const touch of event.changedTouches) {
      this.activeTouches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
      })
    }

    if (this.activeTouches.size === 2) {
      event.preventDefault()
      const [a, b] = Array.from(this.activeTouches.values())
      this.pinchStartDist = Math.hypot(b.x - a.x, b.y - a.y)
      const state = this.store.getStateRef()
      this.pinchStartSpan = Math.max(
        2,
        state.viewport.endIndex - state.viewport.startIndex + 1,
      )
    }
  }

  private readonly onTouchMove = (event: TouchEvent): void => {
    for (const touch of event.changedTouches) {
      this.activeTouches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
      })
    }

    if (this.activeTouches.size === 2) {
      event.preventDefault()
      if (this.store.interaction.handleScale?.pinch === false) return
      const [a, b] = Array.from(this.activeTouches.values())
      const dist = Math.hypot(b.x - a.x, b.y - a.y)
      if (this.pinchStartDist < 1) return

      const scale = this.pinchStartDist / dist
      const nextSpan = Math.max(
        this.store.performance.viewportMinBars,
        Math.round(this.pinchStartSpan * scale),
      )

      const state = this.store.getStateRef()
      const vp = state.viewport
      const mid = Math.round((vp.startIndex + vp.endIndex) / 2)
      this.store.setViewport({
        startIndex: mid - Math.floor(nextSpan / 2),
        endIndex: mid + Math.ceil(nextSpan / 2),
      })
    }
  }

  private readonly onTouchEnd = (event: TouchEvent): void => {
    for (const touch of event.changedTouches) {
      this.activeTouches.delete(touch.identifier)
    }
  }

  private readonly onWheel = (event: WheelEvent): void => {
    if (
      !this.store.interaction.wheelZoom ||
      this.store.interaction.handleScale?.mouseWheel === false
    ) {
      return
    }

    event.preventDefault()
    this.stopInertia()

    const state = this.store.getStateRef()
    const viewport = state.viewport
    const span = Math.max(2, viewport.endIndex - viewport.startIndex + 1)

    // ── Modifier-aware zoom ──
    // Cmd/Ctrl + wheel → Y-axis zoom, plain wheel → X zoom
    if (event.metaKey || event.ctrlKey) {
      const zoomFactor = event.deltaY > 0 ? 1.08 : 0.92
      const range = this.priceRangeOverride ?? this.currentPriceRange
      const mid = (range.min + range.max) / 2
      const halfSpan = ((range.max - range.min) / 2) * zoomFactor
      this.priceRangeOverride = { min: mid - halfSpan, max: mid + halfSpan }
      this.markDirty(DirtyFlags.GEOMETRY)
      return
    }

    const zoomFactor = event.deltaY > 0 ? 1.12 : 0.88
    let nextSpan = Math.max(
      this.store.performance.viewportMinBars,
      Math.round(span * zoomFactor),
    )

    // Enforce barSpacing limits from timeScale config
    const ts = this.latestProps.timeScale
    if (ts) {
      const chartW = this.getPlotWidth()
      if (ts.minBarSpacing) {
        const maxBars = Math.round(chartW / ts.minBarSpacing)
        nextSpan = Math.min(nextSpan, maxBars)
      }
      if (ts.maxBarSpacing) {
        const minBars = Math.max(2, Math.round(chartW / ts.maxBarSpacing))
        nextSpan = Math.max(nextSpan, minBars)
      }
    }

    const rect = this.getCanvasRect()
    const x = event.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / this.getPlotWidth()))
    const center = viewport.startIndex + Math.round(ratio * span - 0.5)

    const nextStart = center - Math.floor(nextSpan * ratio)
    const nextEnd = nextStart + nextSpan - 1

    this.store.setViewport({
      startIndex: nextStart,
      endIndex: nextEnd,
    })
  }

  private readonly onContextMenu = (event: MouseEvent): void => {
    event.preventDefault()

    const rect = this.getCanvasRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const nearestBar = this.getBarAtX(x)
    const nearestDrawing = this.pickDrawingAt(x, y)?.drawing ?? null

    const payload: ChartContextMenuPayload = {
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      nearestBar,
      nearestDrawing,
      selectedDrawingId: this.store.getStateRef().selectedDrawingId,
    }

    this.store.emitEvent({
      type: 'contextmenu',
      payload,
    })
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.store.interaction.keyboardShortcuts) {
      return
    }

    // Do not run chart shortcuts while user is typing in a form field.
    // This prevents collisions like "h" toggling drawing visibility in text inputs.
    const target = (event.composedPath?.()[0] ??
      event.target) as EventTarget | null
    if (isEditableTarget(target)) {
      return
    }

    const isMeta = event.metaKey || event.ctrlKey

    if (isMeta && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault()
      this.undoDrawings()
      return
    }

    if (
      (isMeta && event.key.toLowerCase() === 'y') ||
      (isMeta && event.shiftKey && event.key.toLowerCase() === 'z')
    ) {
      event.preventDefault()
      this.redoDrawings()
      return
    }

    if (event.key.toLowerCase() === 'l') {
      this.toggleSelectedDrawingLocked()
      return
    }

    if (event.key.toLowerCase() === 'h') {
      this.toggleSelectedDrawingVisibility()
      return
    }

    if (event.key.toLowerCase() === 'f') {
      this.fitPriceScale()
      return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selected = this.store.getStateRef().selectedDrawingId
      if (selected) {
        this.store.removeDrawing(selected)
      }
      return
    }

    if (event.key === 'Escape') {
      this.store.setSelectedDrawingId(null)
      if (
        (this.pointerDrag.mode === 'draw' ||
          this.pointerDrag.mode === 'multi-point-draw') &&
        this.pointerDrag.drawingId
      ) {
        this.store.removeDrawing(this.pointerDrag.drawingId)
      }
      this.pointerDrag = {
        mode: 'none',
        startX: 0,
        startY: 0,
        viewportStart: null,
        drawingStartPoint: null,
        drawingId: null,
        handleId: null,
        originalDrawing: null,
        multiPointIndex: 0,
      }
      this.markDirty(DirtyFlags.OVERLAY | DirtyFlags.UI)
    }
  }

  private undoDrawings(): void {
    const previous = this.drawingUndoStack.pop()
    if (!previous) {
      return
    }

    this.drawingRedoStack.push(cloneDrawings(this.store.getStateRef().drawings))
    this.isApplyingDrawingHistory = true
    this.store.setDrawings(previous)
    this.isApplyingDrawingHistory = false
  }

  private redoDrawings(): void {
    const next = this.drawingRedoStack.pop()
    if (!next) {
      return
    }

    this.drawingUndoStack.push(cloneDrawings(this.store.getStateRef().drawings))
    this.isApplyingDrawingHistory = true
    this.store.setDrawings(next)
    this.isApplyingDrawingHistory = false
  }

  /**
   * Drop all drawing undo/redo history and re-baseline on the current state.
   * Used when the drawing set is replaced wholesale (persistence restore on
   * symbol switch) — undo must not cross that boundary and resurrect the
   * previous symbol's drawings.
   */
  private resetDrawingHistory(): void {
    this.drawingUndoStack.length = 0
    this.drawingRedoStack.length = 0
    this.previousDrawingsForHistory = cloneDrawings(
      this.store.getStateRef().drawings,
    )
  }

  private toggleSelectedDrawingLocked(): void {
    const selected = this.store.getStateRef().selectedDrawingId
    if (!selected) {
      return
    }
    const drawing = this.getDrawingById(selected)
    if (!drawing) {
      return
    }
    this.store.patchDrawing(selected, {
      locked: !drawing.locked,
    })
  }

  private toggleSelectedDrawingVisibility(): void {
    const selected = this.store.getStateRef().selectedDrawingId
    if (!selected) {
      return
    }
    const drawing = this.getDrawingById(selected)
    if (!drawing) {
      return
    }
    this.store.patchDrawing(selected, {
      visible: drawing.visible === false ? true : false,
    })
  }

  private syncTimeScaleToStore(): void {
    const ts = this.latestProps.timeScale
    this.store.updateViewportClampOptions({
      rightOffset: ts?.rightOffset,
      fixLeftEdge: ts?.fixLeftEdge,
      fixRightEdge: ts?.fixRightEdge,
    })
  }

  private getEffectivePriceAxisWidth(): number {
    if (this.latestProps.priceScale?.visible === false) return 0
    return Math.max(
      this.latestProps.priceScale?.minimumWidth ?? 0,
      this.store.theme.layout.priceAxisWidth,
    )
  }

  /**
   * Width of the plot area — the container minus the price-axis gutter.
   *
   * Every bar-index ↔ x mapping must go through this: the GL viewport, the
   * indicator presenters, drawings, and all pointer math. Mapping a bar across
   * the full container width instead pushes the newest bars underneath the
   * opaque price-axis panel, where they are unreachable without scrolling, and
   * puts the series in a different coordinate space than the grid, the axis
   * labels, and the crosshair.
   */
  private getPlotWidth(): number {
    return Math.max(
      1,
      this.currentLayout.width - this.getEffectivePriceAxisWidth(),
    )
  }

  /**
   * Height of the plot area — the main pane minus the time-axis gutter.
   * The price ↔ y counterpart of {@link getPlotWidth}.
   */
  private getPlotHeight(): number {
    return Math.max(
      1,
      this.currentLayout.mainHeight - this.store.theme.layout.timeAxisHeight,
    )
  }

  /**
   * Convert a raw price to screen Y coordinate using current range and scale mode.
   * Handles percentage/indexedTo100 transforms automatically.
   */
  private priceToScreenY(price: number): number | null {
    const mode = this.store.getStateRef().priceScaleMode
    const chartHeight =
      this.currentLayout.mainHeight - this.store.theme.layout.timeAxisHeight
    if (chartHeight <= 0) return null

    const needsTransform = mode === 'percentage' || mode === 'indexedTo100'
    let displayValue = price
    if (needsTransform) {
      const primary = this.store.seriesStore.getPrimarySeriesRef()
      const viewport = this.store.getStateRef().viewport
      const visibleBars =
        primary?.bars.slice(
          Math.max(0, viewport.startIndex),
          viewport.endIndex + 1,
        ) ?? []
      const basePrice = visibleBars[0]?.close ?? 0
      displayValue = transformPriceForMode(price, basePrice, mode)
    }
    return valueToYScaled(
      displayValue,
      this.currentPriceRange,
      chartHeight,
      mode,
    )
  }

  // ── Coordinate conversion APIs ──

  /**
   * Convert a price value to a Y pixel coordinate.
   */
  priceToCoordinate(price: number): number | null {
    return this.priceToScreenY(price)
  }

  /**
   * Convert a Y pixel coordinate to a price value.
   */
  coordinateToPrice(y: number): number | null {
    const mode = this.store.getStateRef().priceScaleMode
    const chartHeight =
      this.currentLayout.mainHeight - this.store.theme.layout.timeAxisHeight
    if (chartHeight <= 0) return null

    const displayValue = yToValueScaled(
      y,
      this.currentPriceRange,
      chartHeight,
      mode,
    )

    const needsTransform = mode === 'percentage' || mode === 'indexedTo100'
    if (!needsTransform) return displayValue

    const primary = this.store.seriesStore.getPrimarySeriesRef()
    const viewport = this.store.getStateRef().viewport
    const visibleBars =
      primary?.bars.slice(
        Math.max(0, viewport.startIndex),
        viewport.endIndex + 1,
      ) ?? []
    const basePrice = visibleBars[0]?.close ?? 0
    return inversePriceForMode(displayValue, basePrice, mode)
  }

  /**
   * Convert a timestamp to an X pixel coordinate.
   */
  timeToCoordinate(ts: number): number | null {
    const primary = this.store.seriesStore.getPrimarySeriesRef()
    if (!primary || primary.bars.length === 0) return null

    const barIndex = findBarIndexByTs(primary.bars, ts)
    if (barIndex < 0) return null

    const viewport = this.store.getStateRef().viewport
    const total = Math.max(1, viewport.endIndex - viewport.startIndex + 1)
    return ((barIndex - viewport.startIndex + 0.5) / total) * this.getPlotWidth()
  }

  /**
   * Convert an X pixel coordinate to a timestamp.
   */
  coordinateToTime(x: number): number | null {
    const primary = this.store.seriesStore.getPrimarySeriesRef()
    if (!primary || primary.bars.length === 0) return null

    const viewport = this.store.getStateRef().viewport
    const total = Math.max(1, viewport.endIndex - viewport.startIndex + 1)
    const ratio = Math.max(0, Math.min(1, x / this.getPlotWidth()))
    const index = Math.max(
      0,
      Math.min(
        primary.bars.length - 1,
        viewport.startIndex + Math.round(ratio * total - 0.5),
      ),
    )
    return primary.bars[index]?.ts ?? null
  }

  /**
   * Scroll the viewport so that `barIndex` is centered, with optional animation.
   */
  scrollToPosition(barIndex: number, animated = false): void {
    const state = this.store.getStateRef()
    const span = Math.max(
      1,
      state.viewport.endIndex - state.viewport.startIndex,
    )
    const half = Math.floor(span / 2)
    const endViewport: ChartViewport = {
      startIndex: barIndex - half,
      endIndex: barIndex - half + span,
    }

    if (!animated) {
      this.cancelViewportAnimation()
      this.store.setViewport(endViewport)
      return
    }

    this.cancelViewportAnimation()
    const startTime = performance.now()
    const duration = 300 // ms

    const step = (): void => {
      const elapsed = performance.now() - startTime
      const t = Math.min(1, elapsed / duration)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)

      const startVp = state.viewport
      const currentStart = Math.round(
        startVp.startIndex +
          (endViewport.startIndex - startVp.startIndex) * eased,
      )
      const currentEnd = Math.round(
        startVp.endIndex + (endViewport.endIndex - startVp.endIndex) * eased,
      )
      this.store.setViewport({ startIndex: currentStart, endIndex: currentEnd })

      if (t < 1) {
        this.viewportAnimation = {
          startViewport: startVp,
          endViewport,
          startTime,
          duration,
          rafId: requestAnimationFrame(step),
        }
      } else {
        this.viewportAnimation = null
      }
    }

    this.viewportAnimation = {
      startViewport: state.viewport,
      endViewport,
      startTime,
      duration,
      rafId: requestAnimationFrame(step),
    }
  }

  private cancelViewportAnimation(): void {
    if (this.viewportAnimation) {
      cancelAnimationFrame(this.viewportAnimation.rafId)
      this.viewportAnimation = null
    }
  }

  private fitPriceScale(): void {
    this.priceRangeOverride = null
    this.markDirty(DirtyFlags.GEOMETRY | DirtyFlags.OVERLAY | DirtyFlags.UI)
  }

  private markDirty(flags: number): void {
    this.dirtyFlags |= flags
    this.scheduler.requestFrame()
  }

  private toDrawingPoint(x: number, y: number): DrawingPoint {
    const primary = this.store.seriesStore.getPrimarySeriesRef()

    const context: DrawingTransformContext = {
      bars: primary?.bars ?? [],
      viewport: this.store.getStateRef().viewport,
      width: this.getPlotWidth(),
      height: this.getPlotHeight(),
      range: this.currentPriceRange,
      priceScaleMode: this.store.getStateRef().priceScaleMode,
    }

    return toDrawingPoint(x, y, context, this.store.interaction.drawingSnap)
  }

  private getDrawingById(id: string): DrawingObject | null {
    return findDrawingById(this.store.getStateRef().drawings, id)
  }

  private getBarAtX(x: number): ChartBar | null {
    const primary = this.store.seriesStore.getPrimarySeriesRef()
    if (!primary || primary.bars.length === 0) {
      return null
    }

    const viewport = this.store.getStateRef().viewport
    const total = Math.max(1, viewport.endIndex - viewport.startIndex + 1)
    const ratio = Math.max(0, Math.min(1, x / this.getPlotWidth()))
    const index = viewport.startIndex + Math.round(ratio * total - 0.5)

    return (
      primary.bars[Math.max(0, Math.min(primary.bars.length - 1, index))] ??
      null
    )
  }

  private buildMouseEventParams(x: number, y: number): MouseEventParams {
    const bar = this.getBarAtX(x)
    return {
      time: bar?.ts ?? null,
      point: { x, y },
      price: bar?.close ?? null,
      seriesData: bar,
    }
  }

  private emitVisibleTimeRangeChange(viewport: ChartViewport): void {
    const primary = this.store.seriesStore.getPrimarySeriesRef()
    const bars = primary?.bars ?? []
    const fromBar = bars[Math.max(0, viewport.startIndex)]
    const toBar = bars[Math.min(bars.length - 1, viewport.endIndex)]

    const payload = {
      viewport,
      from: fromBar?.ts ?? null,
      to: toBar?.ts ?? null,
    }

    this.store.emitEvent({ type: 'visibleTimeRangeChange', payload })
    this.latestProps.onVisibleTimeRangeChange?.(payload)
  }

  private pickDrawingAt(
    x: number,
    y: number,
  ): { drawing: DrawingObject; handleId?: string } | null {
    const state = this.store.getStateRef()
    const primary = this.store.seriesStore.getPrimarySeriesRef()
    if (!primary) {
      return null
    }

    const transform: DrawingTransformContext = {
      bars: primary.bars,
      viewport: state.viewport,
      width: this.getPlotWidth(),
      height: this.getPlotHeight(),
      range: this.currentPriceRange,
      priceScaleMode: state.priceScaleMode,
    }

    const toX = (ts: number) => toXFromTs(ts, transform)
    const toY = (price: number) => toYFromPrice(price, transform)

    const selected = state.selectedDrawingId
    if (selected) {
      const selectedDrawing = state.drawings.find(
        (drawing) => drawing.id === selected,
      )
      if (selectedDrawing) {
        const definition = this.drawingRegistry.get(selectedDrawing.type)
        if (definition) {
          const handles = definition.getHandles(selectedDrawing, toX, toY)
          for (const handle of handles) {
            const distance = Math.hypot(x - handle.x, y - handle.y)
            if (distance <= 8) {
              return {
                drawing: selectedDrawing,
                handleId: handle.id,
              }
            }
          }
        }
      }
    }

    let best: { drawing: DrawingObject; distance: number } | null = null

    for (const drawing of state.drawings) {
      const definition = this.drawingRegistry.get(drawing.type)
      if (!definition) {
        continue
      }

      const hit = definition.hitTest({
        drawing,
        x,
        y,
        bars: primary.bars,
        toX,
        toY,
      })

      if (!hit) {
        if (drawing.type === 'hline') {
          const distance = Math.abs(y - toY(drawing.price))
          if (distance <= 6 && (!best || distance < best.distance)) {
            best = { drawing, distance }
          }
        }

        if (drawing.type === 'vline') {
          const distance = Math.abs(x - toX(drawing.ts))
          if (distance <= 6 && (!best || distance < best.distance)) {
            best = { drawing, distance }
          }
        }

        continue
      }

      if (!best || hit.distance < best.distance) {
        best = {
          drawing,
          distance: hit.distance,
        }
      }
    }

    if (!best) {
      return null
    }

    return { drawing: best.drawing }
  }

  private createDrawing(
    tool: DrawingToolType,
    point: DrawingPoint,
  ): DrawingObject {
    if (tool === 'select') {
      throw new Error('Select tool does not create drawings')
    }

    const definition = this.drawingRegistry.get(tool)
    if (!definition) {
      throw new Error(`Unsupported drawing tool: ${tool}`)
    }

    const drawing = definition.createDefault({
      id: `draw_${Math.random().toString(36).slice(2, 10)}`,
      point,
      seriesId: this.store.seriesStore.getPrimarySeriesRef()?.id,
      meta: this.store.getStateRef().activeToolMeta ?? undefined,
    })

    // Apply the host's per-tool style defaults (last-used color/width/style)
    // over the registry's built-in defaults.
    const styleDefaults = this.store.drawingStyleDefaults[tool]
    if (styleDefaults) {
      if (styleDefaults.color !== undefined) drawing.color = styleDefaults.color
      if (styleDefaults.lineWidth !== undefined) {
        drawing.lineWidth = styleDefaults.lineWidth
      }
      if (styleDefaults.lineStyle !== undefined) {
        drawing.lineStyle = styleDefaults.lineStyle
      }
    }
    return drawing
  }

  private updateDraftDrawing(
    drawing: DrawingObject,
    point: DrawingPoint,
  ): void {
    const definition = this.drawingRegistry.get(drawing.type)
    if (!definition?.onDrag) {
      return
    }
    this.store.setDrawing(definition.onDrag(drawing, point))
  }

  private resizeDrawing(
    drawing: DrawingObject,
    handleId: string,
    point: DrawingPoint,
  ): DrawingObject {
    const definition = this.drawingRegistry.get(drawing.type)
    if (!definition?.onHandleResize) {
      return drawing
    }
    return definition.onHandleResize(drawing, handleId, point)
  }

  private shiftDrawing(
    drawing: DrawingObject,
    deltaTs: number,
    deltaPrice: number,
  ): DrawingObject {
    const definition = this.drawingRegistry.get(drawing.type)
    if (!definition?.onShift) {
      return drawing
    }
    return definition.onShift(drawing, deltaTs, deltaPrice)
  }

  private scheduleIndicatorCompute(immediate = false): void {
    if (this.indicatorComputeTimer) {
      clearTimeout(this.indicatorComputeTimer)
      this.indicatorComputeTimer = null
    }

    const run = () => {
      void this.computeIndicatorsAsync()
    }

    if (immediate) {
      run()
      return
    }

    this.indicatorComputeTimer = setTimeout(run, 90)
  }

  private async computeIndicatorsAsync(): Promise<void> {
    const state = this.store.getStateRef()
    const indicators = state.indicators.slice()
    const version = ++this.indicatorComputeVersion
    const timeframeMs = this.store.getTimeframeMs()

    const tasks = indicators.map(async (indicator) => {
      const series = this.store.seriesStore.getSeriesById(indicator.seriesId, {
        clone: false,
      })
      if (!series) {
        return null
      }

      const request = {
        requestId: buildIndicatorRequestId(),
        indicator,
        bars: series.bars,
        timeframeMs,
      }

      // Built-in indicators compute in the worker; registry-defined custom
      // indicators (whose compute may be async, e.g. a Python round-trip)
      // compute on the main thread. Both partitions run concurrently and
      // resolve to the same worker response shape (errors included), so a
      // failing or unregistered custom type degrades exactly like a worker
      // error and can never reject the batch.
      const response = isCustomIndicatorType(indicator.type)
        ? await computeCustomIndicator(
            this.store.indicatorRegistry.get(indicator.type),
            request,
          )
        : await this.indicatorWorker.compute(request)

      if (response.error) {
        return null
      }

      return {
        indicator,
        values: response.values,
        computedAt: Date.now(),
      }
    })

    const settled = await Promise.allSettled(tasks)
    if (version !== this.indicatorComputeVersion) {
      return
    }

    const computations: Array<IndicatorComputation> = []

    for (const result of settled) {
      if (result.status !== 'fulfilled' || !result.value) {
        continue
      }
      computations.push(result.value)
    }

    this.store.setIndicatorComputations(computations)

    for (const computation of computations) {
      this.store.emitEvent({
        type: 'indicatorComputeComplete',
        payload: {
          indicatorId: computation.indicator.id,
          valuesCount: computation.values.length,
        },
      })
    }
  }

  private getVisibleData(snapshot: ChartSnapshot, limit?: number): unknown {
    const viewport = snapshot.viewport

    const series = snapshot.series.map((item) => {
      const visibleBars = item.bars.slice(
        viewport.startIndex,
        viewport.endIndex + 1,
      )
      if (!limit) {
        return {
          id: item.id,
          bars: visibleBars,
        }
      }

      return {
        id: item.id,
        bars: visibleBars.slice(-limit),
      }
    })

    return {
      timeframe: snapshot.timeframe,
      viewport,
      series,
    }
  }

  private captureScreenshot(options?: ScreenshotOptions): { dataUrl: string } {
    // The WebGL context is created with preserveDrawingBuffer:false (for
    // performance), so its drawing buffer is cleared once the browser
    // composites the frame. By the time a user triggers a screenshot, the
    // price-chart layer (mainCanvas, WebGL) has already been composited and
    // discarded — only the Canvas2D layers (grid/overlay/ui/indicator) retain
    // their pixels, which is why indicators appear but the price chart does
    // not. Force a fresh synchronous render and read the buffer back in the
    // same task (before the next compositing step) so mainCanvas holds the
    // price chart at capture time.
    if (!this.webgl.isContextLost) {
      this.dirtyFlags = DirtyFlags.ALL
      this.renderFrame()
    }

    const width = this.currentLayout.width
    const height =
      this.currentLayout.mainHeight + this.currentLayout.indicatorHeight
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(width * this.webgl.dpr))
    canvas.height = Math.max(1, Math.floor(height * this.webgl.dpr))
    const context = canvas.getContext('2d')

    if (!context) {
      return {
        dataUrl: '',
      }
    }

    context.drawImage(this.elements.gridCanvas, 0, 0)
    context.drawImage(this.elements.mainCanvas, 0, 0)

    if (options?.includeOverlays !== false) {
      context.drawImage(this.elements.overlayCanvas, 0, 0)
    }

    if (options?.includeCrosshair !== false) {
      context.drawImage(this.elements.uiCanvas, 0, 0)
    }

    if (
      this.currentLayout.indicatorHeight > 0 &&
      options?.includeOverlays !== false
    ) {
      context.drawImage(
        this.elements.indicatorCanvas,
        0,
        Math.floor(this.currentLayout.mainHeight * this.webgl.dpr),
      )
    }

    return {
      dataUrl: canvas.toDataURL('image/png'),
    }
  }

  // ── Data read-back APIs ──

  /**
   * Get all bars for a series (or primary series if no id provided).
   */
  data(seriesId?: string): Array<ChartBar> {
    if (seriesId) {
      return (
        this.store.seriesStore.getSeriesById(seriesId, { clone: true })?.bars ??
        []
      )
    }
    return this.store.seriesStore.getPrimarySeries({ clone: true })?.bars ?? []
  }

  /**
   * Get a specific bar by index.
   */
  dataByIndex(index: number, seriesId?: string): ChartBar | null {
    const series = seriesId
      ? this.store.seriesStore.getSeriesById(seriesId, { clone: false })
      : this.store.seriesStore.getPrimarySeriesRef()
    if (!series || index < 0 || index >= series.bars.length) return null
    return { ...series.bars[index] }
  }

  /**
   * Remove the last `count` bars from a series.
   */
  pop(count: number, seriesId?: string): number {
    const id = seriesId ?? this.store.seriesStore.getPrimarySeriesRef()?.id
    if (!id) return 0
    const removed = this.store.seriesStore.popBars(id, count)
    if (removed > 0) {
      this.store.markDataChanged()
    }
    return removed
  }

  /**
   * Get the current series rendering order.
   */
  seriesOrder(): Array<string> {
    return this.store.seriesStore.getSeriesOrder()
  }

  /**
   * Set the series rendering order.
   */
  setSeriesOrder(orderedIds: Array<string>): void {
    this.store.seriesStore.setSeriesOrder(orderedIds)
    this.markDirty(DirtyFlags.GEOMETRY | DirtyFlags.OVERLAY)
  }

  /**
   * Take a screenshot with configurable options.
   */
  takeScreenshot(options?: ScreenshotOptions): { dataUrl: string } {
    return this.captureScreenshot(options)
  }

  /**
   * `plotWidth`/`plotHeight` are plot-area dimensions (gutters already
   * subtracted) — presenters map bar index → x and price → y with them, so
   * they must match the space the series is rendered in.
   */
  private renderOverlayIndicatorsOnCanvas(
    viewport: ChartViewport,
    plotWidth: number,
    plotHeight: number,
    indicators: Array<IndicatorInstance>,
    options?: { includeMainOverlay?: boolean },
  ): void {
    const state = this.store.getStateRef()
    const results = state.indicatorResults
    const includeMainOverlay = options?.includeMainOverlay ?? true

    // Render overlay indicators on the main chart canvas.
    //
    // Clipped to the plot area: mapping bars into plot space keeps a
    // presenter's *anchors* inside the chart, but not the ink around them —
    // a marker glyph or a centre-aligned label on one of the last bars still
    // spills past the last bar's x and paints over the price-axis panel.
    // renderMarkersPass clips for the same reason.
    if (includeMainOverlay) {
      this.overlayContext.save()
      this.overlayContext.beginPath()
      this.overlayContext.rect(0, 0, plotWidth, plotHeight)
      this.overlayContext.clip()

      for (const indicator of indicators) {
        if (!indicator.visible || indicator.pane !== 'overlay') {
          continue
        }

        const computation = results.get(indicator.id)
        if (!computation) {
          continue
        }

        const definition = this.store.indicatorRegistry.get(indicator.type)
        if (!definition) {
          continue
        }
        const series = this.store.seriesStore.getSeriesById(
          indicator.seriesId,
          { clone: false },
        )
        if (!series) {
          continue
        }

        definition.presenter({
          ctx: this.overlayContext,
          width: plotWidth,
          height: plotHeight,
          viewport,
          bars: series.bars,
          values: computation.values,
          indicator,
          compareMode: this.store.getStateRef().compareMode,
          theme: this.store.theme,
        })
      }

      this.overlayContext.restore()
    }

    // Render separate-pane indicators on the indicator canvas
    const multiLayout = this.paneManager.getLayout()

    // Collect non-overlay indicators (legacy 'separate' or paneId-assigned)
    const nonOverlayIndicators = indicators.filter(
      (indicator) => indicator.visible && indicator.pane !== 'overlay',
    )

    if (
      nonOverlayIndicators.length === 0 ||
      this.currentLayout.indicatorHeight <= 0
    ) {
      this.indicatorContext.clearRect(
        0,
        0,
        this.currentLayout.width,
        this.currentLayout.indicatorHeight,
      )
      this.indicatorUiContext.clearRect(
        0,
        0,
        this.currentLayout.width,
        this.currentLayout.indicatorHeight,
      )
      return
    }

    this.indicatorContext.clearRect(
      0,
      0,
      this.currentLayout.width,
      this.currentLayout.indicatorHeight,
    )
    this.indicatorContext.fillStyle = this.store.theme.background
    this.indicatorContext.fillRect(
      0,
      0,
      this.currentLayout.width,
      this.currentLayout.indicatorHeight,
    )

    if (
      multiLayout &&
      multiLayout.hasUserPanes &&
      multiLayout.userPanes.length > 0
    ) {
      // Multi-pane rendering: route indicators to their assigned pane
      for (const paneState of multiLayout.userPanes) {
        // Indicators assigned to this pane (by paneId or legacy 'separate' if it's the first pane)
        const paneIndicators = nonOverlayIndicators.filter((ind) => {
          if (ind.paneId === paneState.id) return true
          // Legacy: indicators with pane === 'separate' go to the first pane
          if (
            ind.pane === 'separate' &&
            !ind.paneId &&
            paneState === multiLayout.userPanes[0]
          )
            return true
          // Indicators with pane matching the paneId
          if (ind.pane === paneState.id) return true
          return false
        })

        if (paneIndicators.length === 0) continue

        const rowHeight = paneState.height / paneIndicators.length

        for (let i = 0; i < paneIndicators.length; i++) {
          this.renderIndicatorInRegion(
            paneIndicators[i],
            viewport,
            paneState.top + i * rowHeight,
            rowHeight,
            i > 0 || paneState.top > 0,
          )
        }
      }
    } else {
      // Legacy: equal-height rows for all 'separate' indicators
      const rowHeight =
        this.currentLayout.indicatorHeight / nonOverlayIndicators.length

      for (let index = 0; index < nonOverlayIndicators.length; index += 1) {
        this.renderIndicatorInRegion(
          nonOverlayIndicators[index],
          viewport,
          index * rowHeight,
          rowHeight,
          index > 0,
        )
      }
    }

    // Draw crosshair vertical line across indicator panes
    this.renderIndicatorPaneCrosshair()
  }

  /**
   * Draw a vertical crosshair line across all indicator panes,
   * synchronized with the main chart crosshair x-position.
   */
  private renderIndicatorPaneCrosshair(): void {
    this.indicatorUiContext.clearRect(
      0,
      0,
      this.currentLayout.width,
      this.currentLayout.indicatorHeight,
    )

    if (!this.crosshair.visible || this.currentLayout.indicatorHeight <= 0) {
      return
    }

    const vertLine = this.latestProps.crosshairConfig?.vertLine
    if (vertLine?.visible === false) {
      return
    }

    this.indicatorUiContext.save()
    this.indicatorUiContext.strokeStyle =
      vertLine?.color ?? `${this.store.theme.crosshair}66`
    this.indicatorUiContext.lineWidth = vertLine?.width ?? 1

    const dash =
      vertLine?.style === 'dotted'
        ? [2, 2]
        : vertLine?.style === 'solid'
          ? []
          : [4, 4] // default: dashed
    this.indicatorUiContext.setLineDash(dash)

    this.indicatorUiContext.beginPath()
    this.indicatorUiContext.moveTo(this.crosshair.x, 0)
    this.indicatorUiContext.lineTo(
      this.crosshair.x,
      this.currentLayout.indicatorHeight,
    )
    this.indicatorUiContext.stroke()
    this.indicatorUiContext.setLineDash([])
    this.indicatorUiContext.restore()
  }

  /**
   * Render a single indicator in a clipped region of the indicator canvas.
   */
  private renderIndicatorInRegion(
    indicator: IndicatorInstance,
    viewport: ChartViewport,
    top: number,
    height: number,
    drawSeparator: boolean,
  ): void {
    const results = this.store.getStateRef().indicatorResults
    const computation = results.get(indicator.id)
    if (!computation) return

    const definition = this.store.indicatorRegistry.get(indicator.type)
    if (!definition) return

    const series = this.store.seriesStore.getSeriesById(indicator.seriesId, {
      clone: false,
    })
    if (!series) return

    this.indicatorContext.save()
    this.indicatorContext.translate(0, top)
    this.indicatorContext.beginPath()
    this.indicatorContext.rect(0, 0, this.currentLayout.width, height)
    this.indicatorContext.clip()

    if (drawSeparator) {
      this.indicatorContext.strokeStyle = this.store.theme.grid
      this.indicatorContext.lineWidth = 1
      this.indicatorContext.beginPath()
      this.indicatorContext.moveTo(0, 0)
      this.indicatorContext.lineTo(this.currentLayout.width, 0)
      this.indicatorContext.stroke()
    }

    // Narrow the clip to the plot area for the presenter itself — the pane
    // separator above spans the full canvas, but indicator ink must stop at
    // the price-axis gutter like it does on the main pane.
    this.indicatorContext.save()
    this.indicatorContext.beginPath()
    this.indicatorContext.rect(0, 0, this.getPlotWidth(), height)
    this.indicatorContext.clip()

    definition.presenter({
      ctx: this.indicatorContext,
      // Plot width, not canvas width: pane indicators must sit on the same
      // bar-index → x mapping as the main chart, otherwise the shared
      // crosshair points at a different bar in each pane.
      width: this.getPlotWidth(),
      height,
      viewport,
      bars: series.bars,
      values: computation.values,
      indicator,
      compareMode: this.store.getStateRef().compareMode,
      theme: this.store.theme,
    })

    this.indicatorContext.restore() // plot-area clip
    this.indicatorContext.restore() // pane clip + translate
  }

  /**
   * Render all visible custom series instances.
   * Custom series render as Canvas2D overlays in parallel with the main WebGL series.
   */
  private renderCustomSeries(
    viewport: ChartViewport,
    plotWidth: number,
    plotHeight: number,
  ): void {
    const visibleSeries = this.customSeriesStore.visible()
    if (visibleSeries.length === 0) return

    const state = this.store.getStateRef()

    // Same reason as the overlay indicators: keep custom ink out of the gutter.
    this.overlayContext.save()
    this.overlayContext.beginPath()
    this.overlayContext.rect(0, 0, plotWidth, plotHeight)
    this.overlayContext.clip()

    for (const instance of visibleSeries) {
      const definition = this.customSeriesRegistry.get(instance.type)
      if (!definition) continue

      // Skip non-main pane instances (they render in indicator panes)
      if (instance.paneId && instance.paneId !== 'main') continue

      const bars = instance.computedBars
      if (bars.length === 0) continue

      // Slice visible bars
      const startIndex = Math.max(0, Math.floor(viewport.startIndex))
      const endIndex = Math.min(bars.length - 1, Math.ceil(viewport.endIndex))
      const visibleBars = bars.slice(startIndex, endIndex + 1)

      if (visibleBars.length === 0) continue

      // Determine price range: use definition's priceRange if available, else use main chart range
      let priceRange = this.currentPriceRange
      if (definition.priceRange) {
        const customRange = definition.priceRange(visibleBars)
        if (customRange) {
          priceRange = customRange
        }
      }

      const coords = createCoordinateHelpers(
        viewport,
        priceRange,
        plotWidth,
        plotHeight,
        [], // custom series don't use ChartBar[] for coords — they use their own bar format
        state.priceScaleMode,
      )

      definition.renderer({
        ctx: this.overlayContext,
        width: plotWidth,
        height: plotHeight,
        viewport,
        bars,
        visibleBars,
        visibleStartIndex: startIndex,
        priceRange,
        priceScaleMode: state.priceScaleMode,
        theme: this.store.theme,
        coords,
        color: instance.color ?? definition.defaultColor ?? '#2196F3',
      })
    }

    this.overlayContext.restore()
  }

  /**
   * Render all visible primitives for a given z-order layer.
   */
  private renderPrimitivesForZOrder(
    zOrder: PrimitiveZOrder,
    viewport: ChartViewport,
    plotWidth: number,
    plotHeight: number,
    bars: Array<ChartBar>,
  ): void {
    const primitives = this.primitiveRegistry.byZOrder(zOrder)
    if (primitives.length === 0) return

    const state = this.store.getStateRef()
    const priceAxisWidth = this.getEffectivePriceAxisWidth()

    // Create coords once per z-order pass — all primitives share the same viewport/range
    const coords = createCoordinateHelpers(
      viewport,
      this.currentPriceRange,
      plotWidth,
      plotHeight,
      bars,
      state.priceScaleMode,
    )

    for (const primitive of primitives) {
      // Verify the series exists
      const series = this.store.seriesStore.getSeriesById(primitive.seriesId, {
        clone: false,
      })
      if (!series) continue

      if (primitive.paneRenderer) {
        primitive.paneRenderer({
          ctx: this.overlayContext,
          width: plotWidth,
          height: plotHeight,
          viewport,
          bars,
          priceRange: this.currentPriceRange,
          priceScaleMode: state.priceScaleMode,
          theme: this.store.theme,
          coords,
        })
      }

      if (primitive.priceAxisRenderer) {
        primitive.priceAxisRenderer({
          ctx: this.overlayContext,
          width: priceAxisWidth,
          height: plotHeight,
          priceRange: this.currentPriceRange,
          priceScaleMode: state.priceScaleMode,
          theme: this.store.theme,
          coords,
        })
      }

      if (primitive.timeAxisRenderer) {
        primitive.timeAxisRenderer({
          ctx: this.overlayContext,
          width: plotWidth,
          height: this.store.theme.layout.timeAxisHeight,
          viewport,
          bars,
          theme: this.store.theme,
          coords,
        })
      }
    }
  }

  private renderFrame(): void {
    if (this.dirtyFlags === DirtyFlags.NONE || this.webgl.isContextLost) {
      return
    }

    const state = this.store.getStateRef()
    const series = this.store.seriesStore.getSeriesRefs()
    const primarySeries = this.store.seriesStore.getPrimarySeriesRef()

    if (!primarySeries) {
      return
    }

    const width = this.currentLayout.width
    const mainHeight = this.currentLayout.mainHeight
    // Plot area = canvas minus the axis gutters. Passes that draw *series
    // data* (WebGL, indicators, custom series, primitives, drawings) map into
    // this space; passes that draw the chrome itself (grid, axes, crosshair)
    // take the full canvas and subtract the gutters themselves.
    const plotWidth = this.getPlotWidth()
    const plotHeight = this.getPlotHeight()

    // Time-axis ticks are planned once per frame and shared by the grid pass
    // and the overlay pass, so gridlines and their labels always land on the
    // same bars. Live ticks (LAST_BAR) reuse the plan: a same-bucket update
    // can't move a calendar boundary, and replanning would re-measure text on
    // every trade.
    if (
      hasDirtyFlag(
        this.dirtyFlags,
        DirtyFlags.GEOMETRY |
          DirtyFlags.VIEWPORT |
          DirtyFlags.OVERLAY |
          DirtyFlags.INDICATORS,
      )
    ) {
      this.timeAxisTicks = computeTimeAxisTicks({
        bars: primarySeries.bars,
        viewport: state.viewport,
        chartWidth: plotWidth,
        measureText: createTextMeasurer(
          this.overlayContext,
          timeAxisFont(this.store.theme),
        ),
        tickMarkFormatter: this.latestProps.timeScale?.tickMarkFormatter,
        locale: this.latestProps.localization?.locale,
      })
    }

    const hasGeometry = hasDirtyFlag(
      this.dirtyFlags,
      DirtyFlags.GEOMETRY | DirtyFlags.INDICATORS,
    )
    const hasViewport = hasDirtyFlag(this.dirtyFlags, DirtyFlags.VIEWPORT)
    // Live-tick incremental frame: only the last bar mutated, y-range and
    // viewport are unchanged (a range-extending tick escalates to ALL before
    // reaching here). GEOMETRY/VIEWPORT supersede LAST_BAR when also dirty.
    const lastBarOnly =
      hasDirtyFlag(this.dirtyFlags, DirtyFlags.LAST_BAR) &&
      !hasGeometry &&
      !hasViewport
    if (hasGeometry || hasViewport || lastBarOnly) {
      if (!lastBarOnly) {
        // Grid canvas: background fill + grid lines (renders BEHIND WebGL
        // candles). It depends only on layout + theme — never on bar data —
        // so tick-only frames skip it (a y-range change escalates to ALL).
        renderGridPass({
          ctx: this.gridContext,
          width,
          height: mainHeight,
          theme: this.store.theme,
          priceAxisWidth: this.getEffectivePriceAxisWidth(),
          timeTicks: this.timeAxisTicks,
        })
      }

      // Clear WebGL to transparent so grid canvas shows through behind candles
      clearWebGL(this.webgl, [0, 0, 0, 0])

      // Clip the GL viewport to the plot area (exclude the time axis at the
      // bottom and the price axis on the right) so WebGL bar positions align
      // with the Canvas2D grid, axis labels, and crosshair. Canvas2D maps bars
      // to chartWidth = width - priceAxisWidth and prices to
      // chartHeight = mainHeight - timeAxisHeight, so the GL viewport must
      // match that coordinate space — spanning the full canvas instead hides
      // the newest bars beneath the opaque price-axis panel.
      const timeAxisH = this.store.theme.layout.timeAxisHeight
      const chartPixelH = Math.max(
        1,
        Math.floor((mainHeight - timeAxisH) * this.webgl.dpr),
      )
      const chartPixelW = Math.max(
        1,
        Math.floor(this.getPlotWidth() * this.webgl.dpr),
      )
      this.webgl.gl.viewport(
        0,
        Math.floor(timeAxisH * this.webgl.dpr),
        chartPixelW,
        chartPixelH,
      )

      const pricePassResult: PricePassResult = renderPricePass({
        series,
        viewport: state.viewport,
        compareMode: state.compareMode,
        chartType: state.chartType,
        priceScaleMode: state.priceScaleMode,
        theme: this.store.theme,
        candleProgram: this.candleProgram,
        barProgram: this.barProgram,
        lineProgram: this.lineProgram,
        areaProgram: this.areaProgram,
        thickLineProgram: this.thickLineProgram,
        yRangeOverride: this.priceRangeOverride,
        scaleMargins: this.latestProps.priceScale?.scaleMargins,
        inverted: this.latestProps.priceScale?.inverted,
        histogramBaseValue: this.latestProps.histogramConfig?.baseValue,
        viewportOnly: hasViewport && !hasGeometry,
        lastBarOnly,
        canvasPixelWidth: chartPixelW,
        canvasPixelHeight: chartPixelH,
        dpr: this.webgl.dpr,
        state: this.pricePassState,
      })

      this.currentPriceRange = pricePassResult.yRange

      // Volume pass renders behind price data in the lower portion of the WebGL canvas
      // renderVolumePass handles maxVol <= 0 early-exit internally, no O(n) guard needed
      // Skipped for price-transform types (renko/lineBreak/kagi/pointFigure):
      // their synthetic bars don't map 1:1 to source bars, so per-index
      // source volume would render misaligned with the bricks.
      if (!isPriceTransformChartType(state.chartType)) {
        renderVolumePass({
          bars: primarySeries.bars,
          viewport: state.viewport,
          priceRange: this.currentPriceRange,
          theme: this.store.theme,
          lineProgram: this.lineProgram,
        })
      }
    }

    if (
      hasDirtyFlag(
        this.dirtyFlags,
        DirtyFlags.OVERLAY |
          DirtyFlags.GEOMETRY |
          DirtyFlags.INDICATORS |
          DirtyFlags.VIEWPORT |
          // Tick frames must redraw the overlay: last-price line/label and
          // baseline series read the mutated last bar.
          DirtyFlags.LAST_BAR,
      )
    ) {
      this.overlayContext.clearRect(0, 0, width, mainHeight)

      // Z-order: behindGrid — renders before grid/axis
      this.renderPrimitivesForZOrder(
        'behindGrid',
        state.viewport,
        plotWidth,
        plotHeight,
        primarySeries.bars,
      )

      const lastBar = primarySeries.bars[primarySeries.bars.length - 1]
      renderTextOverlayPass({
        ctx: this.overlayContext,
        width,
        height: mainHeight,
        bars: primarySeries.bars,
        viewport: state.viewport,
        yRange: this.currentPriceRange,
        theme: this.store.theme,
        crosshair: this.crosshair,
        lastClose: lastBar?.close ?? null,
        lastBar: lastBar ?? null,
        pricePrecision: primarySeries.pricePrecision,
        priceScaleMode: state.priceScaleMode,
        priceScale: this.latestProps.priceScale,
        tickMarkFormatter: this.latestProps.timeScale?.tickMarkFormatter,
        priceLines: primarySeries.priceLines,
        quoteLines: this.quoteLines,
        watermark: this.latestProps.watermark,
        priceFormatter: this.latestProps.localization?.priceFormatter,
        locale: this.latestProps.localization?.locale,
        timeTicks: this.timeAxisTicks,
      })

      // Z-order: behindSeries — renders after grid, before series overlays
      this.renderPrimitivesForZOrder(
        'behindSeries',
        state.viewport,
        plotWidth,
        plotHeight,
        primarySeries.bars,
      )

      // Baseline series rendering (Canvas2D, after text overlay, before drawings)
      if (state.chartType === 'baseline' && this.latestProps.baselineConfig) {
        renderBaselinePass({
          ctx: this.overlayContext,
          width,
          height: mainHeight,
          bars: primarySeries.bars,
          viewport: state.viewport,
          yRange: this.currentPriceRange,
          theme: this.store.theme,
          baseline: this.latestProps.baselineConfig,
          priceAxisWidth: this.getEffectivePriceAxisWidth(),
          timeAxisHeight: this.store.theme.layout.timeAxisHeight,
          priceScaleMode: state.priceScaleMode,
        })
      }

      this.renderOverlayIndicatorsOnCanvas(
        state.viewport,
        plotWidth,
        plotHeight,
        state.indicators,
      )

      // Custom series rendering (Canvas2D overlays)
      this.renderCustomSeries(state.viewport, plotWidth, plotHeight)

      // Z-order: afterSeries (default) — renders after overlay indicators
      this.renderPrimitivesForZOrder(
        'afterSeries',
        state.viewport,
        plotWidth,
        plotHeight,
        primarySeries.bars,
      )

      // Series markers
      if (primarySeries.markers && primarySeries.markers.length > 0) {
        renderMarkersPass({
          ctx: this.overlayContext,
          width,
          height: mainHeight,
          bars: primarySeries.bars,
          viewport: state.viewport,
          yRange: this.currentPriceRange,
          theme: this.store.theme,
          markers: primarySeries.markers,
          priceAxisWidth: this.getEffectivePriceAxisWidth(),
          timeAxisHeight: this.store.theme.layout.timeAxisHeight,
          priceScaleMode: state.priceScaleMode,
        })
      }

      renderDrawingsPass({
        ctx: this.overlayContext,
        width: plotWidth,
        height: plotHeight,
        bars: primarySeries.bars,
        viewport: state.viewport,
        drawings: state.drawings,
        selectedDrawingId: state.selectedDrawingId,
        drawingRegistry: this.drawingRegistry,
        theme: this.store.theme,
        range: this.currentPriceRange,
      })

      // Z-order: topmost — renders above everything including drawings
      this.renderPrimitivesForZOrder(
        'topmost',
        state.viewport,
        plotWidth,
        plotHeight,
        primarySeries.bars,
      )
    }

    if (hasDirtyFlag(this.dirtyFlags, DirtyFlags.UI | DirtyFlags.OVERLAY)) {
      renderUiOverlayPass({
        ctx: this.uiContext,
        width,
        height: mainHeight,
        bars: primarySeries.bars,
        viewport: state.viewport,
        range: this.currentPriceRange,
        theme: this.store.theme,
        crosshair: this.crosshair,
        hoveredDrawing: this.hoveredDrawingId
          ? this.getDrawingById(this.hoveredDrawingId)
          : null,
        priceScaleMode: state.priceScaleMode,
        crosshairConfig: this.latestProps.crosshairConfig,
        priceFormatter: this.latestProps.localization?.priceFormatter,
        seriesColor: primarySeries.color,
        timeAxisHeight: this.store.theme.layout.timeAxisHeight,
        priceAxisWidth: this.getEffectivePriceAxisWidth(),
        tickMarkFormatter: this.latestProps.timeScale?.tickMarkFormatter,
        timeFormatter: this.latestProps.localization?.timeFormatter,
      })

      // Cross-pane crosshair sync: when only the crosshair moved (UI dirty),
      // update only the indicator UI overlay (avoid redrawing indicator panes).
      if (
        hasDirtyFlag(this.dirtyFlags, DirtyFlags.UI) &&
        !hasDirtyFlag(
          this.dirtyFlags,
          DirtyFlags.OVERLAY |
            DirtyFlags.GEOMETRY |
            DirtyFlags.INDICATORS |
            DirtyFlags.VIEWPORT |
            DirtyFlags.LAST_BAR,
        )
      ) {
        this.renderIndicatorPaneCrosshair()
      }
    }

    this.emitSnapshotIfNeeded()
    this.dirtyFlags = DirtyFlags.NONE
  }

  private emitSnapshotIfNeeded(force = false): void {
    if (!this.callbacks?.onSnapshot && !this.latestProps.onSnapshot) {
      return
    }

    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (!force && now - this.lastSnapshotNotifyAt < this.snapshotThrottleMs) {
      return
    }

    this.lastSnapshotNotifyAt = now
    const snapshot = this.store.getSnapshotLite()
    this.callbacks?.onSnapshot?.(snapshot)
    this.latestProps.onSnapshot?.(snapshot)
  }

  updateProps(nextProps: Partial<FastFinancialChartProps>): void {
    const previousProps = this.latestProps
    this.latestProps = {
      ...this.latestProps,
      ...nextProps,
    }
    this.controlledState = {
      ...defaultControlledState,
      ...(this.latestProps.controlled ?? {}),
    }
    this.snapshotThrottleMs = this.latestProps.snapshotThrottleMs ?? 100

    if (nextProps.theme && nextProps.theme !== previousProps.theme) {
      this.store.updateTheme(this.latestProps.theme)
    }

    if (
      nextProps.performance &&
      nextProps.performance !== previousProps.performance
    ) {
      this.store.updatePerformanceConfig(this.latestProps.performance)
      this.scheduler.setMaxFps(this.store.performance.maxFps)
    }

    if (
      nextProps.interaction &&
      nextProps.interaction !== previousProps.interaction
    ) {
      this.store.updateInteractionConfig(this.latestProps.interaction)
    }

    if (nextProps.drawingStyleDefaults !== previousProps.drawingStyleDefaults) {
      this.store.updateDrawingStyleDefaults(nextProps.drawingStyleDefaults)
    }

    if (nextProps.series && nextProps.series !== previousProps.series) {
      this.setSeries({ series: nextProps.series })
    }

    if (
      nextProps.timeframe &&
      nextProps.timeframe !== previousProps.timeframe
    ) {
      this.store.setTimeframe(nextProps.timeframe)
    }

    if (
      this.controlledState.indicators &&
      nextProps.indicators &&
      nextProps.indicators !== previousProps.indicators
    ) {
      this.store.setIndicators(nextProps.indicators)
      this.scheduleIndicatorCompute(true)
    }

    if (
      this.controlledState.drawings &&
      nextProps.drawings &&
      nextProps.drawings !== previousProps.drawings
    ) {
      this.store.setDrawings(nextProps.drawings)
    }

    if (
      nextProps.activeTool !== undefined &&
      nextProps.activeTool !== previousProps.activeTool
    ) {
      // Remove measure drawing when switching away from measure tool
      if (
        previousProps.activeTool === 'measure' &&
        nextProps.activeTool !== 'measure'
      ) {
        const measure = this.store
          .getStateRef()
          .drawings.find((d) => d.type === 'measure')
        if (measure) this.store.removeDrawing(measure.id)
      }
      // Reconcile against the store, not just the previous props: hosts that
      // activate tools through the setActiveTool command (which carries meta,
      // e.g. path presets) update the store before this prop echo arrives —
      // re-setting the same tool here would wipe that activeToolMeta.
      if (this.store.getStateRef().activeTool !== nextProps.activeTool) {
        this.store.setActiveTool(nextProps.activeTool)
      }
    }

    if (
      nextProps.chartType &&
      nextProps.chartType !== previousProps.chartType
    ) {
      this.store.setChartType(nextProps.chartType)
      this.markDirty(DirtyFlags.GEOMETRY)
    }

    if (
      nextProps.compareMode &&
      nextProps.compareMode !== previousProps.compareMode
    ) {
      this.store.setCompareMode(nextProps.compareMode)
    }

    if (
      nextProps.priceScaleMode &&
      nextProps.priceScaleMode !== previousProps.priceScaleMode
    ) {
      this.store.setPriceScaleMode(nextProps.priceScaleMode)
    }

    // priceScale.mode overrides top-level priceScaleMode
    if (
      nextProps.priceScale?.mode &&
      nextProps.priceScale.mode !== previousProps.priceScale?.mode
    ) {
      this.store.setPriceScaleMode(nextProps.priceScale.mode)
    }

    // If priceScale config changes, mark geometry dirty for margins/inversion
    if (
      nextProps.priceScale &&
      nextProps.priceScale !== previousProps.priceScale
    ) {
      this.markDirty(DirtyFlags.GEOMETRY | DirtyFlags.OVERLAY | DirtyFlags.UI)
    }

    // If timeScale config changes, update viewport clamp options
    if (
      nextProps.timeScale &&
      nextProps.timeScale !== previousProps.timeScale
    ) {
      this.syncTimeScaleToStore()
      this.markDirty(DirtyFlags.GEOMETRY | DirtyFlags.OVERLAY | DirtyFlags.UI)
    }

    if (
      this.controlledState.viewport &&
      nextProps.viewport &&
      nextProps.viewport !== previousProps.viewport
    ) {
      this.store.setViewport(nextProps.viewport)
    }

    if (
      !this.controlledState.viewport &&
      nextProps.defaultViewport &&
      !isSameDefaultViewport(
        nextProps.defaultViewport,
        previousProps.defaultViewport,
      ) &&
      !nextProps.viewport
    ) {
      const barsLength =
        this.store.seriesStore.getPrimarySeriesRef()?.bars.length ?? 0
      this.store.setViewport(
        viewportFromPreset(
          barsLength,
          nextProps.defaultViewport,
          this.latestProps.timeScale?.rightOffset ?? 0,
        ),
      )
    }

    // Sync pane configurations from props
    if (nextProps.panes && nextProps.panes !== previousProps.panes) {
      this.paneManager.setPanes(nextProps.panes)
      this.store.emitStateChange('panes')
    }
  }

  /**
   * Show, move, or hide (null) the best bid/ask quote lines. Imperative like
   * applyTicks — quotes tick at orderbook cadence and must not flow through
   * React props. Only the Canvas2D overlay is redrawn.
   */
  setQuoteLines(quotes: { bid: number; ask: number } | null): void {
    const prev = this.quoteLines
    if (
      prev === quotes ||
      (prev !== null &&
        quotes !== null &&
        prev.bid === quotes.bid &&
        prev.ask === quotes.ask)
    ) {
      return
    }
    this.quoteLines = quotes
    this.markDirty(DirtyFlags.OVERLAY)
  }

  applyTick(update: TickUpdate): void {
    const shiftOnNew =
      this.latestProps.timeScale?.shiftVisibleRangeOnNewBar !== false
    const flagsBefore = this.dirtyFlags
    const result = this.store.applyTick(update, {
      autoScroll: shiftOnNew && !this.controlledState.viewport,
    })
    this.downgradeTickDirtyFlags(
      flagsBefore,
      [update.seriesId],
      result.appended,
    )
  }

  applyTicks(updates: Array<TickUpdate>): void {
    const shiftOnNew =
      this.latestProps.timeScale?.shiftVisibleRangeOnNewBar !== false
    const flagsBefore = this.dirtyFlags
    const result = this.store.applyTicks(updates, {
      autoScroll: shiftOnNew && !this.controlledState.viewport,
    })
    if (updates.length > 0) {
      this.downgradeTickDirtyFlags(
        flagsBefore,
        updates.map((update) => update.seriesId),
        result.appended > 0,
      )
    }
  }

  /**
   * Live-tick fast path: applying a tick emits a 'data' state change which
   * marks DirtyFlags.ALL (full geometry rebuild + full GPU re-upload). When
   * the tick(s) only mutated the last bar of their series — no append, no
   * rollover — and stayed inside the currently rendered y-range, downgrade
   * to the incremental LAST_BAR path: the price pass rewrites just the last
   * bar's instances via bufferSubData and static passes (grid) are skipped.
   *
   * Escalation to the full rebuild is kept whenever the tick could change
   * the auto-scaled y-range (see resolveTickRenderFlags).
   */
  private downgradeTickDirtyFlags(
    flagsBefore: number,
    seriesIds: Array<string>,
    appended: boolean,
  ): void {
    if (appended) {
      return
    }

    const changedBars = seriesIds.map((seriesId) => {
      const series = this.store.seriesStore.getSeriesById(seriesId, {
        clone: false,
      })
      return series?.bars[series.bars.length - 1]
    })

    const nextFlags = resolveTickRenderFlags({
      flagsBefore,
      appended,
      changedBars,
      priceScaleMode: this.store.getStateRef().priceScaleMode,
      currentYRange: this.priceRangeOverride ?? this.currentPriceRange,
    })

    if (nextFlags !== null) {
      this.dirtyFlags = nextFlags
    }
  }

  appendBar(update: { seriesId: string; bar: ChartBar }): void {
    this.store.appendBar(update)
    const shiftOnNew =
      this.latestProps.timeScale?.shiftVisibleRangeOnNewBar !== false
    if (shiftOnNew && !this.controlledState.viewport) {
      const span =
        this.store.getStateRef().viewport.endIndex -
        this.store.getStateRef().viewport.startIndex +
        1
      this.store.scrollToLatest(span)
    }
  }

  setSeries(update: SeriesReplaceUpdate): void {
    const oldViewport = this.store.getStateRef().viewport
    const oldPrimaryId = this.store.seriesStore.getPrimarySeriesRef()?.id
    const oldBarsLength =
      this.store.seriesStore.getPrimarySeriesRef()?.bars.length ?? 0
    const rightOffset = this.latestProps.timeScale?.rightOffset ?? 0
    const oldMaxIndex = oldBarsLength > 0 ? oldBarsLength - 1 + rightOffset : 0
    const wasEmpty = oldBarsLength === 0
    const wasRightAnchored =
      oldBarsLength > 0 && oldViewport.endIndex >= oldMaxIndex

    const replaced = this.store.replaceSeries(update)
    if (!replaced) {
      return
    }
    const newPrimaryId = this.store.seriesStore.getPrimarySeriesRef()?.id
    if (oldPrimaryId !== undefined && oldPrimaryId !== newPrimaryId) {
      this.priceRangeOverride = null
    }
    const primaryBars = this.store.seriesStore.getPrimarySeriesRef()?.bars ?? []
    if (!this.controlledState.viewport) {
      if (wasEmpty && primaryBars.length > 0) {
        // Transitioning from empty → populated data (e.g. WebSocket snapshot arriving).
        // Compute a fresh viewport from the default preset so rightOffset is applied.
        const preset = this.latestProps.defaultViewport ?? {
          type: 'last-bars' as const,
          bars: 120,
        }
        this.store.setViewport(
          viewportFromPreset(primaryBars.length, preset, rightOffset),
        )
      } else if (
        wasRightAnchored &&
        primaryBars.length > 0 &&
        primaryBars.length !== oldBarsLength
      ) {
        // Keep viewport anchored to the latest bar (+rightOffset) when replacing a full
        // series payload (e.g. backend snapshot refresh) while user is at the right edge.
        const deltaBars = primaryBars.length - oldBarsLength
        this.store.setViewport({
          startIndex: oldViewport.startIndex + deltaBars,
          endIndex: oldViewport.endIndex + deltaBars,
        })
      } else {
        this.store.setViewport(
          clampViewport(
            this.store.getStateRef().viewport,
            primaryBars.length,
            this.store.performance.viewportMinBars,
            {
              rightOffset: this.latestProps.timeScale?.rightOffset,
              fixLeftEdge: this.latestProps.timeScale?.fixLeftEdge,
              fixRightEdge: this.latestProps.timeScale?.fixRightEdge,
            },
          ),
        )
      }
    }
    this.scheduleIndicatorCompute(true)
  }

  setIndicators(indicators: Array<IndicatorInstanceInput>): void {
    this.store.setIndicators(indicators)
    this.scheduleIndicatorCompute(true)
  }

  /**
   * Register an indicator definition at runtime (e.g. a `custom:*` indicator
   * backed by an external async runtime). Triggers a recompute so instances
   * whose definition arrived late pick it up.
   */
  registerIndicatorDefinition(definition: IndicatorDefinition): void {
    this.store.indicatorRegistry.register(definition)
    this.scheduleIndicatorCompute()
  }

  /**
   * Unregister an indicator definition by type. Returns false when the type
   * was not registered. Instances of the type remain but stop producing
   * values (unsupported-type error) and no longer render.
   */
  unregisterIndicatorDefinition(type: IndicatorType): boolean {
    const removed = this.store.indicatorRegistry.remove(type)
    if (removed) {
      this.scheduleIndicatorCompute()
    }
    return removed
  }

  setDrawings(drawings: Array<DrawingObject>): void {
    this.store.setDrawings(drawings)
  }

  setActiveTool(tool: DrawingToolType | null): void {
    const prev = this.store.getStateRef().activeTool
    if (prev === 'measure' && tool !== 'measure') {
      const measure = this.store
        .getStateRef()
        .drawings.find((d) => d.type === 'measure')
      if (measure) this.store.removeDrawing(measure.id)
    }
    this.store.setActiveTool(tool)
  }

  fitContent(): void {
    const barsLength =
      this.store.seriesStore.getPrimarySeriesRef()?.bars.length ?? 0
    if (barsLength === 0) return
    const rightOffset = this.latestProps.timeScale?.rightOffset ?? 0
    // Add left padding proportional to the visible bars (min 3 bars of whitespace)
    const totalBars = barsLength + rightOffset
    const leftPad = Math.max(3, Math.round(totalBars * 0.02))
    this.store.setViewport({
      startIndex: -leftPad,
      endIndex: barsLength - 1 + rightOffset,
    })
  }

  executeCommand(command: ChartCommand): ChartCommandResult {
    if (command.type === 'applyTick') {
      this.applyTick(command.payload)
      return { ok: true, result: { applied: 1 } }
    }

    if (command.type === 'setQuoteLines') {
      this.setQuoteLines(command.payload)
      return { ok: true, result: { visible: command.payload !== null } }
    }

    if (command.type === 'applyTicks') {
      this.applyTicks(command.payload.updates)
      return { ok: true, result: { applied: command.payload.updates.length } }
    }

    if (command.type === 'appendBar') {
      this.appendBar(command.payload)
      return { ok: true, result: { appended: true } }
    }

    if (command.type === 'replaceSeries') {
      this.setSeries(command.payload)
      return { ok: true, result: { replaced: command.payload.series.length } }
    }

    if (command.type === 'fitContent') {
      this.fitContent()
      return { ok: true, result: { fitted: true } }
    }

    if (command.type === 'scrollToPosition') {
      this.scrollToPosition(command.payload.barIndex, command.payload.animated)
      return { ok: true, result: { scrolledTo: command.payload.barIndex } }
    }

    if (command.type === 'priceToCoordinate') {
      const y = this.priceToCoordinate(command.payload.price)
      return { ok: true, result: { price: command.payload.price, y } }
    }

    if (command.type === 'coordinateToPrice') {
      const price = this.coordinateToPrice(command.payload.y)
      return { ok: true, result: { y: command.payload.y, price } }
    }

    if (command.type === 'timeToCoordinate') {
      const x = this.timeToCoordinate(command.payload.ts)
      return { ok: true, result: { ts: command.payload.ts, x } }
    }

    if (command.type === 'coordinateToTime') {
      const ts = this.coordinateToTime(command.payload.x)
      return { ok: true, result: { x: command.payload.x, ts } }
    }

    if (command.type === 'getData') {
      const allBars = this.data(command.payload?.seriesId)
      const total = allBars.length
      const offset = command.payload?.offset ?? 0
      const limit = command.payload?.limit
      const bars =
        offset > 0 || limit !== undefined
          ? allBars.slice(
              offset,
              limit !== undefined ? offset + limit : undefined,
            )
          : allBars
      return { ok: true, result: { bars, total, count: bars.length, offset } }
    }

    if (command.type === 'getDataByIndex') {
      const bar = this.dataByIndex(
        command.payload.index,
        command.payload.seriesId,
      )
      return { ok: true, result: { bar } }
    }

    if (command.type === 'popBars') {
      const removed = this.pop(command.payload.count, command.payload.seriesId)
      return { ok: true, result: { removed } }
    }

    if (command.type === 'getSeriesOrder') {
      const order = this.seriesOrder()
      return { ok: true, result: { order } }
    }

    if (command.type === 'setSeriesOrder') {
      this.setSeriesOrder(command.payload.orderedIds)
      return { ok: true, result: { order: command.payload.orderedIds } }
    }

    if (command.type === 'takeScreenshot') {
      const screenshot = this.takeScreenshot(command.payload)
      return { ok: true, result: screenshot }
    }

    if (command.type === 'addPane') {
      const paneId = this.addPane(command.payload)
      return { ok: true, result: { paneId } }
    }

    if (command.type === 'removePane') {
      const removed = this.removePane(command.payload.id)
      return { ok: true, result: { removed } }
    }

    if (command.type === 'swapPanes') {
      const swapped = this.swapPanes(
        command.payload.paneId1,
        command.payload.paneId2,
      )
      return { ok: true, result: { swapped } }
    }

    if (command.type === 'updatePane') {
      const updated = this.paneManager.updatePane(
        command.payload.id,
        command.payload.patch,
      )
      if (updated) {
        this.store.emitStateChange('panes')
      }
      return { ok: true, result: { updated } }
    }

    if (command.type === 'getPaneLayout') {
      const layout = this.paneManager.getLayout()
      const panes = this.paneManager.getPanes()
      return { ok: true, result: { panes, layout } }
    }

    if (command.type === 'addPrimitive') {
      const id = this.addPrimitive(command.payload)
      return { ok: true, result: { id } }
    }

    if (command.type === 'removePrimitive') {
      const removed = this.removePrimitive(command.payload.id)
      return { ok: true, result: { removed } }
    }

    if (command.type === 'listPrimitives') {
      const primitives = this.listPrimitives()
      return { ok: true, result: { primitives } }
    }

    if (command.type === 'addCustomSeries') {
      const id = this.addCustomSeries(command.payload)
      return { ok: true, result: { id } }
    }

    if (command.type === 'removeCustomSeries') {
      const removed = this.removeCustomSeries(command.payload.id)
      return { ok: true, result: { removed } }
    }

    if (command.type === 'updateCustomSeriesData') {
      const updated = this.updateCustomSeriesData(
        command.payload.id,
        command.payload.bars,
      )
      return { ok: true, result: { updated } }
    }

    if (command.type === 'listCustomSeries') {
      const series = this.listCustomSeries()
      return { ok: true, result: { series } }
    }

    return this.commandBus.execute(command)
  }

  getSnapshot(options?: SnapshotOptions): ChartSnapshot | ChartSnapshotLite {
    const snapshot = this.store.getSnapshot(options)
    // Undo/redo stacks live on the engine, not the store — annotate here.
    snapshot.canUndo = this.drawingUndoStack.length > 0
    snapshot.canRedo = this.drawingRedoStack.length > 0
    return snapshot
  }

  getMcpSchema(): Array<MCPToolSchema> {
    return this.mcpSchema.slice()
  }

  subscribe(listener: (event: ChartEvent) => void): () => void {
    this.externalEventListeners.add(listener)
    return () => {
      this.externalEventListeners.delete(listener)
    }
  }

  getCapabilities(): ChartCapabilities {
    return this.buildCapabilities()
  }

  // ── Pane Management API ──

  addPane(input?: PaneInput): PaneId {
    const paneId = this.paneManager.addPane(input)
    this.store.emitStateChange('panes')
    return paneId
  }

  removePane(paneId: PaneId): boolean {
    const removed = this.paneManager.removePane(paneId)
    if (removed) {
      // Reassign indicators that were in the removed pane back to 'separate'
      const state = this.store.getStateRef()
      for (const indicator of state.indicators) {
        if (indicator.paneId === paneId || indicator.pane === paneId) {
          this.store.updateIndicator(indicator.id, {
            pane: 'separate',
            paneId: undefined,
          })
        }
      }
      this.store.emitStateChange('panes')
    }
    return removed
  }

  swapPanes(paneId1: PaneId, paneId2: PaneId): boolean {
    const swapped = this.paneManager.swapPanes(paneId1, paneId2)
    if (swapped) {
      this.store.emitStateChange('panes')
    }
    return swapped
  }

  getPaneLayout() {
    return {
      panes: this.paneManager.getPanes(),
      layout: this.paneManager.getLayout(),
    }
  }

  // ── Primitive API ──

  addPrimitive(input: SeriesPrimitiveInput): string {
    const id = this.primitiveRegistry.add(input)
    this.markDirty(DirtyFlags.OVERLAY)
    return id
  }

  removePrimitive(id: string): boolean {
    const removed = this.primitiveRegistry.remove(id)
    if (removed) {
      this.markDirty(DirtyFlags.OVERLAY)
    }
    return removed
  }

  listPrimitives() {
    return this.primitiveRegistry.all().map((p) => ({
      id: p.id,
      seriesId: p.seriesId,
      zOrder: p.zOrder ?? 'afterSeries',
      visible: p.visible ?? true,
      paneId: p.paneId,
      hasPaneRenderer: !!p.paneRenderer,
      hasPriceAxisRenderer: !!p.priceAxisRenderer,
      hasTimeAxisRenderer: !!p.timeAxisRenderer,
    }))
  }

  // ── Custom Series API ──

  addCustomSeries(input: CustomSeriesInput): string {
    const id = this.customSeriesStore.add(input)
    this.markDirty(DirtyFlags.OVERLAY)
    return id
  }

  removeCustomSeries(id: string): boolean {
    const removed = this.customSeriesStore.remove(id)
    if (removed) {
      this.markDirty(DirtyFlags.OVERLAY)
    }
    return removed
  }

  updateCustomSeriesData(id: string, bars: Array<CustomSeriesBar>): boolean {
    const updated = this.customSeriesStore.updateBars(id, bars)
    if (updated) {
      this.markDirty(DirtyFlags.OVERLAY)
    }
    return updated
  }

  listCustomSeries() {
    return this.customSeriesStore.all().map((s) => ({
      id: s.id,
      type: s.type,
      label: s.label,
      color: s.color,
      visible: s.visible ?? true,
      paneId: s.paneId,
      barCount: s.bars.length,
    }))
  }

  dispose(): void {
    this.detachDomListeners()

    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    if (this.indicatorComputeTimer) {
      clearTimeout(this.indicatorComputeTimer)
      this.indicatorComputeTimer = null
    }

    this.stopInertia()
    this.cancelViewportAnimation()
    this.contextLossHandler.detach()
    this.scheduler.dispose()
    this.indicatorWorker.dispose()
    this.primitiveRegistry.clear()
    this.customSeriesStore.clear()
    this.customSeriesRegistry.clear()
    this.candleProgram.dispose()
    this.barProgram.dispose()
    this.lineProgram.dispose()
    this.areaProgram.dispose()
    this.thickLineProgram.dispose()
  }
}
