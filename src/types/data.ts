export type Timeframe =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '1d'
  | '3d'
  | '1w'
  | '1M'

export type ChartType =
  | 'candles'
  | 'heikinAshi'
  | 'hollowCandles'
  | 'line'
  | 'stepLine'
  | 'area'
  | 'hlcArea'
  | 'bar'
  | 'highLow'
  | 'baseline'
  | 'histogram'
  | 'column'
  | 'renko'
  | 'lineBreak'
  | 'kagi'
  | 'pointFigure'

export type NumericRange = {
  min: number
  max: number
}

export type ChartBar = {
  ts: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type LineStyleType = 'solid' | 'dashed' | 'dotted'

export type PriceLine = {
  price: number
  color: string
  lineWidth?: number
  lineStyle?: LineStyleType
  title?: string
  axisLabelVisible?: boolean
}

export type SeriesMarker = {
  time: number
  position: 'aboveBar' | 'belowBar' | 'inBar'
  shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown'
  color: string
  text?: string
  size?: number
}

export type ChartSeriesInput = {
  id: string
  label?: string
  bars: Array<ChartBar>
  color?: string
  visible?: boolean
  /** Decimal places for price display (default 2) */
  pricePrecision?: number
  /** Horizontal price lines bound to this series */
  priceLines?: Array<PriceLine>
  /** Visual markers on specific bars */
  markers?: Array<SeriesMarker>
}

export type TickUpdate = {
  seriesId: string
  ts: number
  price: number
  volume?: number
}

export type BarAppendUpdate = {
  seriesId: string
  bar: ChartBar
}

export type SeriesReplaceUpdate = {
  series: Array<ChartSeriesInput>
}
