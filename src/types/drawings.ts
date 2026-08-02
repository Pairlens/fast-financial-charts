import type { ChartBar, LineStyleType } from './data'

export type BuiltInDrawingToolType =
  | 'select'
  | 'line'
  | 'arrow'
  | 'ray'
  | 'xline'
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'path'
  | 'hline'
  | 'hray'
  | 'vline'
  | 'crossline'
  | 'fibonacci'
  | 'text'
  | 'measure'
  | 'info-line'
  | 'trend-angle'
  | 'long-position'
  | 'short-position'
  | 'date-range'
  | 'callout'
  | 'channel'
  | 'pitchfork'
  | 'fib-extension'
  | 'fib-channel'
  | 'polyline'
  | 'triangle-pattern'
  | 'abcd-pattern'
  | 'xabcd-pattern'
  | 'head-shoulders'
  | 'anchored-vwap'
  | 'forecast'
  | 'brush'
  | 'highlighter'
  | 'arc'
  | 'rotated-rectangle'
  | 'gann-fan'
  | 'gann-box'
  | 'fib-time-zone'
  | 'fib-wedge'
  | 'elliott-wave'
  | 'price-date-range'

export type DrawingToolType = BuiltInDrawingToolType | `custom:${string}`

export type DrawingPoint = {
  ts: number
  price: number
}

export type DrawingBase = {
  id: string
  type: DrawingToolType
  color: string
  lineWidth: number
  visible: boolean
  seriesId?: string
  locked?: boolean
  lineStyle?: LineStyleType
  fillColor?: string
  fillOpacity?: number
}

export type LineExtendMode = 'none' | 'left' | 'right' | 'both'

export type LineDrawing = DrawingBase & {
  type: 'line'
  points: [DrawingPoint, DrawingPoint]
  extend?: LineExtendMode
}

export type RectangleDrawing = DrawingBase & {
  type: 'rectangle'
  points: [DrawingPoint, DrawingPoint]
}

export type CircleDrawing = DrawingBase & {
  type: 'circle'
  points: [DrawingPoint, DrawingPoint]
}

export type HorizontalLineDrawing = DrawingBase & {
  type: 'hline'
  price: number
}

export type VerticalLineDrawing = DrawingBase & {
  type: 'vline'
  ts: number
}

export type FibonacciDrawing = DrawingBase & {
  type: 'fibonacci'
  points: [DrawingPoint, DrawingPoint]
  levels?: Array<number>
}

export type TextDrawing = DrawingBase & {
  type: 'text'
  point: DrawingPoint
  content: string
  fontSize?: number
}

export type ArrowDrawing = DrawingBase & {
  type: 'arrow'
  points: [DrawingPoint, DrawingPoint]
}

export type RayDrawing = DrawingBase & {
  type: 'ray'
  points: [DrawingPoint, DrawingPoint]
  extend?: LineExtendMode
}

export type ExtendedLineDrawing = DrawingBase & {
  type: 'xline'
  points: [DrawingPoint, DrawingPoint]
  extend?: LineExtendMode
}

export type EllipseDrawing = DrawingBase & {
  type: 'ellipse'
  points: [DrawingPoint, DrawingPoint]
}

export type PathShapePreset =
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'hexagon'
  | 'pentagon'
  | 'cross'
  | 'heart'
  | 'flag'
  | 'checkmark'
  | 'xmark'

export type PathDrawing = DrawingBase & {
  type: 'path'
  points: [DrawingPoint, DrawingPoint]
  /** SVG path `d` attribute, or omit if using a preset. */
  pathData?: string
  /** Named preset from the built-in shape catalog. */
  preset?: PathShapePreset
  fill?: boolean
}

export type MeasureDrawing = DrawingBase & {
  type: 'measure'
  points: [DrawingPoint, DrawingPoint]
}

export type HorizontalRayDrawing = DrawingBase & {
  type: 'hray'
  price: number
  ts: number
}

export type CrossLineDrawing = DrawingBase & {
  type: 'crossline'
  point: DrawingPoint
}

export type InfoLineDrawing = DrawingBase & {
  type: 'info-line'
  points: [DrawingPoint, DrawingPoint]
}

