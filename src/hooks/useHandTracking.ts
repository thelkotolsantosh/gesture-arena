// ============================================================================
// Gesture Arena — Hand Tracking Hook (MediaPipe lifecycle)
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import type { HandData, GestureResult } from '../engine/types';
import { HandTracker } from '../engine/HandTracker';
import { GestureRecognizer } from '../engine/GestureRecognizer';
import { useGameStore } from '../store/gameStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseHandTrackingReturn {
  /** Currently detected hands (updated each frame). */
  hands: HandData[];
  /** Currently recognized gestures (updated each frame). */
  gestures: GestureResult[];
  /** True while MediaPipe models are loading. */
  isLoading: boolean;
  /** Error message if initialization failed. */
  error: string | null;
  /** Current detection FPS. */
  fps: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useHandTracking(
  videoElement: HTMLVideoElement | null,
  isVideoReady: boolean,
): UseHandTrackingReturn {
  // ---- State exposed to consumers ----
  const [hands, setHands] = useState<HandData[]>([]);
  const [gestures, setGestures] = useState<GestureResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);

  // ---- Refs for the rAF loop ----
  const trackerRef = useRef<HandTracker | null>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const rafIdRef = useRef<number>(0);
  const lastFrameTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const fpsAccumulatorRef = useRef(0);

  // ---- Game-store setters (stable refs to avoid re-renders) ----
  const setActiveGesture = useGameStore((s) => s.setActiveGesture);
  const setTrackingFPS = useGameStore((s) => s.setTrackingFPS);
  const setHandsDetected = useGameStore((s) => s.setHandsDetected);

  // ------------------------------------------------------------------
  // Initialize tracker & recognizer once the video element is ready
  // ------------------------------------------------------------------
  const init = useCallback(async () => {
    if (!videoElement) return;

    setIsLoading(true);
    setError(null);

    try {
      const tracker = new HandTracker();
      await tracker.initialize();
      trackerRef.current = tracker;

      const recognizer = new GestureRecognizer();
      recognizerRef.current = recognizer;

      setIsLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initialize hand tracking.');
      setIsLoading(false);
    }
  }, [videoElement]);

  useEffect(() => {
    init();
  }, [init]);

  // ------------------------------------------------------------------
  // Detection loop (rAF)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (isLoading || error || !videoElement || !isVideoReady) return;
    if (!trackerRef.current || !recognizerRef.current) return;

    const tracker = trackerRef.current;
    const recognizer = recognizerRef.current;
    let running = true;

    const loop = (timestamp: number) => {
      if (!running) return;

      // Ensure the video element has data to process
      if (videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        rafIdRef.current = requestAnimationFrame(loop);
        return;
      }

      // ---- FPS calculation ----
      if (lastFrameTimeRef.current > 0) {
        const delta = timestamp - lastFrameTimeRef.current;
        fpsAccumulatorRef.current += delta;
        frameCountRef.current += 1;

        // Update FPS every ~500 ms
        if (fpsAccumulatorRef.current >= 500) {
          const currentFps = Math.round(
            (frameCountRef.current * 1000) / fpsAccumulatorRef.current,
          );
          setFps(currentFps);
          setTrackingFPS(currentFps);
          frameCountRef.current = 0;
          fpsAccumulatorRef.current = 0;
        }
      }
      lastFrameTimeRef.current = timestamp;

      // ---- Detect hands ----
      const detectedHands = tracker.detect(videoElement, timestamp);
      setHands(detectedHands);
      setHandsDetected(detectedHands.length);

      // ---- Recognize gestures ----
      const detectedGestures = recognizer.recognize(detectedHands);
      setGestures(detectedGestures);

      // Push the primary gesture into the game store
      if (detectedGestures.length > 0) {
        const primary = detectedGestures[0];
        setActiveGesture(primary.gesture, primary.confidence);
      } else {
        setActiveGesture('NONE', 0);
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    // Kick off
    lastFrameTimeRef.current = 0;
    frameCountRef.current = 0;
    fpsAccumulatorRef.current = 0;
    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [
    isLoading,
    error,
    videoElement,
    isVideoReady,
    setActiveGesture,
    setTrackingFPS,
    setHandsDetected,
  ]);

  // ------------------------------------------------------------------
  // Cleanup on unmount
  // ------------------------------------------------------------------
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafIdRef.current);
      trackerRef.current?.destroy();
      trackerRef.current = null;
      recognizerRef.current = null;
    };
  }, []);

  return { hands, gestures, isLoading, error, fps };
}
