import type { DrawingObject } from '../../types'

export const upsertDrawing = (
  drawings: Array<DrawingObject>,
  drawing: DrawingObject,
): Array<DrawingObject> => {
  const index = drawings.findIndex((item) => item.id === drawing.id)

  if (index === -1) {
    return [...drawings, drawing]
  }

  const next = drawings.slice()
  next[index] = drawing
  return next
}

export const patchDrawing = (
  drawings: Array<DrawingObject>,
  id: string,
  patch: Partial<DrawingObject>,
): Array<DrawingObject> => {
  return drawings.map((drawing) => {
    if (drawing.id !== id) {
      return drawing
    }

    return {
      ...drawing,
      ...patch,
    } as DrawingObject
  })
}

export const removeDrawing = (
  drawings: Array<DrawingObject>,
  id: string,
): Array<DrawingObject> => {
  return drawings.filter((drawing) => drawing.id !== id)
}

export const clearDrawings = (): Array<DrawingObject> => []
