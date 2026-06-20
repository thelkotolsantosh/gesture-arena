// ============================================================================
// Gesture Arena — Achievement Tracking Store (Zustand)
// ============================================================================

import { create } from 'zustand';
import type { Achievement, SessionStats } from '../engine/types';
import { ACHIEVEMENT_DEFS } from '../engine/constants';

// ---------------------------------------------------------------------------
// Achievement condition evaluators (keyed by achievement id)
// ---------------------------------------------------------------------------

const CONDITIONS: Record<string, (stats: SessionStats) => boolean> = {
  first_blood:    (s) => s.enemiesDestroyed >= 1,
  combo_5:        (s) => s.maxCombo >= 5,
  combo_10:       (s) => s.maxCombo >= 10,
  combo_25:       (s) => s.maxCombo >= 25,
  score_1000:     (s) => s.totalScore >= 1000,
  score_5000:     (s) => s.totalScore >= 5000,
  score_10000:    (s) => s.totalScore >= 10000,
  boss_slayer:    (s) => s.bossesDefeated >= 1,
  shield_master:  (s) => s.hazardsBlocked >= 10,
  sharpshooter:   (s) => s.projectilesHit >= 20,
  survivor:       (s) => s.timePlayed >= 300,
  perfect_round:  (s) => s.perfectRounds >= 1,
};

// ---------------------------------------------------------------------------
// Build the initial achievements list from constant definitions
// ---------------------------------------------------------------------------

function buildInitialAchievements(): Achievement[] {
  return ACHIEVEMENT_DEFS.map((def) => ({
    ...def,
    condition: CONDITIONS[def.id] ?? (() => false),
    unlocked: false,
  }));
}

// Persistence key for unlocked achievement ids
const STORAGE_KEY = 'gesture-arena-achievements';

/** Load previously unlocked ids from localStorage. */
function loadUnlockedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const ids: string[] = JSON.parse(raw);
      return new Set(ids);
    }
  } catch {
    // Corrupted — ignore
  }
  return new Set<string>();
}

/** Persist unlocked ids to localStorage. */
function saveUnlockedIds(achievements: Achievement[]): void {
  try {
    const ids = achievements.filter((a) => a.unlocked).map((a) => a.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage full — silently ignore
  }
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export interface AchievementStore {
  achievements: Achievement[];
  /** Most recently unlocked achievement (shown as popup). */
  recentUnlock: Achievement | null;

  /**
   * Check all locked achievements against the current session stats.
   * Newly matched achievements are unlocked and the most recent one is
   * set for popup display (auto-clears after 3 seconds).
   */
  checkAchievements: (stats: SessionStats) => void;

  /** Manually clear the recent-unlock popup. */
  clearRecentUnlock: () => void;

  /** Return the number of currently unlocked achievements. */
  getUnlockedCount: () => number;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useAchievementStore = create<AchievementStore>((set, get) => {
  // Hydrate unlock state from localStorage on store creation
  const unlockedIds = loadUnlockedIds();
  const initial = buildInitialAchievements().map((a) => ({
    ...a,
    unlocked: unlockedIds.has(a.id),
  }));

  // Reference to the auto-clear timer so we can reset it on subsequent unlocks
  let recentUnlockTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    achievements: initial,
    recentUnlock: null,

    checkAchievements: (stats) => {
      const { achievements } = get();
      let latestUnlock: Achievement | null = null;
      let changed = false;

      const updated = achievements.map((ach) => {
        if (ach.unlocked) return ach;

        // Evaluate condition
        if (ach.condition(stats)) {
          changed = true;
          const unlocked = { ...ach, unlocked: true };
          latestUnlock = unlocked;
          return unlocked;
        }
        return ach;
      });

      if (!changed) return; // nothing new

      // Persist & update state
      saveUnlockedIds(updated);

      set({ achievements: updated, recentUnlock: latestUnlock });

      // Auto-clear the popup after 3 seconds
      if (recentUnlockTimer) clearTimeout(recentUnlockTimer);
      recentUnlockTimer = setTimeout(() => {
        set({ recentUnlock: null });
        recentUnlockTimer = null;
      }, 3000);
    },

    clearRecentUnlock: () => {
      if (recentUnlockTimer) {
        clearTimeout(recentUnlockTimer);
        recentUnlockTimer = null;
      }
      set({ recentUnlock: null });
    },

    getUnlockedCount: () => get().achievements.filter((a) => a.unlocked).length,
  };
});
