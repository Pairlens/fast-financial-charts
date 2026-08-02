import type { DrawingHit, DrawingObject } from '../../../types'

export const sortHitsByDistance = (
  hits: Array<DrawingHit>,
): Array<DrawingHit> => {
  return hits.slice().sort((left, right) => left.distance - right.distance)
}

export const findDrawingById = (
  drawings: Array<DrawingObject>,
  id: string | null,
): DrawingObject | null => {
  if (!id) {
    return null
  }

  return drawings.find((drawing) => drawing.id === id) ?? null
}
