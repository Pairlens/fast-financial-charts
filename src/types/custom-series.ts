import type { NumericRange } from './data'
import type { PaneId } from './panes'
import type { PrimitiveCoordinateHelpers } from './primitives'
import type { ChartTheme } from './theme'
import type { ChartViewport, PriceScaleMode } from './viewport'

/**
 * A data bar for custom series — must have a `ts` field,
 * all other fields are user-defined.
 */
export type CustomSeriesBar = {
  ts: number
  [key: string]: number | string | boolean | undefined
}

/**
 * Rendering context passed to a custom series renderer.
 */
export type CustomSeriesRenderContext = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  viewport: ChartViewport
  /** All bars in the series */
  bars: Array<CustomSeriesBar>
  /** Viewport-sliced visible bars */
  visibleBars: Array<CustomSeriesBar>
  /** Index of the first visible bar in the full bars array */
  visibleStartIndex: number
  priceRange: NumericRange
  priceScaleMode: PriceScaleMode
  theme: ChartTheme
  coords: PrimitiveCoordinateHelpers
  /** Assigned color for this series */
  color: string
}

/**
 * Definition of a custom series type.
 * Register once, then create instances with `addCustomSeries()`.
 */
export type CustomSeriesDefinition = {
  /** Must be prefixed with `custom:`, e.g. `custom:heatmap` */
  type: `custom:${string}`
  /** Display label */
  label?: string
  /** Canvas2D renderer called every frame for visible data */
  renderer: (ctx: CustomSeriesRenderContext) => void
  /** Optional preprocessor: transform bars before rendering */
  compute?: (bars: Array<CustomSeriesBar>) => Array<CustomSeriesBar>
  /** Optional: compute price range for y-axis scaling from visible bars */
  priceRange?: (visibleBars: Array<CustomSeriesBar>) => NumericRange | null
  /** Default color for instances that don't specify one */
  defaultColor?: string
  /** Default pane for instances (default: 'main') */
  defaultPaneId?: PaneId | 'main'
}

/**
 * Input for creating a custom series instance.
 */
export type CustomSeriesInput = {
  /** Unique instance id */
  id: string
  /** Must match a registered `CustomSeriesDefinition.type` */
  type: `custom:${string}`
  /** Data bars */
  bars: Array<CustomSeriesBar>
  /** Display label */
  label?: string
  /** Series color (falls back to definition defaultColor) */
  color?: string
  /** Whether the series is visible (default: true) */
  visible?: boolean
  /** Target pane ('main' or a PaneId) */
  paneId?: PaneId | 'main'
  /** Price precision for axis/HUD formatting */
  pricePrecision?: number
}

/**
 * Runtime state of a custom series instance.
 */
export type CustomSeriesInstance = CustomSeriesInput & {
  /** Computed bars after `definition.compute()` (or raw bars if no compute) */
  computedBars: Array<CustomSeriesBar>
}
