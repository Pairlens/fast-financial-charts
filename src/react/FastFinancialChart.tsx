import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { FastChartContext } from './context'
import { FastFinancialChartCanvas } from './FastFinancialChartCanvas'
import type { ReactNode } from 'react'
import type {
  ChartContextMenuPayload,
  ChartEvent,
  ChartHudPayload,
  ChartSnapshotLite,
  FastFinancialChartProps,
  FastFinancialChartRef,
} from '../types'

const EMPTY_HUD: ChartHudPayload = {
  hoveredBar: null,
  hoveredDrawing: null,
  hoveredCustomBar: null,
  hoveredCustomSeriesId: null,
}

type HudListener = (payload: ChartHudPayload) => void

/**
 * Isolated HUD subtree. The engine emits hover/hudUpdate on every pointermove
 * (60–120/sec); holding that payload as state in FastFinancialChart re-rendered
 * the entire chart tree (canvas, top bar, HUD) per mouse move. This component
 * subscribes to a local listener set instead and coalesces updates to one
 * setState per animation frame, so pointer movement re-renders only the HUD.
 */
function HudLayer({
  subscribe,
  renderHud,
  resetKey,
}: {
  subscribe: (listener: HudListener) => () => void
  renderHud: (payload: ChartHudPayload) => ReactNode
  /** Primary series id — hovered-bar data from one symbol must not linger on the next. */
  resetKey: string | undefined
}) {
  const [hudPayload, setHudPayload] = useState<ChartHudPayload>(EMPTY_HUD)
  const pendingRef = useRef<ChartHudPayload | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const unsubscribe = subscribe((payload) => {
      pendingRef.current = payload
      frameRef.current ??= requestAnimationFrame(() => {
        frameRef.current = null
        if (pendingRef.current) {
          setHudPayload(pendingRef.current)
          pendingRef.current = null
        }
      })
    })
    return () => {
      unsubscribe()
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [subscribe])

  // Reset when the primary series changes — the engine only emits the next
  // hudUpdate on pointer movement, so without this the previous symbol's
  // OHLCV stays on screen after a pair switch.
  const prevResetKeyRef = useRef(resetKey)
  if (prevResetKeyRef.current !== resetKey) {
    prevResetKeyRef.current = resetKey
    pendingRef.current = null
    setHudPayload(EMPTY_HUD)
  }

  return (
    <div
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        right: 82,
        top: 8,
        zIndex: 40,
      }}
    >
      {renderHud(hudPayload)}
    </div>
  )
}

export const FastFinancialChart = forwardRef<
  FastFinancialChartRef,
  FastFinancialChartProps
>(function FastFinancialChart(props, ref) {
  const [snapshot, setSnapshot] = useState<ChartSnapshotLite | null>(null)
  const [contextMenuPayload, setContextMenuPayload] =
    useState<ChartContextMenuPayload | null>(null)

  const contextValue = useMemo(
    () => ({
      controller: null,
      snapshot,
    }),
    [snapshot],
  )

  // Hover/hudUpdate fan-out to the HUD subtree — deliberately NOT React state
  // here (see HudLayer). Listener set lives in a ref so handleEvent stays
  // referentially stable.
  const hudListenersRef = useRef(new Set<HudListener>())
  const subscribeHud = useCallback((listener: HudListener) => {
    hudListenersRef.current.add(listener)
    return () => {
      hudListenersRef.current.delete(listener)
    }
  }, [])

  const handleSnapshot = useCallback((next: ChartSnapshotLite) => {
    setSnapshot(next)
  }, [])

  // The engine captures handleEvent once at construction; read props through
  // a ref so events always see the latest render's props.
  const propsRef = useRef(props)
  propsRef.current = props

  const handleEvent = useCallback((event: ChartEvent) => {
    const currentProps = propsRef.current
    if (event.type === 'hover' || event.type === 'hudUpdate') {
      for (const listener of hudListenersRef.current) {
        listener(event.payload)
      }
    }

    if (event.type === 'contextmenu') {
      currentProps.onContextMenu?.(event.payload)
      if (currentProps.renderContextMenu) {
        setContextMenuPayload(event.payload)
      }
    }

    if (event.type === 'hudUpdate') {
      currentProps.onHudUpdate?.(event.payload)
    }

    currentProps.onEvent?.(event)
  }, [])

  return (
    <FastChartContext.Provider value={contextValue}>
      <div
        className={props.className}
        onPointerDown={() => {
          if (contextMenuPayload) {
            setContextMenuPayload(null)
          }
        }}
        style={{
          ...props.style,
          position: 'relative',
        }}
      >
        {props.renderTopBar && snapshot ? (
          <div style={{ position: 'absolute', left: 8, top: 8, zIndex: 40 }}>
            {props.renderTopBar({
              viewport: snapshot.viewport,
              indicators: snapshot.indicators,
              activeTool: snapshot.activeTool,
            })}
          </div>
        ) : null}

        <FastFinancialChartCanvas
          {...props}
          onDrawingsChange={props.onDrawingsChange}
          onEvent={handleEvent}
          onSnapshot={handleSnapshot}
          onViewportChange={props.onViewportChange}
          ref={ref}
        />

        {props.renderHud ? (
          <HudLayer
            subscribe={subscribeHud}
            renderHud={props.renderHud}
            resetKey={props.series?.[0]?.id}
          />
        ) : null}

        {props.renderContextMenu && contextMenuPayload ? (
          <div
            style={{
              position: 'absolute',
              left: contextMenuPayload.x,
              top: contextMenuPayload.y,
              zIndex: snapshot?.theme.menuZ ?? 50,
            }}
          >
            {props.renderContextMenu(contextMenuPayload)}
          </div>
        ) : null}
      </div>
    </FastChartContext.Provider>
  )
})
