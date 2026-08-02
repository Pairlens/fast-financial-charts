import { getVisibleBars } from './viewport-slicer'
import type { ChartBar, ChartSeriesInput, CompareMode } from '../../types'

export type ComparableSeries = {
  id: string
  points: Array<{ ts: number; value: number }>
  color: string
}

const DEFAULT_COLORS = ['#00d084', '#4aa8ff', '#ffb020', '#8b7dff', '#f86f9f']

export const normalizeSeriesForCompare = (
  series: Array<ChartSeriesInput>,
  compareMode: CompareMode,
  viewport: { startIndex: number; endIndex: number },
): Array<ComparableSeries> => {
  return series
    .filter((item) => item.visible !== false)
    .map((item, index) => {
      const visible = getVisibleBars(item.bars, viewport)
      if (visible.length === 0) {
        return {
          id: item.id,
          color: item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          points: [],
        }
      }

      if (compareMode === 'indexed') {
        const baseline = visible[0]?.close ?? 1
        const divisor = baseline === 0 ? 1 : baseline

        return {
          id: item.id,
          color: item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          points: visible.map((bar) => ({
            ts: bar.ts,
            value: (bar.close / divisor) * 100,
          })),
        }
      }

      return {
        id: item.id,
        color: item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        points: visible.map((bar: ChartBar) => ({
          ts: bar.ts,
          value: bar.close,
        })),
      }
    })
}
