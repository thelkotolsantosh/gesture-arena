// ============================================================================
// Gesture Arena — Gesture Recognizer
// ============================================================================

import type { HandData, GestureResult, GestureType, GameSettings } from './types';
import { TRACKING } from './constants';
import { getFingerStates, classifyStaticGesture } from '../utils/gestures';
import { vec2Length } from '../utils/math';

// ---------------------------------------------------------------------------
// Internal per-hand tracking state
// ---------------------------------------------------------------------------
interface HandGestureState {
  /** The gesture candidate being confirmed. */
  candidate: GestureType;
  /** How many consecutive frames the candidate has been held. */
  holdFrames: number;
  /** The confirmed (output) gesture after hysteresis. */
  confirmed: GestureType;
  /** Timestamp of last swipe (for cooldown). */
  lastSwipeTime: number;
}

/**
 * Classifies gestures from tracked hand data.
 *
 * Features:
 * - Static gesture recognition via finger-state analysis
 * - Hysteresis: a gesture must be held for GESTURE_HOLD_FRAMES before
 *   being confirmed, preventing flicker between states
 * - Dynamic gesture (swipe) detection from wrist velocity
 * - Confidence scoring that incorporates sensitivity setting
 * - Per-hand swipe cooldown
 */
export class GestureRecognizer {
  /** Per-hand state keyed by handedness label ('Left' | 'Right'). */
  private states = new Map<string, HandGestureState>();

  /** Gesture sensitivity multiplier (0.1–1.0) from settings. */
  private sensitivity = 0.7;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Apply user settings. Call whenever settings change.
   */
  applySettings(settings: Pick<GameSettings, 'gestureSensitivity'>): void {
    this.sensitivity = settings.gestureSensitivity;
  }

  /**
   * Recognize gestures for all tracked hands.
   *
   * @param hands  Array of processed hand data from HandTracker.
   * @returns      Array of gesture results (one per hand).
   */
  recognize(hands: HandData[]): GestureResult[] {
    const results: GestureResult[] = [];

    for (const hand of hands) {
      const result = this.recognizeHand(hand);
      if (result) results.push(result);
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Per-hand recognition
  // -------------------------------------------------------------------------

  private recognizeHand(hand: HandData): GestureResult | null {
    const key = hand.handedness;
    let state = this.states.get(key);
    if (!state) {
      state = {
        candidate: 'NONE',
        holdFrames: 0,
        confirmed: 'NONE',
        lastSwipeTime: 0,
      };
      this.states.set(key, state);
    }

    // 1. Check for dynamic gestures (swipes) first — they override statics
    const swipe = this.detectSwipe(hand, state);
    if (swipe) {
      state.confirmed = swipe.gesture;
      state.candidate = swipe.gesture;
      state.holdFrames = 0;
      return swipe;
    }

    // 2. Classify static gesture from finger states
    const fingerStates = getFingerStates(hand.landmarks, hand.handedness);
    const { gesture: rawGesture, confidence: rawConfidence } = classifyStaticGesture(
      fingerStates,
      hand.landmarks,
    );

    // Apply sensitivity: scale the confidence threshold
    // Higher sensitivity → lower threshold → easier to trigger
    const adjustedConfidence = rawConfidence * this.sensitivity;
    const confidenceThreshold = TRACKING.MIN_GESTURE_CONFIDENCE * (1.1 - this.sensitivity);

    const meetsConfidence = adjustedConfidence >= confidenceThreshold;

    // 3. Hysteresis: gesture must be held for GESTURE_HOLD_FRAMES
    const detectedGesture = meetsConfidence ? rawGesture : 'NONE';

    if (detectedGesture === state.candidate) {
      // Same gesture — increment hold counter
      state.holdFrames++;
    } else {
      // New gesture — reset counter
      state.candidate = detectedGesture;
      state.holdFrames = 1;
    }

    // Confirm when held long enough
    if (state.holdFrames >= TRACKING.GESTURE_HOLD_FRAMES) {
      state.confirmed = state.candidate;
    }

    // If nothing is detected for a while, fall back to NONE
    if (detectedGesture === 'NONE' && state.holdFrames >= TRACKING.GESTURE_HOLD_FRAMES) {
      state.confirmed = 'NONE';
    }

    return {
      gesture: state.confirmed,
      confidence: meetsConfidence ? adjustedConfidence : 0,
      hand: hand.handedness,
      position: hand.wristPosition,
    };
  }

  // -------------------------------------------------------------------------
  // Swipe detection
  // -------------------------------------------------------------------------

  /**
   * Detect a swipe gesture from wrist velocity.
   * Requires velocity magnitude above the threshold, with cooldown enforcement.
   */
  private detectSwipe(hand: HandData, state: HandGestureState): GestureResult | null {
    const vel = hand.wristVelocity;
    const speed = vec2Length(vel);

    // Apply sensitivity to the threshold — higher sensitivity → lower threshold
    const threshold = TRACKING.SWIPE_VELOCITY_THRESHOLD * (1.3 - this.sensitivity);

    if (speed < threshold) return null;

    // Enforce cooldown
    const now = performance.now();
    if (now - state.lastSwipeTime < TRACKING.SWIPE_COOLDOWN_MS) return null;

    // Determine swipe direction from velocity vector
    let gesture: GestureType = 'NONE';
    const absX = Math.abs(vel.x);
    const absY = Math.abs(vel.y);

    if (absX > absY) {
      // Horizontal swipe
      gesture = vel.x > 0 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT';
    } else {
      // Vertical swipe (MediaPipe y increases downward)
      gesture = vel.y > 0 ? 'SWIPE_DOWN' : 'SWIPE_UP';
    }

    state.lastSwipeTime = now;

    // Confidence based on how far above threshold the speed is
    const confidence = Math.min(speed / (threshold * 2), 1.0);

    return {
      gesture,
      confidence,
      hand: hand.handedness,
      position: hand.wristPosition,
    };
  }
}
