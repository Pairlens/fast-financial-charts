import { findBarIndexByTs } from '../../data/binary-search'
import type { ChartBar, ChartTheme } from '../../../types'
import type { ChartViewport, TimeTickType } from '../../../types/viewport'

/**
 * Time-axis tick planning.
 *
 * The axis is not a fixed number of evenly-spaced slots. Ticks land on calendar
 * boundaries (year → month → day → hour → minute → second), each label says
 * only what changed since the tick before it ("Jul", then "28", then "09:00"),
 * and every label is measured before it is drawn so two can never overlap.
 * When space runs out the more significant boundary wins, so a month label
 * survives while the plain hours around it are dropped.
 */

const MS_SECOND = 1000
const MS_MINUTE = 60 * MS_SECOND
const MS_HOUR = 60 * MS_MINUTE
const MS_DAY = 24 * MS_HOUR

/** Whitespace kept between two adjacent labels, in CSS pixels. */
const MIN_LABEL_GAP = 14
/** Whitespace kept between a label and the edge of the axis. */
const EDGE_PADDING = 3
/** Hard cap on generated boundaries, so a pathological range can't spin. */
const MAX_BOUNDARIES = 512

/**
 * Calendar significance of a tick, ordered least → most significant. Higher
 * weights win when labels compete for horizontal space.
 */
export const TickWeight = {
  Second: 0,
  Minute: 1,
  Hour: 2,
  Day: 3,
  Month: 4,
  Year: 5,
} as const

export type TickWeight = (typeof TickWeight)[keyof typeof TickWeight]

export type TimeAxisTick = {
  /** Bar index the tick sits on. */
  index: number
  /** Timestamp of that bar. */
  ts: number
  /** Center x of the bar, in plot space. */
  x: number
  /** Center x of the label — x, clamped so the text stays inside the axis. */
  labelX: number
  label: string
  /** Measured label width in CSS pixels. */
  width: number
  weight: TickWeight
}

type TimeStep =
  | { kind: 'intraday'; ms: number; weight: TickWeight }
  | { kind: 'day'; days: number; weight: TickWeight }
  | { kind: 'month'; months: number; weight: TickWeight }
  | { kind: 'year'; years: number; weight: TickWeight }

/**
 * Candidate tick intervals, coarsening left to right. The first one whose
 * on-screen spacing clears the label width is the one we use.
 */
const STEP_LADDER: ReadonlyArray<TimeStep> = [
  { kind: 'intraday', ms: MS_SECOND, weight: TickWeight.Second },
  { kind: 'intraday', ms: 5 * MS_SECOND, weight: TickWeight.Second },
  { kind: 'intraday', ms: 15 * MS_SECOND, weight: TickWeight.Second },
  { kind: 'intraday', ms: 30 * MS_SECOND, weight: TickWeight.Second },
  { kind: 'intraday', ms: MS_MINUTE, weight: TickWeight.Minute },
  { kind: 'intraday', ms: 5 * MS_MINUTE, weight: TickWeight.Minute },
  { kind: 'intraday', ms: 15 * MS_MINUTE, weight: TickWeight.Minute },
  { kind: 'intraday', ms: 30 * MS_MINUTE, weight: TickWeight.Minute },
  { kind: 'intraday', ms: MS_HOUR, weight: TickWeight.Hour },
  { kind: 'intraday', ms: 2 * MS_HOUR, weight: TickWeight.Hour },
  { kind: 'intraday', ms: 3 * MS_HOUR, weight: TickWeight.Hour },
  { kind: 'intraday', ms: 4 * MS_HOUR, weight: TickWeight.Hour },
  { kind: 'intraday', ms: 6 * MS_HOUR, weight: TickWeight.Hour },
  { kind: 'intraday', ms: 12 * MS_HOUR, weight: TickWeight.Hour },
  { kind: 'day', days: 1, weight: TickWeight.Day },
  { kind: 'day', days: 7, weight: TickWeight.Day },
  { kind: 'month', months: 1, weight: TickWeight.Month },
  { kind: 'month', months: 3, weight: TickWeight.Month },
  { kind: 'month', months: 6, weight: TickWeight.Month },
  { kind: 'year', years: 1, weight: TickWeight.Year },
  { kind: 'year', years: 2, weight: TickWeight.Year },
  { kind: 'year', years: 5, weight: TickWeight.Year },
  { kind: 'year', years: 10, weight: TickWeight.Year },
  { kind: 'year', years: 25, weight: TickWeight.Year },
  { kind: 'year', years: 50, weight: TickWeight.Year },
  { kind: 'year', years: 100, weight: TickWeight.Year },
]

