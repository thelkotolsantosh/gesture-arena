// ============================================================================
// Gesture Arena — MediaPipe Hand Tracker
// ============================================================================

import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import type { HandData, Landmark, Vec2 } from './types';
import { TRACKING } from './constants';
import { emaSmooth } from '../utils/math';

// Re-export for UI rendering use
export { DrawingUtils };
export const HAND_CONNECTIONS = HandLandmarker.HAND_CONNECTIONS;

// ---------------------------------------------------------------------------
// Local paths for MediaPipe resources (loaded from public/ directory)
// ---------------------------------------------------------------------------
const WASM_PATH = `${window.location.origin}/wasm`;
const MODEL_PATH = `${window.location.origin}/hand_landmarker.task`;

// ---------------------------------------------------------------------------
// Internal per-hand smoothing state
// ---------------------------------------------------------------------------
interface SmoothedHandState {
  /** Smoothed landmarks (21 landmarks). */
  landmarks: Landmark[];
  /** Smoothed wrist position in normalized coords. */
  wristPosition: Vec2;
  /** Wrist position from the previous frame (for velocity). */
  prevWristPosition: Vec2;
  /** Timestamp of last detection for this hand. */
  prevTimestamp: number;
  /** Current wrist velocity in normalized coords per second. */
  wristVelocity: Vec2;
}

/**
 * Wraps MediaPipe HandLandmarker to provide:
 * - GPU-accelerated hand landmark detection (up to 2 hands)
 * - EMA smoothing on landmark positions
 * - Wrist velocity tracking via position differencing
 * - Motion prediction via velocity extrapolation
 * - FPS tracking for detection performance monitoring
 */
export class HandTracker {
  private handLandmarker: HandLandmarker | null = null;

  /** Per-hand smoothed state keyed by handedness label. */
  private smoothedState: Map<string, SmoothedHandState> = new Map();

  /** Rolling FPS calculation. */
  private frameTimestamps: number[] = [];
  private _fps = 0;

  /** Alpha for EMA — how much of the new reading to keep. */
  private readonly alpha = 1 - TRACKING.SMOOTHING_FACTOR;

  /** Offscreen downscaling canvas for high-performance inference */
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Detection FPS (read-only). */
  get fps(): number {
    return this._fps;
  }

