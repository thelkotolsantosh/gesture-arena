// ============================================================================
// Gesture Arena — Gesture Detection Algorithms
// ============================================================================

import type { Landmark, GestureType } from '../engine/types';
import { LANDMARK } from '../engine/types';
import { distance3D } from './math';

// ---------------------------------------------------------------------------
// Finger state types
// ---------------------------------------------------------------------------

export interface FingerStates {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

// ---------------------------------------------------------------------------
// Finger extension detection
// ---------------------------------------------------------------------------

/**
 * Check whether a single finger is extended.
 *
 * A finger is "extended" when its tip is farther from the wrist than its PIP
 * joint AND the tip-to-MCP distance exceeds the PIP-to-MCP distance
 * (i.e. the finger isn't curled back).
 *
 * @param landmarks  All 21 hand landmarks
 * @param tipIdx     Landmark index of the finger tip
 * @param pipIdx     Landmark index of the finger PIP (proximal interphalangeal)
 * @param mcpIdx     Landmark index of the finger MCP (metacarpophalangeal)
 */
export function isFingerExtended(
  landmarks: Landmark[],
  tipIdx: number,
  pipIdx: number,
  mcpIdx: number,
): boolean {
  const tip = landmarks[tipIdx];
  const pip = landmarks[pipIdx];
  const mcp = landmarks[mcpIdx];
  const wrist = landmarks[LANDMARK.WRIST];

  // Tip must be farther from wrist than PIP
  const tipToWrist = distance3D(tip, wrist);
  const pipToWrist = distance3D(pip, wrist);

  // Tip must be farther from MCP than PIP is from MCP
  const tipToMcp = distance3D(tip, mcp);
  const pipToMcp = distance3D(pip, mcp);

  return tipToWrist > pipToWrist && tipToMcp > pipToMcp;
}

/**
 * Detect thumb extension with handedness awareness.
 *
 * The thumb is considered extended when its tip is farther from the index
 * finger MCP than the thumb MCP is, AND the thumb tip's x-position is
 * outside the index MCP relative to the handedness.
 *
 * @param landmarks   All 21 hand landmarks
 * @param handedness  'Left' | 'Right' — from MediaPipe detection
 */
export function isThumbExtended(landmarks: Landmark[], handedness: 'Left' | 'Right'): boolean {
  const thumbTip = landmarks[LANDMARK.THUMB_TIP];
  const thumbIp = landmarks[LANDMARK.THUMB_IP];
  const thumbMcp = landmarks[LANDMARK.THUMB_MCP];
  const indexMcp = landmarks[LANDMARK.INDEX_MCP];

  // Distance check: thumb tip should be farther from index MCP
  const tipToIndex = distance3D(thumbTip, indexMcp);
  const mcpToIndex = distance3D(thumbMcp, indexMcp);

  if (tipToIndex <= mcpToIndex) return false;

  // Thumb IP should also be farther from base than when curled
  const tipToMcp = distance3D(thumbTip, thumbMcp);
  const ipToMcp = distance3D(thumbIp, thumbMcp);

  if (tipToMcp <= ipToMcp * 0.8) return false;

  // Positional check:
  // MediaPipe returns landmarks as seen from the camera (mirrored).
  // For a "Right" label from MediaPipe (which is the user's right hand
  // viewed mirrored), the thumb extends to the LEFT of the index MCP in
  // image space (smaller x). Vice versa for "Left".
  if (handedness === 'Right') {
    return thumbTip.x < indexMcp.x;
  } else {
    return thumbTip.x > indexMcp.x;
  }
}

// ---------------------------------------------------------------------------
// Get states for all five fingers
// ---------------------------------------------------------------------------

/**
 * Returns extended/curled state for each finger.
 * Thumb detection is handedness-aware; defaults to 'Right' if not provided.
 */
export function getFingerStates(
  landmarks: Landmark[],
  handedness: 'Left' | 'Right' = 'Right',
): FingerStates {
  return {
    thumb: isThumbExtended(landmarks, handedness),
    index: isFingerExtended(landmarks, LANDMARK.INDEX_TIP, LANDMARK.INDEX_PIP, LANDMARK.INDEX_MCP),
    middle: isFingerExtended(landmarks, LANDMARK.MIDDLE_TIP, LANDMARK.MIDDLE_PIP, LANDMARK.MIDDLE_MCP),
    ring: isFingerExtended(landmarks, LANDMARK.RING_TIP, LANDMARK.RING_PIP, LANDMARK.RING_MCP),
    pinky: isFingerExtended(landmarks, LANDMARK.PINKY_TIP, LANDMARK.PINKY_PIP, LANDMARK.PINKY_MCP),
  };
}

// ---------------------------------------------------------------------------
// Static gesture classification
// ---------------------------------------------------------------------------

/**
 * Classify the hand pose into a static gesture type based on finger states.
 * Returns the detected gesture and a rough confidence score (0–1).
 */
export function classifyStaticGesture(
  fingerStates: FingerStates,
  landmarks: Landmark[],
): { gesture: GestureType; confidence: number } {
  const { thumb, index, middle, ring, pinky } = fingerStates;

  const extendedCount = [thumb, index, middle, ring, pinky].filter(Boolean).length;

  // --- OPEN_PALM: all five fingers extended ---------------------------------
  if (thumb && index && middle && ring && pinky) {
    // Confidence boost if fingers are well spread
    const indexTip = landmarks[LANDMARK.INDEX_TIP];
    const pinkyTip = landmarks[LANDMARK.PINKY_TIP];
    const spread = distance3D(indexTip, pinkyTip);
    const confidence = Math.min(0.7 + spread * 2, 1.0);
    return { gesture: 'OPEN_PALM', confidence };
  }

  // --- CLOSED_FIST: no fingers extended (or only thumb slightly out) --------
  if (!index && !middle && !ring && !pinky && !thumb) {
    return { gesture: 'CLOSED_FIST', confidence: 0.9 };
  }
  if (extendedCount === 0) {
    return { gesture: 'CLOSED_FIST', confidence: 0.85 };
  }

  // --- PEACE_SIGN: index + middle extended, others curled -------------------
  if (index && middle && !ring && !pinky) {
    // Allow thumb in either state for peace sign
    const confidence = thumb ? 0.75 : 0.9;
    return { gesture: 'PEACE_SIGN', confidence };
  }

  // --- THUMBS_UP: only thumb extended, all fingers curled -------------------
  if (thumb && !index && !middle && !ring && !pinky) {
    // Additional check: thumb tip should be above index MCP (in y-axis)
    // MediaPipe y increases downward, so "above" = smaller y
    const thumbTip = landmarks[LANDMARK.THUMB_TIP];
    const indexMcp = landmarks[LANDMARK.INDEX_MCP];
    const isUp = thumbTip.y < indexMcp.y;
    const confidence = isUp ? 0.9 : 0.65;
    return { gesture: 'THUMBS_UP', confidence };
  }

  // --- POINTING: only index extended ----------------------------------------
  if (index && !middle && !ring && !pinky) {
    // Thumb can be in any position for pointing
    const confidence = thumb ? 0.75 : 0.9;
    return { gesture: 'POINTING', confidence };
  }

  // --- No recognized pose ---------------------------------------------------
  return { gesture: 'NONE', confidence: 0 };
}
