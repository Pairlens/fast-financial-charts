import type {
  PrimitiveZOrder,
  SeriesPrimitive,
  SeriesPrimitiveInput,
} from '../../types/primitives'

const createPrimitiveId = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `prim_${crypto.randomUUID().slice(0, 8)}`
  }

  return `prim_${Math.random().toString(36).slice(2, 10)}`
}

const Z_ORDERS: Array<PrimitiveZOrder> = [
  'behindGrid',
  'behindSeries',
  'afterSeries',
  'topmost',
]

/**
 * Registry for series primitives.
 * Manages add/remove operations and provides query methods for rendering.
 * Maintains pre-bucketed z-order caches to avoid allocations on the hot render path.
 */
export class PrimitiveRegistry {
  private readonly primitives = new Map<string, SeriesPrimitive>()

  /** Pre-bucketed visible primitives by z-order — rebuilt on mutation, O(1) lookup at render time */
  private readonly zOrderCache = new Map<
    PrimitiveZOrder,
    Array<SeriesPrimitive>
  >()

  /** Dirty flag to rebuild z-order cache lazily */
  private zOrderDirty = true

  constructor() {
    for (const z of Z_ORDERS) {
      this.zOrderCache.set(z, [])
    }
  }

  /**
   * Register a new primitive. Returns the assigned id.
   */
  add(input: SeriesPrimitiveInput): string {
    const id = input.id ?? createPrimitiveId()
    const primitive: SeriesPrimitive = {
      ...input,
      id,
      zOrder: input.zOrder ?? 'afterSeries',
      visible: input.visible ?? true,
    }
    this.primitives.set(id, primitive)
    this.zOrderDirty = true
    return id
  }

  /**
   * Remove a primitive by id. Returns true if it existed.
   */
  remove(id: string): boolean {
    const removed = this.primitives.delete(id)
    if (removed) this.zOrderDirty = true
    return removed
  }

  /**
   * Get a primitive by id.
   */
  get(id: string): SeriesPrimitive | undefined {
    return this.primitives.get(id)
  }

  /**
   * Get all primitives matching a specific z-order layer.
   * Only returns visible primitives. Returns a cached array — do not mutate.
   */
  byZOrder(zOrder: PrimitiveZOrder): ReadonlyArray<SeriesPrimitive> {
    if (this.zOrderDirty) this.rebuildZOrderCache()
    return this.zOrderCache.get(zOrder)!
  }

  /**
   * Get all registered primitives (visible or not).
   */
  all(): Array<SeriesPrimitive> {
    return Array.from(this.primitives.values())
  }

  /**
   * Get all visible primitives for a specific series.
   */
  bySeriesId(seriesId: string): Array<SeriesPrimitive> {
    const result: Array<SeriesPrimitive> = []
    for (const primitive of this.primitives.values()) {
      if (primitive.visible !== false && primitive.seriesId === seriesId) {
        result.push(primitive)
      }
    }
    return result
  }

  /**
   * Number of registered primitives.
   */
  get size(): number {
    return this.primitives.size
  }

  /**
   * Remove all primitives.
   */
  clear(): void {
    this.primitives.clear()
    this.zOrderDirty = true
  }

  private rebuildZOrderCache(): void {
    for (const z of Z_ORDERS) {
      this.zOrderCache.get(z)!.length = 0
    }
    for (const primitive of this.primitives.values()) {
      if (primitive.visible !== false) {
        const z = primitive.zOrder ?? 'afterSeries'
        this.zOrderCache.get(z)!.push(primitive)
      }
    }
    this.zOrderDirty = false
  }
}
