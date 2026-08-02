import { describe, expect, test } from 'bun:test'

import { PaneManager } from '../core/engine/pane-manager'

describe('PaneManager', () => {
  test('starts with no panes', () => {
    const pm = new PaneManager()
    expect(pm.getPaneCount()).toBe(0)
    expect(pm.getPanes()).toHaveLength(0)
  })

  test('addPane creates a pane with defaults', () => {
    const pm = new PaneManager()
    const id = pm.addPane()
    expect(id).toBeTruthy()
    expect(pm.getPaneCount()).toBe(1)
    const pane = pm.getPaneById(id)
    expect(pane).toBeDefined()
    expect(pane!.stretchFactor).toBe(1)
    expect(pane!.minHeight).toBe(60)
  })

  test('addPane with custom id and config', () => {
    const pm = new PaneManager()
    const id = pm.addPane({
      id: 'rsi-pane',
      stretchFactor: 2,
      minHeight: 100,
      label: 'RSI',
    })
    expect(id).toBe('rsi-pane')
    const pane = pm.getPaneById('rsi-pane')
    expect(pane!.stretchFactor).toBe(2)
    expect(pane!.minHeight).toBe(100)
    expect(pane!.label).toBe('RSI')
  })

  test('addPane with duplicate id returns existing id', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'p1' })
    const id2 = pm.addPane({ id: 'p1' })
    expect(id2).toBe('p1')
    expect(pm.getPaneCount()).toBe(1)
  })

  test('removePane removes existing pane', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'p1' })
    pm.addPane({ id: 'p2' })
    expect(pm.getPaneCount()).toBe(2)

    const removed = pm.removePane('p1')
    expect(removed).toBe(true)
    expect(pm.getPaneCount()).toBe(1)
    expect(pm.getPaneById('p1')).toBeUndefined()
  })

  test('removePane returns false for non-existent pane', () => {
    const pm = new PaneManager()
    expect(pm.removePane('nonexistent')).toBe(false)
  })

  test('swapPanes swaps two panes', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'first', label: 'First' })
    pm.addPane({ id: 'second', label: 'Second' })
    pm.addPane({ id: 'third', label: 'Third' })

    const swapped = pm.swapPanes('first', 'third')
    expect(swapped).toBe(true)

    const panes = pm.getPanes()
    expect(panes[0].id).toBe('third')
    expect(panes[1].id).toBe('second')
    expect(panes[2].id).toBe('first')
  })

  test('swapPanes returns false for invalid ids', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'p1' })
    expect(pm.swapPanes('p1', 'nonexistent')).toBe(false)
    expect(pm.swapPanes('p1', 'p1')).toBe(false)
  })

  test('updatePane modifies pane config', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'p1', stretchFactor: 1, label: 'Old' })

    const updated = pm.updatePane('p1', { stretchFactor: 3, label: 'New' })
    expect(updated).toBe(true)

    const pane = pm.getPaneById('p1')
    expect(pane!.stretchFactor).toBe(3)
    expect(pane!.label).toBe('New')
  })

  test('updatePane returns false for non-existent pane', () => {
    const pm = new PaneManager()
    expect(pm.updatePane('nonexistent', { label: 'X' })).toBe(false)
  })

  test('setPanes replaces all panes', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'p1' })
    pm.addPane({ id: 'p2' })

    pm.setPanes([
      { id: 'a', stretchFactor: 2 },
      { id: 'b', stretchFactor: 1 },
      { id: 'c', stretchFactor: 1 },
    ])

    expect(pm.getPaneCount()).toBe(3)
    expect(pm.getPanes()[0].id).toBe('a')
    expect(pm.getPanes()[0].stretchFactor).toBe(2)
  })
})

