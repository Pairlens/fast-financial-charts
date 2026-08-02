import type { ChartBar, ChartType } from '../../types'

/**
 * Price-based (time-independent) chart types built by transforming OHLC
 * candles into synthetic bricks/lines/columns. The transformed bars are
 * rendered through the existing candle instance path — each output bar is
 * an OHLC bar whose open/close encode direction (close >= open → up color).
 *
 * All transforms are pure functions: no I/O, no shared state.
 */

export type PriceTransformChartType =
  | 'renko'
  | 'lineBreak'
  | 'kagi'
  | 'pointFigure'

export const isPriceTransformChartType = (
  chartType: ChartType,
): chartType is PriceTransformChartType =>
  chartType === 'renko' ||
  chartType === 'lineBreak' ||
  chartType === 'kagi' ||
  chartType === 'pointFigure'

/**
 * Simple ATR: arithmetic mean of the true range over the last `period` bars.
 * Falls back to 1% of the last close when fewer than 2 bars are available or
 * the computed ATR is degenerate (0 / non-finite).
 */
export const computeSimpleAtr = (
  bars: Array<ChartBar>,
  period = 14,
): number => {
  if (bars.length === 0) {
    return 0
  }

  const fallback = Math.abs(bars[bars.length - 1].close) * 0.01

  if (bars.length < 2) {
    return fallback
  }

  const start = Math.max(1, bars.length - period)
  let sum = 0
  let count = 0

  for (let i = start; i < bars.length; i += 1) {
    const previousClose = bars[i - 1].close
    const trueRange = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - previousClose),
      Math.abs(bars[i].low - previousClose),
    )
    sum += trueRange
    count += 1
  }

  const atr = sum / count
  return Number.isFinite(atr) && atr > 0 ? atr : fallback
}

const makeSyntheticBar = (
  ts: number,
  open: number,
  close: number,
  volume: number,
): ChartBar => ({
  ts,
  open,
  high: Math.max(open, close),
  low: Math.min(open, close),
  close,
  volume,
})

/**
 * Renko: fixed-size bricks stacked by close moves.
 *
 * - brickSize defaults to simple ATR(14) (fallback: 1% of last close).
 * - A new brick in the current direction forms when the close moves at least
 *   one brickSize beyond the last brick edge.
 * - A direction reversal requires the close to move 2x brickSize from the
 *   current brick's leading edge (one brick to cross back over the current
 *   brick, one to form the new opposite brick).
 * - Brick ts = ts of the source candle that completed it. Source volume is
 *   accumulated and assigned to the first brick emitted since the last one.
 */
export const toRenkoBars = (
  bars: Array<ChartBar>,
  brickSize?: number,
): Array<ChartBar> => {
  if (bars.length === 0) {
    return []
  }

  const size = brickSize ?? computeSimpleAtr(bars)
  if (!(size > 0) || !Number.isFinite(size)) {
    return []
  }

  const bricks: Array<ChartBar> = []
  // Current brick edges. Before the first brick both collapse to the anchor.
  let lowerEdge = bars[0].close
  let upperEdge = bars[0].close
  let direction: 1 | -1 | 0 = 0
  let pendingVolume = 0

  const emit = (open: number, close: number, ts: number): void => {
    bricks.push(makeSyntheticBar(ts, open, close, pendingVolume))
    pendingVolume = 0
  }

  for (const bar of bars) {
    pendingVolume += bar.volume
    const c = bar.close

    if (direction === 0) {
      if (c >= upperEdge + size) {
        while (c >= upperEdge + size) {
          emit(upperEdge, upperEdge + size, bar.ts)
          upperEdge += size
        }
        lowerEdge = upperEdge - size
        direction = 1
      } else if (c <= lowerEdge - size) {
        while (c <= lowerEdge - size) {
          emit(lowerEdge, lowerEdge - size, bar.ts)
          lowerEdge -= size
        }
        upperEdge = lowerEdge + size
        direction = -1
      }
    } else if (direction === 1) {
      if (c >= upperEdge + size) {
        while (c >= upperEdge + size) {
          emit(upperEdge, upperEdge + size, bar.ts)
          upperEdge += size
        }
        lowerEdge = upperEdge - size
      } else if (c <= lowerEdge - size) {
        // Reversal: needs 2x brickSize below the current upper edge. The
        // first down brick opens at the current brick's lower edge.
        let edge = lowerEdge
        while (c <= edge - size) {
          emit(edge, edge - size, bar.ts)
          edge -= size
        }
        lowerEdge = edge
        upperEdge = lowerEdge + size
        direction = -1
      }
    } else {
      if (c <= lowerEdge - size) {
        while (c <= lowerEdge - size) {
          emit(lowerEdge, lowerEdge - size, bar.ts)
          lowerEdge -= size
        }
        upperEdge = lowerEdge + size
      } else if (c >= upperEdge + size) {
        let edge = upperEdge
        while (c >= edge + size) {
          emit(edge, edge + size, bar.ts)
          edge += size
        }
        upperEdge = edge
        lowerEdge = upperEdge - size
        direction = 1
      }
    }
  }

  return bricks
}