const stepApproxMs = (step: TimeStep): number => {
  switch (step.kind) {
    case 'intraday':
      return step.ms
    case 'day':
      return step.days * MS_DAY
    case 'month':
      return step.months * 30.44 * MS_DAY
    case 'year':
      return step.years * 365.25 * MS_DAY
  }
}

// ── Locale-aware month names (built once per locale) ──

const FALLBACK_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const monthNamesByLocale = new Map<string, ReadonlyArray<string>>()

const getMonthNames = (locale?: string): ReadonlyArray<string> => {
  const key = locale ?? ''
  const cached = monthNamesByLocale.get(key)
  if (cached) return cached

  let names: ReadonlyArray<string> = FALLBACK_MONTHS
  try {
    const fmt = new Intl.DateTimeFormat(locale || undefined, { month: 'short' })
    names = Array.from({ length: 12 }, (_, month) =>
      fmt.format(new Date(2021, month, 15)),
    )
  } catch {
    // Locale unsupported by the runtime — English short names are fine.
  }
  monthNamesByLocale.set(key, names)
  return names
}

// ── Text measurement (cached across frames) ──

const textWidthCache = new Map<string, number>()
const MAX_WIDTH_CACHE = 512

/** Font used for time-axis labels. Shared so measurement matches rendering. */
export const timeAxisFont = (theme: ChartTheme): string =>
  `${Math.max(8, theme.fontSizeAxis - 1)}px ${theme.fontFamilyMono}`

/**
 * Builds a memoized `measureText` for one font. The axis redraws on every live
 * tick, and the same handful of label strings recur frame after frame, so the
 * cache turns per-frame measurement into map lookups.
 */
export const createTextMeasurer = (
  ctx: CanvasRenderingContext2D,
  font: string,
): ((text: string) => number) => {
  return (text: string): number => {
    const key = `${font}\u0000${text}`
    const cached = textWidthCache.get(key)
    if (cached !== undefined) return cached

    ctx.font = font
    const width = ctx.measureText(text).width
    if (textWidthCache.size >= MAX_WIDTH_CACHE) textWidthCache.clear()
    textWidthCache.set(key, width)
    return width
  }
}

// ── Labels ──

const pad2 = (value: number): string => (value < 10 ? `0${value}` : `${value}`)

export const tickTypeForWeight = (weight: TickWeight): TimeTickType => {
  if (weight === TickWeight.Year) return 'year'
  if (weight === TickWeight.Month) return 'month'
  if (weight === TickWeight.Day) return 'day'
  return 'time'
}

/**
 * Label text for a tick: only the field that changed at this boundary. A year
 * boundary reads "2026", a month boundary "Jul", a day boundary "28", and
 * anything finer the clock time. Dropping the redundant prefix is what keeps
 * labels narrow enough to fit.
 */
export const formatTickLabel = (
  ts: number,
  weight: TickWeight,
  monthNames: ReadonlyArray<string>,
): string => {
  const date = new Date(ts)
  switch (weight) {
    case TickWeight.Year:
      return `${date.getFullYear()}`
    case TickWeight.Month:
      return monthNames[date.getMonth()] ?? FALLBACK_MONTHS[date.getMonth()]
    case TickWeight.Day:
      return `${date.getDate()}`
    case TickWeight.Second:
      return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
    default:
      return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  }
}

/** Widest label a step can produce — used to pick the step, before any exist. */
const sampleLabelForWeight = (
  weight: TickWeight,
  monthNames: ReadonlyArray<string>,
): string => {
  switch (weight) {
    case TickWeight.Year:
      return '2088'
    case TickWeight.Month:
      return monthNames.reduce((a, b) => (b.length > a.length ? b : a), 'Jan')
    case TickWeight.Day:
      return '28'
    case TickWeight.Second:
      return '00:00:00'
    default:
      return '00:00'
  }
}

// ── Calendar boundaries ──

/**
 * Highest calendar boundary this bar crosses relative to the bar before it.
 * Computed from the bars themselves (not from wall-clock arithmetic) so gaps —
 * weekends, halts, missing candles — label the bar that actually opens the day.
 */
