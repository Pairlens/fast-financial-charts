import type { IndicatorDefinition, IndicatorInstance } from '../../types'

export type IndicatorRegistry = {
  register: (definition: IndicatorDefinition) => void
  get: (type: IndicatorInstance['type']) => IndicatorDefinition | undefined
  all: () => Array<IndicatorDefinition>
}
