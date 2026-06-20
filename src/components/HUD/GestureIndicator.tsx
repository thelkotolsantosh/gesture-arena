// ============================================================================
// Gesture Arena — Gesture Indicator (Bottom-Left HUD)
// ============================================================================

import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { COLORS } from '../../engine/constants';
import type { GestureType } from '../../engine/types';

const GESTURE_ICONS: Record<GestureType, string> = {
  OPEN_PALM: '✋',
  CLOSED_FIST: '✊',
  PEACE_SIGN: '✌️',
  THUMBS_UP: '👍',
  POINTING: '👆',
  SWIPE_LEFT: '⬅️',
  SWIPE_RIGHT: '➡️',
  SWIPE_UP: '⬆️',
  SWIPE_DOWN: '⬇️',
  NONE: '❓',
};

const GESTURE_NAMES: Record<GestureType, string> = {
  OPEN_PALM: 'Shield',
  CLOSED_FIST: 'Smash',
  PEACE_SIGN: 'Slow-Mo',
  THUMBS_UP: '2X Multi',
  POINTING: 'Shoot',
  SWIPE_LEFT: 'Swipe Left',
  SWIPE_RIGHT: 'Swipe Right',
  SWIPE_UP: 'Swipe Up',
  SWIPE_DOWN: 'Swipe Down',
  NONE: 'No Gesture',
};

export const GestureIndicator: React.FC = () => {
  const gesture = useGameStore((s) => s.activeGesture);
  const confidence = useGameStore((s) => s.gestureConfidence);

  const isLowConfidence = confidence < 0.5;
  const icon = GESTURE_ICONS[gesture];
  const name = GESTURE_NAMES[gesture];

  // Confidence bar color
  const barColor =
    confidence >= 0.8
      ? COLORS.NEON_GREEN
      : confidence >= 0.5
        ? COLORS.NEON_YELLOW
        : COLORS.NEON_RED;

  return (
    <div
      className="hud-element flex flex-col gap-2"
      style={{
        bottom: 24,
        left: 24,
        opacity: isLowConfidence ? 0.4 : 1,
        transition: 'opacity 0.3s',
      }}
    >
      <span className="hud-label">GESTURE</span>

      <div className="flex items-center gap-3">
        {/* Icon */}
        <span
          style={{
            fontSize: '2rem',
            lineHeight: 1,
            filter: isLowConfidence ? 'grayscale(0.7)' : 'none',
            transition: 'filter 0.3s',
          }}
        >
          {icon}
        </span>

        {/* Name + confidence */}
        <div className="flex flex-col gap-1">
          <span
            style={{
              fontFamily: 'var(--font-family-mono)',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: isLowConfidence ? 'rgba(255,255,255,0.4)' : '#fff',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              transition: 'color 0.3s',
            }}
          >
            {name}
          </span>

          {/* Confidence bar */}
          <div
            style={{
              width: 100,
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.round(confidence * 100)}%`,
                borderRadius: 2,
                backgroundColor: barColor,
                boxShadow: `0 0 6px ${barColor}80`,
                transition: 'width 0.2s ease-out, background-color 0.3s',
              }}
            />
          </div>

          {/* Confidence value */}
          <span
            style={{
              fontSize: '0.55rem',
              fontFamily: 'var(--font-family-mono)',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            {Math.round(confidence * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default GestureIndicator;