describe('PaneManager layout computation', () => {
  test('no panes returns full height for main', () => {
    const pm = new PaneManager()
    const layout = pm.computeLayout(800)

    expect(layout.mainHeight).toBe(800)
    expect(layout.userPanesHeight).toBe(0)
    expect(layout.hasUserPanes).toBe(false)
    expect(layout.userPanes).toHaveLength(0)
    expect(layout.separatorPositions).toHaveLength(0)
  })

  test('single pane gets all user pane height', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'p1' })

    const layout = pm.computeLayout(1000)
    expect(layout.hasUserPanes).toBe(true)
    expect(layout.userPanes).toHaveLength(1)
    expect(layout.userPanes[0].id).toBe('p1')
    expect(layout.userPanes[0].height).toBeGreaterThanOrEqual(60)
    expect(layout.mainHeight + layout.userPanesHeight).toBeLessThanOrEqual(1000)
    expect(layout.separatorPositions).toHaveLength(0)
  })

  test('two panes split proportionally by stretch factor', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'a', stretchFactor: 2 })
    pm.addPane({ id: 'b', stretchFactor: 1 })

    const layout = pm.computeLayout(900)
    expect(layout.userPanes).toHaveLength(2)

    const heightA = layout.userPanes[0].height
    const heightB = layout.userPanes[1].height

    // With stretch 2:1, pane A should be roughly twice pane B
    expect(heightA).toBeGreaterThan(heightB)
    expect(Math.abs(heightA / heightB - 2)).toBeLessThan(0.5) // allow rounding tolerance

    // One separator between pane 0 and pane 1
    expect(layout.separatorPositions).toHaveLength(1)
    expect(layout.separatorPositions[0]).toBe(
      layout.userPanes[0].top + layout.userPanes[0].height,
    )
  })

  test('three panes produce two separator positions', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'a' })
    pm.addPane({ id: 'b' })
    pm.addPane({ id: 'c' })

    const layout = pm.computeLayout(600)
    expect(layout.separatorPositions).toHaveLength(2)
    expect(layout.userPanes[0].top).toBe(0)
    expect(layout.userPanes[1].top).toBe(layout.separatorPositions[0])
    expect(layout.userPanes[2].top).toBe(layout.separatorPositions[1])
  })

  test('minHeight is enforced', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'big', stretchFactor: 100 })
    pm.addPane({ id: 'tiny', stretchFactor: 1, minHeight: 80 })

    const layout = pm.computeLayout(800)
    expect(layout.userPanes[1].height).toBeGreaterThanOrEqual(80)
  })

  test('getLayout returns cached result after computeLayout', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'p1' })
    expect(pm.getLayout()).toBeNull()

    pm.computeLayout(500)
    expect(pm.getLayout()).not.toBeNull()
    expect(pm.getLayout()!.userPanes).toHaveLength(1)
  })

  test('layout is invalidated after mutation', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'p1' })
    pm.computeLayout(500)
    expect(pm.getLayout()).not.toBeNull()

    pm.addPane({ id: 'p2' })
    // After addPane the cache should be invalidated
    expect(pm.getLayout()).toBeNull()
  })

  test('userPanesRatio is clamped', () => {
    const pm = new PaneManager()
    pm.setUserPanesRatio(0.01) // below minimum
    expect(pm.getUserPanesRatio()).toBe(0.12)

    pm.setUserPanesRatio(0.99) // above maximum
    expect(pm.getUserPanesRatio()).toBe(0.65)

    pm.setUserPanesRatio(0.4) // in range
    expect(pm.getUserPanesRatio()).toBe(0.4)
  })
})

describe('PaneManager distributeHeights overflow', () => {
  test('total minHeight exceeds available height — distributes proportionally', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'a', minHeight: 100 })
    pm.addPane({ id: 'b', minHeight: 100 })
    pm.addPane({ id: 'c', minHeight: 100 })

    // Only 150px for 300px of combined minHeight
    pm.setUserPanesRatio(1.0) // Force all height to user panes
    const layout = pm.computeLayout(150)

    // Total user pane height should not exceed available height
    const totalUserHeight = layout.userPanes.reduce(
      (sum, p) => sum + p.height,
      0,
    )
    expect(totalUserHeight).toBeLessThanOrEqual(layout.userPanesHeight)
    // Each pane gets at least 1px
    for (const pane of layout.userPanes) {
      expect(pane.height).toBeGreaterThanOrEqual(1)
    }
  })

  test('heights sum exactly to available budget after rounding', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'a', stretchFactor: 1 })
    pm.addPane({ id: 'b', stretchFactor: 1 })
    pm.addPane({ id: 'c', stretchFactor: 1 })

    const layout = pm.computeLayout(1000)
    const totalHeight = layout.userPanes.reduce((sum, p) => sum + p.height, 0)
    // Heights should sum to exactly userPanesHeight (no overshoot or undershoot)
    expect(totalHeight).toBe(layout.userPanesHeight)
  })

  test('pane offsets (top) are contiguous', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'a', stretchFactor: 3 })
    pm.addPane({ id: 'b', stretchFactor: 2 })
    pm.addPane({ id: 'c', stretchFactor: 1 })

    const layout = pm.computeLayout(900)
    for (let i = 1; i < layout.userPanes.length; i++) {
      expect(layout.userPanes[i].top).toBe(
        layout.userPanes[i - 1].top + layout.userPanes[i - 1].height,
      )
    }
  })
})

describe('PaneManager separator drag', () => {
  test('handleSeparatorDrag adjusts stretch factors of adjacent panes', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'top', stretchFactor: 1 })
    pm.addPane({ id: 'bottom', stretchFactor: 1 })

    const layout = pm.computeLayout(800)
    const initialTopHeight = layout.userPanes[0].height
    const initialBottomHeight = layout.userPanes[1].height

    // Drag separator 30px down (expand top, shrink bottom)
    pm.handleSeparatorDrag(0, 30, layout.userPanesHeight)

    const panes = pm.getPanes()
    // Top pane stretch should be larger than bottom now
    expect(panes[0].stretchFactor).toBeGreaterThan(panes[1].stretchFactor)
  })

  test('handleSeparatorDrag with invalid index is a no-op', () => {
    const pm = new PaneManager()
    pm.addPane({ id: 'p1' })
    pm.computeLayout(800)

    // No crash on invalid index
    pm.handleSeparatorDrag(-1, 10, 200)
    pm.handleSeparatorDrag(5, 10, 200)
    expect(pm.getPaneCount()).toBe(1)
  })
})
