/**
 * Shared GLSL uniform block and helpers for GPU-side NDC viewport transforms.
 * Prepended to all vertex shaders that need price/index → NDC conversion.
 *
 * u_mode encoding: 0=normal, 1=logarithmic, 2=percentage, 3=indexedTo100
 * Thresholds (0.5, 1.5, 2.5) avoid floating-point integer equality issues.
 */
export const VIEWPORT_UNIFORMS_GLSL = `
uniform float u_xScale;
uniform float u_xOffset;
uniform float u_yScale;
uniform float u_yOffset;
uniform float u_mode;
uniform float u_basePrice;
uniform float u_viewportW;
uniform float u_viewportH;

// Snap an NDC coordinate to the nearest physical pixel center.
// NDC [-1,1] -> pixel [0, viewport] -> floor + 0.5 -> back to NDC.
float snapX(float ndcX) {
  float px = (ndcX * 0.5 + 0.5) * u_viewportW;
  px = floor(px) + 0.5;
  return (px / u_viewportW) * 2.0 - 1.0;
}

float snapY(float ndcY) {
  float py = (ndcY * 0.5 + 0.5) * u_viewportH;
  py = floor(py) + 0.5;
  return (py / u_viewportH) * 2.0 - 1.0;
}

float priceToNdcY(float price) {
  float value = price;
  if (u_mode > 2.5) {
    // indexedTo100: (price / basePrice) * 100
    value = (price / max(1e-10, u_basePrice)) * 100.0;
  } else if (u_mode > 1.5) {
    // percentage: ((price - basePrice) / basePrice) * 100
    value = ((price - u_basePrice) / max(1e-10, u_basePrice)) * 100.0;
  } else if (u_mode > 0.5) {
    // logarithmic: log(price)
    value = log(max(1e-10, price));
  }
  // else normal: identity
  return clamp(value * u_yScale + u_yOffset, -1.0, 1.0);
}

float indexToNdcX(float idx) {
  return idx * u_xScale + u_xOffset;
}
`