export type TrendAngleDrawing = DrawingBase & {
  type: 'trend-angle'
  points: [DrawingPoint, DrawingPoint]
}

export type LongPositionDrawing = DrawingBase & {
  type: 'long-position'
  points: [DrawingPoint, DrawingPoint]
}

export type ShortPositionDrawing = DrawingBase & {
  type: 'short-position'
  points: [DrawingPoint, DrawingPoint]
}

export type DateRangeDrawing = DrawingBase & {
  type: 'date-range'
  points: [DrawingPoint, DrawingPoint]
}

export type CalloutDrawing = DrawingBase & {
  type: 'callout'
  points: [DrawingPoint, DrawingPoint]
  content: string
}

export type ChannelDrawing = DrawingBase & {
  type: 'channel'
  points: [DrawingPoint, DrawingPoint, DrawingPoint]
}

export type PitchforkDrawing = DrawingBase & {
  type: 'pitchfork'
  points: [DrawingPoint, DrawingPoint, DrawingPoint]
}

export type FibExtensionDrawing = DrawingBase & {
  type: 'fib-extension'
  points: [DrawingPoint, DrawingPoint, DrawingPoint]
  levels?: Array<number>
}

export type FibChannelDrawing = DrawingBase & {
  type: 'fib-channel'
  points: [DrawingPoint, DrawingPoint, DrawingPoint]
  levels?: Array<number>
}

export type PolylineDrawing = DrawingBase & {
  type: 'polyline'
  points: Array<DrawingPoint>
}

export type TrianglePatternDrawing = DrawingBase & {
  type: 'triangle-pattern'
  points: [DrawingPoint, DrawingPoint, DrawingPoint]
}

export type AbcdPatternDrawing = DrawingBase & {
  type: 'abcd-pattern'
  points: Array<DrawingPoint>
}

export type XabcdPatternDrawing = DrawingBase & {
  type: 'xabcd-pattern'
  points: Array<DrawingPoint>
}

export type HeadShouldersDrawing = DrawingBase & {
  type: 'head-shoulders'
  points: Array<DrawingPoint>
}

export type AnchoredVwapDrawing = DrawingBase & {
  type: 'anchored-vwap'
  point: DrawingPoint
}

export type ForecastDrawing = DrawingBase & {
  type: 'forecast'
  points: [DrawingPoint, DrawingPoint]
}

export type BrushDrawing = DrawingBase & {
  type: 'brush'
  points: Array<DrawingPoint>
}

export type HighlighterDrawing = DrawingBase & {
  type: 'highlighter'
  points: Array<DrawingPoint>
}

export type ArcDrawing = DrawingBase & {
  type: 'arc'
  points: [DrawingPoint, DrawingPoint, DrawingPoint]
}

export type RotatedRectangleDrawing = DrawingBase & {
  type: 'rotated-rectangle'
  points: [DrawingPoint, DrawingPoint, DrawingPoint]
}

export type GannFanDrawing = DrawingBase & {
  type: 'gann-fan'
  points: [DrawingPoint, DrawingPoint]
}

export type GannBoxDrawing = DrawingBase & {
  type: 'gann-box'
  points: [DrawingPoint, DrawingPoint]
  levels?: Array<number>
}

export type FibTimeZoneDrawing = DrawingBase & {
  type: 'fib-time-zone'
  points: [DrawingPoint, DrawingPoint]
  levels?: Array<number>
}

export type FibWedgeDrawing = DrawingBase & {
  type: 'fib-wedge'
  points: [DrawingPoint, DrawingPoint, DrawingPoint]
  levels?: Array<number>
}

export type ElliottWaveDrawing = DrawingBase & {
  type: 'elliott-wave'
  points: Array<DrawingPoint>
}

export type PriceDateRangeDrawing = DrawingBase & {
  type: 'price-date-range'
  points: [DrawingPoint, DrawingPoint]
}

export type CustomDrawingObject = DrawingBase & {
  type: `custom:${string}`
  [key: string]:
    | boolean
    | number
    | string
    | DrawingPoint
    | Array<DrawingPoint>
    | undefined
}

