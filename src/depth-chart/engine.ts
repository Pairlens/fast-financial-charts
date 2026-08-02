import { DARK_DEPTH_THEME, resolveDepthChartTheme } from './theme'
import type {
  DepthChartData,
  DepthChartHoverInfo,
  DepthChartTheme,
  DepthChartThemeInput,
  DepthLevel,
} from './types'

// ---------------------------------------------------------------------------
// Internal data structures
// ---------------------------------------------------------------------------

type DepthSide = {
  prices: Float64Array
  cumulative: Float64Array
  maxCum: number
}

const EMPTY_SIDE: DepthSide = {
  prices: new Float64Array(0),
  cumulative: new Float64Array(0),
  maxCum: 0,
}

type ChartGeometry = {
  cLeft: number
  cRight: number
  cTop: number
  cBot: number
  cW: number
  cH: number
  pMin: number
  pMax: number
  pRange: number
  vMax: number
  bestBid: number | null
  bestAsk: number | null
  midX: number | null
}

// Reusable dash arrays — avoid allocations
const CROSSHAIR_DASH = [3, 3]
const EMPTY_DASH: Array<number> = []
const SPREAD_DASH = [4, 3]
const CROSSHAIR_LABEL_H = 16

// ---------------------------------------------------------------------------
// Format helpers — avoid toLocaleString in hot path
// ---------------------------------------------------------------------------

function formatPrice(price: number): string {
  if (price >= 1000) {
    const s = price.toFixed(2)
    const [int, dec] = s.split('.')
    const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return dec ? `${withCommas}.${dec}` : withCommas
  }
  if (price >= 1) return price.toFixed(4)
  return price.toPrecision(4)
}

