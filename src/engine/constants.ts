// ============================================================================
// Gesture Arena — Game Constants & Balance Configuration
// ============================================================================

import type { DifficultyConfig } from './types';

/** Canvas dimensions (logical pixels, scaled to viewport) */
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

/** Camera feed dimensions */
export const CAMERA_WIDTH = 640;
export const CAMERA_HEIGHT = 480;

/** FPS targets */
export const TARGET_FPS = 60;
export const MIN_FPS = 30;

/** Hand tracking constants */
export const TRACKING = {
  /** Smoothing factor for EMA (0 = no smoothing, 1 = max smoothing) */
  SMOOTHING_FACTOR: 0.65,
  /** Minimum confidence to consider a gesture valid */
  MIN_GESTURE_CONFIDENCE: 0.6,
  /** Frames a gesture must be held to confirm */
  GESTURE_HOLD_FRAMES: 3,
  /** Swipe velocity threshold (normalized units per second) */
  SWIPE_VELOCITY_THRESHOLD: 1.2,
  /** Swipe cooldown in milliseconds */
  SWIPE_COOLDOWN_MS: 500,
  /** Motion prediction lookahead in seconds */
  PREDICTION_LOOKAHEAD: 0.033, // ~2 frames at 60fps
} as const;

/** Player health */
export const PLAYER = {
  MAX_HEALTH: 100,
  DAMAGE_PER_HIT: 15,
  DAMAGE_PER_HAZARD: 25,
  HEALTH_REGEN_RATE: 0, // no regen for difficulty
  SHIELD_DURATION_MS: 0, // shield is active while palm is open
  SHIELD_RADIUS: 0.12, // normalized radius
} as const;

/** Scoring */
export const SCORING = {
  ENEMY_DESTROY: 100,
  HAZARD_BLOCK: 50,
  BONUS_COLLECT: 150,
  TARGET_HIT: 200,
  BOSS_HIT: 75,
  BOSS_DEFEAT: 1000,
  COMBO_MULTIPLIER_BASE: 1,
  COMBO_DECAY_MS: 2000, // combo resets after this time without scoring
  THUMBS_UP_MULTIPLIER: 2,
  THUMBS_UP_DURATION_MS: 5000,
  THUMBS_UP_COOLDOWN_MS: 20000,
} as const;

/** Slow motion */
export const SLOW_MOTION = {
  TIME_SCALE: 0.5,
  DURATION_MS: 3000,
  COOLDOWN_MS: 15000,
} as const;

/** Projectile settings */
export const PROJECTILE = {
  SPEED: 1.5, // normalized units per second
  RADIUS: 0.015,
  MAX_LIFETIME_MS: 2000,
  MAX_ACTIVE: 10,
  FIRE_COOLDOWN_MS: 300,
} as const;

/** Difficulty level configurations */
export const DIFFICULTY_CONFIGS: Record<number, DifficultyConfig> = {
  1: {
    level: 1,
    spawnRate: 0.8,
    baseSpeed: 0.15,
    maxObjects: 4,
    hazardChance: 0.1,
    bonusChance: 0.2,
    targetChance: 0.15,
    bossHealth: 5,
    bossSpeed: 0.08,
  },
  2: {
    level: 2,
    spawnRate: 1.2,
    baseSpeed: 0.22,
    maxObjects: 6,
    hazardChance: 0.15,
    bonusChance: 0.15,
    targetChance: 0.15,
    bossHealth: 8,
    bossSpeed: 0.1,
  },
  3: {
    level: 3,
    spawnRate: 1.8,
    baseSpeed: 0.28,
    maxObjects: 8,
    hazardChance: 0.2,
    bonusChance: 0.15,
    targetChance: 0.1,
    bossHealth: 12,
    bossSpeed: 0.12,
  },
  4: {
    level: 4,
    spawnRate: 2.4,
    baseSpeed: 0.33,
    maxObjects: 10,
    hazardChance: 0.25,
    bonusChance: 0.1,
    targetChance: 0.1,
    bossHealth: 16,
    bossSpeed: 0.15,
  },
  5: {
    level: 5,
    spawnRate: 3.0,
    baseSpeed: 0.4,
    maxObjects: 12,
    hazardChance: 0.3,
    bonusChance: 0.1,
    targetChance: 0.1,
    bossHealth: 20,
    bossSpeed: 0.18,
  },
};

/** Boss round interval in milliseconds (every 2 minutes) */
export const BOSS_INTERVAL_MS = 120_000;

/** Particle system limits */
export const PARTICLES = {
  MAX_PARTICLES: 500,
  EXPLOSION_COUNT: 30,
  TRAIL_COUNT: 3,
  IMPACT_COUNT: 15,
  SPARKLE_COUNT: 8,
  SHOCKWAVE_DURATION: 0.5,
  COMBO_PARTICLE_COUNT: 20,
  BOSS_ENTRANCE_COUNT: 50,
} as const;

/** UI Colors */
export const COLORS = {
  NEON_BLUE: '#00d4ff',
  NEON_PURPLE: '#a855f7',
  NEON_PINK: '#ec4899',
  NEON_GREEN: '#10b981',
  NEON_RED: '#ef4444',
  NEON_YELLOW: '#f59e0b',
  NEON_ORANGE: '#f97316',
  DARK_900: '#0a0a1a',
  DARK_800: '#12122a',
  DARK_700: '#1a1a3e',
  ENEMY_COLOR: '#ef4444',
  ENEMY_GLOW: '#ff6b6b',
  HAZARD_COLOR: '#f59e0b',
  HAZARD_GLOW: '#fbbf24',
  BONUS_COLOR: '#10b981',
  BONUS_GLOW: '#34d399',
  TARGET_COLOR: '#00d4ff',
  TARGET_GLOW: '#67e8f9',
  BOSS_COLOR: '#a855f7',
  BOSS_GLOW: '#c084fc',
  PROJECTILE_COLOR: '#00d4ff',
  SHIELD_COLOR: 'rgba(0, 212, 255, 0.3)',
} as const;

/** Object symbols drawn on game objects */
export const OBJECT_SYMBOLS: Record<string, string> = {
  ENEMY: '👊',
  HAZARD: '⚡',
  BONUS: '⭐',
  TARGET: '🎯',
  BOSS: '💀',
};

/** Achievement definitions */
export const ACHIEVEMENT_DEFS = [
  { id: 'first_blood', name: 'First Blood', description: 'Destroy your first enemy', icon: '🗡️' },
  { id: 'combo_5', name: 'Combo Master', description: 'Reach a 5x combo', icon: '🔥' },
  { id: 'combo_10', name: 'Unstoppable', description: 'Reach a 10x combo', icon: '💥' },
  { id: 'combo_25', name: 'Legendary', description: 'Reach a 25x combo', icon: '👑' },
  { id: 'score_1000', name: 'Rising Star', description: 'Score 1,000 points', icon: '⭐' },
  { id: 'score_5000', name: 'Arena Champion', description: 'Score 5,000 points', icon: '🏆' },
  { id: 'score_10000', name: 'Grand Master', description: 'Score 10,000 points', icon: '💎' },
  { id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat a boss', icon: '💀' },
  { id: 'shield_master', name: 'Shield Master', description: 'Block 10 hazards', icon: '🛡️' },
  { id: 'sharpshooter', name: 'Sharpshooter', description: 'Hit 20 targets with projectiles', icon: '🎯' },
  { id: 'survivor', name: 'Survivor', description: 'Play for 5 minutes', icon: '⏱️' },
  { id: 'perfect_round', name: 'Perfect Round', description: 'Complete a boss round at full health', icon: '✨' },
] as const;
