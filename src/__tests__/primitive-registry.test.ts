import { describe, expect, test } from 'bun:test'

import { PrimitiveRegistry } from '../core/primitives/registry'

describe('PrimitiveRegistry', () => {
  test('starts empty', () => {
    const reg = new PrimitiveRegistry()
    expect(reg.size).toBe(0)
    expect(reg.all()).toHaveLength(0)
  })

  test('add creates a primitive with auto-generated id', () => {
    const reg = new PrimitiveRegistry()
    const id = reg.add({ seriesId: 's1' })
    expect(id).toBeTruthy()
    expect(id.startsWith('prim_')).toBe(true)
    expect(reg.size).toBe(1)
    const p = reg.get(id)
    expect(p).toBeDefined()
    expect(p!.seriesId).toBe('s1')
    expect(p!.zOrder).toBe('afterSeries') // default
    expect(p!.visible).toBe(true) // default
  })

  test('add with custom id', () => {
    const reg = new PrimitiveRegistry()
    const id = reg.add({ id: 'my-prim', seriesId: 's1' })
    expect(id).toBe('my-prim')
    expect(reg.get('my-prim')).toBeDefined()
  })

  test('add with custom zOrder and visible=false', () => {
    const reg = new PrimitiveRegistry()
    const id = reg.add({ seriesId: 's1', zOrder: 'behindGrid', visible: false })
    const p = reg.get(id)!
    expect(p.zOrder).toBe('behindGrid')
    expect(p.visible).toBe(false)
  })

  test('remove deletes a primitive', () => {
    const reg = new PrimitiveRegistry()
    const id = reg.add({ seriesId: 's1' })
    expect(reg.remove(id)).toBe(true)
    expect(reg.size).toBe(0)
    expect(reg.get(id)).toBeUndefined()
  })

  test('remove returns false for non-existent id', () => {
    const reg = new PrimitiveRegistry()
    expect(reg.remove('nonexistent')).toBe(false)
  })

  test('byZOrder returns only visible primitives of the given layer', () => {
    const reg = new PrimitiveRegistry()
    reg.add({ id: 'a', seriesId: 's1', zOrder: 'behindGrid' })
    reg.add({ id: 'b', seriesId: 's1', zOrder: 'afterSeries' })
    reg.add({ id: 'c', seriesId: 's1', zOrder: 'behindGrid', visible: false })
    reg.add({ id: 'd', seriesId: 's1', zOrder: 'topmost' })

    const behindGrid = reg.byZOrder('behindGrid')
    expect(behindGrid).toHaveLength(1) // 'c' is invisible
    expect(behindGrid[0].id).toBe('a')

    const afterSeries = reg.byZOrder('afterSeries')
    expect(afterSeries).toHaveLength(1)
    expect(afterSeries[0].id).toBe('b')

    const topmost = reg.byZOrder('topmost')
    expect(topmost).toHaveLength(1)
    expect(topmost[0].id).toBe('d')

    const behindSeries = reg.byZOrder('behindSeries')
    expect(behindSeries).toHaveLength(0)
  })

  test('byZOrder uses default zOrder afterSeries', () => {
    const reg = new PrimitiveRegistry()
    reg.add({ id: 'no-zorder', seriesId: 's1' }) // no explicit zOrder
    const result = reg.byZOrder('afterSeries')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('no-zorder')
  })

  test('bySeriesId returns only visible primitives for a series', () => {
    const reg = new PrimitiveRegistry()
    reg.add({ id: 'a', seriesId: 's1' })
    reg.add({ id: 'b', seriesId: 's2' })
    reg.add({ id: 'c', seriesId: 's1', visible: false })

    const s1 = reg.bySeriesId('s1')
    expect(s1).toHaveLength(1)
    expect(s1[0].id).toBe('a')

    const s2 = reg.bySeriesId('s2')
    expect(s2).toHaveLength(1)
    expect(s2[0].id).toBe('b')
  })

  test('all returns all primitives including invisible', () => {
    const reg = new PrimitiveRegistry()
    reg.add({ id: 'a', seriesId: 's1', visible: false })
    reg.add({ id: 'b', seriesId: 's1' })
    expect(reg.all()).toHaveLength(2)
  })

  test('clear removes everything', () => {
    const reg = new PrimitiveRegistry()
    reg.add({ seriesId: 's1' })
    reg.add({ seriesId: 's2' })
    reg.clear()
    expect(reg.size).toBe(0)
    expect(reg.all()).toHaveLength(0)
  })
})
