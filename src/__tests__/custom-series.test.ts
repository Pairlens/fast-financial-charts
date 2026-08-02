import { describe, expect, test } from 'bun:test'

import { CustomSeriesRegistry } from '../core/custom-series/registry'
import { CustomSeriesStore } from '../core/custom-series/store'
import type {
  CustomSeriesBar,
  CustomSeriesDefinition,
} from '../types/custom-series'

describe('CustomSeriesRegistry', () => {
  test('starts empty', () => {
    const reg = new CustomSeriesRegistry()
    expect(reg.size).toBe(0)
    expect(reg.all()).toHaveLength(0)
  })

  test('register and get a definition', () => {
    const reg = new CustomSeriesRegistry()
    const def: CustomSeriesDefinition = {
      type: 'custom:heatmap',
      label: 'Heatmap',
      renderer: () => {},
    }
    reg.register(def)
    expect(reg.size).toBe(1)
    expect(reg.has('custom:heatmap')).toBe(true)
    expect(reg.get('custom:heatmap')).toBe(def)
  })

  test('unregister removes definition', () => {
    const reg = new CustomSeriesRegistry()
    reg.register({ type: 'custom:test', renderer: () => {} })
    expect(reg.unregister('custom:test')).toBe(true)
    expect(reg.size).toBe(0)
    expect(reg.has('custom:test')).toBe(false)
  })

  test('unregister returns false for non-existent', () => {
    const reg = new CustomSeriesRegistry()
    expect(reg.unregister('custom:nonexistent')).toBe(false)
  })

  test('re-register replaces existing', () => {
    const reg = new CustomSeriesRegistry()
    const def1: CustomSeriesDefinition = {
      type: 'custom:test',
      label: 'V1',
      renderer: () => {},
    }
    const def2: CustomSeriesDefinition = {
      type: 'custom:test',
      label: 'V2',
      renderer: () => {},
    }
    reg.register(def1)
    reg.register(def2)
    expect(reg.size).toBe(1)
    expect(reg.get('custom:test')!.label).toBe('V2')
  })

  test('clear removes all', () => {
    const reg = new CustomSeriesRegistry()
    reg.register({ type: 'custom:a', renderer: () => {} })
    reg.register({ type: 'custom:b', renderer: () => {} })
    reg.clear()
    expect(reg.size).toBe(0)
  })
})

