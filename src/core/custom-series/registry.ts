import type { CustomSeriesDefinition } from '../../types/custom-series'

/**
 * Registry for custom series type definitions.
 * Each definition is registered once by its `type` key (e.g. `custom:heatmap`).
 */
export class CustomSeriesRegistry {
  private readonly definitions = new Map<string, CustomSeriesDefinition>()

  /**
   * Register a custom series definition.
   * If a definition with the same type already exists, it is replaced.
   */
  register(definition: CustomSeriesDefinition): void {
    this.definitions.set(definition.type, definition)
  }

  /**
   * Unregister a custom series definition by type.
   */
  unregister(type: string): boolean {
    return this.definitions.delete(type)
  }

  /**
   * Get a definition by type.
   */
  get(type: string): CustomSeriesDefinition | undefined {
    return this.definitions.get(type)
  }

  /**
   * Check if a definition type is registered.
   */
  has(type: string): boolean {
    return this.definitions.has(type)
  }

  /**
   * Get all registered definitions.
   */
  all(): Array<CustomSeriesDefinition> {
    return Array.from(this.definitions.values())
  }

  /**
   * Number of registered definitions.
   */
  get size(): number {
    return this.definitions.size
  }

  /**
   * Remove all definitions.
   */
  clear(): void {
    this.definitions.clear()
  }
}
