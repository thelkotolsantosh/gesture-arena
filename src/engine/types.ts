// ============================================================================
// Gesture Arena — Core Type Definitions
// ============================================================================

/** Landmark indices for the 21 hand landmarks from MediaPipe */
export const LANDMARK = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

/** 2D vector */
export interface Vec2 {
  x: number;
  y: number;
}

/** 3D normalized landmark from MediaPipe */
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

/** Hand data after processing */
export interface HandData {
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
  handedness: 'Left' | 'Right';
  confidence: number;
  /** Smoothed wrist position in normalized coords */
  wristPosition: Vec2;
  /** Wrist velocity in normalized coords per second */
  wristVelocity: Vec2;
}

/** All recognized gesture types */
export type GestureType =
  | 'NONE'
  | 'OPEN_PALM'
  | 'CLOSED_FIST'
  | 'PEACE_SIGN'
  | 'THUMBS_UP'
  | 'POINTING'
  | 'SWIPE_LEFT'
  | 'SWIPE_RIGHT'
  | 'SWIPE_UP'
  | 'SWIPE_DOWN';

/** Gesture detection result */
export interface GestureResult {
  gesture: GestureType;
  confidence: number;
  hand: 'Left' | 'Right';
  /** Position of the gesture in normalized screen coords (0-1) */
  position: Vec2;
}

/** Game state machine states */
export type GameState =
  | 'MENU'
  | 'COUNTDOWN'
  | 'PLAYING'
  | 'BOSS'
  | 'PAUSED'
  | 'GAME_OVER';

/** Types of game objects */
export type ObjectType = 'ENEMY' | 'HAZARD' | 'BONUS' | 'TARGET' | 'BOSS';

/** A game object in the arena */
export interface GameObject {
  id: number;
  type: ObjectType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  health: number;
  maxHealth: number;
  color: string;
  glowColor: string;
  active: boolean;
  spawnTime: number;
  /** Rotation angle in radians */
  rotation: number;
  rotationSpeed: number;
  /** For boss objects - pulse animation phase */
  pulsePhase: number;
  /** Optional: specific shape or symbol */
  symbol: string;
}

/** Projectile fired by pointing gesture */
export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
  color: string;
  lifetime: number;
}

/** Particle for visual effects */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  radius: number;
  color: string;
  alpha: number;
  alphaDecay: number;
  life: number;
  maxLife: number;
  active: boolean;
  /** Scale factor for size animation */
  scale: number;
  scaleDecay: number;
}

/** Particle effect type */
export type ParticleEffectType =
  | 'EXPLOSION'
  | 'TRAIL'
  | 'IMPACT'
  | 'SPARKLE'
  | 'SHOCKWAVE'
  | 'COMBO'
  | 'BOSS_ENTRANCE'
  | 'SHIELD_HIT';

/** Difficulty level */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

/** Difficulty parameters */
export interface DifficultyConfig {
  level: DifficultyLevel;
  spawnRate: number;        // objects per second
  baseSpeed: number;        // base object speed (normalized units/s)
  maxObjects: number;       // max simultaneous objects
  hazardChance: number;     // probability an object is a hazard (0-1)
  bonusChance: number;      // probability an object is a bonus (0-1)
  targetChance: number;     // probability an object is a projectile target
  bossHealth: number;       // boss HP
  bossSpeed: number;        // boss movement speed
}

/** Achievement definition */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: SessionStats) => boolean;
  unlocked: boolean;
}

/** Stats tracked per session */
export interface SessionStats {
  totalScore: number;
  maxCombo: number;
  enemiesDestroyed: number;
  hazardsBlocked: number;
  bonusesCollected: number;
  projectilesFired: number;
  projectilesHit: number;
  gesturesPerformed: Record<GestureType, number>;
  timePlayed: number;
  bossesDefeated: number;
  perfectRounds: number;
}

/** Graphics quality preset */
export type GraphicsQuality = 'low' | 'medium' | 'high';

/** Settings */
export interface GameSettings {
  cameraId: string;
  gestureSensitivity: number;  // 0.1 - 1.0
  masterVolume: number;        // 0 - 1
  sfxVolume: number;           // 0 - 1
  musicVolume: number;         // 0 - 1
  graphicsQuality: GraphicsQuality;
  showTracking: boolean;
  showFPS: boolean;
  highContrastMode: boolean;
  difficulty: 'auto' | 'easy' | 'medium' | 'hard';
}

/** Leaderboard entry */
export interface LeaderboardEntry {
  name: string;
  score: number;
  maxCombo: number;
  date: string;
  level: number;
}
