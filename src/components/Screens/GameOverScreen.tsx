// ============================================================================
// Gesture Arena — Game Over Screen
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { COLORS } from '../../engine/constants';
import type { LeaderboardEntry } from '../../engine/types';

export interface GameOverScreenProps {
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

/** Format seconds to MM:SS */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  onPlayAgain,
  onMainMenu,
}) => {
  const score = useGameStore((s) => s.score);
  const maxCombo = useGameStore((s) => s.maxCombo);
  const sessionStats = useGameStore((s) => s.sessionStats);
  const leaderboard = useGameStore((s) => s.leaderboard);
  const addToLeaderboard = useGameStore((s) => s.addToLeaderboard);
  const level = useGameStore((s) => s.level);

  const [playerName, setPlayerName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const animFrame = useRef<number>(0);

  // Animate score counting up
  useEffect(() => {
    const duration = 1500;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(score * eased));
      if (progress < 1) {
        animFrame.current = requestAnimationFrame(tick);
      }
    };
    animFrame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame.current);
  }, [score]);

  const handleSubmit = () => {
    if (!playerName.trim() || submitted) return;
    const entry: LeaderboardEntry = {
      name: playerName.trim(),
      score,
      maxCombo,
      date: new Date().toISOString().split('T')[0],
      level,
    };
    addToLeaderboard(entry);
    setSubmitted(true);
  };




  const statCards = [
    { label: 'MAX COMBO', value: `${maxCombo}x`, icon: '🔥' },
    { label: 'ENEMIES', value: sessionStats.enemiesDestroyed.toString(), icon: '💥' },
    { label: 'TIME', value: formatTime(sessionStats.timePlayed), icon: '⏱️' },
    { label: 'BOSSES', value: sessionStats.bossesDefeated.toString(), icon: '💀' },
  ];

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(5, 5, 16, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="flex flex-col items-center gap-6 animate-scale-in"
        style={{ maxWidth: 680, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* "GAME OVER" title */}
        <h2
          className="animate-neon-pulse"
          style={{
            fontSize: '2.5rem',
            fontWeight: 900,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: COLORS.NEON_RED,
            textShadow: `0 0 20px ${COLORS.NEON_RED}, 0 0 40px ${COLORS.NEON_RED}60`,
            margin: 0,
          }}
        >
          GAME OVER
        </h2>

        {/* Final score */}
        <div className="flex flex-col items-center gap-1">
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.2em',
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
            }}
          >
            FINAL SCORE
          </span>
          <span
            style={{
              fontSize: '4rem',
              fontWeight: 900,
              fontFamily: 'var(--font-family-mono)',
              lineHeight: 1,
              background: `linear-gradient(135deg, ${COLORS.NEON_BLUE}, ${COLORS.NEON_PURPLE})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: `drop-shadow(0 0 20px ${COLORS.NEON_PURPLE}40)`,
            }}
          >
            {animatedScore.toLocaleString()}
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3 w-full">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="glass-card flex flex-col items-center gap-1.5 animate-slide-in-up"
              style={{ padding: '14px 8px' }}
            >
              <span style={{ fontSize: '1.4rem' }}>{stat.icon}</span>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-family-mono)',
                  color: '#fff',
                }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  fontSize: '0.55rem',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: 'rgba(255,255,255,0.35)',
                  textTransform: 'uppercase',
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Name input + leaderboard */}
        <div className="glass-card w-full" style={{ padding: '20px 24px' }}>
          {/* Name input */}
          {!submitted && (
            <div className="flex items-center gap-3 mb-4">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.slice(0, 16))}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter your name..."
                maxLength={16}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-family-mono)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10,
                  color: '#fff',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => (e.target.style.borderColor = `${COLORS.NEON_PURPLE}80`)}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
              />
              <button
                className="neon-btn neon-btn-primary"
                onClick={handleSubmit}
                disabled={!playerName.trim()}
                style={{
                  padding: '10px 20px',
                  fontSize: '0.8rem',
                  opacity: playerName.trim() ? 1 : 0.4,
                  pointerEvents: playerName.trim() ? 'auto' : 'none',
                }}
              >
                <span style={{ position: 'relative', zIndex: 1 }}>SAVE</span>
              </button>
            </div>
          )}

          {/* Leaderboard table */}
          <div className="flex flex-col gap-1">
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: COLORS.NEON_YELLOW,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              🏆 TOP 10
            </span>

            {leaderboard.length === 0 ? (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.3)',
                  textAlign: 'center',
                  padding: '12px 0',
                }}
              >
                No entries yet — be the first!
              </span>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['#', 'NAME', 'SCORE', 'COMBO', 'DATE'].map((h) => (
                      <th
                        key={h}
                        style={{
                          fontSize: '0.55rem',
                          fontWeight: 600,
                          letterSpacing: '0.1em',
                          color: 'rgba(255,255,255,0.3)',
                          textTransform: 'uppercase',
                          textAlign: h === 'NAME' ? 'left' : 'center',
                          padding: '6px 4px',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => {
                    const isCurrentScore =
                      submitted && entry.score === score && entry.name === playerName.trim();
                    return (
                      <tr
                        key={`${entry.name}-${entry.date}-${i}`}
                        style={{
                          backgroundColor: isCurrentScore ? `${COLORS.NEON_PURPLE}12` : 'transparent',
                          borderLeft: isCurrentScore ? `2px solid ${COLORS.NEON_PURPLE}` : '2px solid transparent',
                        }}
                      >
                        <td
                          style={{
                            textAlign: 'center',
                            padding: '6px 4px',
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-family-mono)',
                            color: i < 3 ? COLORS.NEON_YELLOW : 'rgba(255,255,255,0.4)',
                            fontWeight: i < 3 ? 700 : 400,
                          }}
                        >
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </td>
                        <td
                          style={{
                            padding: '6px 4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: isCurrentScore ? COLORS.NEON_PURPLE : '#fff',
                          }}
                        >
                          {entry.name}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            padding: '6px 4px',
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-family-mono)',
                            fontWeight: 700,
                            color: isCurrentScore ? COLORS.NEON_BLUE : 'rgba(255,255,255,0.7)',
                          }}
                        >
                          {entry.score.toLocaleString()}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            padding: '6px 4px',
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-family-mono)',
                            color: 'rgba(255,255,255,0.5)',
                          }}
                        >
                          {entry.maxCombo}x
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            padding: '6px 4px',
                            fontSize: '0.65rem',
                            fontFamily: 'var(--font-family-mono)',
                            color: 'rgba(255,255,255,0.3)',
                          }}
                        >
                          {entry.date}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-4">
          <button
            className="neon-btn neon-btn-primary animate-pulse-glow"
            onClick={onPlayAgain}
            style={{
              padding: '14px 40px',
              fontSize: '1rem',
              letterSpacing: '0.12em',
              pointerEvents: 'auto',
            }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>▶ PLAY AGAIN</span>
          </button>
          <button
            className="neon-btn"
            onClick={onMainMenu}
            style={{
              padding: '14px 28px',
              fontSize: '0.9rem',
              pointerEvents: 'auto',
            }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;
