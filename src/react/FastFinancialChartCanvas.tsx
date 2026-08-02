import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react'

import { ChartEngine } from '../index'
import type {
  ChartSnapshotLite,
  FastFinancialChartProps,
  FastFinancialChartRef,
  SeriesReplaceUpdate,
  SnapshotOptions,
  TickUpdate,
} from '../types'

type FastFinancialChartCanvasProps = FastFinancialChartProps & {
  onSnapshot?: (snapshot: ChartSnapshotLite) => void
}

// Memoized: the parent re-renders on every snapshot (~8/sec) and those
// commits must not reconcile the canvas subtree. All engine prop updates are
// diffed inside the effect below, so a bailed-out render loses nothing —
// callers just need referentially stable callbacks for the memo to hold.
export const FastFinancialChartCanvas = memo(
  forwardRef<FastFinancialChartRef, FastFinancialChartCanvasProps>(
    function FastFinancialChartCanvas(
      {
        onSnapshot,
        onReady,
        onEvent,
        onViewportChange,
        onDrawingsChange,
        ...props
      },
      ref,
    ) {
      const containerRef = useRef<HTMLDivElement>(null)
      const gridCanvasRef = useRef<HTMLCanvasElement>(null)
      const mainCanvasRef = useRef<HTMLCanvasElement>(null)
      const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
      const uiCanvasRef = useRef<HTMLCanvasElement>(null)
      const indicatorCanvasRef = useRef<HTMLCanvasElement>(null)
      const indicatorUiCanvasRef = useRef<HTMLCanvasElement>(null)
      const indicatorContainerRef = useRef<HTMLDivElement>(null)
      const engineRef = useRef<ChartEngine | null>(null)

      // Keep the latest callback props in a ref so the engine (constructed once)
      // always delegates to the current closures instead of first-render ones.
      const callbacksRef = useRef({
        onSnapshot,
        onEvent,
        onViewportChange,
        onDrawingsChange,
      })
      callbacksRef.current.onSnapshot = onSnapshot
      callbacksRef.current.onEvent = onEvent
      callbacksRef.current.onViewportChange = onViewportChange
      callbacksRef.current.onDrawingsChange = onDrawingsChange

      useLayoutEffect(() => {
        if (
          !containerRef.current ||
          !gridCanvasRef.current ||
          !mainCanvasRef.current ||
          !overlayCanvasRef.current ||
          !uiCanvasRef.current ||
          !indicatorCanvasRef.current ||
          !indicatorUiCanvasRef.current ||
          !indicatorContainerRef.current
        ) {
          return
        }

        const engine = new ChartEngine({
          elements: {
            container: containerRef.current,
            gridCanvas: gridCanvasRef.current,
            mainCanvas: mainCanvasRef.current,
            overlayCanvas: overlayCanvasRef.current,
            uiCanvas: uiCanvasRef.current,
            indicatorCanvas: indicatorCanvasRef.current,
            indicatorUiCanvas: indicatorUiCanvasRef.current,
            indicatorContainer: indicatorContainerRef.current,
          },
          props,
          callbacks: {
            onSnapshot: (snapshot) =>
              callbacksRef.current.onSnapshot?.(snapshot),
            onEvent: (event) => callbacksRef.current.onEvent?.(event),
            onViewportChange: (viewport) =>
              callbacksRef.current.onViewportChange?.(viewport),
            onDrawingsChange: (drawings, reason) =>
              callbacksRef.current.onDrawingsChange?.(drawings, reason),
          },
        })

        engineRef.current = engine
        onReady?.({
          applyTick: (update) => {
            engine.applyTick(update)
          },
          appendBar: (update) => {
            engine.appendBar(update)
          },
          setSeries: (update) => {
            engine.setSeries(update)
          },
          applyTicks: (updates) => {
            engine.applyTicks(updates)
          },
          executeCommand: (command) => engine.executeCommand(command),
          getSnapshot: (options?: SnapshotOptions) =>
            engine.getSnapshot(options),
          getMcpSchema: () => engine.getMcpSchema(),
          subscribe: (listener) => engine.subscribe(listener),
          getCapabilities: () => engine.getCapabilities(),
          fitContent: () => engine.fitContent(),
          scrollToPosition: (barIndex, animated) =>
            engine.scrollToPosition(barIndex, animated),
          priceToCoordinate: (price) => engine.priceToCoordinate(price),
          coordinateToPrice: (y) => engine.coordinateToPrice(y),
          timeToCoordinate: (ts) => engine.timeToCoordinate(ts),
          coordinateToTime: (x) => engine.coordinateToTime(x),
          data: (seriesId) => engine.data(seriesId),
          dataByIndex: (index, seriesId) => engine.dataByIndex(index, seriesId),
          pop: (count, seriesId) => engine.pop(count, seriesId),
          seriesOrder: () => engine.seriesOrder(),
          setSeriesOrder: (orderedIds) => engine.setSeriesOrder(orderedIds),
          takeScreenshot: (options) => engine.takeScreenshot(options),
          addPane: (input) => engine.addPane(input),
          removePane: (paneId) => engine.removePane(paneId),
          swapPanes: (paneId1, paneId2) => engine.swapPanes(paneId1, paneId2),
          getPaneLayout: () => engine.getPaneLayout(),
          addPrimitive: (input) => engine.addPrimitive(input),
          removePrimitive: (id) => engine.removePrimitive(id),
          listPrimitives: () => engine.listPrimitives(),
          addCustomSeries: (input) => engine.addCustomSeries(input),
          removeCustomSeries: (id) => engine.removeCustomSeries(id),
          updateCustomSeriesData: (id, bars) =>
            engine.updateCustomSeriesData(id, bars),
          listCustomSeries: () => engine.listCustomSeries(),
          registerIndicatorDefinition: (definition) =>
            engine.registerIndicatorDefinition(definition),
          unregisterIndicatorDefinition: (type) =>
            engine.unregisterIndicatorDefinition(type),
        })

        return () => {
          engine.dispose()
          engineRef.current = null
        }
      }, [])

      const prevPropsRef = useRef(props)
      useEffect(() => {
        const prev = prevPropsRef.current
        // Shallow-compare the rest-spread props to avoid calling updateProps
        // on every render (rest-spread creates a new object reference each time)
        const prevKeys = Object.keys(prev) as Array<keyof typeof prev>
        const nextKeys = Object.keys(props) as Array<keyof typeof props>
        if (
          prevKeys.length !== nextKeys.length ||
          nextKeys.some((key) => props[key] !== prev[key])
        ) {
          prevPropsRef.current = props
          engineRef.current?.updateProps(props)
        }
      })

      useImperativeHandle(
        ref,
        () => ({
          applyTick: (update: TickUpdate) => {
            engineRef.current?.applyTick(update)
          },
          applyTicks: (updates) => {
            engineRef.current?.applyTicks(updates)
          },
          appendBar: (update) => {
            engineRef.current?.appendBar(update)
          },
          setSeries: (update: SeriesReplaceUpdate) => {
            engineRef.current?.setSeries(update)
          },
          executeCommand: (command) => {
            const engine = engineRef.current
            if (!engine) {
              return {
                ok: false,
                error: 'Chart engine not initialized',
              }
            }

            return engine.executeCommand(command)
          },
          getSnapshot: (options?: SnapshotOptions) => {
            const engine = engineRef.current
            if (!engine) {
              throw new Error('Chart engine not initialized')
            }

            return engine.getSnapshot(options)
          },
          getMcpSchema: () => {
            return engineRef.current?.getMcpSchema() ?? []
          },
          subscribe: (listener) => {
            return engineRef.current?.subscribe(listener) ?? (() => undefined)
          },
          getCapabilities: () => {
            return (
              engineRef.current?.getCapabilities() ?? {
                chartTypes: ['candles', 'heikinAshi', 'line', 'area'],
                compareModes: ['indexed', 'price', 'dual-axis'],
                priceScaleModes: [
                  'normal',
                  'logarithmic',
                  'percentage',
                  'indexedTo100',
                ],
                drawingTools: [
                  'select',
                  'line',
                  'rectangle',
                  'circle',
                  'hline',
                  'vline',
                ],
                indicatorTypes: [],
                mcpTools: [],
              }
            )
          },
          fitContent: () => {
            engineRef.current?.fitContent()
          },
          scrollToPosition: (barIndex, animated) => {
            engineRef.current?.scrollToPosition(barIndex, animated)
          },
          priceToCoordinate: (price) => {
            return engineRef.current?.priceToCoordinate(price) ?? null
          },
          coordinateToPrice: (y) => {
            return engineRef.current?.coordinateToPrice(y) ?? null
          },
          timeToCoordinate: (ts) => {
            return engineRef.current?.timeToCoordinate(ts) ?? null
          },
          coordinateToTime: (x) => {
            return engineRef.current?.coordinateToTime(x) ?? null
          },
          data: (seriesId) => {
            return engineRef.current?.data(seriesId) ?? []
          },
          dataByIndex: (index, seriesId) => {
            return engineRef.current?.dataByIndex(index, seriesId) ?? null
          },
          pop: (count, seriesId) => {
            return engineRef.current?.pop(count, seriesId) ?? 0
          },
          seriesOrder: () => {
            return engineRef.current?.seriesOrder() ?? []
          },
          setSeriesOrder: (orderedIds) => {
            engineRef.current?.setSeriesOrder(orderedIds)
          },
          takeScreenshot: (options) => {
            return engineRef.current?.takeScreenshot(options) ?? { dataUrl: '' }
          },
          addPane: (input) => {
            return engineRef.current?.addPane(input) ?? ''
          },
          removePane: (paneId) => {
            return engineRef.current?.removePane(paneId) ?? false
          },
          swapPanes: (paneId1, paneId2) => {
            return engineRef.current?.swapPanes(paneId1, paneId2) ?? false
          },
          getPaneLayout: () => {
            return (
              engineRef.current?.getPaneLayout() ?? { panes: [], layout: null }
            )
          },
          addPrimitive: (input) => {
            return engineRef.current?.addPrimitive(input) ?? ''
          },
          removePrimitive: (id) => {
            return engineRef.current?.removePrimitive(id) ?? false
          },
          listPrimitives: () => {
            return engineRef.current?.listPrimitives() ?? []
          },
          addCustomSeries: (input) => {
            return engineRef.current?.addCustomSeries(input) ?? ''
          },
          removeCustomSeries: (id) => {
            return engineRef.current?.removeCustomSeries(id) ?? false
          },
          updateCustomSeriesData: (id, bars) => {
            return engineRef.current?.updateCustomSeriesData(id, bars) ?? false
          },
          listCustomSeries: () => {
            return engineRef.current?.listCustomSeries() ?? []
          },
          registerIndicatorDefinition: (definition) => {
            engineRef.current?.registerIndicatorDefinition(definition)
          },
          unregisterIndicatorDefinition: (type) => {
            return (
              engineRef.current?.unregisterIndicatorDefinition(type) ?? false
            )
          },
        }),
        [],
      )

      return (
        <div
          style={{
            position: 'relative',
            height: '100%',
            width: '100%',
            userSelect: 'none',
            overflow: 'hidden',
          }}
          ref={containerRef}
        >
          <canvas
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              left: 0,
              top: 0,
              zIndex: 5,
            }}
            ref={gridCanvasRef}
          />
          <canvas
            style={{ position: 'absolute', left: 0, top: 0, zIndex: 10 }}
            ref={mainCanvasRef}
          />
          <canvas
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              left: 0,
              top: 0,
              zIndex: 20,
            }}
            ref={overlayCanvasRef}
          />
          <canvas
            style={{ position: 'absolute', left: 0, top: 0, zIndex: 30 }}
            ref={uiCanvasRef}
          />

          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 15,
              overflow: 'hidden',
            }}
            ref={indicatorContainerRef}
          >
            <canvas
              style={{
                pointerEvents: 'none',
                position: 'absolute',
                left: 0,
                top: 0,
              }}
              ref={indicatorCanvasRef}
            />
            <canvas
              style={{
                pointerEvents: 'none',
                position: 'absolute',
                left: 0,
                top: 0,
              }}
              ref={indicatorUiCanvasRef}
            />
          </div>
        </div>
      )
    },
  ),
)
