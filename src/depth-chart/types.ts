/** A single price level in the order book. */
export type DepthLevel = { price: number; size: number }

/** Bid and ask levels to render. */
export type DepthChartData = {
  bids: Array<DepthLevel>
  asks: Array<DepthLevel>
}

/** Full resolved theme for the depth chart. */
export type DepthChartTheme = {
  background: string
  grid: string
  axisText: string
  crosshair: string
  fontFamily: string
  fontSizeAxis: number
  fontSizeLabel: number
  bid: {
    stroke: string
    fillTop: string
    fillBottom: string
  }
  ask: {
    stroke: string
    fillTop: string
    fillBottom: string
  }
  spread: {
    line: string
    text: string
  }
  tooltip: {
    background: string
    border: string
    text: string
    mutedText: string
  }
  padding: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

/** Partial theme input — all fields optional, nested objects partially mergeable. */
export type DepthChartThemeInput = Partial<
  Omit<DepthChartTheme, 'bid' | 'ask' | 'spread' | 'tooltip' | 'padding'>
> & {
  bid?: Partial<DepthChartTheme['bid']>
  ask?: Partial<DepthChartTheme['ask']>
  spread?: Partial<DepthChartTheme['spread']>
  tooltip?: Partial<DepthChartTheme['tooltip']>
  padding?: Partial<DepthChartTheme['padding']>
}

/** Information about the hovered point on the depth chart. */
export type DepthChartHoverInfo = {
  side: 'bid' | 'ask'
  price: number
  cumulative: number
  x: number
  y: number
}