/**
 * Line break (default: 3-line break).
 *
 * - The first source bar seeds the first line (open → close).
 * - A new up line forms when the close exceeds the max close of the previous
 *   `breakCount` lines; a new down line when it drops below the min close of
 *   the previous `breakCount` lines.
 * - New lines open at the previous line's close. Line ts = source candle ts.
 */
export const toLineBreakBars = (
  bars: Array<ChartBar>,
  breakCount = 3,
): Array<ChartBar> => {
  if (bars.length === 0) {
    return []
  }

  const lines: Array<ChartBar> = [
    makeSyntheticBar(bars[0].ts, bars[0].open, bars[0].close, bars[0].volume),
  ]

  for (let i = 1; i < bars.length; i += 1) {
    const c = bars[i].close
    const windowStart = Math.max(0, lines.length - breakCount)
    let maxClose = Number.NEGATIVE_INFINITY
    let minClose = Number.POSITIVE_INFINITY

    for (let j = windowStart; j < lines.length; j += 1) {
      const lineClose = lines[j].close
      if (lineClose > maxClose) maxClose = lineClose
      if (lineClose < minClose) minClose = lineClose
    }

    if (c > maxClose || c < minClose) {
      const open = lines[lines.length - 1].close
      lines.push(makeSyntheticBar(bars[i].ts, open, c, bars[i].volume))
    }
  }

  return lines
}

/**
 * Kagi: reversal-driven vertical segments.
 *
 * - reversalAmount defaults to simple ATR(14) (fallback: 1% of last close).
 * - The line extends with the close while moving in the current direction;
 *   a move of at least reversalAmount against it completes the segment.
 * - Each completed segment is one OHLC bar from segment start to its extreme
 *   (up segments close above open → up color; down segments the inverse).
 *   Segment ts = ts of the source candle that completed it (reversal bar);
 *   the trailing in-progress segment uses the ts of its current extreme.
 */
export const toKagiBars = (
  bars: Array<ChartBar>,
  reversalAmount?: number,
): Array<ChartBar> => {
  if (bars.length === 0) {
    return []
  }

  const reversal = reversalAmount ?? computeSimpleAtr(bars)
  if (!(reversal > 0) || !Number.isFinite(reversal)) {
    return []
  }

  const segments: Array<ChartBar> = []
  let segmentStart = bars[0].close
  let extreme = bars[0].close
  let extremeTs = bars[0].ts
  let direction: 1 | -1 | 0 = 0

  for (let i = 1; i < bars.length; i += 1) {
    const c = bars[i].close
    const ts = bars[i].ts

    if (direction === 0) {
      if (c >= segmentStart + reversal) {
        direction = 1
        extreme = c
        extremeTs = ts
      } else if (c <= segmentStart - reversal) {
        direction = -1
        extreme = c
        extremeTs = ts
      }
    } else if (direction === 1) {
      if (c > extreme) {
        extreme = c
        extremeTs = ts
      } else if (c <= extreme - reversal) {
        segments.push(makeSyntheticBar(ts, segmentStart, extreme, 0))
        segmentStart = extreme
        direction = -1
        extreme = c
        extremeTs = ts
      }
    } else {
      if (c < extreme) {
        extreme = c
        extremeTs = ts
      } else if (c >= extreme + reversal) {
        segments.push(makeSyntheticBar(ts, segmentStart, extreme, 0))
        segmentStart = extreme
        direction = 1
        extreme = c
        extremeTs = ts
      }
    }
  }

  // Trailing in-progress segment so the chart reflects the current state
  if (direction !== 0) {
    segments.push(makeSyntheticBar(extremeTs, segmentStart, extreme, 0))
  }

  return segments
}

