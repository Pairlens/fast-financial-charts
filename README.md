# Fast Financial Charts

[![npm version](https://img.shields.io/npm/v/%40pairlens%2Ffast-financial-charts?logo=npm&color=cb3837)](https://www.npmjs.com/package/@pairlens/fast-financial-charts)
[![npm downloads](https://img.shields.io/npm/dm/%40pairlens%2Ffast-financial-charts)](https://www.npmjs.com/package/@pairlens/fast-financial-charts)
[![license](https://img.shields.io/npm/l/%40pairlens%2Ffast-financial-charts)](./LICENSE)

**A WebGL2 financial charting library for the web: candlesticks, 90 built-in indicators, drawings, multi-pane layouts, live tick streaming, and an AI control surface. Free and MIT licensed.**

`@pairlens/fast-financial-charts` is the chart engine behind the [Pairlens](https://github.com/Pairlens/trading-terminal) trading terminal. It is not a demo extracted from an app: the exact package published here renders live exchange feeds in production, every day, at tick rate. It was built to stand next to commercial charting SDKs and hold its own.

Reasons you might pick it over the alternatives:

- **You get a lot of chart.** [90 technical indicators](./INDICATORS.md) out of the box, sixteen chart types, 42 trader drawing tools with magnet snapping, price lines and buy/sell markers, multi-pane layouts with resizable separators, log/percent/indexed price scales, localization, and touch support. Most libraries make you build or buy half of this.
- **It is fast where it matters.** The main series renders as WebGL2 geometry, live ticks flow through an imperative O(1) hot path that bypasses React entirely, and indicators compute in a Web Worker off the main thread. Pan and zoom are single uniform updates on the GPU. It stays smooth with large histories and high-frequency feeds.
- **It is headless.** The engine owns the canvases and the hot path; your app owns every pixel of UI chrome (toolbars, HUDs, context menus, modals) through events and render slots. No CSS framework dependency, no styles to fight. It drops into ShadCN, Tailwind, or whatever your design system is.
- **An AI can drive it.** A deterministic, MCP-compatible schema exposes 52 tools (add indicators, draw, navigate, read data back, take screenshots), so an agent or your automation can operate the chart the same way a user does.
- **No licensing drama.** MIT, for real. No license tiers, no watermark, no attribution requirement, no "contact sales" features, no repo you can read but not ship. Fork it, extend it, sell with it.

## Installation

```bash
bun add @pairlens/fast-financial-charts
# or
pnpm add @pairlens/fast-financial-charts
# or
npm i @pairlens/fast-financial-charts
```

Installing straight from GitHub (`bun add github:Pairlens/fast-financial-charts`) also works and yields the same package layout.

**The package ships TypeScript source.** Entry points resolve to `.ts`/`.tsx` files, so use a bundler that understands TypeScript out of the box: Vite, esbuild, Bun, Rspack, or webpack with a TS loader. This is also what lets the indicator Web Worker (`new Worker(new URL(...))`) work naturally under modern bundlers. Prebuilt output is planned.

React is an optional peer dependency: the core engine (`@pairlens/fast-financial-charts`, `/mcp`, `/indicators`, `/drawings`, `/theme`) has no React dependency at all; only the `@pairlens/fast-financial-charts/react` entry points need React 19+.

## Quick Start (React)

A candlestick chart with an EMA overlay and an RSI pane:

```tsx
import { useMemo, useRef } from 'react'
import { FastFinancialChart } from '@pairlens/fast-financial-charts/react'
import type {
  FastFinancialChartRef,
  ChartSeriesInput,
} from '@pairlens/fast-financial-charts/types'

export function PairChart() {
  const chartRef = useRef<FastFinancialChartRef>(null)

  const series = useMemo<ChartSeriesInput[]>(
    () => [
      {
        id: 'BTC-USD',
        label: 'BTC/USD',
        bars: [],
        color: '#22c55e',
        pricePrecision: 2, // decimal places shown on price axis and crosshair
      },
    ],
    [],
  )

  return (
    <FastFinancialChart
      ref={chartRef}
      series={series}
      timeframe="1m"
      compareMode="indexed"
      defaultViewport={{ type: 'last-bars', bars: 200 }}
      indicators={[
        {
          type: 'EMA',
          seriesId: 'BTC-USD',
          params: { period: 21 },
          pane: 'overlay',
        },
        {
          type: 'RSI',
          seriesId: 'BTC-USD',
          params: { period: 14 },
          pane: 'separate',
        },
      ]}
    />
  )
}
```

## Live Tick Streaming (Imperative Hot Path)

Use ref methods for high-frequency updates to avoid React rerender churn:

```tsx
chartRef.current?.applyTick({
  seriesId: 'BTC-USD',
  ts: Date.now(),
  price: 64020.5,
  volume: 0.12,
})

chartRef.current?.applyTicks(batchOfTicks)

chartRef.current?.appendBar({
  seriesId: 'BTC-USD',
  bar: {
    ts: 1739990400000,
    open: 64000,
    high: 64100,
    low: 63980,
    close: 64020,
    volume: 42,
  },
})
```

## Built-in Indicators (90)

90 built-in technical indicators covering the major TradingView Advanced Charts categories. See [INDICATORS.md](./INDICATORS.md) for the full list with parameters, pane types, and implementation details.

| Category               | Count | Examples                                                                                                                                  |
| ---------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Moving Averages        | 17    | EMA, SMA, WMA, DEMA, TEMA, VWAP, HMA, VWMA, ALMA, KAMA, SMMA, LSMA, McGinley Dynamic, Guppy MMA, Hamming                                  |
| Oscillators & Momentum | 35    | RSI, MACD, Stochastic, StochRSI, Williams %R, CCI, MFI, ADX, TRIX, Fisher Transform, Connors RSI, TSI, Price Oscillator, Rank Correlation |
| Bands & Channels       | 5     | Bollinger Bands, Donchian Channels, Keltner Channels, Envelopes, Price Channel                                                            |
| Trend                  | 10    | SuperTrend, Ichimoku Cloud, Parabolic SAR, Williams Alligator, Zig Zag, Chande Kroll Stop, MA Cross, EMA Cross                            |
| Volume                 | 9     | Volume, OBV, A/D, CMF, Klinger, PVT, Ease of Movement, Volume Oscillator, Net Volume                                                      |
| Volatility             | 7    | ATR, BB Width, Historical Volatility, Pivot Points, Standard Deviation, Chaikin Volatility, 52 Week High/Low                              |
| Statistical            | 7     | Average Price, Median Price, Typical Price, Linear Regression Curve/Slope, ASI, Majority Rule                                             |

All indicators compute off-main-thread (Web Worker dispatch) and render via Canvas2D presenters with viewport slicing for O(visible-bars) draw cost.

## Chart Types

Sixteen chart types, all GPU-accelerated:

| Type            | Rendering                     | Description                                                             |
| --------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `candles`       | WebGL2 instanced              | Standard OHLC candlestick                                               |
| `heikinAshi`    | WebGL2 instanced              | Smoothed Heikin-Ashi candles                                            |
| `hollowCandles` | WebGL2 instanced              | Up bodies drawn as border-only outlines, down bodies filled             |
| `bar`           | WebGL2 instanced              | Western OHLC bars (vertical wick + open/close ticks)                    |
| `highLow`       | WebGL2 instanced              | One body per bar spanning high to low, colored against the prior close  |
| `line`          | WebGL2 thick line             | Close-price line, Catmull-Rom smoothed                                  |
| `stepLine`      | WebGL2 thick line             | Each close held flat until the next bar                                 |
| `area`          | WebGL2 thick line + gradient  | Filled area under close-price line                                      |
| `hlcArea`       | WebGL2 thick lines + band     | High, low and close lines with a translucent high-low band              |
| `baseline`      | Canvas2D clipped              | Two-tone area split at configurable base value (green above, red below) |
| `histogram`     | WebGL2 instanced              | Vertical bars from configurable base level                              |
| `column`        | WebGL2 instanced              | Body from the base level to close, colored against the prior close      |
| `renko`         | Price transform → candle path | Fixed-size bricks stacked by close moves, ATR(14) brick by default      |
| `lineBreak`     | Price transform → candle path | Break lines, 3-line break by default                                    |
| `kagi`          | Price transform → candle path | Reversal-driven segments, ATR(14) reversal by default                   |
| `pointFigure`   | Price transform → candle path | X/O columns, 1% box with a 3-box reversal by default                    |

The last four are time-independent: they transform OHLC candles into synthetic
bricks, lines, segments or columns, then render through the candle instance
path. The transforms are pure functions with classic defaults, so no
configuration is required to get a conventional chart.

## Price Scale Modes

Four price scale modes for different analysis contexts:

```tsx
<FastFinancialChart priceScaleMode="percentage" />
```

| Mode           | Description                                                           |
| -------------- | --------------------------------------------------------------------- |
| `normal`       | Linear price scale (default)                                          |
| `logarithmic`  | Log scale for assets with wide price ranges (BTC, high-growth stocks) |
| `percentage`   | Percentage change from first visible bar's close                      |
| `indexedTo100` | Normalized to 100 at first visible bar                                |

Additional price scale configuration:

```tsx
<FastFinancialChart
  priceScale={{
    mode: 'logarithmic',
    inverted: false,
    scaleMargins: { top: 0.1, bottom: 0.1 },
    borderVisible: true,
    ticksVisible: true,
  }}
/>
```

## Time Scale Configuration

```tsx
<FastFinancialChart
  timeScale={{
    rightOffset: 5, // empty bars after last data point
    barSpacing: 8, // pixels per bar
    minBarSpacing: 2,
    maxBarSpacing: 32,
    fixLeftEdge: true, // prevent scrolling past first bar
    fixRightEdge: false,
    shiftVisibleRangeOnNewBar: true,
  }}
/>
```

## Crosshair Modes

```tsx
<FastFinancialChart
  crosshairConfig={{
    mode: 'magnet', // 'normal' | 'magnet' | 'hidden'
    vertLine: { color: '#ffffff33', width: 1, style: 'dashed', visible: true },
    horzLine: {
      color: '#ffffff33',
      width: 1,
      style: 'dotted',
      labelVisible: true,
    },
  }}
/>
```

- **normal**: free-moving crosshair follows pointer.
- **magnet**: horizontal line snaps to nearest bar's close price.
- **hidden**: crosshair disabled.

## Watermark

```tsx
<FastFinancialChart
  watermark={{
    text: 'BTC/USD',
    color: '#ffffff11',
    fontSize: 48,
    horzAlign: 'center',
    vertAlign: 'center',
  }}
/>
```

## Series Annotations

### Price lines

Horizontal lines bound to a series at specific prices:

```tsx
const series = [{
  id: 'BTC-USD',
  bars: [...],
  priceLines: [
    { price: 65000, color: '#22c55e', lineStyle: 'dashed', title: 'Resistance' },
    { price: 58000, color: '#ef4444', lineStyle: 'solid', title: 'Support' },
  ],
}]
```

### Series markers

Visual annotations on specific bars for buy/sell signals, pattern detection:

```tsx
const series = [{
  id: 'BTC-USD',
  bars: [...],
  markers: [
    { time: 1700000000000, position: 'belowBar', shape: 'arrowUp', color: '#22c55e', text: 'Buy' },
    { time: 1700100000000, position: 'aboveBar', shape: 'arrowDown', color: '#ef4444', text: 'Sell' },
  ],
}]
```

Shapes: `circle`, `square`, `arrowUp`, `arrowDown`. Positions: `aboveBar`, `belowBar`, `inBar`.

## Multi-Series and Compare Modes

`series[]` supports multiple instruments in one chart.

Available compare modes:

- `indexed` (default): baseline normalization for relative comparison.
- `price`: raw price scale.
- `dual-axis`: independent ranges (minimal V1.2 implementation).

Rules:

- Single-series `candles`/`heikinAshi` stays candle-rendered even if compare mode is `indexed`.
- Multi-series timestamp alignment uses primary-series time mapping.

## Multi-Pane Management

N-pane system with resizable separators and independent price scales per pane:

```tsx
<FastFinancialChart
  panes={[
    { id: 'rsi-pane', stretchFactor: 1, minHeight: 80, label: 'RSI' },
    { id: 'volume-pane', stretchFactor: 1, minHeight: 60, label: 'Volume' },
  ]}
  indicators={[
    {
      type: 'RSI',
      seriesId: 'BTC-USD',
      params: { period: 14 },
      pane: 'rsi-pane',
    },
    { type: 'Volume', seriesId: 'BTC-USD', pane: 'volume-pane' },
  ]}
/>
```

Programmatic pane management:

```tsx
chartRef.current?.addPane({ stretchFactor: 1, minHeight: 60, label: 'Custom' })
chartRef.current?.removePane('rsi-pane')
chartRef.current?.swapPanes('rsi-pane', 'volume-pane')
```

Heights are computed via stretch factors (responsive to container resize). Dragging a separator adjusts adjacent pane stretch factors. Legacy `'separate'` pane behavior continues to work unchanged.

## Built-in Drawing Tools

42 tools, plus `select` for the select-and-pan mode. Every drawing carries its
own `color`, `lineWidth`, `lineStyle`, `visible` and `locked` state, and every
anchor snaps to the nearest OHLC value when `interaction.drawingSnap` is on.
Editing is undoable across all of them.

### Lines

| Tool          | Description                                                              |
| ------------- | ------------------------------------------------------------------------ |
| `line`        | Trend line with optional `extend: 'left' \| 'right' \| 'both' \| 'none'` |
| `ray`         | Line extending forward from its origin                                   |
| `xline`       | Line extending in both directions                                        |
| `hline`       | Horizontal price level                                                   |
| `hray`        | Horizontal ray from a point forward                                      |
| `vline`       | Vertical time marker                                                     |
| `crossline`   | Horizontal and vertical crosshair through one point                      |
| `info-line`   | Trend line labelled with ΔPrice, % change and bar count                  |
| `trend-angle` | Trend line labelled with its angle from horizontal                       |
| `arrow`       | Directional arrow between two points                                     |

### Channels and curves

| Tool        | Points | Description                                                  |
| ----------- | ------ | ------------------------------------------------------------ |
| `channel`   | 3      | Baseline plus a third point that offsets the parallel line   |
| `pitchfork` | 3      | Andrews pitchfork                                            |
| `polyline`  | any    | Connected segments, finalized on double-click                |
| `arc`       | 3      | Quadratic curve with the middle point as the control handle  |

### Shapes

| Tool                | Description                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `rectangle`         | Price/time box                                                                                                   |
| `rotated-rectangle` | One edge from two points, a third setting the perpendicular width, so it rotates off the axes                     |
| `circle`            | Circle from a center point and an edge point                                                                     |
| `ellipse`           | Ellipse filling the box between two corners                                                                      |
| `path`              | Preset shape (triangle, diamond, star, hexagon, pentagon, cross, heart, flag, checkmark, xmark) or your own SVG `d` |

### Annotations

| Tool          | Description                                          |
| ------------- | ---------------------------------------------------- |
| `text`        | Text annotation (position, content, color, fontSize) |
| `callout`     | Text in a bubble with a leader line to a price       |
| `brush`       | Freehand stroke                                      |
| `highlighter` | Translucent freehand stroke                          |

### Fibonacci and Gann

| Tool             | Points | Description                                    |
| ---------------- | ------ | ---------------------------------------------- |
| `fibonacci`      | 2      | Fibonacci retracement with configurable levels |
| `fib-extension`  | 3      | Fibonacci extension                            |
| `fib-channel`    | 3      | Fibonacci levels parallel to a trend           |
| `fib-time-zone`  | 2      | Fibonacci intervals along the time axis        |
| `fib-wedge`      | 3      | Arcs at Fibonacci ratios of a wedge's radius   |
| `gann-fan`       | 2      | Labelled ratio rays with the 1/1 emphasized    |
| `gann-box`       | 2      | Gann box with price and time subdivisions      |

### Patterns

| Tool               | Points | Description                                |
| ------------------ | ------ | ------------------------------------------ |
| `triangle-pattern` | 3      | Three-leg triangle pattern                 |
| `abcd-pattern`     | 4      | ABCD harmonic pattern                      |
| `xabcd-pattern`    | 5      | XABCD harmonic pattern                     |
| `head-shoulders`   | 7      | Head and shoulders with both shoulders     |
| `elliott-wave`     | any    | Wave count, finalized on double-click      |

### Projection and measurement

| Tool               | Description                                                                  |
| ------------------ | ---------------------------------------------------------------------------- |
| `long-position`    | Entry and target with a shaded zone and a signed percentage label            |
| `short-position`   | The inverse, for short setups                                                |
| `forecast`         | Base range with entry and target projections extending right                 |
| `anchored-vwap`    | VWAP computed forward from the bar you anchor it to, on typical price        |
| `measure`          | Ad-hoc ΔPrice and % between two points                                       |
| `date-range`       | Span across the time axis                                                    |
| `price-date-range` | Span across both axes at once                                                |

Line and rectangle drawings show ΔPrice and % change measurement labels when a second point is set. Custom tools register through `DrawingShapeDefinition` and get the same hit-testing, editing and persistence as the built-ins.

## Interaction Model

### Mouse and keyboard

- **Scroll wheel**: zoom X axis (time).
- **Cmd/Ctrl + scroll wheel**: zoom Y axis (price) only.
- **Drag**: pan left/right with inertial deceleration after release.
- **Drag on price axis**: zoom Y axis independently.
- **Double-click on price axis**: reset Y-axis zoom to auto-fit.
- **Double-click on chart area**: fit all visible bars into view.
- **Keyboard shortcuts**: undo/redo, lock, hide, fit, delete, escape.

### Touch (mobile / tablet)

- **One-finger drag**: pan with inertia.
- **Two-finger pinch**: zoom X axis.

### Inertial scrolling

After a pan gesture, the chart decelerates using an exponential decay (factor 0.92 per frame via `requestAnimationFrame`) until velocity drops below threshold.

### Granular interaction control

Disable individual gestures without affecting others:

```tsx
<FastFinancialChart
  interaction={{
    wheelZoom: true,
    dragPan: true,
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
    },
    handleScale: {
      mouseWheel: true,
      pinch: true,
      axisPressedMouseMove: true,
      axisDoubleClickReset: true,
    },
    kineticScroll: { touch: true, mouse: true },
  }}
/>
```

### Programmatic navigation

```tsx
chartRef.current?.fitContent()
chartRef.current?.scrollToPosition(barIndex, true) // animated scroll
```

## Theming

### Partial theme override

Provide partial theme input and override only what you need:

```tsx
<FastFinancialChart
  theme={{
    background: '#090b10',
    axisText: '#9aa4b2',
    hudBg: 'rgba(5, 8, 13, 0.88)',
    hudText: '#e6edf7',
    fontFamilyMono: 'IBM Plex Mono, ui-monospace, monospace',
    fontSizeAxis: 11,
    fontSizeHud: 12,
    layout: {
      priceAxisWidth: 74, // px
      timeAxisHeight: 22, // px
      gridRows: 6,
      gridColumns: 8,
    },
    indicator: {
      macd: {
        signal: '#f59e0b',
        histogramUp: '#22c55e',
        histogramDown: '#ef4444',
      },
    },
  }}
/>
```

Theme updates are supported at runtime and trigger only the relevant overlay/UI redraw paths.

### Theme presets

```tsx
import { getThemePreset, DARK_THEME_TOKENS, LIGHT_THEME_TOKENS } from '@pairlens/fast-financial-charts/theme'

// Retrieve a full theme token set by name
const tokens = getThemePreset('light')  // or 'dark'

<FastFinancialChart theme={tokens} />
```

## Localization

```tsx
<FastFinancialChart
  localization={{
    locale: 'de-DE',
    priceFormatter: (price) =>
      price.toLocaleString('de-DE', { minimumFractionDigits: 2 }),
    timeFormatter: (ts) => new Date(ts).toLocaleString('de-DE'),
  }}
/>
```

`locale` picks the month names on the time axis, and `timeFormatter` formats the
crosshair readout. Axis tick labels come from `timeScale.tickMarkFormatter`,
which gets the timestamp plus the kind of calendar boundary the tick sits on:

```tsx
<FastFinancialChart
  timeScale={{
    tickMarkFormatter: (ts, tickType) => {
      const date = new Date(ts)
      if (tickType === 'year') return `FY${date.getFullYear()}`
      if (tickType === 'month')
        return date.toLocaleString('en', { month: 'long' })
      if (tickType === 'day') return `${date.getDate()}`
      return date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
    },
  }}
/>
```

Ticks land on calendar boundaries (year, month, day, hour, minute) and each
label says only what changed since the one before it, so an intraday chart reads
`28  04:00  08:00  …` instead of repeating the date on every tick. Labels are
measured before they are drawn and never overlap: when space runs short the more
significant boundary keeps its label and the plainer ones drop out. Custom
labels go through the same measurement, so a wide formatter just yields fewer
ticks.

## Headless Composition (ShadCN-Friendly)

The package ships no Tailwind classes and has no dependency on any CSS framework. All internal layout uses inline styles. Parent apps can own all UI chrome via event callbacks and render slots:

- `onContextMenu(payload)`
- `onHudUpdate(payload)`
- `onEvent(event)`
- `onClick(params)`: click with time, price, series data
- `onDblClick(params)`: double-click with same payload
- `onCrosshairMove(params)`: pointer move with hovered bar data
- `onVisibleTimeRangeChange(payload)`: viewport range updates
- `onSizeChange(payload)`: container resize
- `renderTopBar(ctx)`
- `renderHud(ctx)`
- `renderContextMenu(ctx)`
- `renderIndicatorPaneHeader(indicators)`: custom header above indicator panes

This allows your app to use ShadCN or any design system without fighting chart internals.

## Controlled vs Uncontrolled State

`FastFinancialChart` supports controlled or uncontrolled operation for expensive domains:

```tsx
<FastFinancialChart
  controlled={{
    viewport: false,
    drawings: false,
    indicators: false,
  }}
/>
```

Guidance:

- Use uncontrolled for real-time trading to minimize prop-sync churn.
- Use controlled when external state manager is source of truth.
- For controlled mode, pass stable references and update only when value actually changes.

## Extensibility: Indicators and Drawings

### Custom indicator

```tsx
import type { IndicatorDefinition } from '@pairlens/fast-financial-charts/types'

const myIndicator: IndicatorDefinition = {
  type: 'custom:my-indicator',
  pane: 'overlay',
  supportsIncremental: false,
  backend: 'canvas2d',
  compute: ({ bars }) => bars.map((b) => ({ ts: b.ts, value: b.close })),
  presenter: ({ ctx, values, theme }) => {
    ctx.strokeStyle = theme.axisText
    ctx.beginPath()
    // draw using values...
    ctx.stroke()
  },
}

<FastFinancialChart plugins={{ indicators: [myIndicator] }} />
```

### Custom drawing shape

The `DrawingShapeDefinition` interface provides full control over creation, hit-testing, handle layout, and drag behavior:

```tsx
import type { DrawingShapeDefinition } from '@pairlens/fast-financial-charts/types'

const rayShape: DrawingShapeDefinition = {
  type: 'custom:ray',
  createDefault: ({ id, point }) => ({
    id,
    type: 'custom:ray',
    color: '#22c55e',
    lineWidth: 1,
    visible: true,
    points: [point, point],
  }),
  hitTest: () => null,
  render: () => {},
  getHandles: () => [],
  // Optional drag behavior hooks. Implement to control move/resize semantics:
  // onDrag(drawing, point) => DrawingObject
  // onShift(drawing, deltaTs, deltaPrice) => DrawingObject
  // onHandleResize(drawing, handleId, point) => DrawingObject
}

<FastFinancialChart plugins={{ drawings: [rayShape] }} />
```

### Series primitives

Attach custom Canvas2D rendering to a series at four z-order layers (`behindGrid`, `behindSeries`, `afterSeries`, `topmost`). Primitives can render in the chart pane, price axis, and/or time axis:

```tsx
import type { SeriesPrimitiveInput } from '@pairlens/fast-financial-charts/types'

const volumeProfile: SeriesPrimitiveInput = {
  seriesId: 'BTC-USD',
  zOrder: 'behindSeries',
  paneRenderer: ({ ctx, width, height, bars, coords }) => {
    // Custom Canvas2D drawing with full coordinate helpers
    for (const bar of bars) {
      const x = coords.indexToX(bars.indexOf(bar))
      const y = coords.priceToY(bar.close)
      // ... draw volume profile bars
    }
  },
}

<FastFinancialChart plugins={{ primitives: [volumeProfile] }} />
```

`width` and `height` in a `paneRenderer` are the plot area, with the axis gutters already subtracted, so they share the coordinate space the candles are drawn in. Use `coords` for anything data-driven and treat `width`/`height` as the drawable bounds.

Coordinate helpers available: `priceToY`, `indexToX`, `timeToX`, `yToPrice`, `xToIndex`.

### Custom series

Define entirely new series types with custom data formats and Canvas2D rendering. Custom series don't modify the WebGL pipeline: they render as Canvas2D overlays.

```tsx
import type { CustomSeriesDefinition } from '@pairlens/fast-financial-charts/types'

const heatmapDef: CustomSeriesDefinition = {
  type: 'custom:heatmap',
  label: 'Heatmap',
  renderer: ({ ctx, visibleBars, coords, color }) => {
    for (const bar of visibleBars) {
      const x = coords.timeToX(bar.ts)
      if (x === null) continue
      const y = coords.priceToY(bar.value as number)
      const intensity = bar.intensity as number
      ctx.fillStyle = `rgba(255, 0, 0, ${intensity})`
      ctx.fillRect(x - 3, y - 3, 6, 6)
    }
  },
  priceRange: (bars) => {
    const values = bars.map((b) => b.value as number).filter(Boolean)
    return values.length ? { min: Math.min(...values), max: Math.max(...values) } : null
  },
}

<FastFinancialChart
  plugins={{ customSeries: [heatmapDef] }}
  customSeries={[{
    id: 'heat-1',
    type: 'custom:heatmap',
    bars: [{ ts: 1700000000000, value: 64000, intensity: 0.8 }],
  }]}
/>
```

Custom series support optional `compute()` preprocessing, custom `priceRange()` for y-axis contribution, and per-pane routing.

## Coordinate Conversion APIs

Convert between data space and pixel coordinates:

```tsx
const y = chartRef.current?.priceToCoordinate(64000) // price → Y pixel
const price = chartRef.current?.coordinateToPrice(150) // Y pixel → price
const x = chartRef.current?.timeToCoordinate(ts) // timestamp → X pixel
const ts = chartRef.current?.coordinateToTime(300) // X pixel → timestamp
```

## Data Read-Back APIs

```tsx
const bars = chartRef.current?.data('BTC-USD') // all bars for series
const bar = chartRef.current?.dataByIndex(42, 'BTC-USD') // specific bar by index
const removed = chartRef.current?.pop(10, 'BTC-USD') // remove last 10 bars
const order = chartRef.current?.seriesOrder() // rendering order
chartRef.current?.setSeriesOrder(['ETH-USD', 'BTC-USD']) // reorder series
```

## AI / MCP Integration

The package exposes an MCP-compatible tools layer:

```ts
import { createChartMcpAdapter } from '@pairlens/fast-financial-charts/mcp'

const mcp = createChartMcpAdapter(chartRef.current)
const schema = mcp.getSchema()

await mcp.execute('addIndicator', {
  type: 'RSI',
  seriesId: 'BTC-USD',
  params: { period: 14 },
})
```

52 MCP tools organized by category:

- **Indicator commands**: `addIndicator`, `removeIndicator`, `removeAllIndicators`, `updateIndicator`.
- **Drawing commands**: `addDrawing`, `updateDrawing`, `removeDrawing`, `clearDrawings`.
- **View commands**: `setViewport`, `scrollToLatest`, `scrollToPosition`, `fitContent`, `setCompareMode`, `setChartType`, `setPriceScaleMode`.
- **Data mutation**: `applyTick`, `applyTicks`, `appendBar`, `replaceSeries`, `popBars`.
- **Data read-back**: `getData` (with `limit`/`offset` pagination), `getDataByIndex`, `getSeriesOrder`, `setSeriesOrder`.
- **Coordinate conversion**: `priceToCoordinate`, `coordinateToPrice`, `timeToCoordinate`, `coordinateToTime`.
- **Pane management**: `addPane`, `removePane`, `swapPanes`, `updatePane`, `getPaneLayout`.
- **Series primitives**: `addPrimitive`, `removePrimitive`, `listPrimitives`.
- **Custom series**: `addCustomSeries`, `removeCustomSeries`, `updateCustomSeriesData`, `listCustomSeries`.
- **Theme**: `setTheme` applies a partial theme at runtime.
- **History**: `undo`, `redo`.
- **Agent ops**: `getChartState`, `getVisibleData`, `getIndicatorValue`, `getDrawingState`, `getCapabilities`, `subscribeEvents`, `unsubscribeEvents`, `screenshot`, `takeScreenshot` (with `includeCrosshair`/`includeOverlays` options).

### Event subscriptions for agents

Subscribe to chart events for reactive AI workflows:

```ts
await mcp.execute('subscribeEvents', {
  events: [
    'indicatorsChange',
    'indicatorComputeComplete',
    'drawingsChange',
    'stateChange',
  ],
})
```

`indicatorComputeComplete` fires after each indicator finishes computing, giving AI agents a signal that values are ready to query.

Runtime validation rejects malformed payloads for deterministic tool execution.

## Tree-Shakeable Entry Points

Use targeted imports to reduce bundle size:

- `@pairlens/fast-financial-charts`: core engine (no React)
- `@pairlens/fast-financial-charts/react`: `<FastFinancialChart />`, `<DepthChart />`, hooks
- `@pairlens/fast-financial-charts/types`
- `@pairlens/fast-financial-charts/mcp`
- `@pairlens/fast-financial-charts/indicators`
- `@pairlens/fast-financial-charts/drawings`
- `@pairlens/fast-financial-charts/theme`
- `@pairlens/fast-financial-charts/financial-chart`
- `@pairlens/fast-financial-charts/depth-chart`

The package is configured with `sideEffects: false`.

## Performance Recommendations for Consumers

- Prefer imperative update methods (`applyTick`, `applyTicks`, `appendBar`) for live feeds.
- Keep `series` prop reference stable after initial mount.
- Avoid controlling `drawings`/`viewport` unless required by product architecture.
- Batch incoming ticks before dispatch when possible.
- Keep `enableHiDpi` enabled only when visual requirements need it on very high-density canvases.
- Use `snapshotThrottleMs` and consume `onSnapshot` only where needed.
- Offload non-chart UI work from pointer-move events.

## Core Goals

- Performance-first rendering for large OHLCV datasets and live tick streams.
- Headless composition so parent apps fully own UI chrome (menus, HUDs, toolbars, modals).
- Composable architecture where indicator calculation and rendering are separate concerns.
- AI-first deterministic control surface through MCP-compatible tool schemas and executor.
- Extensibility for custom indicators, custom drawing shapes, series primitives, and custom series types.

## Architecture

The library is split into three layers:

- Core engine (no React): data stores, render pipeline, interaction model, command bus.
- Feature modules: indicators, drawings, MCP tooling, theme resolution.
- React adapter: `<FastFinancialChart />`, imperative ref API, hooks, render slots.

High-level pipeline:

1. Parent provides initial `series[]` and config.
2. Engine builds WebGL2 + Canvas overlay stack.
3. Dirty-flag scheduler redraws only affected layers.
4. Tick/bar updates flow through imperative ref for O(1) hot path updates.
5. Indicators compute in worker (or inline fallback), then commit once.
6. Parent receives chart events and renders custom UI around chart state.

## Rendering Model

The chart uses a layered canvas stack:

- Main canvas (WebGL2): candles/bar/line/area/baseline/histogram geometry.
- Indicator canvas (Canvas2D): indicator presenters (overlay + N user panes), series primitives, custom series.
- Overlay canvas (Canvas2D): axis labels/text.
- UI canvas (Canvas2D): crosshair + interaction overlays.

Why this split:

- Geometry stays in GPU path.
- Text/UI avoids WebGL font-atlas complexity.
- Crosshair/pointer movement only invalidates cheap UI layers.

## Performance Design Decisions

- Dirty flags + RAF scheduler: render only changed layers.
- Viewport slicing: render complexity scales with visible bars, not full dataset size.
- Incremental tick ingestion: same-bucket tick mutates last bar in-place.
- Burst ingestion API: `applyTicks(updates)` for batched live feeds.
- Snapshot split: lightweight snapshots by default; heavy data only by explicit request.
- Parallel indicator scheduling: compute requests execute in parallel and commit once.
- Pre-allocated interleaved Float32Array in WebGL candle program: single `gl.bufferData` call per frame, zero intermediate allocations.
- Cached hex→RGBA conversion: color parsing runs once on theme change, not per frame.
- Incremental price range tracking: min/max recalculated only on viewport or series change, not every tick.
- `getBoundingClientRect` cached on resize: pointer-move path performs no layout recalculation.
- Structural sharing for undo stack: only the changed drawing is cloned, not the entire array.
- WebGL context loss recovery: `webglcontextlost` / `webglcontextrestored` handlers re-initialize programs and re-upload buffers.
- `preserveDrawingBuffer: false` for lower GPU overhead.
- Shallow-compare guard on React `updateProps`: rest-spread props reference is compared by key before calling engine, eliminating unnecessary work on parent re-renders.
- MCP `getData` pagination: `limit`/`offset` params avoid cloning full bar arrays for large datasets.
- GPU-side viewport transform: NDC conversions moved to vertex shader uniforms. Viewport pan/zoom is O(1) uniform update with no buffer refill. All bars buffered once, GPU clips offscreen geometry.
- Pre-bucketed z-order cache in PrimitiveRegistry: O(1) render-time lookup per z-order layer, rebuilt lazily on mutation only.
- Visible-instance cache in CustomSeriesStore: avoids per-frame array allocation for custom series visibility filtering.

## Current Scope (V1.3)

Included:

- WebGL2 geometry rendering + Canvas2D overlays.
- Sixteen chart types: candles, Heikin-Ashi, hollow candles, bar (OHLC), high-low, line, step line, area, HLC area, baseline, histogram, column, Renko, line break, Kagi, point and figure.
- Four price scale modes: normal, logarithmic, percentage, indexedTo100.
- Configurable price scale (inverted, margins, border, ticks).
- Time scale configuration (rightOffset, barSpacing, edge clamping, auto-scroll control).
- Multi-series comparison (indexed, price, dual-axis).
- Crosshair modes (normal, magnet, hidden) with per-line styling.
- Watermark support (text, alignment, font, color).
- Series annotations: price lines and markers (buy/sell signals, shapes).
- 90 built-in indicators and 42 drawing tools (lines, channels, shapes, annotations, five Fibonacci tools, Gann fan and box, harmonic patterns, position projections, measurement).
- Smart time-axis date formatting (adapts label format to visible time span).
- Crosshair price/time labels on axes, last-close price line.
- Configurable price precision per series.
- Measurement labels on line/rectangle drawings (ΔPrice, %).
- Drawing edit workflow with keyboard shortcuts and undo/redo.
- Touch/pinch-zoom and inertial scrolling with granular gesture control.
- Programmatic navigation: `fitContent()`, `scrollToPosition()` with animation.
- Coordinate conversion APIs (price/time ↔ pixel).
- Data read-back APIs with pagination (`data`, `dataByIndex`, `pop`).
- Series z-ordering (`seriesOrder`, `setSeriesOrder`).
- Enhanced screenshot capture with configurable layers.
- Localization (locale, custom price/time formatters).
- Light and dark theme presets, configurable grid layout.
- GPU-side viewport transform: O(1) pan/zoom via vertex shader uniforms, all-bars buffer.
- Multi-pane management API (N-pane system with resizable separators and per-pane price scales).
- Series primitives plugin (custom Canvas2D rendering at 4 z-order layers on pane, price axis, time axis).
- Custom series plugin (developer-defined series types with custom data formats and Canvas2D rendering).
- MCP schema + executor with 52 AI-native tools.

Planned for next iterations:

- Alerts.
- Replay mode.
- Extended layout/template persistence.

## Development Scripts

From package root:

```bash
bun run typecheck
bun run test
bun run build
```

## Releasing (maintainers)

Releases are published to NPM by CI (`.github/workflows/publish.yml`) whenever a `v*` tag is pushed. The workflow re-runs typecheck + tests, verifies the tag matches `package.json`, and publishes with [provenance](https://docs.npmjs.com/generating-provenance-statements). It authenticates via [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC, no token secret): the trusted publisher is configured on the package's npm access page (GitHub org `Pairlens`, repo `@pairlens/fast-financial-charts`, workflow `publish.yml`).

```bash
npm version minor        # bumps package.json and creates the vX.Y.Z tag
git push origin main --follow-tags
```

## License

[MIT](./LICENSE). Free for commercial and non-commercial use, no tiers, no watermark.