function formatSize(size: number): string {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(2)}M`
  if (size >= 1_000) return `${(size / 1_000).toFixed(2)}K`
  if (size >= 1) return size.toFixed(2)
  return size.toPrecision(3)
}

function formatCompactPrice(price: number): string {
  if (price >= 10_000) return `${(price / 1_000).toFixed(1)}K`
  if (price >= 1000) return price.toFixed(0)
  if (price >= 1) return price.toFixed(2)
  return price.toPrecision(3)
}

function formatCompactSize(size: number): string {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(1)}M`
  if (size >= 1_000) return `${(size / 1_000).toFixed(1)}K`
  if (size >= 1) return size.toFixed(1)
  return size.toPrecision(2)
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function buildSide(levels: Array<DepthLevel>, sort: 'asc' | 'desc'): DepthSide {
  const sorted = [...levels].sort((a, b) =>
    sort === 'desc' ? b.price - a.price : a.price - b.price,
  )
  const n = sorted.length
  const prices = new Float64Array(n)
  const cumulative = new Float64Array(n)
  let cum = 0
  for (let i = 0; i < n; i++) {
    cum += sorted[i].size
    prices[i] = sorted[i].price
    cumulative[i] = cum
  }
  return { prices, cumulative, maxCum: cum }
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

function computeGeometry(
  w: number,
  h: number,
  bids: DepthSide,
  asks: DepthSide,
  theme: DepthChartTheme,
): ChartGeometry | null {
  const cLeft = theme.padding.left
  const cRight = w - theme.padding.right
  const cTop = theme.padding.top
  const cBot = h - theme.padding.bottom
  const cW = cRight - cLeft
  const cH = cBot - cTop
  if (cW <= 0 || cH <= 0) return null
  if (bids.prices.length === 0 && asks.prices.length === 0) return null

  const pMin =
    bids.prices.length > 0
      ? bids.prices[bids.prices.length - 1]
      : asks.prices[0]
  const pMax =
    asks.prices.length > 0
      ? asks.prices[asks.prices.length - 1]
      : bids.prices[0]
  const pRange = pMax - pMin
  if (pRange <= 0) return null

  const vMax = Math.max(bids.maxCum, asks.maxCum) * 1.05
  const bestBid = bids.prices.length > 0 ? bids.prices[0] : null
  const bestAsk = asks.prices.length > 0 ? asks.prices[0] : null
  const midX =
    bestBid !== null && bestAsk !== null
      ? cLeft + (((bestBid + bestAsk) / 2 - pMin) / pRange) * cW
      : null

  return {
    cLeft,
    cRight,
    cTop,
    cBot,
    cW,
    cH,
    pMin,
    pMax,
    pRange,
    vMax,
    bestBid,
    bestAsk,
    midX,
  }
}

function priceToX(g: ChartGeometry, p: number) {
  return g.cLeft + ((p - g.pMin) / g.pRange) * g.cW
}

function cumToY(g: ChartGeometry, c: number) {
  return g.cBot - (c / g.vMax) * g.cH
}

// ---------------------------------------------------------------------------
// Rendering functions
// ---------------------------------------------------------------------------

function drawStaticLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  bids: DepthSide,
  asks: DepthSide,
  g: ChartGeometry,
  theme: DepthChartTheme,
) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  // Grid lines (batched single stroke)
  const vTickCount = Math.max(2, Math.min(6, Math.floor(g.cH / 40)))
  const vStep = niceStep(g.vMax, vTickCount)
  const pTickCount = Math.max(3, Math.min(8, Math.floor(g.cW / 70)))
  const pStep = niceStep(g.pRange, pTickCount)
  const pStart = Math.ceil(g.pMin / pStep) * pStep

  ctx.strokeStyle = theme.grid
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let v = vStep; v < g.vMax; v += vStep) {
    const y = cumToY(g, v)
    ctx.moveTo(g.cLeft, y)
    ctx.lineTo(g.cRight, y)
  }
  for (let p = pStart; p < g.pMax; p += pStep) {
    const x = priceToX(g, p)
    ctx.moveTo(x, g.cTop)
    ctx.lineTo(x, g.cBot)
  }
  ctx.stroke()

  // Axis labels
  ctx.font = `${theme.fontSizeAxis}px ${theme.fontFamily}`
  ctx.fillStyle = theme.axisText
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let v = vStep; v < g.vMax; v += vStep) {
    ctx.fillText(formatCompactSize(v), g.cLeft - 4, cumToY(g, v))
  }
  ctx.fillText('0', g.cLeft - 4, g.cBot)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let p = pStart; p < g.pMax; p += pStep) {
    ctx.fillText(formatCompactPrice(p), priceToX(g, p), g.cBot + 4)
  }

  // Spread marker
  if (g.bestBid !== null && g.bestAsk !== null && g.midX !== null) {
    ctx.save()
    ctx.strokeStyle = theme.spread.line
    ctx.lineWidth = 1
    ctx.setLineDash(SPREAD_DASH)
    ctx.beginPath()
    ctx.moveTo(g.midX, g.cTop)
    ctx.lineTo(g.midX, g.cBot)
    ctx.stroke()
    ctx.restore()

    const spread = g.bestAsk - g.bestBid
    const spreadPct = g.bestBid > 0 ? (spread / g.bestBid) * 100 : 0
    ctx.font = `${theme.fontSizeLabel}px ${theme.fontFamily}`
    ctx.fillStyle = theme.spread.text
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(
      `${formatPrice(spread)} (${spreadPct.toFixed(3)}%)`,
      g.midX,
      g.cTop - 3,
    )
  }

  // Areas
  drawStepArea(
    ctx,
    bids,
    g,
    theme.bid.stroke,
    theme.bid.fillTop,
    theme.bid.fillBottom,
    'bid',
  )
  drawStepArea(
    ctx,
    asks,
    g,
    theme.ask.stroke,
    theme.ask.fillTop,
    theme.ask.fillBottom,
    'ask',
  )
}

