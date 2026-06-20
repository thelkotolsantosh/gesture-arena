// ============================================================================
// Gesture Arena — Object Spawner (Object Pool)
// ============================================================================

import type { GameObject, ObjectType, DifficultyConfig } from './types';
import { COLORS, OBJECT_SYMBOLS } from './constants';

/** Maximum number of objects in the pool. */
const POOL_SIZE = 50;

/**
 * Manages a pre-allocated pool of GameObjects.
 *
 * Objects are spawned from random screen edges and travel toward the center
 * area with velocities scaled by the current difficulty. Once an object
 * leaves the visible bounds it is automatically returned to the pool.
 */
export class ObjectSpawner {
  /** The pre-allocated object pool. */
  private pool: GameObject[] = [];

  /** Running ID counter for unique object identification. */
  private nextId = 1;

  constructor() {
    this.initPool();
  }

  // -------------------------------------------------------------------------
  // Pool initialization
  // -------------------------------------------------------------------------

  private initPool(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push(this.createInactiveObject());
    }
  }

  private createInactiveObject(): GameObject {
    return {
      id: 0,
      type: 'ENEMY',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 0.03,
      health: 1,
      maxHealth: 1,
      color: COLORS.ENEMY_COLOR,
      glowColor: COLORS.ENEMY_GLOW,
      active: false,
      spawnTime: 0,
      rotation: 0,
      rotationSpeed: 0,
      pulsePhase: 0,
      symbol: '',
    };
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Activate a pooled object at a random screen edge with velocity toward
   * the center area.
   *
   * @param type       The kind of object to spawn.
   * @param difficulty Current difficulty configuration for speed/size.
   * @returns          The activated GameObject, or null if pool is exhausted.
   */
  spawn(type: ObjectType, difficulty: DifficultyConfig): GameObject | null {
    // Find an inactive slot
    const obj = this.pool.find((o) => !o.active);
    if (!obj) return null;

    obj.id = this.nextId++;
    obj.type = type;
    obj.active = true;
    obj.spawnTime = performance.now();
    obj.rotation = 0;
    obj.rotationSpeed = (Math.random() - 0.5) * 4; // radians / sec
    obj.pulsePhase = Math.random() * Math.PI * 2;

    // Appearance based on type
    this.applyTypeAppearance(obj, type);

    // Boss is special — larger, more health
    if (type === 'BOSS') {
      obj.radius = 0.07;
      obj.health = difficulty.bossHealth;
      obj.maxHealth = difficulty.bossHealth;
    } else {
      obj.radius = 0.025 + Math.random() * 0.015;
      obj.health = 1;
      obj.maxHealth = 1;
    }

    // Position: spawn from a random screen edge
    const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    switch (edge) {
      case 0: // top
        obj.x = Math.random();
        obj.y = -obj.radius;
        break;
      case 1: // right
        obj.x = 1 + obj.radius;
        obj.y = Math.random();
        break;
      case 2: // bottom
        obj.x = Math.random();
        obj.y = 1 + obj.radius;
        break;
      case 3: // left
        obj.x = -obj.radius;
        obj.y = Math.random();
        break;
    }

    // Velocity: aim toward center area with some randomness
    const targetX = 0.3 + Math.random() * 0.4; // 0.3–0.7 range
    const targetY = 0.3 + Math.random() * 0.4;
    const dx = targetX - obj.x;
    const dy = targetY - obj.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const speed = type === 'BOSS' ? difficulty.bossSpeed : difficulty.baseSpeed;
    obj.vx = (dx / dist) * speed;
    obj.vy = (dy / dist) * speed;

    return obj;
  }

  /**
   * Spawn a BOSS object — convenience wrapper.
   */
  spawnBoss(difficulty: DifficultyConfig): GameObject | null {
    return this.spawn('BOSS', difficulty);
  }

  /**
   * Update all active objects: move by velocity × dt and deactivate any that
   * leave the screen bounds (with a generous margin).
   *
   * @param dt  Delta time in seconds.
   */
  update(dt: number): void {
    const margin = 0.15;
    for (const obj of this.pool) {
      if (!obj.active) continue;

      // Move
      obj.x += obj.vx * dt;
      obj.y += obj.vy * dt;

      // Rotate
      obj.rotation += obj.rotationSpeed * dt;

      // Pulse phase (for boss glow animation)
      obj.pulsePhase += dt * 3;

      // Deactivate if out of bounds
      if (
        obj.x < -margin ||
        obj.x > 1 + margin ||
        obj.y < -margin ||
        obj.y > 1 + margin
      ) {
        obj.active = false;
      }
    }
  }

  /**
   * Return a read-only view of all currently active objects.
   */
  getActiveObjects(): GameObject[] {
    return this.pool.filter((o) => o.active);
  }

  /**
   * Deactivate an object by ID, returning it to the pool.
   */
  deactivate(id: number): void {
    const obj = this.pool.find((o) => o.id === id);
    if (obj) obj.active = false;
  }

  /**
   * Deactivate all objects (e.g. on game reset).
   */
  deactivateAll(): void {
    for (const obj of this.pool) {
      obj.active = false;
    }
  }

  // -------------------------------------------------------------------------
  // Type appearance
  // -------------------------------------------------------------------------

  private applyTypeAppearance(obj: GameObject, type: ObjectType): void {
    switch (type) {
      case 'ENEMY':
        obj.color = COLORS.ENEMY_COLOR;
        obj.glowColor = COLORS.ENEMY_GLOW;
        obj.symbol = OBJECT_SYMBOLS.ENEMY;
        break;
      case 'HAZARD':
        obj.color = COLORS.HAZARD_COLOR;
        obj.glowColor = COLORS.HAZARD_GLOW;
        obj.symbol = OBJECT_SYMBOLS.HAZARD;
        break;
      case 'BONUS':
        obj.color = COLORS.BONUS_COLOR;
        obj.glowColor = COLORS.BONUS_GLOW;
        obj.symbol = OBJECT_SYMBOLS.BONUS;
        break;
      case 'TARGET':
        obj.color = COLORS.TARGET_COLOR;
        obj.glowColor = COLORS.TARGET_GLOW;
        obj.symbol = OBJECT_SYMBOLS.TARGET;
        break;
      case 'BOSS':
        obj.color = COLORS.BOSS_COLOR;
        obj.glowColor = COLORS.BOSS_GLOW;
        obj.symbol = OBJECT_SYMBOLS.BOSS;
        break;
    }
  }
}
