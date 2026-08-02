/** Distance from a point to a single coordinate (useful for text/single-point drawings). */
export const distanceToPoint = (
  pointX: number,
  pointY: number,
  targetX: number,
  targetY: number,
): number => Math.hypot(pointX - targetX, pointY - targetY)

/** Distance from a point to an axis-aligned rectangle's nearest edge. Returns 0 if inside. */
export const distanceToRectEdge = (
  pointX: number,
  pointY: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): number => {
  // If outside the bounding box entirely, use corner/edge distance
  if (pointX < minX || pointX > maxX || pointY < minY || pointY > maxY) {
    const dx = Math.max(minX - pointX, 0, pointX - maxX)
    const dy = Math.max(minY - pointY, 0, pointY - maxY)
    return Math.hypot(dx, dy)
  }
  // Inside: distance to nearest edge
  return Math.min(pointX - minX, maxX - pointX, pointY - minY, maxY - pointY)
}

export const distanceToSegment = (
  pointX: number,
  pointY: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number => {
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx === 0 && dy === 0) {
    return Math.hypot(pointX - x1, pointY - y1)
  }

  const t = ((pointX - x1) * dx + (pointY - y1) * dy) / (dx * dx + dy * dy)
  const clampedT = Math.max(0, Math.min(1, t))
  const projectedX = x1 + clampedT * dx
  const projectedY = y1 + clampedT * dy
  return Math.hypot(pointX - projectedX, pointY - projectedY)
}

/** Distance from a point to an infinite line through (x1,y1)→(x2,y2). */
export const distanceToInfiniteLine = (
  pointX: number,
  pointY: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number => {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len === 0) return Math.hypot(pointX - x1, pointY - y1)
  // |cross product| / length = perpendicular distance
  return Math.abs((pointX - x1) * dy - (pointY - y1) * dx) / len
}

/**
 * Distance from a point to a ray starting at (x1,y1) and passing through
 * (x2,y2), extending to infinity beyond (x2,y2).
 */
export const distanceToRay = (
  pointX: number,
  pointY: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number => {
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx === 0 && dy === 0) {
    return Math.hypot(pointX - x1, pointY - y1)
  }

  const t = ((pointX - x1) * dx + (pointY - y1) * dy) / (dx * dx + dy * dy)
  // Ray: clamp to [0, +∞) — the ray starts at the first point
  const clampedT = Math.max(0, t)
  const projectedX = x1 + clampedT * dx
  const projectedY = y1 + clampedT * dy
  return Math.hypot(pointX - projectedX, pointY - projectedY)
}
