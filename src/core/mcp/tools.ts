import type { MCPToolSchema } from '../../types'

export const CHART_MCP_TOOLS: Array<MCPToolSchema> = [
  {
    name: 'addIndicator',
    description: 'Add an indicator to the chart for a specific series.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        seriesId: { type: 'string' },
        params: { type: 'object' },
        pane: { type: 'string', enum: ['overlay', 'separate'] },
        color: { type: 'string' },
      },
      required: ['type', 'seriesId'],
      additionalProperties: false,
    },
  },
  {
    name: 'removeIndicator',
    description: 'Remove an indicator by id.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'removeAllIndicators',
    description: 'Remove all indicators from the chart.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'addDrawing',
    description:
      'Add a drawing object to the chart. Supported types: line, arrow, ray, xline, rectangle, circle, ellipse, path (with preset: triangle/diamond/star/hexagon/pentagon/cross/heart/flag/checkmark/xmark), hline, vline, fibonacci, text, measure.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        color: { type: 'string' },
        lineWidth: { type: 'number' },
        visible: { type: 'boolean' },
        locked: { type: 'boolean' },
      },
      required: ['type'],
      additionalProperties: true,
    },
  },
  {
    name: 'updateDrawing',
    description: 'Update a drawing object by id.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        patch: { type: 'object' },
      },
      required: ['id', 'patch'],
      additionalProperties: false,
    },
  },
  {
    name: 'removeDrawing',
    description: 'Remove a drawing by id.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'clearDrawings',
    description: 'Clear all drawings from the chart.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'setViewport',
    description: 'Set chart viewport by indices.',
    parameters: {
      type: 'object',
      properties: {
        startIndex: { type: 'number' },
        endIndex: { type: 'number' },
      },
      required: ['startIndex', 'endIndex'],
      additionalProperties: false,
    },
  },
  {
    name: 'scrollToLatest',
    description: 'Scroll viewport to latest bars.',
    parameters: {
      type: 'object',
      properties: {
        bars: { type: 'number' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'setCompareMode',
    description: 'Set compare mode for multiple series.',
    parameters: {
      type: 'object',
      properties: {
        compareMode: {
          type: 'string',
          enum: ['indexed', 'price', 'dual-axis'],
        },
      },
      required: ['compareMode'],
      additionalProperties: false,
    },
  },
  {
    name: 'setChartType',
    description:
      'Set chart type (candles/heikinAshi/hollowCandles/line/stepLine/area/hlcArea/bar/highLow/baseline/histogram/column/renko/lineBreak/kagi/pointFigure).',
    parameters: {
      type: 'object',
      properties: {
        chartType: {
          type: 'string',
          enum: [
            'candles',
            'heikinAshi',
            'hollowCandles',
            'line',
            'stepLine',
            'area',
            'hlcArea',
            'bar',
            'highLow',
            'baseline',
            'histogram',
            'column',
            'renko',
            'lineBreak',
            'kagi',
            'pointFigure',
          ],
        },
      },
      required: ['chartType'],
      additionalProperties: false,
    },
  },
  {
    name: 'getVisibleData',
    description: 'Get visible bars per series.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'getChartState',
    description: 'Get complete chart snapshot.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'getIndicatorValue',
    description: 'Get indicator value at optional timestamp.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        ts: { type: 'number' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'getDrawingState',
    description: 'Get drawing collection state.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'applyTick',
    description: 'Apply live tick update to a series.',
    parameters: {
      type: 'object',
      properties: {
        seriesId: { type: 'string' },
        ts: { type: 'number' },
        price: { type: 'number' },
        volume: { type: 'number' },
      },
      required: ['seriesId', 'ts', 'price'],
      additionalProperties: false,
    },
  },
  {
    name: 'applyTicks',
    description: 'Apply a batch of live tick updates to one or more series.',
    parameters: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              seriesId: { type: 'string' },
              ts: { type: 'number' },
              price: { type: 'number' },
              volume: { type: 'number' },
            },
            required: ['seriesId', 'ts', 'price'],
            additionalProperties: false,
          },
        },
      },
      required: ['updates'],
      additionalProperties: false,
    },
  },
  {
    name: 'appendBar',
    description: 'Append a full bar to a series.',
    parameters: {
      type: 'object',
      properties: {
        seriesId: { type: 'string' },
        bar: { type: 'object' },
      },
      required: ['seriesId', 'bar'],
      additionalProperties: false,
    },
  },
  {
    name: 'replaceSeries',
    description: 'Replace all chart series.',
    parameters: {
      type: 'object',
      properties: {
        series: { type: 'array' },
      },
      required: ['series'],
      additionalProperties: false,
    },
  },
  {
    name: 'getCapabilities',
    description: 'Get chart capabilities and supported feature sets.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'subscribeEvents',
    description: 'Subscribe to chart events for AI workflows.',
    parameters: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'contextmenu',
              'hover',
              'hudUpdate',
              'drawingsChange',
              'indicatorsChange',
              'stateChange',
              'indicatorComputeComplete',
            ],
          },
        },
      },
      required: ['events'],
      additionalProperties: false,
    },
  },
  {
    name: 'unsubscribeEvents',
    description: 'Unsubscribe event types from existing subscriptions.',
    parameters: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'contextmenu',
              'hover',
              'hudUpdate',
              'drawingsChange',
              'indicatorsChange',
              'stateChange',
              'indicatorComputeComplete',
            ],
          },
        },
      },
      required: ['events'],
      additionalProperties: false,
    },
  },
  {
    name: 'screenshot',
    description: 'Capture chart image as data URL.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'undo',
    description: 'Undo the last drawing change.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'redo',
    description: 'Redo the last undone drawing change.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'updateIndicator',
    description:
      'Update an existing indicator by id. Can change params, color, visibility, and pane.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        params: { type: 'object' },
        color: { type: 'string' },
        visible: { type: 'boolean' },
        pane: { type: 'string', enum: ['overlay', 'separate'] },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'setTheme',
    description: 'Update chart theme with partial theme object.',
    parameters: {
      type: 'object',
      properties: {
        theme: { type: 'object' },
      },
      required: ['theme'],
      additionalProperties: false,
    },
  },
  {
    name: 'setPriceScaleMode',
    description:
      'Set price scale mode (normal, logarithmic, percentage, indexedTo100).',
    parameters: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['normal', 'logarithmic', 'percentage', 'indexedTo100'],
        },
      },
      required: ['mode'],
      additionalProperties: false,
    },
  },
  {
    name: 'fitContent',
    description: 'Fit the chart viewport to show all data.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'scrollToPosition',
    description:
      'Scroll the chart to center on a specific bar index, with optional animation.',
    parameters: {
      type: 'object',
      properties: {
        barIndex: { type: 'number' },
        animated: { type: 'boolean' },
      },
      required: ['barIndex'],
      additionalProperties: false,
    },
  },
  {
    name: 'priceToCoordinate',
    description: 'Convert a price value to Y pixel coordinate in the chart.',
    parameters: {
      type: 'object',
      properties: {
        price: { type: 'number' },
      },
      required: ['price'],
      additionalProperties: false,
    },
  },
  {
    name: 'coordinateToPrice',
    description: 'Convert a Y pixel coordinate to a price value.',
    parameters: {
      type: 'object',
      properties: {
        y: { type: 'number' },
      },
      required: ['y'],
      additionalProperties: false,
    },
  },
  {
    name: 'timeToCoordinate',
    description: 'Convert a timestamp to X pixel coordinate in the chart.',
    parameters: {
      type: 'object',
      properties: {
        ts: { type: 'number' },
      },
      required: ['ts'],
      additionalProperties: false,
    },
  },
  {
    name: 'coordinateToTime',
    description: 'Convert an X pixel coordinate to a timestamp.',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number' },
      },
      required: ['x'],
      additionalProperties: false,
    },
  },
  {
    name: 'getData',
    description:
      'Get bars for a series. Returns the primary series if no seriesId is provided. Use limit/offset for pagination to avoid transferring large datasets.',
    parameters: {
      type: 'object',
      properties: {
        seriesId: { type: 'string' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'getDataByIndex',
    description: 'Get a specific bar by its index in the series.',
    parameters: {
      type: 'object',
      properties: {
        index: { type: 'number' },
        seriesId: { type: 'string' },
      },
      required: ['index'],
      additionalProperties: false,
    },
  },
  {
    name: 'popBars',
    description: 'Remove the last N bars from a series.',
    parameters: {
      type: 'object',
      properties: {
        count: { type: 'number' },
        seriesId: { type: 'string' },
      },
      required: ['count'],
      additionalProperties: false,
    },
  },
  {
    name: 'getSeriesOrder',
    description:
      'Get the current series rendering order as an array of series IDs.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'setSeriesOrder',
    description:
      'Set the series rendering order by providing an ordered array of series IDs.',
    parameters: {
      type: 'object',
      properties: {
        orderedIds: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['orderedIds'],
      additionalProperties: false,
    },
  },
  {
    name: 'takeScreenshot',
    description: 'Capture chart image as data URL with configurable options.',
    parameters: {
      type: 'object',
      properties: {
        includeCrosshair: { type: 'boolean' },
        includeOverlays: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'addPane',
    description:
      'Add a new user pane below the main chart for indicators or custom content.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        stretchFactor: { type: 'number' },
        minHeight: { type: 'number' },
        label: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'removePane',
    description:
      'Remove a user pane by id. Indicators in the pane are reassigned to the default separate pane.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'swapPanes',
    description: 'Swap the positions of two user panes.',
    parameters: {
      type: 'object',
      properties: {
        paneId1: { type: 'string' },
        paneId2: { type: 'string' },
      },
      required: ['paneId1', 'paneId2'],
      additionalProperties: false,
    },
  },
  {
    name: 'updatePane',
    description:
      'Update a user pane configuration (stretchFactor, minHeight, label).',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        patch: {
          type: 'object',
          properties: {
            stretchFactor: { type: 'number' },
            minHeight: { type: 'number' },
            label: { type: 'string' },
          },
        },
      },
      required: ['id', 'patch'],
      additionalProperties: false,
    },
  },
  {
    name: 'getPaneLayout',
    description: 'Get current pane configurations and computed layout.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'addPrimitive',
    description:
      'Add a series primitive for custom Canvas2D rendering on the chart. Primitives can render in the chart pane, price axis, and/or time axis areas.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Optional primitive id (auto-generated if omitted)',
        },
        seriesId: {
          type: 'string',
          description: 'The series this primitive is attached to',
        },
        zOrder: {
          type: 'string',
          enum: ['behindGrid', 'behindSeries', 'afterSeries', 'topmost'],
          description: 'Rendering z-order layer (default: afterSeries)',
        },
        visible: {
          type: 'boolean',
          description: 'Whether the primitive is visible (default: true)',
        },
        paneId: {
          type: 'string',
          description: 'Optional target pane for multi-pane layouts',
        },
      },
      required: ['seriesId'],
      additionalProperties: false,
    },
  },
  {
    name: 'removePrimitive',
    description: 'Remove a series primitive by id.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The primitive id to remove' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'listPrimitives',
    description:
      'List all registered series primitives with their configuration.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'addCustomSeries',
    description:
      'Add a custom series instance. The series type must be registered via plugin config.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Unique instance id' },
        type: {
          type: 'string',
          description: 'Custom series type (e.g. custom:heatmap)',
        },
        bars: {
          type: 'array',
          items: {
            type: 'object',
            properties: { ts: { type: 'number' } },
            required: ['ts'],
          },
          description: 'Array of data bars (must have ts field)',
        },
        label: { type: 'string', description: 'Display label' },
        color: { type: 'string', description: 'Series color' },
        visible: {
          type: 'boolean',
          description: 'Whether the series is visible (default: true)',
        },
        paneId: {
          type: 'string',
          description: 'Target pane (main or a PaneId)',
        },
      },
      required: ['id', 'type', 'bars'],
      additionalProperties: false,
    },
  },
  {
    name: 'removeCustomSeries',
    description: 'Remove a custom series instance by id.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The custom series id to remove' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'updateCustomSeriesData',
    description: 'Update the data bars for a custom series instance.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The custom series id' },
        bars: {
          type: 'array',
          items: {
            type: 'object',
            properties: { ts: { type: 'number' } },
            required: ['ts'],
          },
          description: 'New data bars',
        },
      },
      required: ['id', 'bars'],
      additionalProperties: false,
    },
  },
  {
    name: 'listCustomSeries',
    description: 'List all custom series instances with their configuration.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
