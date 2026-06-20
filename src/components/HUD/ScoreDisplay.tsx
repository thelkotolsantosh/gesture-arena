// ============================================================================
// Gesture Arena — Score Display (Top-Left HUD)
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { COLORS } from '../../engine/constants';

export const ScoreDisplay: React.FC = () => {
  const score = useGameStore((s) => s.score);
  const multiplierActive = useGameStore((s) => s.multiplierActive);

  const [displayScore, setDisplayScore] = useState(score);
  const [popping, setPopping] = useState(false);
  const animFrame = useRef<number>(0);
  const prevScore = useRef(score);

  // Animate the displayed score towards the actual score
  useEffect(() => {
    if (score === prevScore.current) return;
    prevScore.current = score;
    setPopping(true);

    const start = displayScore;
    const diff = score - start;
    const duration = 400; // ms
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(start + diff * eased));

      if (progress < 1) {
        animFrame.current = requestAnimationFrame(tick);
      }
    };
    animFrame.current = requestAnimationFrame(tick);

    const popTimer = setTimeout(() => setPopping(false), 300);

    return () => {
      cancelAnimationFrame(animFrame.current);
      clearTimeout(popTimer);
    };
  }, [score]);

  return (
    <div className="hud-element flex flex-col items-start gap-1" style={{ top: 24, left: 24 }}>
      <span className="hud-label">SCORE</span>
      <div className="flex items-center gap-3">
        <span
          className={`hud-value ${popping ? 'animate-score-pop' : ''}`}
          style={{
            fontSize: '2.5rem',
            textShadow: `0 0 20px ${COLORS.NEON_BLUE}40, 0 0 40px ${COLORS.NEON_BLUE}20`,
          }}
        >
          {displayScore.toLocaleString()}
        </span>

        {/* 2X Multiplier Badge */}
        {multiplierActive && (
          <span
            className="animate-neon-pulse"
            style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              fontFamily: 'var(--font-family-mono)',
              color: COLORS.NEON_YELLOW,
              textShadow: `0 0 12px ${COLORS.NEON_YELLOW}, 0 0 24px ${COLORS.NEON_YELLOW}80`,
              background: `linear-gradient(135deg, ${COLORS.NEON_YELLOW}25, ${COLORS.NEON_ORANGE}15)`,
              border: `1px solid ${COLORS.NEON_YELLOW}60`,
              borderRadius: 8,
              padding: '2px 10px',
              letterSpacing: '0.05em',
            }}
          >
            2X
          </span>
        )}
      </div>
    </div>
  );
};

export default ScoreDisplay;
