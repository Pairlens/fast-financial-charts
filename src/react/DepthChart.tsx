import { useEffect, useRef } from 'react'

import {
  DARK_DEPTH_THEME,
  DepthChartEngine,
  resolveDepthChartTheme,
} from '../depth-chart'
import type {
  DepthChartData,
  DepthChartHoverInfo,
  DepthChartTheme,
  DepthChartThemeInput,
} from '../depth-chart'

export type DepthChartProps = {
  data: DepthChartData
  theme?: DepthChartThemeInput
  /** Fully resolved theme — takes precedence over `theme` if provided. */
  resolvedTheme?: DepthChartTheme
  onHover?: (info: DepthChartHoverInfo | null) => void
  className?: string
  style?: React.CSSProperties
}

export function DepthChart({
  data,
  theme,
  resolvedTheme,
  onHover,
  className,
  style,
}: DepthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<DepthChartEngine | null>(null)
  const onHoverRef = useRef(onHover)
  onHoverRef.current = onHover

  // Create engine once
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const initial =
      resolvedTheme ?? resolveDepthChartTheme(DARK_DEPTH_THEME, theme)
    const engine = new DepthChartEngine(el, initial)
    engine.onHover = (info) => onHoverRef.current?.(info)
    engineRef.current = engine

    return () => {
      engine.destroy()
      engineRef.current = null
    }
  }, []) // mount-only: engine is created once; theme/data updates flow through separate effects

  // Update data
  useEffect(() => {
    engineRef.current?.setData(data)
  }, [data])

  // Update theme
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (resolvedTheme) {
      engine.setFullTheme(resolvedTheme)
    } else if (theme) {
      engine.setTheme(theme)
    }
  }, [theme, resolvedTheme])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', ...style }}
    />
  )
}