describe('CustomSeriesStore', () => {
  function createRegistryWithDef(
    computeFn?: (bars: Array<CustomSeriesBar>) => Array<CustomSeriesBar>,
  ) {
    const reg = new CustomSeriesRegistry()
    reg.register({
      type: 'custom:test',
      label: 'Test',
      renderer: () => {},
      defaultColor: '#FF0000',
      compute: computeFn,
    })
    return reg
  }

  test('add creates an instance with defaults', () => {
    const reg = createRegistryWithDef()
    const store = new CustomSeriesStore(reg)
    const id = store.add({
      id: 'inst1',
      type: 'custom:test',
      bars: [{ ts: 100 }, { ts: 200 }],
    })
    expect(id).toBe('inst1')
    expect(store.size).toBe(1)
    const inst = store.get('inst1')!
    expect(inst.color).toBe('#FF0000') // from definition defaultColor
    expect(inst.visible).toBe(true)
    expect(inst.paneId).toBe('main')
    expect(inst.bars).toHaveLength(2)
    expect(inst.computedBars).toHaveLength(2) // no compute fn = same as bars
  })

  test('add with compute function processes bars', () => {
    const reg = createRegistryWithDef((bars) =>
      bars.map((b) => ({ ...b, doubled: b.ts * 2 })),
    )
    const store = new CustomSeriesStore(reg)
    store.add({
      id: 'inst1',
      type: 'custom:test',
      bars: [{ ts: 100 }, { ts: 200 }],
    })
    const inst = store.get('inst1')!
    expect(inst.computedBars[0].doubled).toBe(200)
    expect(inst.computedBars[1].doubled).toBe(400)
  })

  test('remove deletes an instance', () => {
    const reg = createRegistryWithDef()
    const store = new CustomSeriesStore(reg)
    store.add({ id: 'inst1', type: 'custom:test', bars: [] })
    expect(store.remove('inst1')).toBe(true)
    expect(store.size).toBe(0)
    expect(store.get('inst1')).toBeUndefined()
  })

  test('remove returns false for non-existent', () => {
    const reg = createRegistryWithDef()
    const store = new CustomSeriesStore(reg)
    expect(store.remove('nonexistent')).toBe(false)
  })

  test('updateBars replaces bars and recomputes', () => {
    const reg = createRegistryWithDef((bars) =>
      bars.map((b) => ({ ...b, processed: true })),
    )
    const store = new CustomSeriesStore(reg)
    store.add({ id: 'inst1', type: 'custom:test', bars: [{ ts: 100 }] })

    const updated = store.updateBars('inst1', [
      { ts: 300 },
      { ts: 400 },
      { ts: 500 },
    ])
    expect(updated).toBe(true)

    const inst = store.get('inst1')!
    expect(inst.bars).toHaveLength(3)
    expect(inst.computedBars).toHaveLength(3)
    expect(inst.computedBars[0].processed).toBe(true)
    expect(inst.computedBars[0].ts).toBe(300)
  })

  test('updateBars returns false for non-existent', () => {
    const reg = createRegistryWithDef()
    const store = new CustomSeriesStore(reg)
    expect(store.updateBars('nonexistent', [])).toBe(false)
  })

  test('update patches properties', () => {
    const reg = createRegistryWithDef()
    const store = new CustomSeriesStore(reg)
    store.add({ id: 'inst1', type: 'custom:test', bars: [], color: '#00FF00' })

    const updated = store.update('inst1', {
      color: '#0000FF',
      visible: false,
      label: 'Updated',
    })
    expect(updated).toBe(true)

    const inst = store.get('inst1')!
    expect(inst.color).toBe('#0000FF')
    expect(inst.visible).toBe(false)
    expect(inst.label).toBe('Updated')
  })

  test('update returns false for non-existent', () => {
    const reg = createRegistryWithDef()
    const store = new CustomSeriesStore(reg)
    expect(store.update('nonexistent', { label: 'X' })).toBe(false)
  })

  test('visible returns only visible instances', () => {
    const reg = createRegistryWithDef()
    const store = new CustomSeriesStore(reg)
    store.add({ id: 'a', type: 'custom:test', bars: [] })
    store.add({ id: 'b', type: 'custom:test', bars: [], visible: false })
    store.add({ id: 'c', type: 'custom:test', bars: [] })

    const vis = store.visible()
    expect(vis).toHaveLength(2)
    expect(vis.map((i) => i.id)).toEqual(['a', 'c'])
  })

  test('all returns all instances', () => {
    const reg = createRegistryWithDef()
    const store = new CustomSeriesStore(reg)
    store.add({ id: 'a', type: 'custom:test', bars: [], visible: false })
    store.add({ id: 'b', type: 'custom:test', bars: [] })
    expect(store.all()).toHaveLength(2)
  })

  test('clear removes everything', () => {
    const reg = createRegistryWithDef()
    const store = new CustomSeriesStore(reg)
    store.add({ id: 'a', type: 'custom:test', bars: [] })
    store.add({ id: 'b', type: 'custom:test', bars: [] })
    store.clear()
    expect(store.size).toBe(0)
    expect(store.all()).toHaveLength(0)
  })

  test('add with unregistered type uses fallback defaults', () => {
    const reg = new CustomSeriesRegistry() // no definitions registered
    const store = new CustomSeriesStore(reg)
    store.add({ id: 'x', type: 'custom:unknown', bars: [{ ts: 1 }] })
    const inst = store.get('x')!
    expect(inst.color).toBe('#2196F3') // fallback default
    expect(inst.paneId).toBe('main')
    expect(inst.computedBars).toEqual([{ ts: 1 }]) // no compute, raw bars
  })
})
