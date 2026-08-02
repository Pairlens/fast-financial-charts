import type {
  CustomSeriesBar,
  CustomSeriesInput,
  CustomSeriesInstance,
} from '../../types/custom-series'
import type { CustomSeriesRegistry } from './registry'

/**
 * Storage for custom series instances.
 * Manages add/remove/update operations and maintains computed bars.
 * Caches the visible-instance list to avoid allocations on the hot render/pointer path.
 */
export class CustomSeriesStore {
  private readonly instances = new Map<string, CustomSeriesInstance>()
  private visibleCache: Array<CustomSeriesInstance> = []
  private visibleDirty = true

  constructor(private readonly registry: CustomSeriesRegistry) {}

  /**
   * Add a new custom series instance.
   * Computes bars using the definition's `compute()` if available.
   */
  add(input: CustomSeriesInput): string {
    const definition = this.registry.get(input.type)
    const computedBars = definition?.compute
      ? definition.compute(input.bars)
      : input.bars

    const instance: CustomSeriesInstance = {
      ...input,
      visible: input.visible ?? true,
      color: input.color ?? definition?.defaultColor ?? '#2196F3',
      paneId: input.paneId ?? definition?.defaultPaneId ?? 'main',
      computedBars,
    }

    this.instances.set(input.id, instance)
    this.visibleDirty = true
    return input.id
  }

  /**
   * Remove a custom series instance by id.
   */
  remove(id: string): boolean {
    const removed = this.instances.delete(id)
    if (removed) this.visibleDirty = true
    return removed
  }

  /**
   * Get a custom series instance by id.
   */
  get(id: string): CustomSeriesInstance | undefined {
    return this.instances.get(id)
  }

  /**
   * Update bars for a custom series instance.
   * Re-runs `compute()` if the definition provides one.
   */
  updateBars(id: string, bars: Array<CustomSeriesBar>): boolean {
    const instance = this.instances.get(id)
    if (!instance) return false

    const definition = this.registry.get(instance.type)
    instance.bars = bars
    instance.computedBars = definition?.compute
      ? definition.compute(bars)
      : bars

    return true
  }

  /**
   * Update non-data properties of a custom series instance.
   */
  update(
    id: string,
    patch: Partial<
      Pick<CustomSeriesInput, 'label' | 'color' | 'visible' | 'paneId'>
    >,
  ): boolean {
    const instance = this.instances.get(id)
    if (!instance) return false

    if (patch.label !== undefined) instance.label = patch.label
    if (patch.color !== undefined) instance.color = patch.color
    if (patch.visible !== undefined) {
      instance.visible = patch.visible
      this.visibleDirty = true
    }
    if (patch.paneId !== undefined) instance.paneId = patch.paneId

    return true
  }

  /**
   * Get all instances.
   */
  all(): Array<CustomSeriesInstance> {
    return Array.from(this.instances.values())
  }

  /**
   * Get all visible instances. Returns a cached array — do not mutate.
   */
  visible(): ReadonlyArray<CustomSeriesInstance> {
    if (this.visibleDirty) {
      this.visibleCache.length = 0
      for (const instance of this.instances.values()) {
        if (instance.visible !== false) {
          this.visibleCache.push(instance)
        }
      }
      this.visibleDirty = false
    }
    return this.visibleCache
  }

  /**
   * Number of instances.
   */
  get size(): number {
    return this.instances.size
  }

  /**
   * Remove all instances.
   */
  clear(): void {
    this.instances.clear()
    this.visibleCache.length = 0
    this.visibleDirty = true
  }
}
