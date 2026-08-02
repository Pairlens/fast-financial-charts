import { describe, expect, test } from 'bun:test'

import { createDefaultDrawingRegistry } from '../core/drawings/registry'
import { GANN_FAN_LINES } from '../core/drawings/tools/gann-fan-tool'
import { DEFAULT_FIB_TIME_ZONE_LEVELS } from '../core/drawings/tools/fib-time-zone-tool'
import type {
  DrawingHitTestContext,
  FibTimeZoneDrawing,
  GannFanDrawing,
} from '../types'

const identityContext = (
  drawing: DrawingHitTestContext['drawing'],
  x: number,
  y: number,
): DrawingHitTestContext => ({
  drawing,
  x,
  y,
  bars: [],
  toX: (ts) => ts,
  toY: (price) => price,
})

describe('gann-fan tool', () => {
  const makeGannFan = (): GannFanDrawing => ({
    id: 'gann_1',
    type: 'gann-fan',
    color: '#ffb020',
    lineWidth: 1.5,
    visible: true,
    points: [
      { ts: 0, price: 0 },
      { ts: 100, price: 100 },
    ],
  })

  test('createDefault produces a two-point gann-fan drawing', () => {
    const registry = createDefaultDrawingRegistry()
    const definition = registry.get('gann-fan')
    expect(definition).toBeDefined()

    const drawing = definition!.createDefault({
      id: 'gann_new',
      point: { ts: 42, price: 7 },
    })
    expect(drawing.type).toBe('gann-fan')
    if (drawing.type !== 'gann-fan') throw new Error('Expected gann-fan')
    expect(drawing.points).toEqual([
      { ts: 42, price: 7 },
      { ts: 42, price: 7 },
    ])
  })

  test('uses the nine standard fan slopes', () => {
    expect(GANN_FAN_LINES.map((line) => line.ratio)).toEqual([
      8,
      4,
      3,
      2,
      1,
      1 / 2,
      1 / 3,
      1 / 4,
      1 / 8,
    ])
  })

  test('hitTest hits the 1/1 ray and misses far-off points', () => {
    const registry = createDefaultDrawingRegistry()
    const definition = registry.get('gann-fan')!

    // On the 1/1 ray (y = x with identity transforms)
    const hit = definition.hitTest(identityContext(makeGannFan(), 50, 50))
    expect(hit).not.toBeNull()
    expect(hit!.drawingId).toBe('gann_1')

    // Behind the apex — rays only extend forward
    const miss = definition.hitTest(identityContext(makeGannFan(), -60, -60))
    expect(miss).toBeNull()
  })

  test('onHandleResize moves only the targeted point', () => {
    const registry = createDefaultDrawingRegistry()
    const definition = registry.get('gann-fan')!
    const updated = definition.onHandleResize!(makeGannFan(), 'end', {
      ts: 200,
      price: 50,
    })
    if (updated.type !== 'gann-fan') throw new Error('Expected gann-fan')
    expect(updated.points[0]).toEqual({ ts: 0, price: 0 })
    expect(updated.points[1]).toEqual({ ts: 200, price: 50 })
  })
})

describe('fib-time-zone tool', () => {
  const makeFibTimeZone = (): FibTimeZoneDrawing => ({
    id: 'ftz_1',
    type: 'fib-time-zone',
    color: '#ffb020',
    lineWidth: 1.5,
    visible: true,
    points: [
      { ts: 0, price: 0 },
      { ts: 10, price: 20 },
    ],
    levels: DEFAULT_FIB_TIME_ZONE_LEVELS,
  })

  test('createDefault seeds the fibonacci counts', () => {
    const registry = createDefaultDrawingRegistry()
    const definition = registry.get('fib-time-zone')
    expect(definition).toBeDefined()

    const drawing = definition!.createDefault({
      id: 'ftz_new',
      point: { ts: 5, price: 1 },
    })
    expect(drawing.type).toBe('fib-time-zone')
    if (drawing.type !== 'fib-time-zone') {
      throw new Error('Expected fib-time-zone')
    }
    expect(drawing.levels).toEqual([0, 1, 2, 3, 5, 8, 13, 21, 34, 55])
  })

  test('hitTest hits fibonacci-count verticals and misses in between', () => {
    const registry = createDefaultDrawingRegistry()
    const definition = registry.get('fib-time-zone')!

    // Line at count 8 → x = 0 + 8 * 10 = 80 (identity transforms)
    const hit = definition.hitTest(identityContext(makeFibTimeZone(), 80, 500))
    expect(hit).not.toBeNull()
    expect(hit!.drawingId).toBe('ftz_1')

    // x = 65 sits between counts 5 (x=50) and 8 (x=80)
    const miss = definition.hitTest(identityContext(makeFibTimeZone(), 65, 500))
    expect(miss).toBeNull()
  })

  test('onShift moves both anchor points', () => {
    const registry = createDefaultDrawingRegistry()
    const definition = registry.get('fib-time-zone')!
    const updated = definition.onShift!(makeFibTimeZone(), 5, -2)
    if (updated.type !== 'fib-time-zone') {
      throw new Error('Expected fib-time-zone')
    }
    expect(updated.points[0]).toEqual({ ts: 5, price: -2 })
    expect(updated.points[1]).toEqual({ ts: 15, price: 18 })
  })
})

describe('wave 2 registrations', () => {
  test('all six new tools are registered with expected point counts', () => {
    const registry = createDefaultDrawingRegistry()
    expect(registry.get('gann-fan')).toBeDefined()
    expect(registry.get('gann-box')).toBeDefined()
    expect(registry.get('fib-time-zone')).toBeDefined()
    expect(registry.get('fib-wedge')?.pointCount).toBe(3)
    expect(registry.get('elliott-wave')?.pointCount).toBe(0)
    expect(registry.get('price-date-range')).toBeDefined()
  })
})
