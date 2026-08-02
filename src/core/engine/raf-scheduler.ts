export type RafSchedulerOptions = {
  maxFps: number
  onFrame: (timestamp: number) => void
}

export class RafScheduler {
  private maxFps: number

  private readonly onFrame: (timestamp: number) => void

  private frameHandle: number | null = null

  private lastFrameTimestamp = 0

  constructor(options: RafSchedulerOptions) {
    this.maxFps = Math.max(1, options.maxFps)
    this.onFrame = options.onFrame
  }

  setMaxFps(maxFps: number): void {
    this.maxFps = Math.max(1, maxFps)
  }

  requestFrame(): void {
    if (this.frameHandle !== null) {
      return
    }

    this.frameHandle = requestAnimationFrame((timestamp) => {
      this.frameHandle = null

      const frameBudget = 1000 / this.maxFps
      if (timestamp - this.lastFrameTimestamp < frameBudget) {
        this.requestFrame()
        return
      }

      this.lastFrameTimestamp = timestamp
      this.onFrame(timestamp)
    })
  }

  dispose(): void {
    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle)
      this.frameHandle = null
    }
  }
}
