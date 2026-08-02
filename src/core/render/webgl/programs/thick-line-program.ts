/**
 * Thick line rendering via triangle-strip ribbon with GPU-side miter join computation.
 *
 * Buffer layout (7 floats per vertex, 2 vertices per polyline point):
 *   [barIndex, price, prevBarIndex, prevPrice, nextBarIndex, nextPrice, side]
 *
 * Where side = -1.0 (left) or +1.0 (right) of the ribbon.
 *
 * The vertex shader converts all three points (curr, prev, next) to NDC using
 * viewport uniforms, then computes screen-space miter normals and extrudes by
 * halfLineWidth in pixels for constant-pixel-width lines regardless of zoom level.
 */

import { VIEWPORT_UNIFORMS_GLSL } from '../shaders/viewport-glsl'
import type { ViewportUniforms } from '../shaders/viewport-uniforms'

export const THICK_LINE_FLOATS_PER_VERTEX = 7
const BYTES_PER_FLOAT = 4
const VERTEX_STRIDE = THICK_LINE_FLOATS_PER_VERTEX * BYTES_PER_FLOAT

const THICK_LINE_VERT = `#version 300 es
precision highp float;

${VIEWPORT_UNIFORMS_GLSL}

in float a_barIndex;
in float a_price;
in float a_prevBarIndex;
in float a_prevPrice;
in float a_nextBarIndex;
in float a_nextPrice;
in float a_side;

uniform float u_halfLineWidth;

void main() {
  // Convert current, prev, next to NDC
  vec2 curr = vec2(indexToNdcX(a_barIndex), priceToNdcY(a_price));
  vec2 prev = vec2(indexToNdcX(a_prevBarIndex), priceToNdcY(a_prevPrice));
  vec2 next = vec2(indexToNdcX(a_nextBarIndex), priceToNdcY(a_nextPrice));

  // Convert NDC to screen space (pixels)
  vec2 currPx = (curr * 0.5 + 0.5) * vec2(u_viewportW, u_viewportH);
  vec2 prevPx = (prev * 0.5 + 0.5) * vec2(u_viewportW, u_viewportH);
  vec2 nextPx = (next * 0.5 + 0.5) * vec2(u_viewportW, u_viewportH);

  // Segment directions in screen space
  vec2 dir1 = currPx - prevPx;
  vec2 dir2 = nextPx - currPx;

  float len1 = length(dir1);
  float len2 = length(dir2);

  // Handle edge cases: first/last point or zero-length segments
  vec2 normal;
  if (len1 < 0.001 && len2 < 0.001) {
    normal = vec2(0.0, 1.0);
  } else if (len1 < 0.001) {
    vec2 d = normalize(dir2);
    normal = vec2(-d.y, d.x);
  } else if (len2 < 0.001) {
    vec2 d = normalize(dir1);
    normal = vec2(-d.y, d.x);
  } else {
    vec2 d1 = normalize(dir1);
    vec2 d2 = normalize(dir2);
    vec2 tangent = normalize(d1 + d2);
    vec2 miter = vec2(-tangent.y, tangent.x);

    // Miter length correction — clamp to prevent spikes at sharp angles
    vec2 n1 = vec2(-d1.y, d1.x);
    float miterDot = dot(miter, n1);
    float miterScale = 1.0 / max(abs(miterDot), 0.4);
    // Cap miter at 2.5x to prevent extreme spikes
    miterScale = min(miterScale, 2.5);

    normal = miter * miterScale;
  }

  // Extrude by halfLineWidth in screen space
  vec2 offsetPx = currPx + a_side * normal * u_halfLineWidth;

  // Convert back to NDC
  vec2 ndc = (offsetPx / vec2(u_viewportW, u_viewportH)) * 2.0 - 1.0;
  gl_Position = vec4(ndc, 0.0, 1.0);
}
`

