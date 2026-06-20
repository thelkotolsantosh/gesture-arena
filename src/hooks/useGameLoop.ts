// ============================================================================
// Gesture Arena — Game Loop Hook (requestAnimationFrame)
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import type { HandData, GestureResult } from '../engine/types';
import { GameEngine } from '../engine/GameEngine';
import { useGameStore } from '../store/gameStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseGameLoopReturn {
  /** Ref to attach to the game <canvas> element. */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** The live GameEngine instance (null before initialisation). */
  gameEngine: GameEngine | null;
  /** True while the game loop is actively ticking. */
  isRunning: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGameLoop(
  hands: HandData[],
  gestures: GestureResult[],
): UseGameLoopReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rafIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Frame timing for FPS counter
  const frameCountRef = useRef(0);
  const fpsAccumulatorRef = useRef(0);

  const [isRunning, setIsRunning] = useState(false);

  // ---- Stable selectors from game store ----
  const gameState = useGameStore((s) => s.gameState);
  const setFPS = useGameStore((s) => s.setFPS);
  const updateGameTime = useGameStore((s) => s.updateGameTime);

  // Keep hands & gestures in refs so the rAF closure always reads the latest
  const handsRef = useRef(hands);
  const gesturesRef = useRef(gestures);
  useEffect(() => { handsRef.current = hands; }, [hands]);
  useEffect(() => { gesturesRef.current = gestures; }, [gestures]);

  // ------------------------------------------------------------------
  // Create the GameEngine when the canvas is available
  // ------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!engineRef.current) {
      const engine = new GameEngine(canvas);
      engineRef.current = engine;
    }

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []); // runs once after mount (canvas ref is stable)

  // ------------------------------------------------------------------
  // Main game loop
  // ------------------------------------------------------------------
  const tick = useCallback(
    (timestamp: number) => {
      const engine = engineRef.current;
      if (!engine) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      // Delta time in seconds, clamped to avoid spiral-of-death on tab switch
      const rawDt =
        lastTimeRef.current > 0 ? (timestamp - lastTimeRef.current) / 1000 : 1 / 60;
      const dt = Math.min(rawDt, 0.1); // cap at 100 ms
      lastTimeRef.current = timestamp;

      // ---- FPS tracking ----
      fpsAccumulatorRef.current += rawDt * 1000;
      frameCountRef.current += 1;
      if (fpsAccumulatorRef.current >= 500) {
        const currentFps = Math.round(
          (frameCountRef.current * 1000) / fpsAccumulatorRef.current,
        );
        setFPS(currentFps);
        frameCountRef.current = 0;
        fpsAccumulatorRef.current = 0;
      }

      // ---- Update engine with latest tracking data ----
      engine.setTrackingData(handsRef.current, gesturesRef.current);
      engine.update(dt);
      engine.render();

      // ---- Sync engine → store ----
      updateGameTime(dt);

      rafIdRef.current = requestAnimationFrame(tick);
    },
    [setFPS, updateGameTime],
  );

  // ------------------------------------------------------------------
  // Start / stop based on gameState
  // ------------------------------------------------------------------
  useEffect(() => {
    const shouldRun =
      gameState === 'PLAYING' ||
      gameState === 'BOSS' ||
      gameState === 'COUNTDOWN';

    if (shouldRun && !isRunning) {
      lastTimeRef.current = 0;
      frameCountRef.current = 0;
      fpsAccumulatorRef.current = 0;
      rafIdRef.current = requestAnimationFrame(tick);
      setIsRunning(true);
    } else if (!shouldRun && isRunning) {
      cancelAnimationFrame(rafIdRef.current);
      setIsRunning(false);
    }

    return () => {
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [gameState, isRunning, tick]);

  return {
    canvasRef,
    gameEngine: engineRef.current,
    isRunning,
  };
}
