/**
 * Interleaved instance data layout (6 floats per instance, stride = 24 bytes):
 *   [open, high, low, close, barIndex, partType]
 *
 * Raw price values + bar index — the vertex shader computes NDC positions
 * using viewport uniforms (u_xScale, u_xOffset, u_yScale, u_yOffset, u_halfW).
 *
 * partType values:
 *   0 = body        (rect between open/close, filled)
 *   1 = wick        (thin rect between high/low)
 *   2 = hollow body (rect between open/close; up bodies render border-only)
 *   3 = range body  (full-width rect between high/low, filled — used by
 *                    highLow/column chart types; open/close only drive color)
 *
 * Candle-style charts produce 2 instances per bar (body + wick); histogram,
 * highLow and column charts produce 1 instance per bar.
 */

import { VIEWPORT_UNIFORMS_GLSL } from '../shaders/viewport-glsl'
import type { ViewportUniforms } from '../shaders/viewport-uniforms'

export const FLOATS_PER_INSTANCE = 6
const BYTES_PER_FLOAT = 4
const INSTANCE_STRIDE = FLOATS_PER_INSTANCE * BYTES_PER_FLOAT

const CANDLE_VERT = `#version 300 es
precision highp float;

${VIEWPORT_UNIFORMS_GLSL}
uniform float u_halfW;

in vec2 a_quad;
in float i_open;
in float i_high;
in float i_low;
in float i_close;
in float i_barIndex;
in float i_isWick;

out float v_isUp;
out float v_hollow;
out vec2 v_quadPos;
out vec2 v_sizePx;
out float v_borderPx;

void main() {
  float ndcOpen = priceToNdcY(i_open);
  float ndcHigh = priceToNdcY(i_high);
  float ndcLow = priceToNdcY(i_low);
  float ndcClose = priceToNdcY(i_close);
  float ndcX = indexToNdcX(i_barIndex);

  v_isUp = i_close >= i_open ? 1.0 : 0.0;

  float bodyTop = max(ndcOpen, ndcClose);
  float bodyBot = min(ndcOpen, ndcClose);

  // Physical-pixel-aware minimums (replaces NDC-space 0.001 constant)
  float pixelW = 2.0 / u_viewportW;
  float pixelH = 2.0 / u_viewportH;
  float wickHalfW = max(pixelW * 0.5, u_halfW * 0.14);

  bool isWick = i_isWick > 0.5 && i_isWick < 1.5;
  bool isRange = i_isWick > 2.5;

  float left;
  float right;
  float top;
  float bottom;

  if (isWick) {
    left = ndcX - wickHalfW;
    right = ndcX + wickHalfW;
    top = ndcHigh;
    bottom = ndcLow;
  } else {
    left = ndcX - u_halfW;
    right = ndcX + u_halfW;
    // Range bodies (partType 3) span high..low; regular bodies span open..close
    top = isRange ? ndcHigh : bodyTop;
    bottom = isRange ? ndcLow : bodyBot;

    // Enforce minimum 1 physical pixel height for doji candles
    if (top - bottom < pixelH) {
      float center = (top + bottom) * 0.5;
      top = center + pixelH * 0.5;
      bottom = center - pixelH * 0.5;
    }
  }

  // Snap all edges to physical pixel centers for razor-sharp rendering
  left = snapX(left);
  right = snapX(right);
  top = snapY(top);
  bottom = snapY(bottom);

  // Hollow candles: up bodies (partType 2) render as border-only in the
  // fragment shader. Border thickness matches the wick width.
  v_hollow = (i_isWick > 1.5 && i_isWick < 2.5 && v_isUp > 0.5) ? 1.0 : 0.0;
  v_quadPos = a_quad;
  v_sizePx = vec2(
    (right - left) * u_viewportW * 0.5,
    (top - bottom) * u_viewportH * 0.5
  );
  v_borderPx = max(1.0, wickHalfW * u_viewportW);

  float px = mix(left, right, a_quad.x);
  float py = mix(bottom, top, a_quad.y);
  gl_Position = vec4(px, py, 0.0, 1.0);
}
`

const CANDLE_FRAG = `#version 300 es
precision highp float;

uniform vec4 u_upColor;
uniform vec4 u_downColor;

in float v_isUp;
in float v_hollow;
in vec2 v_quadPos;
in vec2 v_sizePx;
in float v_borderPx;
out vec4 fragColor;

void main() {
  vec4 candleColor = v_isUp > 0.5 ? u_upColor : u_downColor;
  if (v_hollow > 0.5) {
    // Discard interior fragments, keeping a border of v_borderPx pixels
    vec2 px = v_quadPos * v_sizePx;
    vec2 edgeDist = min(px, v_sizePx - px);
    if (min(edgeDist.x, edgeDist.y) > v_borderPx) {
      discard;
    }
  }
  fragColor = candleColor;
}
`

