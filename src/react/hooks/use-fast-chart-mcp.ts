import { useEffect, useMemo } from 'react'

import { ChartMcpExecutor } from '../../mcp'
import type { ChartMCP, FastFinancialChartRef } from '../../types'

export const useFastChartMcp = (
  controller: FastFinancialChartRef | null,
): ChartMCP => {
  const adapter = useMemo(() => new ChartMcpExecutor(), [])

  useEffect(() => {
    adapter.bindController(controller)
  }, [adapter, controller])

  return adapter
}