export type DrawingObject =
  | LineDrawing
  | ArrowDrawing
  | RayDrawing
  | ExtendedLineDrawing
  | RectangleDrawing
  | CircleDrawing
  | EllipseDrawing
  | PathDrawing
  | HorizontalLineDrawing
  | HorizontalRayDrawing
  | VerticalLineDrawing
  | CrossLineDrawing
  | FibonacciDrawing
  | TextDrawing
  | MeasureDrawing
  | InfoLineDrawing
  | TrendAngleDrawing
  | LongPositionDrawing
  | ShortPositionDrawing
  | DateRangeDrawing
  | CalloutDrawing
  | ChannelDrawing
  | PitchforkDrawing
  | FibExtensionDrawing
  | FibChannelDrawing
  | PolylineDrawing
  | TrianglePatternDrawing
  | AbcdPatternDrawing
  | XabcdPatternDrawing
  | HeadShouldersDrawing
  | AnchoredVwapDrawing
  | ForecastDrawing
  | BrushDrawing
  | HighlighterDrawing
  | ArcDrawing
  | RotatedRectangleDrawing
  | GannFanDrawing
  | GannBoxDrawing
  | FibTimeZoneDrawing
  | FibWedgeDrawing
  | ElliottWaveDrawing
  | PriceDateRangeDrawing
  | CustomDrawingObject

export type DrawingHandle = {
  id: string
  x: number
  y: number
}

export type DrawingHit = {
  drawingId: string
  handleId?: string
  distance: number
}

export type DrawingCreateContext = {
  id: string
  point: DrawingPoint
  seriesId?: string
  /** Tool-specific metadata (e.g., path preset name). */
  meta?: Record<string, unknown>
}

export type DrawingHitTestContext = {
  drawing: DrawingObject
  x: number
  y: number
  bars: Array<ChartBar>
  toX: (ts: number) => number
  toY: (price: number) => number
}

export type DrawingRenderContext = {
  ctx: CanvasRenderingContext2D
  drawing: DrawingObject
  width: number
  height: number
  bars: Array<ChartBar>
  toX: (ts: number) => number
  toY: (price: number) => number
}

export type DrawingShapeDefinition = {
  type: DrawingToolType
  createDefault: (context: DrawingCreateContext) => DrawingObject
  hitTest: (context: DrawingHitTestContext) => DrawingHit | null
  render: (context: DrawingRenderContext) => void
  getHandles: (
    drawing: DrawingObject,
    toX: (ts: number) => number,
    toY: (price: number) => number,
  ) => Array<DrawingHandle>
  /** Update drawing while dragging to create (e.g., drag second point). */
  onDrag?: (drawing: DrawingObject, point: DrawingPoint) => DrawingObject
  /** Move an entire drawing by a ts/price delta. */
  onShift?: (
    drawing: DrawingObject,
    deltaTs: number,
    deltaPrice: number,
  ) => DrawingObject
  /** Resize via a specific handle. */
  onHandleResize?: (
    drawing: DrawingObject,
    handleId: string,
    point: DrawingPoint,
  ) => DrawingObject
  /** Number of points needed. Default 2. Set 0 for unlimited (polyline). */
  pointCount?: number
  /** Called after each click during multi-point creation. Returns updated drawing with the new point added. */
  onPointAdded?: (
    drawing: DrawingObject,
    point: DrawingPoint,
    index: number,
  ) => DrawingObject
  /** Live preview while cursor moves between clicks in multi-point mode. */
  onGhostPreview?: (
    drawing: DrawingObject,
    cursorPoint: DrawingPoint,
    nextIndex: number,
  ) => DrawingObject
}

export type DrawingChangeReason =
  | 'add'
  | 'update'
  | 'remove'
  | 'clear'
  | 'move'
  | 'resize'
  | 'replace'

export type DrawingSelection = {
  drawingId: string | null
  handleId: string | null
}

/**
 * Style overrides applied to newly created drawings, keyed by tool type.
 * Lets the host remember the user's last-used style per tool ("draw the next
 * fib in purple too") without patching drawings after creation.
 */
export type DrawingStyleDefaults = Partial<
  Record<
    DrawingToolType,
    {
      color?: string
      lineWidth?: number
      lineStyle?: LineStyleType
    }
  >
>