const compileProgram = (
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram => {
  const vertex = gl.createShader(gl.VERTEX_SHADER)
  if (!vertex) {
    throw new Error('Failed to create vertex shader')
  }

  gl.shaderSource(vertex, vertexSource)
  gl.compileShader(vertex)
  if (!gl.getShaderParameter(vertex, gl.COMPILE_STATUS)) {
    throw new Error(`Vertex compile error: ${gl.getShaderInfoLog(vertex)}`)
  }

  const fragment = gl.createShader(gl.FRAGMENT_SHADER)
  if (!fragment) {
    throw new Error('Failed to create fragment shader')
  }

  gl.shaderSource(fragment, fragmentSource)
  gl.compileShader(fragment)
  if (!gl.getShaderParameter(fragment, gl.COMPILE_STATUS)) {
    throw new Error(`Fragment compile error: ${gl.getShaderInfoLog(fragment)}`)
  }

  const program = gl.createProgram()
  if (!program) {
    throw new Error('Failed to create shader program')
  }

  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`)
  }

  gl.deleteShader(vertex)
  gl.deleteShader(fragment)

  return program
}

export class CandleProgram {
  private gl: WebGL2RenderingContext

  private program!: WebGLProgram

  private vao!: WebGLVertexArrayObject

  private quadBuffer!: WebGLBuffer

  private interleavedBuffer!: WebGLBuffer

  private upColorLocation!: WebGLUniformLocation

  private downColorLocation!: WebGLUniformLocation

  // Viewport transform uniforms
  private xScaleLocation!: WebGLUniformLocation

  private xOffsetLocation!: WebGLUniformLocation

  private yScaleLocation!: WebGLUniformLocation

  private yOffsetLocation!: WebGLUniformLocation

  private modeLocation!: WebGLUniformLocation

  private basePriceLocation!: WebGLUniformLocation

  private halfWLocation!: WebGLUniformLocation

  private viewportWLocation!: WebGLUniformLocation

  private viewportHLocation!: WebGLUniformLocation

  /** Pre-allocated interleaved buffer. Grows but never shrinks. */
  private interleavedData = new Float32Array(0)

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
    this.program = compileProgram(gl, CANDLE_VERT, CANDLE_FRAG)

    const vao = gl.createVertexArray()
    if (!vao) {
      throw new Error('Failed to create candle VAO')
    }
    this.vao = vao

    const quad = gl.createBuffer()
    if (!quad) {
      throw new Error('Failed to create candle quad buffer')
    }
    this.quadBuffer = quad

    const interleavedBuffer = gl.createBuffer()
    if (!interleavedBuffer) {
      throw new Error('Failed to create candle interleaved buffer')
    }
    this.interleavedBuffer = interleavedBuffer

    const upColor = gl.getUniformLocation(this.program, 'u_upColor')
    const downColor = gl.getUniformLocation(this.program, 'u_downColor')

    if (!upColor || !downColor) {
      throw new Error('Missing candle uniform locations')
    }

    this.upColorLocation = upColor
    this.downColorLocation = downColor

    // Viewport transform uniforms
    this.xScaleLocation = gl.getUniformLocation(this.program, 'u_xScale')!
    this.xOffsetLocation = gl.getUniformLocation(this.program, 'u_xOffset')!
    this.yScaleLocation = gl.getUniformLocation(this.program, 'u_yScale')!
    this.yOffsetLocation = gl.getUniformLocation(this.program, 'u_yOffset')!
    this.modeLocation = gl.getUniformLocation(this.program, 'u_mode')!
    this.basePriceLocation = gl.getUniformLocation(this.program, 'u_basePrice')!
    this.halfWLocation = gl.getUniformLocation(this.program, 'u_halfW')!
    this.viewportWLocation = gl.getUniformLocation(this.program, 'u_viewportW')!
    this.viewportHLocation = gl.getUniformLocation(this.program, 'u_viewportH')!

    this.initializeAttributes()
  }

  private initializeAttributes(): void {
    const gl = this.gl
    gl.bindVertexArray(this.vao)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
      gl.STATIC_DRAW,
    )

    const quadLocation = gl.getAttribLocation(this.program, 'a_quad')
    gl.enableVertexAttribArray(quadLocation)
    gl.vertexAttribPointer(quadLocation, 2, gl.FLOAT, false, 0, 0)

    // All 6 instance attributes read from one interleaved buffer with stride/offset
    gl.bindBuffer(gl.ARRAY_BUFFER, this.interleavedBuffer)

    const attribs = [
      'i_open',
      'i_high',
      'i_low',
      'i_close',
      'i_barIndex',
      'i_isWick',
    ]
    for (let i = 0; i < attribs.length; i += 1) {
      const location = gl.getAttribLocation(this.program, attribs[i])
      gl.enableVertexAttribArray(location)
      gl.vertexAttribPointer(
        location,
        1,
        gl.FLOAT,
        false,
        INSTANCE_STRIDE,
        i * BYTES_PER_FLOAT,
      )
      gl.vertexAttribDivisor(location, 1)
    }

    gl.bindVertexArray(null)
  }

  /**
   * Ensure the interleaved buffer is large enough for `count` instances.
   * Returns the Float32Array for direct writes by the caller (zero-alloc hot path).
   */
  ensureBuffer(count: number): Float32Array {
    const needed = count * FLOATS_PER_INSTANCE
    if (this.interleavedData.length < needed) {
      this.interleavedData = new Float32Array(needed)
    }
    return this.interleavedData
  }

  /**
   * Re-upload a contiguous range of instances from the CPU mirror into the
   * GPU buffer via bufferSubData (partial update, no full re-upload).
   *
   * The caller must have written the range into the buffer returned by
   * ensureBuffer(), and the GPU buffer must already contain at least
   * `firstInstance + instanceCount` instances from a prior drawInterleaved()
   * (bufferSubData cannot grow the GPU buffer).
   *
   * Zero-alloc: uses the WebGL2 srcOffset/length overload instead of subarray.
   */
  updateInstances(firstInstance: number, instanceCount: number): void {
    if (instanceCount <= 0) {
      return
    }

    const gl = this.gl
    gl.bindBuffer(gl.ARRAY_BUFFER, this.interleavedBuffer)
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      firstInstance * INSTANCE_STRIDE,
      this.interleavedData,
      firstInstance * FLOATS_PER_INSTANCE,
      instanceCount * FLOATS_PER_INSTANCE,
    )
  }

  /**
   * Upload pre-filled interleaved data and draw.
   * The caller must have written into the buffer returned by ensureBuffer().
   */
  drawInterleaved(
    instanceCount: number,
    colors: {
      up: [number, number, number, number]
      down: [number, number, number, number]
    },
    viewportUniforms: ViewportUniforms,
  ): void {
    if (instanceCount === 0) {
      return
    }

    const gl = this.gl
    const floatLength = instanceCount * FLOATS_PER_INSTANCE

    gl.bindBuffer(gl.ARRAY_BUFFER, this.interleavedBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.interleavedData.subarray(0, floatLength),
      gl.DYNAMIC_DRAW,
    )

    gl.useProgram(this.program)
    gl.uniform4fv(this.upColorLocation, colors.up)
    gl.uniform4fv(this.downColorLocation, colors.down)

    // Set viewport transform uniforms
    gl.uniform1f(this.xScaleLocation, viewportUniforms.xScale)
    gl.uniform1f(this.xOffsetLocation, viewportUniforms.xOffset)
    gl.uniform1f(this.yScaleLocation, viewportUniforms.yScale)
    gl.uniform1f(this.yOffsetLocation, viewportUniforms.yOffset)
    gl.uniform1f(this.modeLocation, viewportUniforms.mode)
    gl.uniform1f(this.basePriceLocation, viewportUniforms.basePrice)
    gl.uniform1f(this.halfWLocation, viewportUniforms.halfW)
    gl.uniform1f(this.viewportWLocation, viewportUniforms.viewportW)
    gl.uniform1f(this.viewportHLocation, viewportUniforms.viewportH)

    gl.bindVertexArray(this.vao)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, instanceCount)
    gl.bindVertexArray(null)
  }

  /**
   * Redraw with updated viewport uniforms but without re-uploading buffer data.
   * Used when only the viewport changed (VIEWPORT dirty, not GEOMETRY).
   */
  drawWithCachedBuffer(
    instanceCount: number,
    colors: {
      up: [number, number, number, number]
      down: [number, number, number, number]
    },
    viewportUniforms: ViewportUniforms,
  ): void {
    if (instanceCount === 0) {
      return
    }

    const gl = this.gl
    gl.useProgram(this.program)
    gl.uniform4fv(this.upColorLocation, colors.up)
    gl.uniform4fv(this.downColorLocation, colors.down)

    gl.uniform1f(this.xScaleLocation, viewportUniforms.xScale)
    gl.uniform1f(this.xOffsetLocation, viewportUniforms.xOffset)
    gl.uniform1f(this.yScaleLocation, viewportUniforms.yScale)
    gl.uniform1f(this.yOffsetLocation, viewportUniforms.yOffset)
    gl.uniform1f(this.modeLocation, viewportUniforms.mode)
    gl.uniform1f(this.basePriceLocation, viewportUniforms.basePrice)
    gl.uniform1f(this.halfWLocation, viewportUniforms.halfW)
    gl.uniform1f(this.viewportWLocation, viewportUniforms.viewportW)
    gl.uniform1f(this.viewportHLocation, viewportUniforms.viewportH)

    gl.bindVertexArray(this.vao)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, instanceCount)
    gl.bindVertexArray(null)
  }

  dispose(): void {
    const gl = this.gl
    gl.deleteProgram(this.program)
    gl.deleteVertexArray(this.vao)
    gl.deleteBuffer(this.quadBuffer)
    gl.deleteBuffer(this.interleavedBuffer)
  }
}