const barWeight = (bars: Array<ChartBar>, index: number): TickWeight => {
  const previous = bars[index - 1]
  // First bar in the dataset has nothing to differ from; let the step decide.
  if (!previous) return TickWeight.Second

  const current = new Date(bars[index].ts)
  const before = new Date(previous.ts)

  if (current.getFullYear() !== before.getFullYear()) return TickWeight.Year
  if (current.getMonth() !== before.getMonth()) return TickWeight.Month
  if (current.getDate() !== before.getDate()) return TickWeight.Day
  if (current.getHours() !== before.getHours()) return TickWeight.Hour
  if (current.getMinutes() !== before.getMinutes()) return TickWeight.Minute
  return TickWeight.Second
}

/**
 * Timestamps of every `step` boundary in `[fromTs, toTs]`, in local time.
 *
 * Sub-day steps re-anchor at each local midnight rather than striding from a
 * fixed epoch: that keeps ticks on clean local times (00:00, 06:00, 12:00) in
 * every timezone, including half-hour offsets, and self-corrects across DST.
 */
const generateBoundaries = (
  step: TimeStep,
  fromTs: number,
  toTs: number,
): Array<number> => {
  const out: Array<number> = []
  if (toTs < fromTs) return out

  if (step.kind === 'intraday') {
    const cursor = new Date(fromTs)
    cursor.setHours(0, 0, 0, 0)
    let dayStart = cursor.getTime()

    while (dayStart <= toTs && out.length < MAX_BOUNDARIES) {
      const next = new Date(dayStart)
      next.setDate(next.getDate() + 1)
      next.setHours(0, 0, 0, 0)
      const dayEnd = Math.min(next.getTime(), dayStart + MS_DAY)

      // Jump straight to the first boundary at or after fromTs — walking a
      // whole day at a 1s step would be 86 400 wasted iterations.
      const skip = Math.max(0, Math.ceil((fromTs - dayStart) / step.ms))
      for (
        let t = dayStart + skip * step.ms;
        t < dayEnd && t <= toTs && out.length < MAX_BOUNDARIES;
        t += step.ms
      ) {
        out.push(t)
      }
      dayStart = next.getTime()
    }
    return out
  }

  const cursor = new Date(fromTs)
  if (step.kind === 'day') {
    cursor.setHours(0, 0, 0, 0)
    if (step.days === 7) {
      // Anchor weekly ticks on Monday.
      cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7))
    }
  } else if (step.kind === 'month') {
    cursor.setDate(1)
    cursor.setHours(0, 0, 0, 0)
    cursor.setMonth(Math.floor(cursor.getMonth() / step.months) * step.months)
  } else {
    cursor.setMonth(0, 1)
    cursor.setHours(0, 0, 0, 0)
    cursor.setFullYear(
      Math.floor(cursor.getFullYear() / step.years) * step.years,
    )
  }

  while (cursor.getTime() <= toTs && out.length < MAX_BOUNDARIES) {
    const t = cursor.getTime()
    if (t >= fromTs) out.push(t)

    if (step.kind === 'day') cursor.setDate(cursor.getDate() + step.days)
    else if (step.kind === 'month')
      cursor.setMonth(cursor.getMonth() + step.months)
    else cursor.setFullYear(cursor.getFullYear() + step.years)
    cursor.setHours(0, 0, 0, 0)
  }
  return out
}

// ── Planning ──

export type TimeTicksInput = {
  bars: Array<ChartBar>
  viewport: ChartViewport
  /** Width of the plot area (container minus the price-axis gutter). */
  chartWidth: number
  /** Measures a label in the axis font. */
  measureText: (text: string) => number
  /** Overrides the label text for every tick. */
  tickMarkFormatter?: (time: number, tickType: TimeTickType) => string
  /** BCP 47 locale for month names. */
  locale?: string
}

/**
 * Plans the time axis: which bars get a tick, what each one says, and where the
 * label sits. The returned ticks are ordered left to right and are guaranteed
 * not to overlap — callers can draw them blind.
 */
