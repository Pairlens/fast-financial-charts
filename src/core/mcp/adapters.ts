import { ChartMcpExecutor } from './executor'
import type { ChartMCP, FastFinancialChartRef } from '../../types'

export const createChartMcpAdapter = (
  ref?: FastFinancialChartRef | null,
): ChartMCP => {
  const executor = new ChartMcpExecutor()
  executor.bindController(ref ?? null)
  return executor
}
