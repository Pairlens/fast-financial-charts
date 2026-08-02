import { valueToY } from '../../data/scales'
import type { IndicatorPresenter } from '../../../types'

export const volumePresenter: IndicatorPresenter = (context) => {
  const visibleBars = context.bars.slice(
    context.viewport.startIndex,
    context.viewport.endIndex + 1,
  )
  if (visibleBars.length === 0) {
    return
  }

  const maxVolume = Math.max(1, ...visibleBars.map((bar) => bar.volume))
  const range = { min: 0, max: maxVolume }
  const widthPerBar = context.width / Math.max(1, visibleBars.length)

  context.ctx.save()

  for (let index = 0; index < visibleBars.length; index += 1) {
    const bar = visibleBars[index]
    const x = index * widthPerBar
    const y = valueToY(bar.volume, range, context.height)
    const h = context.height - y
    context.ctx.fillStyle =
      bar.close >= bar.open
        ? context.theme.indicator.volume.up
        : context.theme.indicator.volume.down
    context.ctx.fillRect(x, y, Math.max(1, widthPerBar - 1), h)
  }

  context.ctx.restore()
}