function drawStepArea(
  ctx: CanvasRenderingContext2D,
  side: DepthSide,
  g: ChartGeometry,
  strokeColor: string,
  fillTop: string,
  fillBot: string,
  sideType: 'bid' | 'ask',
) {
  const { prices, cumulative } = side
  const n = prices.length
  if (n === 0) return

  // Pre-compute screen coordinates
  const xs = new Float64Array(n)
  const ys = new Float64Array(n)
  let minY = g.cBot
  for (let i = 0; i < n; i++) {
    xs[i] = priceToX(g, prices[i])
    ys[i] = cumToY(g, cumulative[i])
    if (ys[i] < minY) minY = ys[i]
  }

  // Fill
  ctx.beginPath()
  ctx.moveTo(xs[0], g.cBot)
  ctx.lineTo(xs[0], ys[0])
  for (let i = 1; i < n; i++) {
    if (sideType === 'bid') {
      ctx.lineTo(xs[i], ys[i - 1])
    } else {
      ctx.lineTo(xs[i - 1], ys[i])
    }
    ctx.lineTo(xs[i], ys[i])
  }
  ctx.lineTo(xs[n - 1], g.cBot)
  ctx.closePath()

  const grad = ctx.createLinearGradient(0, minY, 0, g.cBot)
  grad.addColorStop(0, fillTop)
  grad.addColorStop(1, fillBot)
  ctx.fillStyle = grad
  ctx.fill()

  // Stroke
  ctx.beginPath()
  ctx.moveTo(xs[0], ys[0])
  for (let i = 1; i < n; i++) {
    if (sideType === 'bid') {
      ctx.lineTo(xs[i], ys[i - 1])
    } else {
      ctx.lineTo(xs[i - 1], ys[i])
    }
    ctx.lineTo(xs[i], ys[i])
  }
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function drawCrosshairLayer(
  ctx: CanvasRenderingContext2D,
  staticCanvas: HTMLCanvasElement,
  dpr: number,
  bids: DepthSide,
  asks: DepthSide,
  g: ChartGeometry,
  mouseX: number,
  mouseY: number,
  theme: DepthChartTheme,
): DepthChartHoverInfo | null {
  // Blit static layer (copy composite skips clearRect + alpha blending)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'copy'
  ctx.drawImage(staticCanvas, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  if (
    mouseX < g.cLeft ||
    mouseX > g.cRight ||
    mouseY < g.cTop ||
    mouseY > g.cBot
  ) {
    return null
  }

  const hoverPrice = g.pMin + ((mouseX - g.cLeft) / g.cW) * g.pRange

  let side: 'bid' | 'ask' = 'bid'
  if (g.bestBid !== null && g.bestAsk !== null) {
    side = hoverPrice <= (g.bestBid + g.bestAsk) / 2 ? 'bid' : 'ask'
  } else if (g.bestAsk !== null) {
    side = 'ask'
  }

  const cum =
    side === 'bid' && bids.prices.length > 0
      ? lookupCumBinary(bids, hoverPrice, 'bid')
      : asks.prices.length > 0
        ? lookupCumBinary(asks, hoverPrice, 'ask')
        : 0

  const snapY = cumToY(g, cum)
  const sideColor = side === 'bid' ? theme.bid.stroke : theme.ask.stroke

  // Dashed crosshair
  ctx.strokeStyle = theme.crosshair
  ctx.lineWidth = 1
  ctx.setLineDash(CROSSHAIR_DASH)
  ctx.beginPath()
  ctx.moveTo(mouseX, g.cTop)
  ctx.lineTo(mouseX, g.cBot)
  ctx.moveTo(g.cLeft, snapY)
  ctx.lineTo(g.cRight, snapY)
  ctx.stroke()
  ctx.setLineDash(EMPTY_DASH)

  // Dot
  ctx.beginPath()
  ctx.arc(mouseX, snapY, 3.5, 0, Math.PI * 2)
  ctx.fillStyle = sideColor
  ctx.fill()
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 1
  ctx.stroke()

  // Price label on X axis
  const priceLabel = formatPrice(hoverPrice)
  ctx.font = `${theme.fontSizeLabel}px ${theme.fontFamily}`
  const plW = ctx.measureText(priceLabel).width + 8
  const plX = Math.max(g.cLeft, Math.min(g.cRight - plW, mouseX - plW / 2))
  ctx.fillStyle = sideColor
  roundRect(ctx, plX, g.cBot + 1, plW, CROSSHAIR_LABEL_H, 2)
  ctx.fill()
  ctx.fillStyle = '#000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(priceLabel, plX + plW / 2, g.cBot + 1 + CROSSHAIR_LABEL_H / 2)

  // Volume label on Y axis
  const volLabel = formatSize(cum)
  const vlW = ctx.measureText(volLabel).width + 8
  const vlY = Math.max(
    g.cTop,
    Math.min(g.cBot - CROSSHAIR_LABEL_H, snapY - CROSSHAIR_LABEL_H / 2),
  )
  ctx.fillStyle = sideColor
  roundRect(ctx, g.cLeft - vlW - 2, vlY, vlW, CROSSHAIR_LABEL_H, 2)
  ctx.fill()
  ctx.fillStyle = '#000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(volLabel, g.cLeft - vlW / 2 - 2, vlY + CROSSHAIR_LABEL_H / 2)

  return { side, price: hoverPrice, cumulative: cum, x: mouseX, y: snapY }
}

// ---------------------------------------------------------------------------
// Binary search cumulative lookup — O(log n)
// ---------------------------------------------------------------------------

function lookupCumBinary(
  side: DepthSide,
  price: number,
  sideType: 'bid' | 'ask',
): number {
  const { prices, cumulative } = side
  const n = prices.length
  if (n === 0) return 0

  if (sideType === 'bid') {
    if (price >= prices[0]) return cumulative[0]
    if (price <= prices[n - 1]) return cumulative[n - 1]
    let lo = 0
    let hi = n - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (prices[mid] >= price) lo = mid
      else hi = mid - 1
    }
    return cumulative[lo]
  } else {
    if (price <= prices[0]) return cumulative[0]
    if (price >= prices[n - 1]) return cumulative[n - 1]
    let lo = 0
    let hi = n - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (prices[mid] <= price) lo = mid
      else hi = mid - 1
    }
    return cumulative[lo]
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function niceStep(range: number, targetTicks: number): number {
  const rough = range / targetTicks
  const mag = Math.pow(10, Math.floor(Math.log10(rough)))
  const norm = rough / mag
  let nice: number
  if (norm <= 1.5) nice = 1
  else if (norm <= 3) nice = 2
  else if (norm <= 7) nice = 5
  else nice = 10
  return nice * mag
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class DepthChartEngine {
  private container: HTMLElement
  private canvas: HTMLCanvasElement
  private staticCanvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private sctx: CanvasRenderingContext2D
  private theme: DepthChartTheme
  private bids: DepthSide = EMPTY_SIDE
  private asks: DepthSide = EMPTY_SIDE
  private geo: ChartGeometry | null = null
  private size = { w: 0, h: 0 }
  private mouse = { x: 0, y: 0, active: false }
  private raf = 0
  private rect: DOMRect | null = null
  private resizeObserver: ResizeObserver
  private destroyed = false

  onHover: ((info: DepthChartHoverInfo | null) => void) | null = null

  constructor(container: HTMLElement, theme?: DepthChartThemeInput) {
    this.container = container
    this.theme = resolveDepthChartTheme(DARK_DEPTH_THEME, theme)

    // Create visible canvas
    this.canvas = document.createElement('canvas')
    this.canvas.style.cssText =
      'position:absolute;inset:0;cursor:crosshair;width:100%;height:100%'
    container.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')!

    // Create offscreen static canvas
    this.staticCanvas = document.createElement('canvas')
    this.sctx = this.staticCanvas.getContext('2d')!

    // Bind event handlers (avoid creating closures per call)
    this.onMouseEnter = this.onMouseEnter.bind(this)
    this.onMouseMove = this.onMouseMove.bind(this)
    this.onMouseLeave = this.onMouseLeave.bind(this)

    this.canvas.addEventListener('mouseenter', this.onMouseEnter)
    this.canvas.addEventListener('mousemove', this.onMouseMove)
    this.canvas.addEventListener('mouseleave', this.onMouseLeave)

    // Observe container size
    this.resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      this.size = { w: Math.floor(width), h: Math.floor(height) }
      this.rect = null
      this.drawStatic()
    })
    this.resizeObserver.observe(container)
  }

  setData(data: DepthChartData): void {
    if (this.destroyed) return
    this.bids = data.bids.length > 0 ? buildSide(data.bids, 'desc') : EMPTY_SIDE
    this.asks = data.asks.length > 0 ? buildSide(data.asks, 'asc') : EMPTY_SIDE
    this.drawStatic()
  }

  setTheme(input: DepthChartThemeInput): void {
    if (this.destroyed) return
    this.theme = resolveDepthChartTheme(DARK_DEPTH_THEME, input)
    this.drawStatic()
  }

  setFullTheme(theme: DepthChartTheme): void {
    if (this.destroyed) return
    this.theme = theme
    this.drawStatic()
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.resizeObserver.disconnect()
    this.canvas.removeEventListener('mouseenter', this.onMouseEnter)
    this.canvas.removeEventListener('mousemove', this.onMouseMove)
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave)
    if (this.raf) cancelAnimationFrame(this.raf)
    this.container.removeChild(this.canvas)
    this.onHover = null
  }

  // ---- Private ----

  private ensureCanvases(): boolean {
    const { w, h } = this.size
    if (w === 0 || h === 0) return false

    const dpr = window.devicePixelRatio || 1
    const bw = Math.round(w * dpr)
    const bh = Math.round(h * dpr)

    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw
      this.canvas.height = bh
    }
    if (this.staticCanvas.width !== bw || this.staticCanvas.height !== bh) {
      this.staticCanvas.width = bw
      this.staticCanvas.height = bh
    }
    return true
  }

  private drawStatic(): void {
    if (this.destroyed || !this.ensureCanvases()) return
    const { w, h } = this.size
    const dpr = window.devicePixelRatio || 1

    const g = computeGeometry(w, h, this.bids, this.asks, this.theme)
    this.geo = g

    if (!g) {
      this.sctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      this.sctx.clearRect(0, 0, w, h)
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      this.ctx.clearRect(0, 0, w, h)
      this.onHover?.(null)
      return
    }

    drawStaticLayer(this.sctx, w, h, dpr, this.bids, this.asks, g, this.theme)
    this.drawFrame()
  }

  private drawFrame(): void {
    if (this.destroyed) return
    const { w, h } = this.size
    const g = this.geo
    if (w === 0 || h === 0) return

    const dpr = window.devicePixelRatio || 1

    if (!g || !this.mouse.active) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.ctx.globalCompositeOperation = 'copy'
      this.ctx.drawImage(this.staticCanvas, 0, 0)
      this.ctx.globalCompositeOperation = 'source-over'
      this.onHover?.(null)
      return
    }

    const info = drawCrosshairLayer(
      this.ctx,
      this.staticCanvas,
      dpr,
      this.bids,
      this.asks,
      g,
      this.mouse.x,
      this.mouse.y,
      this.theme,
    )
    this.onHover?.(info)
  }

  private onMouseEnter(): void {
    this.rect = this.canvas.getBoundingClientRect()
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.rect ?? this.canvas.getBoundingClientRect()
    this.mouse.x = e.clientX - rect.left
    this.mouse.y = e.clientY - rect.top
    this.mouse.active = true
    if (!this.raf) {
      this.raf = requestAnimationFrame(() => {
        this.raf = 0
        this.drawFrame()
      })
    }
  }

  private onMouseLeave(): void {
    this.mouse.active = false
    if (this.raf) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    }
    this.drawFrame()
  }
}
