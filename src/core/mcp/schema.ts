import { CHART_MCP_TOOLS } from './tools'
import type { MCPToolSchema } from '../../types'

export const createMcpToolSchemas = (): Array<MCPToolSchema> => {
  return CHART_MCP_TOOLS.slice()
}
