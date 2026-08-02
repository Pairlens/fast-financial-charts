import type { CustomSeriesBar } from './custom-series'
import type { ChartBar } from './data'
import type { DrawingObject, DrawingToolType } from './drawings'
import type { IndicatorInstance } from './indicators'
import type { ChartViewport } from './viewport'

export type ChartStateChangeReason =
  | 'data'
  | 'viewport'
  | 'drawings'
  | 'selection'
  | 'indicators'
  | 'indicator-config'
  | 'theme'
  | 'interaction'
  | 'tool'
  | 'panes'

export type ChartThemeIndicatorPalette = {
  macd: {
    signal: string
    histogramUp: string
    histogramDown: string
    zeroLine: string
  }
  rsi: {
    guide: string
  }
  volume: {
    up: string
    down: string
  }
  stochastic: {
    signal: string
    guide: string
  }
  ichimoku: {
    tenkan: string
    kijun: string
    senkouA: string
    senkouB: string
    chikou: string
    cloudBullish: string
    cloudBearish: string
  }
  supertrend: {
    up: string
    down: string
  }
  adx: {
    plusDI: string
    minusDI: string
    guide: string
  }
  oscillator: {
    zeroLine: string
  }
}

export type ChartLayoutConfig = {
  priceAxisWidth: number
  timeAxisHeight: number
  gridRows: number
  gridColumns: number
}

export type ChartTheme = {
  background: string
  grid: string
  axisText: string
  axisBackground: string
  upCandle: string
  downCandle: string
  crosshair: string
  selection: string
  drawingHandle: string
  hudBg: string
  hudText: string
  fontFamilyMono: string
  fontSizeAxis: number
  fontSizeHud: number
  menuZ: number
  indicator: ChartThemeIndicatorPalette
  layout: ChartLayoutConfig
}

export type ChartThemeInput = Partial<
  Omit<ChartTheme, 'indicator' | 'layout'>
> & {
  indicator?: {
    macd?: Partial<ChartThemeIndicatorPalette['macd']>
    rsi?: Partial<ChartThemeIndicatorPalette['rsi']>
    volume?: Partial<ChartThemeIndicatorPalette['volume']>
    stochastic?: Partial<ChartThemeIndicatorPalette['stochastic']>
    ichimoku?: Partial<ChartThemeIndicatorPalette['ichimoku']>
    supertrend?: Partial<ChartThemeIndicatorPalette['supertrend']>
    adx?: Partial<ChartThemeIndicatorPalette['adx']>
    oscillator?: Partial<ChartThemeIndicatorPalette['oscillator']>
  }
  layout?: Partial<ChartLayoutConfig>
}

export type PerformanceConfig = {
  maxFps: number
  enableHiDpi: boolean
  indicatorWorker: boolean
  viewportMinBars: number
}

export type ScrollHandleConfig = {
  mouseWheel?: boolean
  pressedMouseMove?: boolean
  horzTouchDrag?: boolean
}

export type ScaleHandleConfig = {
  mouseWheel?: boolean
  pinch?: boolean
  axisPressedMouseMove?: boolean
  axisDoubleClickReset?: boolean
}

export type KineticScrollConfig = {
  touch?: boolean
  mouse?: boolean
}

export type DrawingToolMode = 'sticky' | 'single-use'

export type InteractionConfig = {
  wheelZoom: boolean
  dragPan: boolean
  keyboardShortcuts: boolean
  drawingSnap: boolean
  drawingToolMode: DrawingToolMode
  handleScroll?: ScrollHandleConfig
  handleScale?: ScaleHandleConfig
  kineticScroll?: KineticScrollConfig
}

/** Localization & custom formatters. */
export type LocaleConfig = {
  /** BCP 47 locale string for date formatting (e.g. 'en-US', 'de-DE') */
  locale?: string
  /** Custom formatter for price values on the Y axis and crosshair */
  priceFormatter?: (price: number) => string
  /**
   * Custom formatter for the crosshair time readout. Time-axis tick labels come
   * from `timeScale.tickMarkFormatter`, which is told which calendar boundary
   * each tick sits on.
   */
  timeFormatter?: (time: number) => string
}

export type CrosshairMode = 'normal' | 'magnet' | 'hidden'

export type CrosshairLineConfig = {
  color?: string
  width?: number
  style?: 'solid' | 'dashed' | 'dotted'
  visible?: boolean
  labelVisible?: boolean
  labelBackgroundColor?: string
}

export type CrosshairConfig = {
  mode?: CrosshairMode
  vertLine?: CrosshairLineConfig
  horzLine?: CrosshairLineConfig
}

export type WatermarkConfig = {
  text?: string
  color?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
  horzAlign?: 'left' | 'center' | 'right'
  vertAlign?: 'top' | 'center' | 'bottom'
  visible?: boolean
}

export type ChartContextMenuPayload = {
  x: number
  y: number
  clientX: number
  clientY: number
  nearestBar: ChartBar | null
  nearestDrawing: DrawingObject | null
  selectedDrawingId: string | null
}

export type ChartTopBarPayload = {
  viewport: ChartViewport
  indicators: Array<IndicatorInstance>
  activeTool: DrawingToolType | null
}

export type ChartHudPayload = {
  hoveredBar: ChartBar | null
  hoveredDrawing: DrawingObject | null
  /** The hovered custom series bar (if any custom series is at the pointer position) */
  hoveredCustomBar: CustomSeriesBar | null
  /** The id of the hovered custom series (if any) */
  hoveredCustomSeriesId: string | null
}

/** Payload for mouse-based chart events (click, crosshairMove). */
export type MouseEventParams = {
  /** Timestamp of the nearest bar at the pointer position */
  time: number | null
  /** Screen coordinates (relative to chart element) */
  point: { x: number; y: number }
  /** The nearest bar's close price */
  price: number | null
  /** The nearest bar (full OHLCV data) */
  seriesData: ChartBar | null
}

/** Payload for visible time range changes. */
export type VisibleTimeRangeChangePayload = {
  /** Viewport indices */
  viewport: ChartViewport
  /** Timestamp of the first visible bar (null if no bars visible) */
  from: number | null
  /** Timestamp of the last visible bar (null if no bars visible) */
  to: number | null
}

/** Payload for chart size changes. */
export type SizeChangePayload = {
  width: number
  height: number
}

export type ChartEvent =
  | { type: 'contextmenu'; payload: ChartContextMenuPayload }
  | { type: 'hover'; payload: ChartHudPayload }
  | { type: 'hudUpdate'; payload: ChartHudPayload }
  | { type: 'click'; payload: MouseEventParams }
  | { type: 'dblclick'; payload: MouseEventParams }
  | { type: 'crosshairMove'; payload: MouseEventParams }
  | { type: 'visibleTimeRangeChange'; payload: VisibleTimeRangeChangePayload }
  | { type: 'sizeChange'; payload: SizeChangePayload }
  | {
      type: 'selectionChange'
      payload: {
        drawingId: string | null
        drawing: DrawingObject | null
      }
    }
  | {
      type: 'drawingsChange'
      payload: {
        drawings: Array<DrawingObject>
        reason: string
      }
    }
  | {
      type: 'indicatorsChange'
      payload: {
        indicators: Array<IndicatorInstance>
      }
    }
  | {
      type: 'stateChange'
      payload: {
        reason: ChartStateChangeReason
      }
    }
  | {
      type: 'indicatorComputeComplete'
      payload: {
        indicatorId: string
        valuesCount: number
      }
    }
