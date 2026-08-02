import { DRAWING_HANDLE_RADIUS } from '../../drawings/models'
import { toXFromTs, toYFromPrice } from '../../drawings/transforms'
import type { DrawingTransformContext } from '../../drawings/transforms'
import type { DrawingRegistry } from '../../drawings/registry'
import type {
  ChartBar,
  ChartTheme,
  ChartViewport,
  DrawingObject,
  NumericRange,
} from '../../../types'

type DrawingsPassInput = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  bars: Array<ChartBar>
  viewport: ChartViewport
  drawings: Array<DrawingObject>
  selectedDrawingId: string | null
  drawingRegistry: DrawingRegistry
  theme: ChartTheme
  range: NumericRange
}

export const renderDrawingsPass = (input: DrawingsPassInput): void => {
  const transform: DrawingTransformContext = {
    bars: input.bars,
    viewport: input.viewport,
    width: input.width,
    height: input.height,
    range: input.range,
  }

  const toX = (ts: number) => toXFromTs(ts, transform)
  const toY = (price: number) => toYFromPrice(price, transform)

  for (const drawing of input.drawings) {
    if (!drawing.visible) {
      continue
    }

    const definition = input.drawingRegistry.get(drawing.type)
    if (!definition) {
      continue
    }

    definition.render({
      ctx: input.ctx,
      drawing,
      width: input.width,
      height: input.height,
      bars: input.bars,
      toX,
      toY,
    })

    if (input.selectedDrawingId !== drawing.id) {
      continue
    }

    const handles = definition.getHandles(drawing, toX, toY)
    input.ctx.save()
    input.ctx.fillStyle = input.theme.drawingHandle
    input.ctx.strokeStyle = input.theme.selection
    input.ctx.lineWidth = 1

    for (const handle of handles) {
      input.ctx.beginPath()
      input.ctx.arc(handle.x, handle.y, DRAWING_HANDLE_RADIUS, 0, Math.PI * 2)
      input.ctx.fill()
      input.ctx.stroke()
    }

    input.ctx.restore()
  }
}
