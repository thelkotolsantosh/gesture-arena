// ============================================================================
// Gesture Arena — Start Screen (Title / Main Menu)
// ============================================================================

import React from 'react';
import { COLORS } from '../../engine/constants';

export interface StartScreenProps {
  onStart: () => void;
  onSettings: () => void;
  onLeaderboard: () => void;
  isTrackingReady: boolean;
  cameraError?: string | null;
  onRetryCamera?: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStart,
  onSettings,
  onLeaderboard,
  isTrackingReady,
  cameraError = null,
  onRetryCamera,
}) => {
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center animate-gradient"
      style={{
        background: `linear-gradient(135deg, ${COLORS.DARK_900} 0%, #0d0d2b 25%, #120a28 50%, #0a1628 75%, ${COLORS.DARK_900} 100%)`,
        backgroundSize: '200% 200%',
      }}
    >
      {/* Radial glow behind title */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 400,
          background: `radial-gradient(ellipse, ${COLORS.NEON_PURPLE}15 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Floating particles decoration */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="animate-float"
            style={{
              position: 'absolute',
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              borderRadius: '50%',
              backgroundColor: i % 2 === 0 ? COLORS.NEON_BLUE : COLORS.NEON_PURPLE,
              opacity: Math.random() * 0.3 + 0.1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 2 + 2}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Title */}
        <div className="flex flex-col items-center gap-2 animate-slide-in-down">
          <h1
            className="animate-neon-pulse"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              fontWeight: 900,
              fontFamily: 'var(--font-family-display)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#fff',
              textShadow: `
                0 0 20px ${COLORS.NEON_PURPLE}80,
                0 0 40px ${COLORS.NEON_PURPLE}40,
                0 0 80px ${COLORS.NEON_BLUE}30,
                0 2px 0 rgba(0,0,0,0.3)
              `,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            GESTURE ARENA
          </h1>

          <p
            style={{
              fontSize: '1rem',
              fontWeight: 500,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: COLORS.NEON_BLUE,
              opacity: 0.7,
              textShadow: `0 0 10px ${COLORS.NEON_BLUE}40`,
            }}
          >
            Hand Gesture Combat
          </p>
        </div>

        {/* Decorative divider */}
        <div
          className="animate-scale-in"
          style={{
            width: 200,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${COLORS.NEON_PURPLE}60, transparent)`,
          }}
        />

        {/* Buttons */}
        <div className="flex flex-col items-center gap-4 animate-slide-in-up">
          {cameraError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${COLORS.NEON_RED}`,
                borderRadius: '8px',
                padding: '12px 24px',
                color: '#fff',
                fontSize: '0.85rem',
                textAlign: 'center',
                maxWidth: '380px',
                textShadow: `0 0 8px ${COLORS.NEON_RED}40`,
                boxShadow: `0 0 10px ${COLORS.NEON_RED}15`,
              }}
            >
              ⚠️ <strong>Webcam Error:</strong> {cameraError}
            </div>
          )}

          {isTrackingReady ? (
            /* Start button with camera */
            <button
              className="neon-btn neon-btn-primary animate-pulse-glow"
              onClick={onStart}
              style={{
                padding: '18px 56px',
                fontSize: '1.15rem',
                letterSpacing: '0.15em',
                cursor: 'pointer',
                pointerEvents: 'auto',
              }}
            >
              <span style={{ position: 'relative', zIndex: 1 }}>
                ▶ START GAME
              </span>
            </button>
          ) : (
            /* Fallback buttons if camera is not ready */
            <div className="flex flex-col items-center gap-3">
              {cameraError ? (
                <button
                  className="neon-btn"
                  onClick={onRetryCamera}
                  style={{
                    padding: '14px 40px',
                    fontSize: '1rem',
                    letterSpacing: '0.1em',
                    borderColor: COLORS.NEON_BLUE,
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                  }}
                >
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    🔄 RETRY WEBCAM
                  </span>
                </button>
              ) : (
                <button
                  className="neon-btn"
                  disabled
                  style={{
                    padding: '14px 40px',
                    fontSize: '1rem',
                    letterSpacing: '0.1em',
                    opacity: 0.5,
                    cursor: 'not-allowed',
                    pointerEvents: 'auto',
                  }}
                >
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    ⏳ INITIALIZING WEBCAM...
                  </span>
                </button>
              )}

              <button
                className="neon-btn neon-btn-primary animate-pulse-glow"
                onClick={onStart}
                style={{
                  padding: '14px 40px',
                  fontSize: '1.0rem',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                }}
              >
                <span style={{ position: 'relative', zIndex: 1 }}>
                  🎮 PLAY WITH MOUSE & KEYBOARD
                </span>
              </button>
            </div>
          )}

          {/* Secondary buttons row */}
          <div className="flex items-center gap-3">
            <button
              className="neon-btn"
              onClick={onSettings}
              style={{
                padding: '12px 28px',
                fontSize: '0.85rem',
                pointerEvents: 'auto',
              }}
            >
              <span style={{ position: 'relative', zIndex: 1 }}>⚙ SETTINGS</span>
            </button>
            <button
              className="neon-btn"
              onClick={onLeaderboard}
              style={{
                padding: '12px 28px',
                fontSize: '0.85rem',
                pointerEvents: 'auto',
              }}
            >
              <span style={{ position: 'relative', zIndex: 1 }}>🏆 LEADERBOARD</span>
            </button>
          </div>
        </div>

        {/* Tracking status */}
        <div
          className="flex items-center gap-2 animate-slide-in-up"
          style={{ animationDelay: '0.3s' }}
        >
          {isTrackingReady ? (
            <>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: COLORS.NEON_GREEN,
                  boxShadow: `0 0 6px ${COLORS.NEON_GREEN}, 0 0 12px ${COLORS.NEON_GREEN}60`,
                }}
              />
              <span
                style={{
                  fontSize: '0.7rem',
                  color: COLORS.NEON_GREEN,
                  letterSpacing: '0.08em',
                  fontWeight: 500,
                }}
              >
                Hand tracking ready
              </span>
            </>
          ) : cameraError ? (
            <>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: COLORS.NEON_RED,
                  boxShadow: `0 0 6px ${COLORS.NEON_RED}, 0 0 12px ${COLORS.NEON_RED}60`,
                }}
              />
              <span
                style={{
                  fontSize: '0.7rem',
                  color: COLORS.NEON_RED,
                  letterSpacing: '0.08em',
                  fontWeight: 500,
                }}
              >
                Webcam error — Fallback controls enabled
              </span>
            </>
          ) : (
            <>
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              <span
                style={{
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.4)',
                  letterSpacing: '0.08em',
                  fontWeight: 500,
                }}
              >
                Initializing hand tracking...
              </span>
            </>
          )}
        </div>

        {/* Instructions hint */}
        <p
          className="animate-slide-in-up"
          style={{
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.25)',
            textAlign: 'center',
            maxWidth: 300,
            lineHeight: 1.6,
            animationDelay: '0.5s',
          }}
        >
          Use your webcam to play — control the game with hand gestures
        </p>
      </div>
    </div>
  );
};

export default StartScreen;
