import { findBarIndexByTs } from '../../data/binary-search'
import { computePriceRange, valueToY } from '../../data/scales'
import { fillBetweenLines, strokeLine } from './utils'
import type { IndicatorPresenter } from '../../../types'

export const ichimokuPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme } = context
  const visibleBars = context.bars.slice(
    context.viewport.startIndex,
    context.viewport.endIndex + 1,
  )
  const range = computePriceRange(visibleBars)
  const total = Math.max(
    1,
    context.viewport.endIndex - context.viewport.startIndex + 1,
  )
  const ico = theme.indicator.ichimoku

  const tenkan: Array<{ x: number; y: number }> = []
  const kijun: Array<{ x: number; y: number }> = []
  const senkouA: Array<{ x: number; y: number }> = []
  const senkouB: Array<{ x: number; y: number }> = []
  const chikou: Array<{ x: number; y: number }> = []

  for (const point of context.values) {
    const index = findBarIndexByTs(context.bars, point.ts)
    if (
      index < context.viewport.startIndex ||
      index > context.viewport.endIndex
    ) {
      continue
    }

    const x = ((index - context.viewport.startIndex + 0.5) / total) * width

    const tv = Number(point.tenkan)
    const kv = Number(point.kijun)
    const sa = Number(point.senkouA)
    const sb = Number(point.senkouB)
    const cv = Number(point.chikou)

    if (Number.isFinite(tv)) tenkan.push({ x, y: valueToY(tv, range, height) })
    if (Number.isFinite(kv)) kijun.push({ x, y: valueToY(kv, range, height) })
    if (Number.isFinite(sa)) senkouA.push({ x, y: valueToY(sa, range, height) })
    if (Number.isFinite(sb)) senkouB.push({ x, y: valueToY(sb, range, height) })
    if (Number.isFinite(cv)) chikou.push({ x, y: valueToY(cv, range, height) })
  }

  // Cloud fill (dual color based on which span is on top)
  if (senkouA.length > 1 && senkouB.length > 1) {
    const bullSegA: Array<{ x: number; y: number }> = []
    const bullSegB: Array<{ x: number; y: number }> = []
    const bearSegA: Array<{ x: number; y: number }> = []
    const bearSegB: Array<{ x: number; y: number }> = []

    for (let i = 0; i < Math.min(senkouA.length, senkouB.length); i += 1) {
      if (senkouA[i].y <= senkouB[i].y) {
        bullSegA.push(senkouA[i])
        bullSegB.push(senkouB[i])
        if (bearSegA.length > 1) {
          fillBetweenLines(ctx, bearSegA, bearSegB, ico.cloudBearish)
        }
        bearSegA.length = 0
        bearSegB.length = 0
      } else {
        bearSegA.push(senkouA[i])
        bearSegB.push(senkouB[i])
        if (bullSegA.length > 1) {
          fillBetweenLines(ctx, bullSegA, bullSegB, ico.cloudBullish)
        }
        bullSegA.length = 0
        bullSegB.length = 0
      }
    }
    if (bullSegA.length > 1) {
      fillBetweenLines(ctx, bullSegA, bullSegB, ico.cloudBullish)
    }
    if (bearSegA.length > 1) {
      fillBetweenLines(ctx, bearSegA, bearSegB, ico.cloudBearish)
    }
  }

  strokeLine(ctx, tenkan, ico.tenkan, 1.3)
  strokeLine(ctx, kijun, ico.kijun, 1.3)
  strokeLine(ctx, senkouA, ico.senkouA, 1)
  strokeLine(ctx, senkouB, ico.senkouB, 1)
  strokeLine(ctx, chikou, ico.chikou, 1)
}
