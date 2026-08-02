import { useRef } from 'react'

import type { FastFinancialChartRef } from '../../types'

export const useFastChartController = () => {
  return useRef<FastFinancialChartRef | null>(null)
}
