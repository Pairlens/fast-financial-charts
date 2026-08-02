import { useMemo } from 'react'

import { resolveTheme } from '../../theme'
import type { ChartTheme, ChartThemeInput } from '../../types'

export const useFastChartTheme = (theme?: ChartThemeInput): ChartTheme => {
  return useMemo(() => resolveTheme(theme), [theme])
}
