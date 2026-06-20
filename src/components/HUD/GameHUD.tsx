// ============================================================================
// Gesture Arena — Game HUD Container (Combines All HUD Elements)
// ============================================================================

import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { COLORS } from '../../engine/constants';
import { ScoreDisplay } from './ScoreDisplay';
import { ComboCounter } from './ComboCounter';
import { HealthBar } from './HealthBar';
import { GestureIndicator } from './GestureIndicator';
import { FPSCounter } from './FPSCounter';

export const GameHUD: React.FC = () => {
  const slowMotionActive = useGameStore((s) => s.slowMotionActive);

  return (
    <div
      className="absolute inset-0 z-30"
      style={{ pointerEvents: 'none' }}
    >
      {/* Top-Left: Score */}
      <ScoreDisplay />

      {/* Top-Right: Combo */}
      <ComboCounter />

      {/* Top-Center: FPS */}
      <FPSCounter />

      {/* Bottom-Left: Gesture */}
      <GestureIndicator />

      {/* Bottom-Right: Health */}
      <HealthBar />

      {/* Center: Slow Motion Indicator */}
      {slowMotionActive && (
        <div
          className="absolute animate-neon-pulse"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 25,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: '1.5rem',
              fontFamily: 'var(--font-family-mono)',
              fontWeight: 800,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: COLORS.NEON_PURPLE,
              textShadow: `0 0 20px ${COLORS.NEON_PURPLE}, 0 0 40px ${COLORS.NEON_PURPLE}80, 0 0 80px ${COLORS.NEON_PURPLE}40`,
            }}
          >
            ⏳ SLOW MOTION
          </span>
          <span
            style={{
              fontSize: '0.6rem',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.1em',
            }}
          >
            TIME DILATED
          </span>
        </div>
      )}
    </div>
  );
};

export default GameHUD;
