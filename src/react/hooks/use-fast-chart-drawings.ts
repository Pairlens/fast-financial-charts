import type {
  DrawingToolType,
  FastFinancialChartRef,
} from '../../types'

export const useFastChartDrawings = (
  controller: FastFinancialChartRef | null,
) => {
  return {
    setTool: (tool: DrawingToolType | null) => {
      controller?.executeCommand({
        type: 'setActiveTool',
        payload: { tool },
      })
    },
    clear: () => {
      controller?.executeCommand({
        type: 'clearDrawings',
        payload: {},
      })
    },
    removeSelected: (id: string) => {
      controller?.executeCommand({
        type: 'removeDrawing',
        payload: { id },
      })
    },
  }
}