/**
 * Point & figure: X/O columns from close moves.
 *
 * - boxSize defaults to 1% of the last close; reversal requires
 *   `reversalBoxes` (default 3) boxes against the current column.
 * - Column extensions snap to whole boxes. On reversal, the new column
 *   starts one box inside the previous column's extreme (classic P&F).
 * - Each column is one OHLC bar: open = column start price, close = column
 *   end price (X columns close above open → up color; O columns inverse).
 *   Column ts = ts of the source candle that completed it; the trailing
 *   in-progress column uses the ts of its last extension.
 */
export const toPointFigureBars = (
  bars: Array<ChartBar>,
  boxSize?: number,
  reversalBoxes = 3,
): Array<ChartBar> => {
  if (bars.length === 0) {
    return []
  }

  const box = boxSize ?? Math.abs(bars[bars.length - 1].close) * 0.01
  if (!(box > 0) || !Number.isFinite(box)) {
    return []
  }

  const columns: Array<ChartBar> = []
  let columnStart = bars[0].close
  let columnEnd = bars[0].close
  let columnTs = bars[0].ts
  let direction: 1 | -1 | 0 = 0

  for (let i = 1; i < bars.length; i += 1) {
    const c = bars[i].close
    const ts = bars[i].ts

    if (direction === 0) {
      if (c >= columnStart + box) {
        direction = 1
        columnEnd = columnStart + Math.floor((c - columnStart) / box) * box
        columnTs = ts
      } else if (c <= columnStart - box) {
        direction = -1
        columnEnd = columnStart - Math.floor((columnStart - c) / box) * box
        columnTs = ts
      }
    } else if (direction === 1) {
      if (c >= columnEnd + box) {
        columnEnd += Math.floor((c - columnEnd) / box) * box
        columnTs = ts
      } else if (c <= columnEnd - reversalBoxes * box) {
        columns.push(makeSyntheticBar(columnTs, columnStart, columnEnd, 0))
        // New O column starts one box below the previous top
        columnStart = columnEnd - box
        columnEnd = columnEnd - Math.floor((columnEnd - c) / box) * box
        columnTs = ts
        direction = -1
      }
    } else {
      if (c <= columnEnd - box) {
        columnEnd -= Math.floor((columnEnd - c) / box) * box
        columnTs = ts
      } else if (c >= columnEnd + reversalBoxes * box) {
        columns.push(makeSyntheticBar(columnTs, columnStart, columnEnd, 0))
        // New X column starts one box above the previous bottom
        columnStart = columnEnd + box
        columnEnd = columnEnd + Math.floor((c - columnEnd) / box) * box
        columnTs = ts
        direction = 1
      }
    }
  }

  // Trailing in-progress column so the chart reflects the current state
  if (direction !== 0) {
    columns.push(makeSyntheticBar(columnTs, columnStart, columnEnd, 0))
  }

  return columns
}

/**
 * Dispatch a price-transform chart type to its transform.
 * Parameters (brick size, reversal, box size) use their classic defaults:
 * ATR(14) for renko/kagi, 3 lines for lineBreak, 1% box + 3-box reversal
 * for pointFigure.
 */
export const transformBarsForChartType = (
  bars: Array<ChartBar>,
  chartType: PriceTransformChartType,
): Array<ChartBar> => {
  switch (chartType) {
    case 'renko':
      return toRenkoBars(bars)
    case 'lineBreak':
      return toLineBreakBars(bars)
    case 'kagi':
      return toKagiBars(bars)
    case 'pointFigure':
      return toPointFigureBars(bars)
  }
}
