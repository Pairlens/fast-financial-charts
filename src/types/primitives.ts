import type { ChartBar, NumericRange } from './data'
import type { PaneId } from './panes'
import type { ChartTheme } from './theme'
import type { ChartViewport, PriceScaleMode } from './viewport'

/**
 * Coordinate conversion helpers available to primitive renderers.
 */
export type PrimitiveCoordinateHelpers = {
  /** Convert a price value to Y pixel coordinate */
  priceToY: (price: number) => number
  /** Convert a bar index to X pixel coordinate */
  indexToX: (index: number) => number
  /** Convert a timestamp to X pixel coordinate (returns null if not found) */
  timeToX: (ts: number) => number | null
  /** Convert a Y pixel coordinate to a price value */
  yToPrice: (y: number) => number
  /** Convert an X pixel coordinate to a bar index */
  xToIndex: (x: number) => number
}

/**
 * Context passed to a primitive's pane (chart area) renderer.
 */
export type PrimitivePaneRenderContext = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  viewport: ChartViewport
  bars: Array<ChartBar>
  priceRange: NumericRange
  priceScaleMode: PriceScaleMode
  theme: ChartTheme
  coords: PrimitiveCoordinateHelpers
}

/**
 * Context passed to a primitive's price axis renderer.
 */
export type PrimitivePriceAxisRenderContext = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  priceRange: NumericRange
  priceScaleMode: PriceScaleMode
  theme: ChartTheme
  coords: Pick<PrimitiveCoordinateHelpers, 'priceToY' | 'yToPrice'>
}

/**
 * Context passed to a primitive's time axis renderer.
 */
export type PrimitiveTimeAxisRenderContext = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  viewport: ChartViewport
  bars: Array<ChartBar>
  theme: ChartTheme
  coords: Pick<PrimitiveCoordinateHelpers, 'indexToX' | 'timeToX' | 'xToIndex'>
}

/**
 * Z-order layer for primitive rendering relative to chart content.
 */
export type PrimitiveZOrder =
  | 'behindGrid'
  | 'behindSeries'
  | 'afterSeries'
  | 'topmost'

/**
 * A series primitive provides custom Canvas2D rendering attached to a series.
 * Primitives can render in the chart area, price axis, and/or time axis.
 */
export type SeriesPrimitive = {
  /** Unique primitive identifier */
  id: string
  /** Series this primitive is attached to */
  seriesId: string
  /** Z-order layer (default: 'afterSeries') */
  zOrder?: PrimitiveZOrder
  /** Canvas2D renderer for the chart pane area */
  paneRenderer?: (ctx: PrimitivePaneRenderContext) => void
  /** Canvas2D renderer for the price axis area */
  priceAxisRenderer?: (ctx: PrimitivePriceAxisRenderContext) => void
  /** Canvas2D renderer for the time axis area */
  timeAxisRenderer?: (ctx: PrimitiveTimeAxisRenderContext) => void
  /** Optional target pane (for multi-pane layouts) */
  paneId?: PaneId
  /** Whether the primitive is visible (default: true) */
  visible?: boolean
}

/**
 * Input for creating a new primitive (id is optional).
 */
export type SeriesPrimitiveInput = Omit<SeriesPrimitive, 'id'> & { id?: string }
