// ============================================================================
// Gesture Arena — Health Bar (Bottom-Right HUD)
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PLAYER, COLORS } from '../../engine/constants';

function getHealthColor(pct: number): string {
  if (pct > 60) return COLORS.NEON_GREEN;
  if (pct > 30) return COLORS.NEON_YELLOW;
  return COLORS.NEON_RED;
}

function getHealthGlow(pct: number, color: string): string {
  const intensity = pct <= 30 ? '0.6' : '0.3';
  return `0 0 12px ${color}${intensity === '0.6' ? '' : '80'}, 0 0 24px ${color}40`;
}

export const HealthBar: React.FC = () => {
  const health = useGameStore((s) => s.health);
  const [shaking, setShaking] = useState(false);
  const prevHealth = useRef(health);

  const pct = (health / PLAYER.MAX_HEALTH) * 100;
  const color = getHealthColor(pct);

  // Trigger shake on health decrease
  useEffect(() => {
    if (health < prevHealth.current) {
      setShaking(true);
      const timer = setTimeout(() => setShaking(false), 500);
      prevHealth.current = health;
      return () => clearTimeout(timer);
    }
    prevHealth.current = health;
  }, [health]);

  return (
    <div
      className={`hud-element flex flex-col items-end gap-2 ${shaking ? 'animate-shake' : ''}`}
      style={{ bottom: 24, right: 24 }}
    >
      {/* Health label + number */}
      <div className="flex items-center gap-3">
        <span className="hud-label">HP</span>
        <span
          style={{
            fontFamily: 'var(--font-family-mono)',
            fontSize: '1.25rem',
            fontWeight: 700,
            color,
            textShadow: getHealthGlow(pct, color),
            transition: 'color 0.3s',
          }}
        >
          {health}
        </span>
      </div>

      {/* Bar */}
      <div className="health-bar-outer" style={{ width: 200 }}>
        <div
          className="health-bar-inner"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}80, 0 0 20px ${color}40`,
          }}
        />
      </div>

      {/* Critical warning */}
      {pct <= 30 && pct > 0 && (
        <span
          className="animate-neon-pulse"
          style={{
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: COLORS.NEON_RED,
          }}
        >
          ⚠ CRITICAL
        </span>
      )}
    </div>
  );
};

export default HealthBar;
