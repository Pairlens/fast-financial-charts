import { VIEWPORT_UNIFORMS_GLSL } from '../shaders/viewport-glsl'
import { IDENTITY_VIEWPORT_UNIFORMS } from '../shaders/viewport-uniforms'
import type { ViewportUniforms } from '../shaders/viewport-uniforms'

const AREA_VERT = `#version 300 es
precision highp float;
in vec2 a_pos;

${VIEWPORT_UNIFORMS_GLSL}

out float v_gradientPos;

void main() {
  float ndcX = indexToNdcX(a_pos.x);
  float ndcY = priceToNdcY(a_pos.y);
  gl_Position = vec4(ndcX, ndcY, 0.0, 1.0);

  // Even vertices (0, 2, 4, ...) = line points (top), odd = baseline (bottom)
  v_gradientPos = float(gl_VertexID % 2);
}
`

const AREA_FRAG = `#version 300 es
precision highp float;
uniform vec4 u_topColor;
uniform vec4 u_bottomColor;
in float v_gradientPos;
out vec4 fragColor;
void main() {
  fragColor = mix(u_topColor, u_bottomColor, v_gradientPos);
}
`

const compileProgram = (
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram => {
  const vertex = gl.createShader(gl.VERTEX_SHADER)
  if (!vertex) {
    throw new Error('Failed to create area vertex shader')
  }

  gl.shaderSource(vertex, vertexSource)
  gl.compileShader(vertex)
  if (!gl.getShaderParameter(vertex, gl.COMPILE_STATUS)) {
    throw new Error(`Area vertex compile error: ${gl.getShaderInfoLog(vertex)}`)
  }

  const fragment = gl.createShader(gl.FRAGMENT_SHADER)
  if (!fragment) {
    throw new Error('Failed to create area fragment shader')
  }

  gl.shaderSource(fragment, fragmentSource)
  gl.compileShader(fragment)
  if (!gl.getShaderParameter(fragment, gl.COMPILE_STATUS)) {
    throw new Error(
      `Area fragment compile error: ${gl.getShaderInfoLog(fragment)}`,
    )
  }

  const program = gl.createProgram()
  if (!program) {
    throw new Error('Failed to create area program')
  }

  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Area program link error: ${gl.getProgramInfoLog(program)}`)
  }

  gl.deleteShader(vertex)
  gl.deleteShader(fragment)

  return program
}

export class AreaProgram {
  private gl: WebGL2RenderingContext

  private program!: WebGLProgram

  private vao!: WebGLVertexArrayObject

  private buffer!: WebGLBuffer

  private topColorLocation!: WebGLUniformLocation

  private bottomColorLocation!: WebGLUniformLocation

  // Viewport transform uniforms
  private xScaleLocation!: WebGLUniformLocation

  private xOffsetLocation!: WebGLUniformLocation

  private yScaleLocation!: WebGLUniformLocation

  private yOffsetLocation!: WebGLUniformLocation

  private modeLocation!: WebGLUniformLocation

  private basePriceLocation!: WebGLUniformLocation

  private viewportWLocation!: WebGLUniformLocation | null

  private viewportHLocation!: WebGLUniformLocation | null

  /** Pre-allocated vertex buffer. Grows but never shrinks. */
  private vertexData = new Float32Array(0)

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.initializeGpuResources()
  }

  /** Re-create all GPU resources after WebGL context restoration. */
  recreate(gl: WebGL2RenderingContext): void {
    this.gl = gl
    this.initializeGpuResources()
  }

  private initializeGpuResources(): void {
    const gl = this.gl
    this.program = compileProgram(gl, AREA_VERT, AREA_FRAG)

    const vao = gl.createVertexArray()
    const buffer = gl.createBuffer()

    if (!vao || !buffer) {
      throw new Error('Failed to create area buffers')
    }

    this.vao = vao
    this.buffer = buffer

    const topColorLocation = gl.getUniformLocation(this.program, 'u_topColor')
    const bottomColorLocation = gl.getUniformLocation(
      this.program,
      'u_bottomColor',
    )
    if (!topColorLocation || !bottomColorLocation) {
      throw new Error('Missing area color uniforms')
    }
    this.topColorLocation = topColorLocation
    this.bottomColorLocation = bottomColorLocation

    // Viewport transform uniforms
    this.xScaleLocation = gl.getUniformLocation(this.program, 'u_xScale')!
    this.xOffsetLocation = gl.getUniformLocation(this.program, 'u_xOffset')!
    this.yScaleLocation = gl.getUniformLocation(this.program, 'u_yScale')!
    this.yOffsetLocation = gl.getUniformLocation(this.program, 'u_yOffset')!
    this.modeLocation = gl.getUniformLocation(this.program, 'u_mode')!
    this.basePriceLocation = gl.getUniformLocation(this.program, 'u_basePrice')!
    this.viewportWLocation = gl.getUniformLocation(this.program, 'u_viewportW')
    this.viewportHLocation = gl.getUniformLocation(this.program, 'u_viewportH')

    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    const positionLocation = gl.getAttribLocation(this.program, 'a_pos')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)
  }

  private setViewportUniforms(uniforms: ViewportUniforms): void {
    const gl = this.gl
    gl.uniform1f(this.xScaleLocation, uniforms.xScale)
    gl.uniform1f(this.xOffsetLocation, uniforms.xOffset)
    gl.uniform1f(this.yScaleLocation, uniforms.yScale)
    gl.uniform1f(this.yOffsetLocation, uniforms.yOffset)
    gl.uniform1f(this.modeLocation, uniforms.mode)
    gl.uniform1f(this.basePriceLocation, uniforms.basePrice)
    if (this.viewportWLocation)
      gl.uniform1f(this.viewportWLocation, uniforms.viewportW)
    if (this.viewportHLocation)
      gl.uniform1f(this.viewportHLocation, uniforms.viewportH)
  }

  /**
   * Ensure the vertex buffer is large enough for `count` vertices (2 floats each).
   * Returns the Float32Array for direct writes by the caller (zero-alloc hot path).
   */
  ensureBuffer(vertexCount: number): Float32Array {
    const needed = vertexCount * 2
    if (this.vertexData.length < needed) {
      this.vertexData = new Float32Array(needed)
    }
    return this.vertexData
  }

  /**
   * Upload pre-filled vertex data and draw with gradient colors.
   * The caller must have written into the buffer returned by ensureBuffer().
   */
  drawInterleaved(
    vertexCount: number,
    colors: {
      top: [number, number, number, number]
      bottom: [number, number, number, number]
    },
    viewportUniforms: ViewportUniforms,
  ): void {
    if (vertexCount < 4) {
      return
    }

    const gl = this.gl
    const floatLength = vertexCount * 2

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.vertexData.subarray(0, floatLength),
      gl.DYNAMIC_DRAW,
    )

    gl.useProgram(this.program)
    gl.uniform4fv(this.topColorLocation, colors.top)
    gl.uniform4fv(this.bottomColorLocation, colors.bottom)
    this.setViewportUniforms(viewportUniforms)

    gl.bindVertexArray(this.vao)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount)
    gl.bindVertexArray(null)
  }

  /**
   * Redraw with updated viewport uniforms but without re-uploading buffer data.
   * Used when only the viewport changed (VIEWPORT dirty, not GEOMETRY).
   */
  drawWithCachedBuffer(
    vertexCount: number,
    colors: {
      top: [number, number, number, number]
      bottom: [number, number, number, number]
    },
    viewportUniforms: ViewportUniforms,
  ): void {
    if (vertexCount < 4) {
      return
    }

    const gl = this.gl
    gl.useProgram(this.program)
    gl.uniform4fv(this.topColorLocation, colors.top)
    gl.uniform4fv(this.bottomColorLocation, colors.bottom)
    this.setViewportUniforms(viewportUniforms)

    gl.bindVertexArray(this.vao)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount)
    gl.bindVertexArray(null)
  }

  /**
   * Draw area fill with direct buffer upload (legacy API for compare mode).
   * Both topColor and bottomColor are set to the same value for solid fill.
   */
  draw(
    points: Float32Array,
    color: [number, number, number, number],
    viewportUniforms?: ViewportUniforms,
  ): void {
    if (points.length < 6) {
      return
    }

    const gl = this.gl
    gl.useProgram(this.program)
    gl.uniform4fv(this.topColorLocation, color)
    gl.uniform4fv(this.bottomColorLocation, color)
    this.setViewportUniforms(viewportUniforms ?? IDENTITY_VIEWPORT_UNIFORMS)

    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, points, gl.DYNAMIC_DRAW)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, points.length / 2)
    gl.bindVertexArray(null)
  }

  dispose(): void {
    const gl = this.gl
    gl.deleteProgram(this.program)
    gl.deleteVertexArray(this.vao)
    gl.deleteBuffer(this.buffer)
  }
}
