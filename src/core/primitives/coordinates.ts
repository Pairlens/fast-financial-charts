import { findBarIndexByTs } from '../data/binary-search'
import { valueToYScaled, yToValueScaled } from '../data/scales'
import type { ChartBar, NumericRange } from '../../types/data'
import type { PrimitiveCoordinateHelpers } from '../../types/primitives'
import type { ChartViewport, PriceScaleMode } from '../../types/viewport'

/**
 * Creates coordinate conversion helpers for primitive renderers.
 * These helpers convert between data space (price, bar index, timestamp)
 * and pixel space (x, y coordinates) within the chart area.
 *
 * `plotWidth`/`plotHeight` are *plot area* dimensions — the container minus
 * the price-axis gutter on the right and the time-axis gutter at the bottom.
 * Callers subtract the gutters; passing raw canvas dimensions would put
 * primitives in a different coordinate space than the series they annotate.
 */
export const createCoordinateHelpers = (
  viewport: ChartViewport,
  priceRange: NumericRange,
  plotWidth: number,
  plotHeight: number,
  bars: Array<ChartBar>,
  priceScaleMode: PriceScaleMode,
): PrimitiveCoordinateHelpers => {
  const total = viewport.endIndex - viewport.startIndex + 1

  return {
    priceToY: (price: number): number => {
      return valueToYScaled(price, priceRange, plotHeight, priceScaleMode)
    },

    indexToX: (index: number): number => {
      const relative = index - viewport.startIndex + 0.5
      return (relative / total) * plotWidth
    },

    timeToX: (ts: number): number | null => {
      const index = findBarIndexByTs(bars, ts)
      // findBarIndexByTs returns nearest index for non-empty arrays,
      // so we must verify the exact timestamp matches
      if (index < 0 || !bars[index] || bars[index].ts !== ts) return null
      const relative = index - viewport.startIndex + 0.5
      return (relative / total) * plotWidth
    },

    yToPrice: (y: number): number => {
      return yToValueScaled(y, priceRange, plotHeight, priceScaleMode)
    },

    xToIndex: (x: number): number => {
      return Math.round((x / plotWidth) * total + viewport.startIndex - 0.5)
    },
  }
}
