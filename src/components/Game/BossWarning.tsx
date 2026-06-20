// ============================================================================
// Gesture Arena — Boss Warning Overlay
// ============================================================================

import React, { useEffect, useState } from 'react';
import { COLORS } from '../../engine/constants';

export interface BossWarningProps {
  visible: boolean;
}

export const BossWarning: React.FC<BossWarningProps> = ({ visible }) => {
  const [show, setShow] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      setFading(false);

      // Start fade-out after 2 seconds
      const fadeTimer = setTimeout(() => {
        setFading(true);
      }, 2000);

      // Remove from DOM after fade completes
      const removeTimer = setTimeout(() => {
        setShow(false);
        setFading(false);
      }, 2600);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [visible]);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(ellipse at center, ${COLORS.NEON_RED}15 0%, rgba(0,0,0,0.7) 70%)`,
        pointerEvents: 'none',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.6s ease-out',
      }}
    >
      {/* Red scanlines overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(239,68,68,0.03) 3px, rgba(239,68,68,0.03) 6px)',
          pointerEvents: 'none',
        }}
      />

      {/* Pulsing red border vignette */}
      <div
        className="animate-neon-pulse"
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: `inset 0 0 120px ${COLORS.NEON_RED}40, inset 0 0 240px ${COLORS.NEON_RED}20`,
          pointerEvents: 'none',
        }}
      />

      {/* Main warning text */}
      <div className="animate-boss-entrance flex flex-col items-center gap-4">
        <span
          style={{
            fontSize: '4rem',
            fontWeight: 900,
            fontFamily: 'var(--font-family-display)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: COLORS.NEON_RED,
            textShadow: `
              0 0 20px ${COLORS.NEON_RED},
              0 0 40px ${COLORS.NEON_RED}80,
              0 0 80px ${COLORS.NEON_RED}60,
              0 0 120px ${COLORS.NEON_RED}40
            `,
          }}
        >
          ⚠️ BOSS INCOMING ⚠️
        </span>

        <span
          className="animate-neon-pulse"
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.6)',
            textShadow: `0 0 10px ${COLORS.NEON_RED}40`,
          }}
        >
          PREPARE FOR BATTLE
        </span>

        {/* Skull icon */}
        <span
          className="animate-float"
          style={{
            fontSize: '3rem',
            filter: `drop-shadow(0 0 20px ${COLORS.NEON_RED}) drop-shadow(0 0 40px ${COLORS.NEON_RED}80)`,
          }}
        >
          💀
        </span>
      </div>
    </div>
  );
};

export default BossWarning;
