# Indicator Coverage

The full list of built-in indicators in `fast-financial-charts`, with their type ids, pane placement, and key parameters (defaults in parentheses). Coverage is tracked against [TradingView Advanced Charts](https://www.tradingview.com/charting-library-docs/latest/ui_elements/indicators/Indicators-List/) and its 146 built-in indicators.

## Supported (90 / 146)

### Moving Averages (17)

| Indicator               | Type                    | Pane    | Key Params                                 |
| ----------------------- | ----------------------- | ------- | ------------------------------------------ |
| EMA                     | `EMA`                   | overlay | `period` (20)                              |
| SMA                     | `SMA`                   | overlay | `period` (20)                              |
| WMA                     | `WMA`                   | overlay | `period` (20)                              |
| DEMA                    | `DEMA`                  | overlay | `period` (20)                              |
| TEMA                    | `TEMA`                  | overlay | `period` (20)                              |
| VWAP                    | `VWAP`                  | overlay | none                                       |
| HMA                     | `HMA`                   | overlay | `period` (9)                               |
| VWMA                    | `VWMA`                  | overlay | `period` (20)                              |
| ALMA                    | `ALMA`                  | overlay | `period` (9), `offset` (0.85), `sigma` (6) |
| KAMA                    | `KAMA`                  | overlay | `period` (10), `fast` (2), `slow` (30)     |
| SMMA                    | `SMMA`                  | overlay | `period` (7)                               |
| LSMA                    | `LSMA`                  | overlay | `period` (25)                              |
| McGinley Dynamic        | `McGinleyDynamic`       | overlay | `period` (14)                              |
| Moving Average Hamming  | `MovingAverageHamming`  | overlay | `period` (20)                              |
| Moving Average Channel  | `MovingAverageChannel`  | overlay | `period` (20)                              |
| Moving Average Multiple | `MovingAverageMultiple` | overlay | `periods` ('10,20,50,100,200')             |
| Guppy MMA               | `GuppyMMA`              | overlay | none                                       |

### Oscillators & Momentum (35)

| Indicator                 | Type                      | Pane     | Key Params                                                         |
| ------------------------- | ------------------------- | -------- | ------------------------------------------------------------------ |
| RSI                       | `RSI`                     | separate | `period` (14)                                                      |
| MACD                      | `MACD`                    | separate | `fast` (12), `slow` (26), `signal` (9)                             |
| Stochastic                | `Stochastic`              | separate | `kPeriod` (14), `dPeriod` (3), `smooth` (3)                        |
| Stochastic RSI            | `StochRSI`                | separate | `rsiPeriod` (14), `stochPeriod` (14), `kSmooth` (3), `dSmooth` (3) |
| Williams %R               | `WilliamsR`               | separate | `period` (14)                                                      |
| CCI                       | `CCI`                     | separate | `period` (20)                                                      |
| MFI                       | `MFI`                     | separate | `period` (14)                                                      |
| Momentum                  | `Momentum`                | separate | `period` (10)                                                      |
| ROC                       | `ROC`                     | separate | `period` (12)                                                      |
| Aroon                     | `Aroon`                   | separate | `period` (25)                                                      |
| ADX                       | `ADX`                     | separate | `period` (14)                                                      |
| TRIX                      | `TRIX`                    | separate | `period` (15), `signal` (9)                                        |
| BB %B                     | `BBPercent`               | separate | `period` (20), `stdDev` (2)                                        |
| Awesome Oscillator        | `AwesomeOscillator`       | separate | `fast` (5), `slow` (34)                                            |
| Choppiness Index          | `ChoppinessIndex`         | separate | `period` (14)                                                      |
| Fisher Transform          | `FisherTransform`         | separate | `period` (9)                                                       |
| Vortex Indicator          | `VortexIndicator`         | separate | `period` (14)                                                      |
| Ultimate Oscillator       | `UltimateOscillator`      | separate | `period1` (7), `period2` (14), `period3` (28)                      |
| Coppock Curve             | `CoppockCurve`            | separate | `longPeriod` (14), `shortPeriod` (11), `wmaPeriod` (10)            |
| KST                       | `KST`                     | separate | `roc1` (10), `roc2` (15), `roc3` (20), `roc4` (30)                 |
| Elder Force Index         | `ElderForceIndex`         | separate | `period` (13)                                                      |
| DPO                       | `DPO`                     | separate | `period` (20)                                                      |
| CMO                       | `CMO`                     | separate | `period` (9)                                                       |
| RVI                       | `RVI`                     | separate | `period` (10), `signal` (4)                                        |
| TSI                       | `TSI`                     | separate | `longPeriod` (25), `shortPeriod` (13), `signal` (7)                |
| SMI Ergodic               | `SMIErgodic`              | separate | `longPeriod` (20), `shortPeriod` (5), `signal` (5)                 |
| Connors RSI               | `ConnorsRSI`              | separate | `rsiPeriod` (3), `streakPeriod` (2), `rankPeriod` (100)            |
| Balance of Power          | `BalanceOfPower`          | separate | `period` (14)                                                      |
| Relative Volatility Index | `RelativeVolatilityIndex` | separate | `period` (10), `smoothPeriod` (14)                                 |
| Accelerator Oscillator    | `AcceleratorOscillator`   | separate | `fast` (5), `slow` (34), `smoothPeriod` (5)                        |
| Mass Index                | `MassIndex`               | separate | `emaPeriod` (9), `sumPeriod` (25)                                  |
| Price Oscillator          | `PriceOscillator`         | separate | `fast` (12), `slow` (26)                                           |
| Directional Movement      | `DirectionalMovement`     | separate | `period` (14)                                                      |
| Trend Strength Index      | `TrendStrengthIndex`      | separate | `period` (14)                                                      |
| Rank Correlation Index    | `RankCorrelationIndex`    | separate | `period` (14)                                                      |

### Bands & Channels (5)

| Indicator         | Type               | Pane    | Key Params                                        |
| ----------------- | ------------------ | ------- | ------------------------------------------------- |
| Bollinger Bands   | `BollingerBands`   | overlay | `period` (20), `stdDev` (2)                       |
| Donchian Channels | `DonchianChannels` | overlay | `period` (20)                                     |
| Keltner Channels  | `KeltnerChannels`  | overlay | `period` (20), `atrPeriod` (10), `multiplier` (2) |
| Envelopes         | `Envelopes`        | overlay | `period` (20), `deviation` (10)                   |
| Price Channel     | `PriceChannel`     | overlay | `period` (20)                                     |

### Trend (10)

| Indicator          | Type              | Pane    | Key Params                                                                                               |
| ------------------ | ----------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| SuperTrend         | `SuperTrend`      | overlay | `period` (10), `multiplier` (3)                                                                          |
| Ichimoku Cloud     | `Ichimoku`        | overlay | `tenkanPeriod` (9), `kijunPeriod` (26), `senkouBPeriod` (52), `displacement` (26)                        |
| Parabolic SAR      | `ParabolicSAR`    | overlay | `afStart` (0.02), `afStep` (0.02), `afMax` (0.2)                                                         |
| Williams Alligator | `Alligator`       | overlay | `jawPeriod` (13), `teethPeriod` (8), `lipsPeriod` (5), `jawShift` (8), `teethShift` (5), `lipsShift` (3) |
| Williams Fractal   | `WilliamsFractal` | overlay | `period` (2)                                                                                             |
| Zig Zag            | `ZigZag`          | overlay | `deviation` (5)                                                                                          |
| Chande Kroll Stop  | `ChandeKrollStop` | overlay | `atrPeriod` (10), `firstStop` (1), `secondStop` (9)                                                      |
| MA Cross           | `MACross`         | overlay | `fastPeriod` (9), `slowPeriod` (21)                                                                      |
| EMA Cross          | `EMACross`        | overlay | `fastPeriod` (9), `slowPeriod` (21)                                                                      |
| MA with EMA Cross  | `MAWithEMACross`  | overlay | `smaPeriod` (10), `emaPeriod` (21)                                                                       |

### Volume (9)

| Indicator          | Type                | Pane     | Key Params                              |
| ------------------ | ------------------- | -------- | --------------------------------------- |
| Volume             | `Volume`            | separate | none                                    |
| OBV                | `OBV`               | separate | none                                    |
| A/D                | `AD`                | separate | none                                    |
| CMF                | `CMF`               | separate | `period` (20)                           |
| Klinger Oscillator | `KlingerOscillator` | separate | `fast` (34), `slow` (55), `signal` (13) |
| PVT                | `PVT`               | separate | none                                    |
| Ease of Movement   | `EaseOfMovement`    | separate | `period` (14)                           |
| Volume Oscillator  | `VolumeOscillator`  | separate | `fast` (5), `slow` (10)                 |
| Net Volume         | `NetVolume`         | separate | none                                    |

### Volatility (7)

| Indicator             | Type                   | Pane     | Key Params                         |
| --------------------- | ---------------------- | -------- | ---------------------------------- |
| ATR                   | `ATR`                  | separate | `period` (14)                      |
| BB Width              | `BBWidth`              | separate | `period` (20), `stdDev` (2)        |
| Historical Volatility | `HistoricalVolatility` | separate | `period` (20)                      |
| Pivot Points          | `PivotPoints`          | overlay  | `method` (standard)                |
| Standard Deviation    | `StandardDeviation`    | separate | `period` (20)                      |
| Chaikin Volatility    | `ChaikinVolatility`    | separate | `emaPeriod` (10), `rocPeriod` (10) |
| 52 Week High/Low      | `FiftyTwoWeekHighLow`  | overlay  | `period` (252)                     |

### Statistical (7)

| Indicator                | Type                     | Pane     | Key Params      |
| ------------------------ | ------------------------ | -------- | --------------- |
| Average Price            | `AveragePrice`           | overlay  | none            |
| Median Price             | `MedianPrice`            | overlay  | none            |
| Typical Price            | `TypicalPrice`           | overlay  | none            |
| Linear Regression Curve  | `LinearRegressionCurve`  | overlay  | `period` (25)   |
| Linear Regression Slope  | `LinearRegressionSlope`  | separate | `period` (25)   |
| Accumulative Swing Index | `AccumulativeSwingIndex` | separate | `limitMove` (0) |
| Majority Rule            | `MajorityRule`           | separate | `period` (14)   |

---

## Not Yet Implemented (56)

### Not Applicable / Deferred

| Indicator                                           | Reason                                      |
| --------------------------------------------------- | ------------------------------------------- |
| Volume Profile (Fixed Range / Visible Range)        | Requires tick-level data, complex rendering |
| Advance/Decline                                     | Market breadth, not per-instrument          |
| Correlation Coefficient / Log                       | Multi-asset comparison                      |
| Ratio / Spread                                      | Multi-asset comparison                      |
| Volatility Index (VIX)                              | External data feed                          |
| Various Volatility variants (C-C, OHLC, Zero Trend) | Niche statistical measures                  |
| Standard Error / Standard Error Bands               | Statistical, rarely used in crypto          |

---

## Adding a New Indicator

Each indicator follows a 3-file pattern:

1. **Compute**: `src/core/indicators/compute/<name>.ts`
   - Pure function: `IndicatorComputeFn = ({ bars, params }) => IndicatorValuePoint[]`
   - Parse params with safe defaults: `Math.max(1, Number(params.xxx ?? default))`
   - Guard insufficient data: `if (bars.length < period) return []`

2. **Presenter**: `src/core/indicators/presenters/<name>-presenter.ts`
   - Rendering function: `IndicatorPresenter = (context) => void`
   - Use shared utilities from `./utils.ts` (`toLinePoints`, `toMultiLinePoints`, `strokeLine`, `drawGuideLines`, etc.)
   - Overlay indicators use `computePriceRange`; separate-pane use `computeNumericRange` or fixed ranges

3. **Wire up**: update these files:
   - `src/types/indicators.ts`: add to `BuiltInIndicatorType` union
   - `src/core/indicators/compute/dispatch.ts`: import + register compute function
   - `src/core/indicators/registry.ts`: import presenter + register `IndicatorDefinition`
   - `src/__tests__/indicators.test.ts`: add compute tests
   - `src/types/theme.ts` + `src/core/theme/tokens.ts` + `src/core/theme/resolve-theme.ts`: only if new theme colors needed

### Presenter coordinate space

`context.width` and `context.height` are the **plot area**, not the canvas. The
price-axis gutter on the right is already subtracted, and for overlay indicators
so is the time-axis gutter at the bottom. Map bars across `context.width` and
prices across `context.height` and your series lines up with the candles, the
grid, and the crosshair. Don't add the gutters back — anything drawn past
`context.width` lands under the opaque price-axis panel.

### Shared Presenter Utilities (`src/core/indicators/presenters/utils.ts`)

| Utility                                                           | Use Case                                 |
| ----------------------------------------------------------------- | ---------------------------------------- |
| `toLinePoints(bars, values, viewport, width, yFn)`                | Single-value → screen points             |
| `toMultiLinePoints(bars, values, viewport, width, fields, yFn)`   | Multi-value → field-keyed point arrays   |
| `strokeLine(ctx, points, color, lineWidth)`                       | Draw a polyline                          |
| `strokeColorSwitchingLine(ctx, points, lineWidth)`                | Line with per-segment color (SuperTrend) |
| `drawGuideLines(ctx, levels, range, width, height, color, theme)` | Horizontal dashed lines with labels      |
| `drawTitleLabel(ctx, text, color, theme)`                         | Top-left indicator name                  |
| `fillBetweenLines(ctx, lineA, lineB, fillColor)`                  | Shaded area between two lines            |
| `drawZeroLine(ctx, range, width, height, color, level?)`          | Single horizontal reference line         |
| `drawDots(ctx, points, color, radius)`                            | Dot markers (Parabolic SAR)              |

### Presenter Factories

| Factory                              | Use Case                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| `createBandPresenter(label)`         | Upper/middle/lower band + fill (Bollinger, Donchian, Keltner)                             |
| `createZeroLinePresenter(labelFn)`   | Single line oscillating around zero (CMF, ROC, Momentum, CCI, Coppock, EFI, BBW, HV, DPO) |
| `createSignalLinePresenter(labelFn)` | Two-line with zero reference (Fisher, KST, Klinger)                                       |
