import { VIEWPORT_UNIFORMS_GLSL } from '../shaders/viewport-glsl'
import { IDENTITY_VIEWPORT_UNIFORMS } from '../shaders/viewport-uniforms'
import type { ViewportUniforms } from '../shaders/viewport-uniforms'

const LINE_VERT = `#version 300 es
precision highp float;
in vec2 a_pos;

${VIEWPORT_UNIFORMS_GLSL}

void main() {
  float ndcX = indexToNdcX(a_pos.x);
  float ndcY = priceToNdcY(a_pos.y);
  gl_Position = vec4(ndcX, ndcY, 0.0, 1.0);
}
`

const LINE_FRAG = `#version 300 es
precision highp float;
uniform vec4 u_color;
out vec4 fragColor;
void main() {
  fragColor = u_color;
}
`

const compileProgram = (
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram => {
  const vertex = gl.createShader(gl.VERTEX_SHADER)
  if (!vertex) {
    throw new Error('Failed to create line vertex shader')
  }
  gl.shaderSource(vertex, vertexSource)
  gl.compileShader(vertex)
  if (!gl.getShaderParameter(vertex, gl.COMPILE_STATUS)) {
    throw new Error(`Line vertex compile error: ${gl.getShaderInfoLog(vertex)}`)
  }

  const fragment = gl.createShader(gl.FRAGMENT_SHADER)
  if (!fragment) {
    throw new Error('Failed to create line fragment shader')
  }
  gl.shaderSource(fragment, fragmentSource)
  gl.compileShader(fragment)
  if (!gl.getShaderParameter(fragment, gl.COMPILE_STATUS)) {
    throw new Error(
      `Line fragment compile error: ${gl.getShaderInfoLog(fragment)}`,
    )
  }

  const program = gl.createProgram()
  if (!program) {
    throw new Error('Failed to create line program')
  }

  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Line program link error: ${gl.getProgramInfoLog(program)}`)
  }

  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  return program
}

export class LineProgram {
  private gl: WebGL2RenderingContext

  private program!: WebGLProgram

  private vao!: WebGLVertexArrayObject

  private buffer!: WebGLBuffer

  private colorLocation!: WebGLUniformLocation

  // Viewport transform uniforms
  private xScaleLocation!: WebGLUniformLocation

  private xOffsetLocation!: WebGLUniformLocation

  private yScaleLocation!: WebGLUniformLocation

  private yOffsetLocation!: WebGLUniformLocation

  private modeLocation!: WebGLUniformLocation

  private basePriceLocation!: WebGLUniformLocation

  private viewportWLocation!: WebGLUniformLocation | null

  private viewportHLocation!: WebGLUniformLocation | null

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
    this.program = compileProgram(gl, LINE_VERT, LINE_FRAG)

    const vao = gl.createVertexArray()
    if (!vao) {
      throw new Error('Failed to create line VAO')
    }
    this.vao = vao

    const buffer = gl.createBuffer()
    if (!buffer) {
      throw new Error('Failed to create line buffer')
    }
    this.buffer = buffer

    const colorLocation = gl.getUniformLocation(this.program, 'u_color')
    if (!colorLocation) {
      throw new Error('Missing line color uniform')
    }
    this.colorLocation = colorLocation

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
   * Draw points with optional viewport transform uniforms.
   * When viewportUniforms is omitted, uses identity (passthrough for NDC-baked data).
   * This preserves backward compat for volume pass and compare mode.
   */
  draw(
    points: Float32Array,
    color: [number, number, number, number],
    mode?: number,
    viewportUniforms?: ViewportUniforms,
  ): void {
    if (points.length < 4) {
      return
    }

    const gl = this.gl
    gl.useProgram(this.program)
    gl.uniform4fv(this.colorLocation, color)
    this.setViewportUniforms(viewportUniforms ?? IDENTITY_VIEWPORT_UNIFORMS)

    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, points, gl.DYNAMIC_DRAW)
    gl.drawArrays(mode ?? gl.LINE_STRIP, 0, points.length / 2)
    gl.bindVertexArray(null)
  }

  dispose(): void {
    const gl = this.gl
    gl.deleteProgram(this.program)
    gl.deleteVertexArray(this.vao)
    gl.deleteBuffer(this.buffer)
  }
}