export const computeTimeAxisTicks = (
  input: TimeTicksInput,
): Array<TimeAxisTick> => {
  const { bars, viewport, chartWidth, measureText } = input
  if (bars.length === 0 || chartWidth <= 0) return []

  const lastIndex = bars.length - 1
  const start = Math.max(0, Math.min(viewport.startIndex, lastIndex))
  const end = Math.max(start, Math.min(viewport.endIndex, lastIndex))
  // Slot count comes from the raw viewport so a right-hand offset of empty
  // bars keeps the same bar↔x mapping the series and grid use.
  const slots = Math.max(1, viewport.endIndex - viewport.startIndex + 1)

  const monthNames = getMonthNames(input.locale)
  const fromTs = bars[start].ts
  const toTs = bars[end].ts
  const spanMs = toTs - fromTs

  const xForIndex = (index: number): number =>
    ((index - viewport.startIndex + 0.5) / slots) * chartWidth

  const buildTick = (index: number, weight: TickWeight): TimeAxisTick => {
    const ts = bars[index].ts
    const label = input.tickMarkFormatter
      ? input.tickMarkFormatter(ts, tickTypeForWeight(weight))
      : formatTickLabel(ts, weight, monthNames)
    const width = measureText(label)
    const x = xForIndex(index)
    const half = width / 2
    const labelX =
      width + 2 * EDGE_PADDING >= chartWidth
        ? chartWidth / 2
        : Math.min(
            Math.max(x, half + EDGE_PADDING),
            chartWidth - half - EDGE_PADDING,
          )
    return { index, ts, x, labelX, label, width, weight }
  }

  // Degenerate range (single bar, or every visible bar sharing a timestamp):
  // one tick, at the bar that anchors the view.
  if (spanMs <= 0) {
    const weight = Math.max(
      barWeight(bars, start),
      TickWeight.Minute,
    ) as TickWeight
    return [buildTick(start, weight)]
  }

  const barIntervalMs = spanMs / Math.max(1, end - start)
  const pxPerBar = chartWidth / slots

  // Pick the coarsest-enough step: at least one bar wide, and wide enough on
  // screen for its own label plus breathing room.
  let step = STEP_LADDER[STEP_LADDER.length - 1]
  for (const candidate of STEP_LADDER) {
    const approxMs = stepApproxMs(candidate)
    if (approxMs < barIntervalMs) continue
    const pxPerStep = (approxMs / barIntervalMs) * pxPerBar
    const needed =
      measureText(sampleLabelForWeight(candidate.weight, monthNames)) +
      MIN_LABEL_GAP
    if (pxPerStep >= needed) {
      step = candidate
      break
    }
  }

  // Month starts are always candidates when the step is finer than a month.
  // Sub-day and daily steps already land on them, but a weekly step is
  // Monday-anchored and would otherwise skip the one tick that tells the
  // reader which month — and which year — they are looking at.
  const boundaries = generateBoundaries(step, fromTs, toTs)
  if (stepApproxMs(step) < 28 * MS_DAY) {
    boundaries.push(
      ...generateBoundaries(
        { kind: 'month', months: 1, weight: TickWeight.Month },
        fromTs,
        toTs,
      ),
    )
    // Bars are visited in index order below, which the dedupe relies on.
    boundaries.sort((a, b) => a - b)
  }
  const candidates: Array<TimeAxisTick> = []
  let previousIndex = -1

  for (const boundary of boundaries) {
    const index = findBarIndexByTs(bars, boundary)
    if (index < start || index > end || index === previousIndex) continue
    previousIndex = index
    // The bar's own boundary crossing outranks the step when it is more
    // significant: a month opening inside a daily step still reads "Jul".
    const weight = Math.max(barWeight(bars, index), step.weight) as TickWeight
    candidates.push(buildTick(index, weight))
  }

  if (candidates.length === 0) return []

  // Most significant first, then left to right, so the boundaries that carry
  // the most meaning claim their space before the filler times do.
  const ordered = candidates
    .map((tick, order) => ({ tick, order }))
    .sort((a, b) =>
      a.tick.weight !== b.tick.weight
        ? b.tick.weight - a.tick.weight
        : a.order - b.order,
    )

  const placed: Array<TimeAxisTick> = []
  for (const { tick } of ordered) {
    const left = tick.labelX - tick.width / 2
    const right = tick.labelX + tick.width / 2
    const collides = placed.some(
      (other) =>
        left < other.labelX + other.width / 2 + MIN_LABEL_GAP &&
        right > other.labelX - other.width / 2 - MIN_LABEL_GAP,
    )
    if (!collides) placed.push(tick)
  }

  return placed.sort((a, b) => a.x - b.x)
}
