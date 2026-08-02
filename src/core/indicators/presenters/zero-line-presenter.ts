import { computeNumericRange, valueToY } from '../../data/scales'
import { drawTitleLabel, drawZeroLine, strokeLine, toLinePoints } from './utils'
import type { IndicatorPresenter } from '../../../types'

export const createZeroLinePresenter = (
  labelFn: (params: Record<string, boolean | number | string>) => string,
): IndicatorPresenter => {
  return (context) => {
    const { ctx, width, height, theme, indicator } = context

    const numericValues = context.values
      .map((p) => Number(p.value))
      .filter((v) => Number.isFinite(v))
    const range = computeNumericRange(numericValues, { min: -1, max: 1 }, 0.08)

    const points = toLinePoints(
      context.bars,
      context.values,
      context.viewport,
      width,
      (value) => valueToY(value, range, height),
    )

    drawZeroLine(ctx, range, width, height, theme.indicator.oscillator.zeroLine)
    drawTitleLabel(ctx, labelFn(indicator.params), indicator.color, theme)

    strokeLine(ctx, points, indicator.color, 1.5)
  }
}

export const cmfPresenter = createZeroLinePresenter(
  (params) => `CMF(${params.period ?? 20})`,
)

export const rocPresenter = createZeroLinePresenter(
  (params) => `ROC(${params.period ?? 12})`,
)

export const momentumPresenter = createZeroLinePresenter(
  (params) => `Mom(${params.period ?? 10})`,
)

export const cciPresenter = createZeroLinePresenter(
  (params) => `CCI(${params.period ?? 20})`,
)

export const bbPercentPresenter = createZeroLinePresenter(
  (params) => `BB%B(${params.period ?? 20})`,
)

export const coppockPresenter = createZeroLinePresenter(
  (params) => `Coppock(${params.longPeriod ?? 14})`,
)

export const elderForcePresenter = createZeroLinePresenter(
  (params) => `EFI(${params.period ?? 13})`,
)

export const bbWidthPresenter = createZeroLinePresenter(
  (params) => `BBW(${params.period ?? 20})`,
)

export const historicalVolPresenter = createZeroLinePresenter(
  (params) => `HV(${params.period ?? 20})`,
)

export const dpoPresenter = createZeroLinePresenter(
  (params) => `DPO(${params.period ?? 20})`,
)

export const cmoPresenter = createZeroLinePresenter(
  (params) => `CMO(${params.period ?? 9})`,
)

export const bopPresenter = createZeroLinePresenter(
  (params) => `BOP(${params.period ?? 14})`,
)

export const eomPresenter = createZeroLinePresenter(
  (params) => `EoM(${params.period ?? 14})`,
)

export const volumeOscPresenter = createZeroLinePresenter(
  (params) => `VO(${params.fast ?? 5},${params.slow ?? 10})`,
)

export const netVolumePresenter = createZeroLinePresenter(() => 'Net Vol')

export const stdDevPresenter = createZeroLinePresenter(
  (params) => `StdDev(${params.period ?? 20})`,
)

export const chaikinVolPresenter = createZeroLinePresenter(
  (params) => `CV(${params.emaPeriod ?? 10})`,
)

export const chaikinOscPresenter = createZeroLinePresenter(
  (params) => `CO(${params.fast ?? 3},${params.slow ?? 10})`,
)

export const linRegSlopePresenter = createZeroLinePresenter(
  (params) => `LinRegSlope(${params.period ?? 25})`,
)

export const priceOscPresenter = createZeroLinePresenter(
  (params) => `PO(${params.fast ?? 12},${params.slow ?? 26})`,
)

export const rankCorrelationPresenter = createZeroLinePresenter(
  (params) => `RCI(${params.period ?? 14})`,
)
