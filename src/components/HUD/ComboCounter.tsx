// ============================================================================
// Gesture Arena — Combo Counter (Top-Right HUD)
// ============================================================================

import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { COLORS } from '../../engine/constants';

function getComboColor(combo: number): string {
  if (combo >= 20) return COLORS.NEON_RED;
  if (combo >= 10) return COLORS.NEON_ORANGE;
  if (combo >= 5) return COLORS.NEON_YELLOW;
  return '#ffffff';
}

function getComboGlow(combo: number): string {
  if (combo >= 20) return `0 0 20px ${COLORS.NEON_RED}, 0 0 40px ${COLORS.NEON_RED}80`;
  if (combo >= 10) return `0 0 16px ${COLORS.NEON_ORANGE}, 0 0 32px ${COLORS.NEON_ORANGE}60`;
  if (combo >= 5) return `0 0 12px ${COLORS.NEON_YELLOW}, 0 0 24px ${COLORS.NEON_YELLOW}40`;
  return `0 0 8px rgba(255,255,255,0.15)`;
}

export const ComboCounter: React.FC = () => {
  const combo = useGameStore((s) => s.combo);

  const color = getComboColor(combo);
  const glow = getComboGlow(combo);
  const isOnFire = combo > 5;

  return (
    <div
      className="hud-element flex flex-col items-end gap-1"
      style={{ top: 24, right: 24 }}
    >
      <span className="hud-label">COMBO</span>

      <div className="flex items-center gap-2">
        {/* Fire emoji for high combos */}
        {isOnFire && (
          <span
            className="animate-combo-fire"
            style={{ fontSize: '1.6rem', lineHeight: 1 }}
          >
            🔥
          </span>
        )}

        <span
          className={`hud-value ${isOnFire ? 'animate-combo-fire' : ''}`}
          style={{
            fontSize: '2.5rem',
            color,
            textShadow: glow,
            // Override the gradient text for colored combos
            WebkitBackgroundClip: combo >= 5 ? 'unset' : undefined,
            WebkitTextFillColor: combo >= 5 ? color : undefined,
            backgroundImage: combo >= 5 ? 'none' : undefined,
            transition: 'color 0.3s, text-shadow 0.3s',
          }}
        >
          {combo}
        </span>
      </div>

      {/* Combo tier label */}
      {combo >= 5 && (
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color,
            opacity: 0.8,
          }}
        >
          {combo >= 20 ? 'LEGENDARY!' : combo >= 10 ? 'UNSTOPPABLE!' : 'ON FIRE!'}
        </span>
      )}
    </div>
  );
};

export default ComboCounter;
