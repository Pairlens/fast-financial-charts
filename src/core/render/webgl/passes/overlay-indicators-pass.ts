import { findBarIndexByTs } from '../../../data/binary-search'
import { toRgba } from '../context'
import type { LineProgram } from '../programs/line-program'
import type {
  ChartBar,
  ChartViewport,
  IndicatorComputation,
  IndicatorInstance,
  NumericRange,
} from '../../../../types'

type OverlayIndicatorPassInput = {
  indicators: Array<IndicatorInstance>
  results: Array<IndicatorComputation>
  viewport: ChartViewport
  bars: Array<ChartBar>
  yRange: NumericRange
  lineProgram: LineProgram
}

const valueToNdc = (value: number, range: NumericRange): number => {
  const ratio = (value - range.min) / Math.max(1e-9, range.max - range.min)
  return Math.max(-1, Math.min(1, ratio * 2 - 1))
}

const xToNdc = (index: number, viewport: ChartViewport): number => {
  const total = Math.max(1, viewport.endIndex - viewport.startIndex + 1)
  return ((index - viewport.startIndex + 0.5) / total) * 2 - 1
}

export const renderOverlayIndicatorsPass = (
  input: OverlayIndicatorPassInput,
): void => {
  for (const indicator of input.indicators) {
    if (!indicator.visible || indicator.pane !== 'overlay') {
      continue
    }

    const result = input.results.find(
      (entry) => entry.indicator.id === indicator.id,
    )
    if (!result) {
      continue
    }

    const points: Array<number> = []

    for (const value of result.values) {
      const numeric = Number(value.value)
      if (!Number.isFinite(numeric)) {
        continue
      }

      const index = findBarIndexByTs(input.bars, value.ts)
      if (
        index < input.viewport.startIndex ||
        index > input.viewport.endIndex
      ) {
        continue
      }

      points.push(
        xToNdc(index, input.viewport),
        valueToNdc(numeric, input.yRange),
      )
    }

    input.lineProgram.draw(
      new Float32Array(points),
      toRgba(indicator.color, 0.95),
    )
  }
}
