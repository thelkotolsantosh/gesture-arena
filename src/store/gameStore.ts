// ============================================================================
// Gesture Arena — Core Game State Store (Zustand)
// ============================================================================

import { create } from 'zustand';
import type {
  GameState,
  GestureType,
  DifficultyLevel,
  SessionStats,
  LeaderboardEntry,
} from '../engine/types';
import { PLAYER, SCORING, SLOW_MOTION } from '../engine/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LEADERBOARD_KEY = 'gesture-arena-leaderboard';
const MAX_LEADERBOARD = 10;

/** Default session stats (zero counters). */
function defaultSessionStats(): SessionStats {
  return {
    totalScore: 0,
    maxCombo: 0,
    enemiesDestroyed: 0,
    hazardsBlocked: 0,
    bonusesCollected: 0,
    projectilesFired: 0,
    projectilesHit: 0,
    gesturesPerformed: {
      NONE: 0,
      OPEN_PALM: 0,
      CLOSED_FIST: 0,
      PEACE_SIGN: 0,
      THUMBS_UP: 0,
      POINTING: 0,
      SWIPE_LEFT: 0,
      SWIPE_RIGHT: 0,
      SWIPE_UP: 0,
      SWIPE_DOWN: 0,
    },
    timePlayed: 0,
    bossesDefeated: 0,
    perfectRounds: 0,
  };
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export interface GameStore {
  // — Gameplay state —
  gameState: GameState;
  score: number;
  combo: number;
  maxCombo: number;
  health: number;
  level: DifficultyLevel;

  // — Gesture detection —
  activeGesture: GestureType;
  gestureConfidence: number;

  // — Abilities —
  slowMotionActive: boolean;
  slowMotionCooldown: boolean;
  multiplierActive: boolean;
  multiplierCooldown: boolean;

  // — Boss —
  bossActive: boolean;
  bossHealth: number;
  bossMaxHealth: number;

  // — Timing —
  gameTime: number;

  // — Performance —
  fps: number;
  trackingFps: number;
  handsDetected: number;

  // — Session / Leaderboard —
  sessionStats: SessionStats;
  leaderboard: LeaderboardEntry[];

  // — Actions —
  setGameState: (state: GameState) => void;
  addScore: (points: number) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  takeDamage: (amount: number) => void;
  setActiveGesture: (gesture: GestureType, confidence: number) => void;
  activateSlowMotion: () => void;
  deactivateSlowMotion: () => void;
  activateMultiplier: () => void;
  deactivateMultiplier: () => void;
  startBoss: (health: number) => void;
  damageBoss: (amount: number) => void;
  defeatBoss: () => void;
  updateGameTime: (dt: number) => void;
  setFPS: (fps: number) => void;
  setTrackingFPS: (fps: number) => void;
  setHandsDetected: (count: number) => void;
  setLevel: (level: DifficultyLevel) => void;
  updateSessionStats: (partial: Partial<SessionStats>) => void;
  addToLeaderboard: (entry: LeaderboardEntry) => void;
  loadLeaderboard: () => void;
  resetGame: () => void;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useGameStore = create<GameStore>((set, get) => ({
  // ---- initial state ----
  gameState: 'MENU',
  score: 0,
  combo: 0,
  maxCombo: 0,
  health: PLAYER.MAX_HEALTH,
  level: 1,

  activeGesture: 'NONE',
  gestureConfidence: 0,

  slowMotionActive: false,
  slowMotionCooldown: false,
  multiplierActive: false,
  multiplierCooldown: false,

  bossActive: false,
  bossHealth: 0,
  bossMaxHealth: 0,

  gameTime: 0,

  fps: 0,
  trackingFps: 0,
  handsDetected: 0,

  sessionStats: defaultSessionStats(),
  leaderboard: [],

  // ---- actions ----

  setGameState: (state) => set({ gameState: state }),

  addScore: (points) =>
    set((s) => {
      // Apply multiplier bonus if active
      const multiplier =
        (SCORING.COMBO_MULTIPLIER_BASE + s.combo) *
        (s.multiplierActive ? SCORING.THUMBS_UP_MULTIPLIER : 1);
      const gained = Math.round(points * multiplier);
      return {
        score: s.score + gained,
        sessionStats: {
          ...s.sessionStats,
          totalScore: s.sessionStats.totalScore + gained,
        },
      };
    }),

  incrementCombo: () =>
    set((s) => {
      const next = s.combo + 1;
      return {
        combo: next,
        maxCombo: Math.max(s.maxCombo, next),
        sessionStats: {
          ...s.sessionStats,
          maxCombo: Math.max(s.sessionStats.maxCombo, next),
        },
      };
    }),

  resetCombo: () => set({ combo: 0 }),

  takeDamage: (amount) =>
    set((s) => {
      const newHealth = Math.max(0, s.health - amount);
      return {
        health: newHealth,
        // Auto‑transition to GAME_OVER if health drops to zero
        ...(newHealth <= 0 ? { gameState: 'GAME_OVER' as GameState } : {}),
      };
    }),

  setActiveGesture: (gesture, confidence) =>
    set({ activeGesture: gesture, gestureConfidence: confidence }),

  activateSlowMotion: () => {
    if (get().slowMotionCooldown) return;
    set({ slowMotionActive: true, slowMotionCooldown: true });

    // Auto-deactivate after duration
    setTimeout(() => {
      get().deactivateSlowMotion();
    }, SLOW_MOTION.DURATION_MS);

    // Clear cooldown after cooldown period
    setTimeout(() => {
      set({ slowMotionCooldown: false });
    }, SLOW_MOTION.COOLDOWN_MS);
  },

  deactivateSlowMotion: () => set({ slowMotionActive: false }),

  activateMultiplier: () => {
    if (get().multiplierCooldown) return;
    set({ multiplierActive: true, multiplierCooldown: true });

    // Auto-deactivate after duration
    setTimeout(() => {
      get().deactivateMultiplier();
    }, SCORING.THUMBS_UP_DURATION_MS);

    // Clear cooldown after cooldown period
    setTimeout(() => {
      set({ multiplierCooldown: false });
    }, SCORING.THUMBS_UP_COOLDOWN_MS);
  },

  deactivateMultiplier: () => set({ multiplierActive: false }),

  startBoss: (health) =>
    set({
      bossActive: true,
      bossHealth: health,
      bossMaxHealth: health,
      gameState: 'BOSS',
    }),

  damageBoss: (amount) =>
    set((s) => {
      const newHealth = Math.max(0, s.bossHealth - amount);
      if (newHealth <= 0) {
        // Boss defeated – handled by defeatBoss() but also guard here
        return { bossHealth: 0 };
      }
      return { bossHealth: newHealth };
    }),

  defeatBoss: () =>
    set((s) => ({
      bossActive: false,
      bossHealth: 0,
      gameState: 'PLAYING',
      sessionStats: {
        ...s.sessionStats,
        bossesDefeated: s.sessionStats.bossesDefeated + 1,
      },
    })),

  updateGameTime: (dt) =>
    set((s) => ({
      gameTime: s.gameTime + dt,
      sessionStats: {
        ...s.sessionStats,
        timePlayed: s.sessionStats.timePlayed + dt,
      },
    })),

  setFPS: (fps) => set({ fps }),

  setTrackingFPS: (fps) => set({ trackingFps: fps }),

  setHandsDetected: (count) => set({ handsDetected: count }),

  setLevel: (level) => set({ level }),

  updateSessionStats: (partial) =>
    set((s) => ({
      sessionStats: { ...s.sessionStats, ...partial },
    })),

  addToLeaderboard: (entry) =>
    set((s) => {
      const updated = [...s.leaderboard, entry]
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_LEADERBOARD);
      // Persist
      try {
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
      } catch {
        // localStorage full or unavailable — silently ignore
      }
      return { leaderboard: updated };
    }),

  loadLeaderboard: () => {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (raw) {
        const parsed: LeaderboardEntry[] = JSON.parse(raw);
        set({ leaderboard: parsed.sort((a, b) => b.score - a.score).slice(0, MAX_LEADERBOARD) });
      }
    } catch {
      // Corrupted data — start fresh
      set({ leaderboard: [] });
    }
  },

  resetGame: () =>
    set({
      gameState: 'MENU',
      score: 0,
      combo: 0,
      maxCombo: 0,
      health: PLAYER.MAX_HEALTH,
      level: 1,
      activeGesture: 'NONE',
      gestureConfidence: 0,
      slowMotionActive: false,
      slowMotionCooldown: false,
      multiplierActive: false,
      multiplierCooldown: false,
      bossActive: false,
      bossHealth: 0,
      bossMaxHealth: 0,
      gameTime: 0,
      sessionStats: defaultSessionStats(),
    }),
}));