  /**
   * Load WASM fileset + model and create the HandLandmarker instance.
   * Must be called (and awaited) before calling `detect()`.
   */
  async initialize(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

    try {
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });
    } catch (gpuErr) {
      console.warn('MediaPipe GPU delegate failed, falling back to CPU:', gpuErr);
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });
    }
  }

  /**
   * Run detection on a video frame and return processed HandData[].
   *
   * @param video      The HTMLVideoElement or HTMLCanvasElement currently playing the camera feed.
   * @param timestamp  Performance.now() timestamp in milliseconds.
   * @returns          Array of processed hand data (0–2 entries).
   */
  detect(video: HTMLVideoElement | HTMLCanvasElement, timestamp: number): HandData[] {
    if (!this.handLandmarker) return [];

    // Track FPS
    this.updateFps(timestamp);

    // Downscale input to max 320px to prevent main thread blocking (huge performance win)
    const maxDim = 320;
    const videoW = video instanceof HTMLVideoElement ? video.videoWidth : video.width;
    const videoH = video instanceof HTMLVideoElement ? video.videoHeight : video.height;
    
    let targetW = maxDim;
    let targetH = maxDim;
    if (videoW > videoH) {
      targetH = Math.round(maxDim * (videoH / videoW));
    } else {
      targetW = Math.round(maxDim * (videoW / videoH));
    }

    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
    }
    if (this.offscreenCanvas.width !== targetW || this.offscreenCanvas.height !== targetH) {
      this.offscreenCanvas.width = targetW;
      this.offscreenCanvas.height = targetH;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    }

    if (this.offscreenCtx) {
      this.offscreenCtx.drawImage(video, 0, 0, targetW, targetH);
    }

    // Run MediaPipe detection on the downscaled offscreen canvas
    const result = this.handLandmarker.detectForVideo(this.offscreenCanvas, timestamp);
    if (!result || !result.landmarks || result.landmarks.length === 0) {
      return [];
    }

    const hands: HandData[] = [];

    for (let i = 0; i < result.landmarks.length; i++) {
      const rawLandmarks = result.landmarks[i] as Landmark[];
      const worldLandmarks = (result.worldLandmarks?.[i] ?? rawLandmarks) as Landmark[];
      const handedness =
        (result.handednesses?.[i]?.[0]?.categoryName as 'Left' | 'Right') ?? 'Right';
      const confidence = result.handednesses?.[i]?.[0]?.score ?? 0;

      // Build a key that survives across frames for the same physical hand
      const stateKey = handedness;

      // Smooth landmarks
      const smoothed = this.smoothLandmarks(stateKey, rawLandmarks, timestamp);

      // Compute wrist position & velocity
      const wristRaw: Vec2 = { x: rawLandmarks[0].x, y: rawLandmarks[0].y };
      const { wristPosition, wristVelocity } = this.updateWrist(stateKey, wristRaw, timestamp);

      // Apply motion prediction: extrapolate wrist position by a short lookahead
      const predicted: Vec2 = {
        x: wristPosition.x + wristVelocity.x * TRACKING.PREDICTION_LOOKAHEAD,
        y: wristPosition.y + wristVelocity.y * TRACKING.PREDICTION_LOOKAHEAD,
      };

      hands.push({
        landmarks: smoothed,
        worldLandmarks,
        handedness,
        confidence,
        wristPosition: predicted,
        wristVelocity,
      });
    }

    return hands;
  }

  /** Tear down MediaPipe resources. */
  destroy(): void {
    this.handLandmarker?.close();
    this.handLandmarker = null;
    this.smoothedState.clear();
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Apply EMA smoothing to every landmark coordinate.
   * On the first frame for a given hand we simply store the raw values.
   */
  private smoothLandmarks(key: string, raw: Landmark[], timestamp: number): Landmark[] {
    let state = this.smoothedState.get(key);

    if (!state) {
      // First detection — seed state with raw values
      const cloned = raw.map((l) => ({ x: l.x, y: l.y, z: l.z }));
      state = {
        landmarks: cloned,
        wristPosition: { x: raw[0].x, y: raw[0].y },
        prevWristPosition: { x: raw[0].x, y: raw[0].y },
        prevTimestamp: timestamp,
        wristVelocity: { x: 0, y: 0 },
      };
      this.smoothedState.set(key, state);
      return cloned;
    }

    // Smooth each landmark
    for (let j = 0; j < raw.length && j < state.landmarks.length; j++) {
      state.landmarks[j].x = emaSmooth(state.landmarks[j].x, raw[j].x, this.alpha);
      state.landmarks[j].y = emaSmooth(state.landmarks[j].y, raw[j].y, this.alpha);
      state.landmarks[j].z = emaSmooth(state.landmarks[j].z, raw[j].z, this.alpha);
    }

    return state.landmarks.map((l) => ({ x: l.x, y: l.y, z: l.z }));
  }

  /**
   * Update wrist position with EMA and compute velocity by differencing.
   */
  private updateWrist(
    key: string,
    rawWrist: Vec2,
    timestamp: number,
  ): { wristPosition: Vec2; wristVelocity: Vec2 } {
    const state = this.smoothedState.get(key)!;

    // EMA smooth wrist
    const sx = emaSmooth(state.wristPosition.x, rawWrist.x, this.alpha);
    const sy = emaSmooth(state.wristPosition.y, rawWrist.y, this.alpha);

    // Delta time in seconds (timestamps are in ms)
    const dt = Math.max((timestamp - state.prevTimestamp) / 1000, 0.001);

    // Velocity (normalized units per second)
    const vx = (sx - state.prevWristPosition.x) / dt;
    const vy = (sy - state.prevWristPosition.y) / dt;

    // EMA smooth velocity to avoid noise spikes
    const svx = emaSmooth(state.wristVelocity.x, vx, this.alpha);
    const svy = emaSmooth(state.wristVelocity.y, vy, this.alpha);

    // Store state
    state.prevWristPosition = { x: state.wristPosition.x, y: state.wristPosition.y };
    state.wristPosition = { x: sx, y: sy };
    state.wristVelocity = { x: svx, y: svy };
    state.prevTimestamp = timestamp;

    return {
      wristPosition: { x: sx, y: sy },
      wristVelocity: { x: svx, y: svy },
    };
  }

  /**
   * Rolling FPS counter using a 1-second sliding window.
   */
  private updateFps(timestamp: number): void {
    this.frameTimestamps.push(timestamp);
    // Remove entries older than 1 second
    const cutoff = timestamp - 1000;
    while (this.frameTimestamps.length > 0 && this.frameTimestamps[0] < cutoff) {
      this.frameTimestamps.shift();
    }
    this._fps = this.frameTimestamps.length;
  }
}
