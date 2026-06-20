// ============================================================================
// Gesture Arena — Achievement Popup (Top-Right Notification)
// ============================================================================

import React from 'react';
import { useAchievementStore } from '../../store/achievementStore';
import { COLORS } from '../../engine/constants';

export const AchievementPopup: React.FC = () => {
  const recentUnlock = useAchievementStore((s) => s.recentUnlock);

  if (!recentUnlock) return null;

  return (
    <div
      className="animate-achievement"
      style={{
        position: 'fixed',
        top: 80,
        right: 24,
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      <div
        className="glass-card"
        style={{
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          minWidth: 280,
          borderColor: `${COLORS.NEON_YELLOW}40`,
          boxShadow: `0 0 20px ${COLORS.NEON_YELLOW}20, 0 8px 32px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Icon */}
        <div
          style={{
            fontSize: '2rem',
            lineHeight: 1,
            filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.5))',
          }}
        >
          {recentUnlock.icon}
        </div>

        {/* Text */}
        <div className="flex flex-col gap-1">
          {/* Trophy label */}
          <span
            style={{
              fontSize: '0.55rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: COLORS.NEON_YELLOW,
              textShadow: `0 0 8px ${COLORS.NEON_YELLOW}60`,
            }}
          >
            🏆 ACHIEVEMENT UNLOCKED
          </span>

          {/* Name */}
          <span
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.03em',
            }}
          >
            {recentUnlock.name}
          </span>

          {/* Description */}
          <span
            style={{
              fontSize: '0.7rem',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            {recentUnlock.description}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AchievementPopup;
