// ============================================================================
// Gesture Arena — Dynamic Difficulty Manager
// ============================================================================

import type { DifficultyConfig, DifficultyLevel } from './types';
import { DIFFICULTY_CONFIGS, BOSS_INTERVAL_MS } from './constants';
import { clamp } from '../utils/math';

// ---------------------------------------------------------------------------
// Performance metrics used for difficulty evaluation
// ---------------------------------------------------------------------------

interface PerformanceSnapshot {
  hitRate: number;   // 0–1 fraction of objects destroyed vs spawned
  combo: number;     // current combo value
  healthFraction: number; // current health / max health
}

/**
 * Dynamically adjusts game difficulty based on player performance.
 *
 * - Evaluates hit rate, current combo, and remaining health each update
 * - Ramps difficulty UP quickly when the player excels
 * - Ramps difficulty DOWN slowly when the player struggles
 * - Exposes whether a boss round should trigger based on elapsed time
 */
export class DifficultyManager {
  /** Current difficulty level (1–5). Stored as float for smooth ramping. */
  private levelProgress = 1.0;

  /** Snapped integer level for config lookup. */
  private currentLevel: DifficultyLevel = 1;

  /** Elapsed game time in milliseconds. */
  private gameTime = 0;

  /** Timestamp of last boss spawn. */
  private lastBossTime = 0;

  /** Cumulative performance score used for ramping (internal). */
  private performanceAccumulator = 0;

  // -------------------------------------------------------------------------
  // Tuning knobs
  // -------------------------------------------------------------------------

  /** How fast difficulty climbs when the player is doing well (per second). */
  private readonly rampUpRate = 0.05;

  /** How fast difficulty drops when the player is struggling (per second). */
  private readonly rampDownRate = 0.02;

  /** Performance score above this → player is "excelling". */
  private readonly excelThreshold = 0.7;

  /** Performance score below this → player is "struggling". */
  private readonly struggleThreshold = 0.35;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Returns the DifficultyConfig for the current snapped level.
   */
  getCurrentConfig(): DifficultyConfig {
    return DIFFICULTY_CONFIGS[this.currentLevel];
  }

  /**
   * Returns the raw numeric level (1.0–5.0) including fractional progress.
   */
  getLevel(): number {
    return this.levelProgress;
  }

  /**
   * Update difficulty based on elapsed time and player performance.
   *
   * @param dt     Delta time in seconds.
   * @param stats  Player performance metrics.
   */
  update(
    dt: number,
    stats: {
      hitRate: number;
      combo: number;
      currentHealth: number;
      maxHealth: number;
    },
  ): void {
    this.gameTime += dt * 1000;

    // Build performance snapshot
    const perf: PerformanceSnapshot = {
      hitRate: clamp(stats.hitRate, 0, 1),
      combo: stats.combo,
      healthFraction: stats.maxHealth > 0 ? stats.currentHealth / stats.maxHealth : 1,
    };

    // Composite performance score (0–1)
    // Weight: hit rate 40%, combo contribution 30%, health 30%
    const comboScore = clamp(perf.combo / 15, 0, 1); // 15 combo ≈ max score
    const score = perf.hitRate * 0.4 + comboScore * 0.3 + perf.healthFraction * 0.3;

    // Smooth the score to avoid jitter
    this.performanceAccumulator =
      this.performanceAccumulator * 0.9 + score * 0.1;

    // Ramp difficulty
    if (this.performanceAccumulator > this.excelThreshold) {
      // Player is excelling → ramp up faster
      this.levelProgress += this.rampUpRate * dt * 1.5;
    } else if (this.performanceAccumulator > this.struggleThreshold) {
      // Player is doing okay → slow steady ramp
      this.levelProgress += this.rampUpRate * dt * 0.5;
    } else {
      // Player is struggling → ease off
      this.levelProgress -= this.rampDownRate * dt;
    }

    // Clamp to valid range
    this.levelProgress = clamp(this.levelProgress, 1.0, 5.0);

    // Snap to integer for config lookup
    this.currentLevel = Math.round(this.levelProgress) as DifficultyLevel;
    this.currentLevel = clamp(this.currentLevel, 1, 5) as DifficultyLevel;
  }

  /**
   * Check whether enough time has passed since the last boss to spawn another.
   *
   * @param gameTime  Total elapsed game time in milliseconds.
   * @returns         True if a boss round should begin.
   */
  shouldSpawnBoss(gameTime: number): boolean {
    if (gameTime - this.lastBossTime >= BOSS_INTERVAL_MS) {
      this.lastBossTime = gameTime;
      return true;
    }
    return false;
  }

  /**
   * Reset all state (e.g. on new game).
   */
  reset(): void {
    this.levelProgress = 1.0;
    this.currentLevel = 1;
    this.gameTime = 0;
    this.lastBossTime = 0;
    this.performanceAccumulator = 0;
  }
}