const THICK_LINE_FRAG = `#version 300 es
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
    throw new Error('Failed to create thick-line vertex shader')
  }

  gl.shaderSource(vertex, vertexSource)
  gl.compileShader(vertex)
  if (!gl.getShaderParameter(vertex, gl.COMPILE_STATUS)) {
    throw new Error(
      `ThickLine vertex compile error: ${gl.getShaderInfoLog(vertex)}`,
    )
  }

  const fragment = gl.createShader(gl.FRAGMENT_SHADER)
  if (!fragment) {
    throw new Error('Failed to create thick-line fragment shader')
  }

  gl.shaderSource(fragment, fragmentSource)
  gl.compileShader(fragment)
  if (!gl.getShaderParameter(fragment, gl.COMPILE_STATUS)) {
    throw new Error(
      `ThickLine fragment compile error: ${gl.getShaderInfoLog(fragment)}`,
    )
  }

  const program = gl.createProgram()
  if (!program) {
    throw new Error('Failed to create thick-line program')
  }

  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(
      `ThickLine program link error: ${gl.getProgramInfoLog(program)}`,
    )
  }

  gl.deleteShader(vertex)
  gl.deleteShader(fragment)

  return program
}

export class ThickLineProgram {
  private gl: WebGL2RenderingContext

  private program!: WebGLProgram

  private vao!: WebGLVertexArrayObject

  private vertexBuffer!: WebGLBuffer

  private colorLocation!: WebGLUniformLocation

  private halfLineWidthLocation!: WebGLUniformLocation

  // Viewport transform uniforms
  private xScaleLocation!: WebGLUniformLocation

  private xOffsetLocation!: WebGLUniformLocation

  private yScaleLocation!: WebGLUniformLocation

  private yOffsetLocation!: WebGLUniformLocation

  private modeLocation!: WebGLUniformLocation

  private basePriceLocation!: WebGLUniformLocation

  private viewportWLocation!: WebGLUniformLocation

  private viewportHLocation!: WebGLUniformLocation

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
    this.program = compileProgram(gl, THICK_LINE_VERT, THICK_LINE_FRAG)

    const vao = gl.createVertexArray()
    if (!vao) {
      throw new Error('Failed to create thick-line VAO')
    }
    this.vao = vao

    const vertexBuffer = gl.createBuffer()
    if (!vertexBuffer) {
      throw new Error('Failed to create thick-line vertex buffer')
    }
    this.vertexBuffer = vertexBuffer

    const colorLocation = gl.getUniformLocation(this.program, 'u_color')
    if (!colorLocation) {
      throw new Error('Missing thick-line color uniform')
    }
    this.colorLocation = colorLocation

    const halfLineWidthLocation = gl.getUniformLocation(
      this.program,
      'u_halfLineWidth',
    )
    if (!halfLineWidthLocation) {
      throw new Error('Missing thick-line halfLineWidth uniform')
    }
    this.halfLineWidthLocation = halfLineWidthLocation

    // Viewport transform uniforms
    this.xScaleLocation = gl.getUniformLocation(this.program, 'u_xScale')!
    this.xOffsetLocation = gl.getUniformLocation(this.program, 'u_xOffset')!
    this.yScaleLocation = gl.getUniformLocation(this.program, 'u_yScale')!
    this.yOffsetLocation = gl.getUniformLocation(this.program, 'u_yOffset')!
    this.modeLocation = gl.getUniformLocation(this.program, 'u_mode')!
    this.basePriceLocation = gl.getUniformLocation(this.program, 'u_basePrice')!
    this.viewportWLocation = gl.getUniformLocation(this.program, 'u_viewportW')!
    this.viewportHLocation = gl.getUniformLocation(this.program, 'u_viewportH')!

    this.initializeAttributes()
  }

  private initializeAttributes(): void {
    const gl = this.gl
    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)

    const attribs = [
      'a_barIndex',
      'a_price',
      'a_prevBarIndex',
      'a_prevPrice',
      'a_nextBarIndex',
      'a_nextPrice',
      'a_side',
    ]

    for (let i = 0; i < attribs.length; i += 1) {
      const location = gl.getAttribLocation(this.program, attribs[i])
      gl.enableVertexAttribArray(location)
      gl.vertexAttribPointer(
        location,
        1,
        gl.FLOAT,
        false,
        VERTEX_STRIDE,
        i * BYTES_PER_FLOAT,
      )
    }

    gl.bindVertexArray(null)
  }

  /**
   * Ensure the vertex buffer is large enough for `count` vertices.
   * Returns the Float32Array for direct writes by the caller (zero-alloc hot path).
   */
  ensureBuffer(vertexCount: number): Float32Array {
    const needed = vertexCount * THICK_LINE_FLOATS_PER_VERTEX
    if (this.vertexData.length < needed) {
      this.vertexData = new Float32Array(needed)
    }
    return this.vertexData
  }

  private setViewportUniforms(uniforms: ViewportUniforms): void {
    const gl = this.gl
    gl.uniform1f(this.xScaleLocation, uniforms.xScale)
    gl.uniform1f(this.xOffsetLocation, uniforms.xOffset)
    gl.uniform1f(this.yScaleLocation, uniforms.yScale)
    gl.uniform1f(this.yOffsetLocation, uniforms.yOffset)
    gl.uniform1f(this.modeLocation, uniforms.mode)
    gl.uniform1f(this.basePriceLocation, uniforms.basePrice)
    gl.uniform1f(this.viewportWLocation, uniforms.viewportW)
    gl.uniform1f(this.viewportHLocation, uniforms.viewportH)
  }

  /**
   * Upload pre-filled vertex data and draw.
   * The caller must have written into the buffer returned by ensureBuffer().
   */
  drawInterleaved(
    vertexCount: number,
    color: [number, number, number, number],
    halfLineWidth: number,
    viewportUniforms: ViewportUniforms,
  ): void {
    if (vertexCount < 4) {
      return
    }

    const gl = this.gl
    const floatLength = vertexCount * THICK_LINE_FLOATS_PER_VERTEX

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.vertexData.subarray(0, floatLength),
      gl.DYNAMIC_DRAW,
    )

    gl.useProgram(this.program)
    gl.uniform4fv(this.colorLocation, color)
    gl.uniform1f(this.halfLineWidthLocation, halfLineWidth)
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
    color: [number, number, number, number],
    halfLineWidth: number,
    viewportUniforms: ViewportUniforms,
  ): void {
    if (vertexCount < 4) {
      return
    }

    const gl = this.gl
    gl.useProgram(this.program)
    gl.uniform4fv(this.colorLocation, color)
    gl.uniform1f(this.halfLineWidthLocation, halfLineWidth)
    this.setViewportUniforms(viewportUniforms)

    gl.bindVertexArray(this.vao)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount)
    gl.bindVertexArray(null)
  }

  dispose(): void {
    const gl = this.gl
    gl.deleteProgram(this.program)
    gl.deleteVertexArray(this.vao)
    gl.deleteBuffer(this.vertexBuffer)
  }
}
