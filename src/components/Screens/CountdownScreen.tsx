// ============================================================================
// Gesture Arena — Countdown Screen (3-2-1 Overlay)
// ============================================================================

import React from 'react';
import { COLORS } from '../../engine/constants';

export interface CountdownScreenProps {
  count: number; // 3, 2, or 1
}

export const CountdownScreen: React.FC<CountdownScreenProps> = ({ count }) => {
  // Color cycles through the countdown
  const countColors: Record<number, string> = {
    3: COLORS.NEON_BLUE,
    2: COLORS.NEON_PURPLE,
    1: COLORS.NEON_PINK,
  };
  const color = countColors[count] ?? COLORS.NEON_BLUE;

  return (
    <div
      className="absolute inset-0 z-60 flex flex-col items-center justify-center"
      style={{
        background: 'rgba(5, 5, 16, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 60,
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* "GET READY" text */}
      <span
        className="animate-slide-in-down"
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: 24,
          textShadow: `0 0 10px ${color}40`,
        }}
      >
        GET READY
      </span>

      {/* Countdown number */}
      <span
        key={count} // Force re-mount to retrigger animation
        className="animate-countdown"
        style={{
          fontSize: 'clamp(6rem, 20vw, 12rem)',
          fontWeight: 900,
          fontFamily: 'var(--font-family-mono)',
          lineHeight: 1,
          color,
          textShadow: `
            0 0 30px ${color},
            0 0 60px ${color}80,
            0 0 120px ${color}40,
            0 0 200px ${color}20
          `,
        }}
      >
        {count}
      </span>

      {/* Ring effect */}
      <div
        key={`ring-${count}`}
        style={{
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: '50%',
          border: `2px solid ${color}40`,
          boxShadow: `0 0 30px ${color}20, inset 0 0 30px ${color}10`,
          animation: 'ripple 0.8s ease-out forwards',
        }}
      />
    </div>
  );
};

export default CountdownScreen;
