import { describe, expect, test } from 'bun:test'

import { createDefaultDrawingRegistry } from '../core/drawings/registry'
import type { CircleDrawing } from '../types'

const makeCircle = (): CircleDrawing => ({
  id: 'circle_1',
  type: 'circle',
  color: '#ffb020',
  lineWidth: 1.5,
  visible: true,
  points: [
    { ts: 100, price: 50 },
    { ts: 110, price: 45 },
  ],
})

describe('drawing registry circle resize behavior', () => {
  test('moving center handle shifts circle without changing radius', () => {
    const registry = createDefaultDrawingRegistry()
    const definition = registry.get('circle')
    expect(definition?.onHandleResize).toBeDefined()

    const updated = definition!.onHandleResize!(makeCircle(), 'start', {
      ts: 105,
      price: 52,
    })
    expect(updated.type).toBe('circle')

    if (updated.type !== 'circle') {
      throw new Error('Expected circle drawing')
    }

    expect(updated.points[0]).toEqual({ ts: 105, price: 52 })
    expect(updated.points[1]).toEqual({ ts: 115, price: 47 })
  })

  test('moving radius handle changes only radius point', () => {
    const registry = createDefaultDrawingRegistry()
    const definition = registry.get('circle')
    expect(definition?.onHandleResize).toBeDefined()

    const updated = definition!.onHandleResize!(makeCircle(), 'end', {
      ts: 120,
      price: 55,
    })
    expect(updated.type).toBe('circle')

    if (updated.type !== 'circle') {
      throw new Error('Expected circle drawing')
    }

    expect(updated.points[0]).toEqual({ ts: 100, price: 50 })
    expect(updated.points[1]).toEqual({ ts: 120, price: 55 })
  })
})
