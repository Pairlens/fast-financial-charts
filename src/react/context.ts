import { createContext } from 'react'

import type {
  ChartSnapshotLite,
  FastFinancialChartRef,
} from '../types'

export type FastChartContextValue = {
  controller: FastFinancialChartRef | null
  snapshot: ChartSnapshotLite | null
}

export const FastChartContext = createContext<FastChartContextValue>({
  controller: null,
  snapshot: null,
})
