// ============================================================================
// Gesture Arena — Vector Math & Numeric Utilities
// ============================================================================

import type { Vec2 } from '../engine/types';

// ---------------------------------------------------------------------------
// Vec2 operations
// ---------------------------------------------------------------------------

/** Add two vectors component-wise. */
export function vec2Add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Subtract b from a component-wise. */
export function vec2Sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Multiply a vector by a scalar. */
export function vec2Multiply(v: Vec2, scalar: number): Vec2 {
  return { x: v.x * scalar, y: v.y * scalar };
}

/** Divide a vector by a scalar. Returns zero vector when dividing by zero. */
export function vec2Divide(v: Vec2, scalar: number): Vec2 {
  if (scalar === 0) return { x: 0, y: 0 };
  return { x: v.x / scalar, y: v.y / scalar };
}

/** Magnitude (length) of a vector. */
export function vec2Length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/** Return a unit-length vector in the same direction. Returns zero if input is zero-length. */
export function vec2Normalize(v: Vec2): Vec2 {
  const len = vec2Length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/** Euclidean distance between two points. */
export function vec2Distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Dot product of two vectors. */
export function vec2Dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

/** Linearly interpolate between a and b by factor t (0 → a, 1 → b). */
export function vec2Lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

// ---------------------------------------------------------------------------
// Smoothing
// ---------------------------------------------------------------------------

/**
 * Exponential moving average (EMA) smoother.
 *
 * Returns `alpha * current + (1 - alpha) * previous`.
 * - alpha close to 0 → heavy smoothing (more weight on previous)
 * - alpha close to 1 → light smoothing (more weight on current)
 *
 * For our use-case the TRACKING.SMOOTHING_FACTOR is the *smoothness* dial,
 * so we treat it as "how much of the previous frame to keep". The caller can
 * pass `1 - smoothingFactor` as `alpha` to use it that way, or use this
 * helper which already expects `alpha` in the range 0-1.
 */
export function emaSmooth(previous: number, current: number, alpha: number): number {
  return alpha * current + (1 - alpha) * previous;
}

/** EMA smooth an entire Vec2 at once. */
export function emaSmoothVec2(previous: Vec2, current: Vec2, alpha: number): Vec2 {
  return {
    x: emaSmooth(previous.x, current.x, alpha),
    y: emaSmooth(previous.y, current.y, alpha),
  };
}

// ---------------------------------------------------------------------------
// Angles
// ---------------------------------------------------------------------------

/**
 * Signed angle (in radians) from vector a to vector b.
 * Range: -π to π. Positive = counter-clockwise.
 */
export function angleBetween(a: Vec2, b: Vec2): number {
  return Math.atan2(
    a.x * b.y - a.y * b.x,   // cross product z-component
    a.x * b.x + a.y * b.y,   // dot product
  );
}

/**
 * Unsigned angle (in radians) between two vectors.
 * Range: 0 to π.
 */
export function angleBetweenUnsigned(a: Vec2, b: Vec2): number {
  const lenA = vec2Length(a);
  const lenB = vec2Length(b);
  if (lenA === 0 || lenB === 0) return 0;
  const cosAngle = clamp(vec2Dot(a, b) / (lenA * lenB), -1, 1);
  return Math.acos(cosAngle);
}

// ---------------------------------------------------------------------------
// Scalar helpers
// ---------------------------------------------------------------------------

/** Clamp value between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Map a value from one range to another.
 * `mapRange(0.5, 0, 1, 100, 200)` → 150
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  // Avoid division by zero when the input range is degenerate
  if (inMax === inMin) return (outMin + outMax) / 2;
  const t = (value - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

/** Distance between two 3D points (used for landmark comparison). */
export function distance3D(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
