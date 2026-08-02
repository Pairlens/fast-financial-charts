export type WebGLContext = {
  gl: WebGL2RenderingContext
  canvas: HTMLCanvasElement
  dpr: number
  isContextLost: boolean
}

export type ContextLossHandler = {
  onLost: () => void
  onRestored: () => void
  detach: () => void
}

export const createWebGLContext = (
  canvas: HTMLCanvasElement,
  enableHiDpi: boolean,
): WebGLContext => {
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  })

  if (!gl) {
    throw new Error('WebGL2 is required for FastFinancialChart')
  }

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  return {
    gl,
    canvas,
    dpr: enableHiDpi ? window.devicePixelRatio || 1 : 1,
    isContextLost: false,
  }
}

/**
 * Listen for WebGL context loss / restoration events.
 * On loss: suppress rendering. On restore: re-create programs and re-upload buffers.
 */
export const attachContextLossHandler = (
  context: WebGLContext,
  onRestored: () => void,
): ContextLossHandler => {
  const handleLost = (event: Event): void => {
    event.preventDefault() // allows restoration
    context.isContextLost = true
  }

  const handleRestored = (): void => {
    context.isContextLost = false
    // Re-enable blend state after context restore
    context.gl.enable(context.gl.BLEND)
    context.gl.blendFunc(context.gl.SRC_ALPHA, context.gl.ONE_MINUS_SRC_ALPHA)
    onRestored()
  }

  context.canvas.addEventListener('webglcontextlost', handleLost)
  context.canvas.addEventListener('webglcontextrestored', handleRestored)

  return {
    onLost: handleLost as () => void,
    onRestored: handleRestored,
    detach: () => {
      context.canvas.removeEventListener('webglcontextlost', handleLost)
      context.canvas.removeEventListener('webglcontextrestored', handleRestored)
    },
  }
}

export const resizeWebGLCanvas = (
  context: WebGLContext,
  width: number,
  height: number,
): void => {
  const pixelWidth = Math.max(1, Math.floor(width * context.dpr))
  const pixelHeight = Math.max(1, Math.floor(height * context.dpr))

  if (
    context.canvas.width !== pixelWidth ||
    context.canvas.height !== pixelHeight
  ) {
    context.canvas.width = pixelWidth
    context.canvas.height = pixelHeight
  }

  context.canvas.style.width = `${width}px`
  context.canvas.style.height = `${height}px`

  context.gl.viewport(0, 0, pixelWidth, pixelHeight)
}

export const toRgba = (
  color: string,
  alpha = 1,
): [number, number, number, number] => {
  const hex = color.replace('#', '')
  if (hex.length !== 6) {
    return [1, 1, 1, alpha]
  }

  return [
    Number.parseInt(hex.slice(0, 2), 16) / 255,
    Number.parseInt(hex.slice(2, 4), 16) / 255,
    Number.parseInt(hex.slice(4, 6), 16) / 255,
    alpha,
  ]
}

export const clearWebGL = (
  context: WebGLContext,
  rgba: [number, number, number, number],
): void => {
  context.gl.clearColor(rgba[0], rgba[1], rgba[2], rgba[3])
  context.gl.clear(context.gl.COLOR_BUFFER_BIT)
}
