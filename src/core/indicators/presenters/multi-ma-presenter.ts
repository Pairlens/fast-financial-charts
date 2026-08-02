import { computePriceRange, valueToY } from '../../data/scales'
import { drawTitleLabel, strokeLine, toMultiLinePoints } from './utils'
import type { IndicatorPresenter } from '../../../types'

const MA_COLORS = [
  '#2196f3',
  '#f44336',
  '#4caf50',
  '#ff9800',
  '#9c27b0',
  '#00bcd4',
  '#e91e63',
  '#8bc34a',
]

export const multiMaPresenter: IndicatorPresenter = (context) => {
  const { ctx, width, height, theme, indicator } = context
  const visibleBars = context.bars.slice(
    context.viewport.startIndex,
    context.viewport.endIndex + 1,
  )
  const range = computePriceRange(visibleBars)

  const periodsStr = String(indicator.params.periods ?? '10,20,50,100,200')
  const periods = periodsStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const keys = periods.map((p) => `ma_${p}`)

  const lines = toMultiLinePoints(
    context.bars,
    context.values,
    context.viewport,
    width,
    keys,
    (value) => valueToY(value, range, height),
  )

  drawTitleLabel(ctx, `MA Multi(${periodsStr})`, indicator.color, theme)

  for (let index = 0; index < keys.length; index++) {
    const color = MA_COLORS[index % MA_COLORS.length]
    strokeLine(ctx, lines.get(keys[index]) ?? [], color, 1.3)
  }
}
