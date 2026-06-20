// ============================================================================
// Gesture Arena — FPS Counter (Top-Center HUD Overlay)
// ============================================================================

import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSettingsStore } from '../../store/settingsStore';
import { COLORS } from '../../engine/constants';

function fpsColor(fps: number): string {
  if (fps > 50) return COLORS.NEON_GREEN;
  if (fps > 30) return COLORS.NEON_YELLOW;
  return COLORS.NEON_RED;
}

export const FPSCounter: React.FC = () => {
  const showFPS = useSettingsStore((s) => s.showFPS);
  const fps = useGameStore((s) => s.fps);
  const trackingFps = useGameStore((s) => s.trackingFps);

  if (!showFPS) return null;

  return (
    <div
      className="hud-element flex gap-4"
      style={{
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      {/* Render FPS */}
      <div className="flex items-center gap-1.5">
        <span
          style={{
            fontSize: '0.6rem',
            fontFamily: 'var(--font-family-mono)',
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          RENDER
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            fontFamily: 'var(--font-family-mono)',
            fontWeight: 700,
            color: fpsColor(fps),
            textShadow: `0 0 6px ${fpsColor(fps)}60`,
          }}
        >
          {Math.round(fps)}
        </span>
      </div>

      {/* Divider */}
      <div
        style={{
          width: 1,
          height: 14,
          background: 'rgba(255,255,255,0.15)',
          alignSelf: 'center',
        }}
      />

      {/* Tracking FPS */}
      <div className="flex items-center gap-1.5">
        <span
          style={{
            fontSize: '0.6rem',
            fontFamily: 'var(--font-family-mono)',
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          TRACK
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            fontFamily: 'var(--font-family-mono)',
            fontWeight: 700,
            color: fpsColor(trackingFps),
            textShadow: `0 0 6px ${fpsColor(trackingFps)}60`,
          }}
        >
          {Math.round(trackingFps)}
        </span>
      </div>
    </div>
  );
};

export default FPSCounter;
