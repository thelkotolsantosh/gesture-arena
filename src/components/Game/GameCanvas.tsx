// ============================================================================
// Gesture Arena — Game Canvas (Main Rendering Surface)
// ============================================================================

import { useRef, useEffect, useCallback } from 'react';
import type { GameEngine } from '../../engine/GameEngine';

interface GameCanvasProps {
  gameEngine: GameEngine | null;
  isPlaying: boolean;
}

/**
 * Main game canvas where all game objects, particles, and effects are rendered.
 * Uses requestAnimationFrame for smooth 60fps rendering.
 */
export default function GameCanvas({ gameEngine, isPlaying }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameEngine) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Match canvas resolution to display size
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = rect.width * dpr;
    const h = rect.height * dpr;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Render game state to canvas
    gameEngine.render(ctx, rect.width, rect.height);

    ctx.restore();

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(render);
    }
  }, [gameEngine, isPlaying]);

  useEffect(() => {
    if (isPlaying && gameEngine) {
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, gameEngine, render]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
      }}
    />
  );
}
