export type ChartViewport = {
  startIndex: number
  endIndex: number
}

export type ChartViewportPreset =
  | { type: 'last-bars'; bars: number }
  | { type: 'indices'; startIndex: number; endIndex: number }

export type CompareMode = 'indexed' | 'price' | 'dual-axis'

/**
 * Price scale mode controls how y-axis values are displayed.
 * - `normal`: Linear price display (default)
 * - `logarithmic`: Logarithmic scale for assets with wide price ranges
 * - `percentage`: Shows percentage change from first visible bar (0% at first bar)
 * - `indexedTo100`: Like percentage but starts at 100 instead of 0
 */
export type PriceScaleMode =
  | 'normal'
  | 'logarithmic'
  | 'percentage'
  | 'indexedTo100'

/**
 * Tick type for custom time formatters.
 */
export type TimeTickType = 'year' | 'month' | 'day' | 'time'

/**
 * Configuration for the time (X) axis scale.
 */
export type TimeScaleConfig = {
  /** Number of empty bars to show after the last data point (default 0) */
  rightOffset?: number
  /** Pixel width per bar; controls zoom level (default 6) */
  barSpacing?: number
  /** Minimum pixel width per bar */
  minBarSpacing?: number
  /** Maximum pixel width per bar */
  maxBarSpacing?: number
  /** Prevent scrolling past the first bar */
  fixLeftEdge?: boolean
  /** Prevent scrolling past the last bar */
  fixRightEdge?: boolean
  /** Auto-scroll when new bars arrive (default true) */
  shiftVisibleRangeOnNewBar?: boolean
  /** Custom formatter for time axis tick labels */
  tickMarkFormatter?: (time: number, tickType: TimeTickType) => string
}

/**
 * Configuration for the price (Y) axis scale.
 */
export type PriceScaleConfig = {
  /** Scale mode (overrides top-level priceScaleMode if set) */
  mode?: PriceScaleMode
  /** Flip the Y axis so higher values are at the bottom */
  inverted?: boolean
  /** Reserve space at top/bottom as a ratio of chart height (0–0.5) */
  scaleMargins?: { top: number; bottom: number }
  /** Show the border line between chart area and price axis */
  borderVisible?: boolean
  /** Border color (defaults to theme grid color) */
  borderColor?: string
  /** Show tick marks on the price axis */
  ticksVisible?: boolean
  /** Minimum width of the price axis in pixels */
  minimumWidth?: number
  /** Hide the price axis entirely */
  visible?: boolean
}
