// ============================================================================
// Gesture Arena — Game Engine (Main Game Controller)
// ============================================================================

import { ObjectSpawner } from './ObjectSpawner';
import { CollisionSystem } from './CollisionSystem';
import type { ShieldInfo } from './CollisionSystem';
import { DifficultyManager } from './DifficultyManager';
import { ParticleSystem } from './ParticleSystem';
import { AudioEngine } from './AudioEngine';
import { useGameStore } from '../store/gameStore';
import type { HandData, GestureResult, Projectile, Vec2 } from './types';
import { COLORS, PLAYER, SCORING, SLOW_MOTION, PROJECTILE } from './constants';
import { vec2Distance } from '../utils/math';

export class GameEngine {
  private spawner: ObjectSpawner;
  private collisionSystem: CollisionSystem;
  private difficultyManager: DifficultyManager;
  private particles: ParticleSystem;
  private audio: AudioEngine | null = null;

  private projectiles: Projectile[] = [];
  private nextProjectileId = 1;
  private lastProjectileFireTime = 0;

  private hands: HandData[] = [];
  private gestures: GestureResult[] = [];

  private lastSpawnTime = 0;
  private comboDecayTimer = 0;

  // Double-hand ultimate abilities
  private nukeCooldown = 0; // in seconds
  private nukeActiveTime = 0; // in seconds (for screen flash & shake)
  private timeFreezeCooldown = 0; // in seconds
  private timeFreezeActiveTime = 0; // in seconds
  private forceFieldCooldown = 0; // in seconds
  private forceFieldActiveTime = 0; // in seconds

  // Glow texture cache for GPU performance
  private glowTextures = new Map<string, HTMLCanvasElement>();

  private getGlowTexture(color: string): HTMLCanvasElement {
    let texture = this.glowTextures.get(color);
    if (!texture) {
      texture = this.createGlowTexture(color);
      this.glowTextures.set(color, texture);
    }
    return texture;
  }

  private createGlowTexture(color: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(size/2, size/2, 4, size/2, size/2, size/2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.15, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }

  // Simulated mouse controls fallback
  private mousePos: Vec2 = { x: 0.5, y: 0.5 };
  private isMouseDown = false;
  private isSpaceDown = false;
  private isFDown = false;
  private listenersAttached = false;

  private attachInputListeners(): void {
    if (this.listenersAttached) return;
    this.listenersAttached = true;

    window.addEventListener('mousemove', (e) => {
      this.mousePos.x = e.clientX / window.innerWidth;
      this.mousePos.y = e.clientY / window.innerHeight;
    });

    window.addEventListener('mousedown', () => {
      this.isMouseDown = true;
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        this.isSpaceDown = true;
        e.preventDefault();
      }
      if (e.code === 'KeyF') {
        this.isFDown = true;
      }
      if (e.code === 'KeyN') {
        const store = useGameStore.getState();
        if (this.nukeCooldown === 0 && (store.gameState === 'PLAYING' || store.gameState === 'BOSS')) {
          this.triggerNuclearBlast(store);
        }
      }
      if (e.code === 'KeyT') {
        const store = useGameStore.getState();
        if (this.timeFreezeCooldown === 0 && (store.gameState === 'PLAYING' || store.gameState === 'BOSS')) {
          this.triggerTimeFreeze();
        }
      }
      if (e.code === 'KeyS') {
        const store = useGameStore.getState();
        if (this.forceFieldCooldown === 0 && (store.gameState === 'PLAYING' || store.gameState === 'BOSS')) {
          this.triggerForceField();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpaceDown = false;
      }
      if (e.code === 'KeyF') {
        this.isFDown = false;
      }
    });
  }

  constructor(audioOrCanvas?: AudioEngine | HTMLCanvasElement) {
    this.spawner = new ObjectSpawner();
    this.collisionSystem = new CollisionSystem();
    this.difficultyManager = new DifficultyManager();
    this.particles = new ParticleSystem();

    if (audioOrCanvas && audioOrCanvas instanceof AudioEngine) {
      this.audio = audioOrCanvas;
    }
  }

  setTrackingData(hands: HandData[], gestures: GestureResult[]): void {
    this.hands = hands;
    this.gestures = gestures;
  }

  destroy(): void {
    this.spawner.deactivateAll();
    this.particles.clear();
    this.projectiles = [];
  }

  update(dt: number, gestures?: GestureResult[], hands?: HandData[]): void {
    if (gestures) this.gestures = gestures;
    if (hands) this.hands = hands;

    this.attachInputListeners();

    // Fallback if no camera hand is detected
    if (this.hands.length === 0) {
      const simulatedHand: HandData = {
        landmarks: [],
        worldLandmarks: [],
        handedness: 'Right',
        confidence: 1.0,
        wristPosition: this.mousePos,
        wristVelocity: { x: 0, y: 0 }
      };

      let simulatedGesture: GestureResult | null = null;
      if (this.isSpaceDown) {
        simulatedGesture = {
          gesture: 'OPEN_PALM',
          confidence: 1.0,
          hand: 'Right',
          position: this.mousePos
        };
      } else if (this.isFDown) {
        simulatedGesture = {
          gesture: 'POINTING',
          confidence: 1.0,
          hand: 'Right',
          position: this.mousePos
        };
      } else if (this.isMouseDown) {
        simulatedGesture = {
          gesture: 'CLOSED_FIST',
          confidence: 1.0,
          hand: 'Right',
          position: this.mousePos
        };
      }

      this.hands = [simulatedHand];
      this.gestures = simulatedGesture ? [simulatedGesture] : [];
    }

    const store = useGameStore.getState();
    if (store.gameState !== 'PLAYING' && store.gameState !== 'BOSS') return;

    // Tick down double-hand ultimate ability timers
    if (this.nukeCooldown > 0) this.nukeCooldown = Math.max(0, this.nukeCooldown - dt);
    if (this.nukeActiveTime > 0) this.nukeActiveTime = Math.max(0, this.nukeActiveTime - dt);
    if (this.timeFreezeCooldown > 0) this.timeFreezeCooldown = Math.max(0, this.timeFreezeCooldown - dt);
    if (this.timeFreezeActiveTime > 0) this.timeFreezeActiveTime = Math.max(0, this.timeFreezeActiveTime - dt);
    if (this.forceFieldCooldown > 0) this.forceFieldCooldown = Math.max(0, this.forceFieldCooldown - dt);
    if (this.forceFieldActiveTime > 0) this.forceFieldActiveTime = Math.max(0, this.forceFieldActiveTime - dt);

    // Time scaling (Time Freeze > Slow Motion > Normal)
    let timeScale = 1.0;
    if (this.timeFreezeActiveTime > 0) {
      timeScale = 0.0;
    } else if (store.slowMotionActive) {
      timeScale = SLOW_MOTION.TIME_SCALE;
    }
    const scaledDt = dt * timeScale;

    // Update game time in store
    store.updateGameTime(scaledDt);

    // Get active objects to compute hit rate
    const activeObjects = this.spawner.getActiveObjects();

    // 1. Update difficulty
    const destroyed = store.sessionStats.enemiesDestroyed + store.sessionStats.projectilesHit + store.sessionStats.hazardsBlocked;
    const spawnedCount = destroyed + activeObjects.length;
    const hitRate = spawnedCount > 0 ? destroyed / spawnedCount : 1.0;

    this.difficultyManager.update(scaledDt, {
      hitRate,
      combo: store.combo,
      currentHealth: store.health,
      maxHealth: PLAYER.MAX_HEALTH,
    });
    
    // Sync level
    store.setLevel(this.difficultyManager.getCurrentConfig().level);

    // 2. Update components
    this.spawner.update(scaledDt);
    this.particles.update(dt); // particles look better running at full speed
    this.updateProjectiles(scaledDt);

    // 3. Spawning logic
    this.handleSpawning(scaledDt, store);

    // 4. Handle gestures
    this.handleGestures(store);

    // 5. Check collisions
    this.handleCollisions(store);

    // 6. Handle escapes and damage
    this.handleDamageAndEscapes(store, scaledDt);

    // 7. Combo decay
    if (store.combo > 0) {
      this.comboDecayTimer += dt * 1000;
      if (this.comboDecayTimer >= SCORING.COMBO_DECAY_MS) {
        store.resetCombo();
        this.comboDecayTimer = 0;
      }
    } else {
      this.comboDecayTimer = 0;
    }
  }

  private handleSpawning(dt: number, store: any): void {
    if (this.timeFreezeActiveTime > 0) return; // freeze spawning during Time Freeze!

    const difficulty = this.difficultyManager.getCurrentConfig();
    const gameTimeMs = store.gameTime * 1000;

    if (store.gameState === 'BOSS') {
      // Boss is active. If the boss object somehow disappeared but state is BOSS, spawn one.
      const activeObjs = this.spawner.getActiveObjects();
      const hasBoss = activeObjs.some(o => o.type === 'BOSS');
      if (!hasBoss) {
        // Boss was defeated or cleared
        store.defeatBoss();
      }
      return;
    }

    // Check if it's time to spawn a boss
    if (this.difficultyManager.shouldSpawnBoss(gameTimeMs)) {
      // Transition to boss!
      store.startBoss(difficulty.bossHealth);
      const boss = this.spawner.spawnBoss(difficulty);
      if (boss) {
        this.particles.emit('BOSS_ENTRANCE', boss.x, boss.y, COLORS.BOSS_GLOW);
      }
      this.audio?.playBossWarning();
      return;
    }

    // Regular spawns
    const activeObjects = this.spawner.getActiveObjects();
    if (activeObjects.length >= difficulty.maxObjects) return;

    this.lastSpawnTime += dt;
    const spawnInterval = 1 / difficulty.spawnRate;
    if (this.lastSpawnTime >= spawnInterval) {
      this.lastSpawnTime = 0;

      // Roll type
      const r = Math.random();
      let type: any = 'ENEMY';
      if (r < difficulty.hazardChance) {
        type = 'HAZARD';
      } else if (r < difficulty.hazardChance + difficulty.bonusChance) {
        type = 'BONUS';
      } else if (r < difficulty.hazardChance + difficulty.bonusChance + difficulty.targetChance) {
        type = 'TARGET';
      }

      this.spawner.spawn(type, difficulty);
    }
  }

  private handleGestures(store: any): void {
    // Check for peace sign (slow motion) and thumbs up (multiplier)
    for (const g of this.gestures) {
      if (g.confidence < 0.6) continue;

      if (g.gesture === 'PEACE_SIGN') {
        if (!store.slowMotionActive && !store.slowMotionCooldown) {
          store.activateSlowMotion();
          this.audio?.playPowerUp();
          // Emit some sparkles
          this.particles.emit('SPARKLE', g.position.x, g.position.y, COLORS.NEON_PURPLE, 20);
        }
      }

      if (g.gesture === 'THUMBS_UP') {
        if (!store.multiplierActive && !store.multiplierCooldown) {
          store.activateMultiplier();
          this.audio?.playPowerUp();
          this.particles.emit('SPARKLE', g.position.x, g.position.y, COLORS.NEON_YELLOW, 20);
        }
      }

      if (g.gesture === 'POINTING') {
        const now = performance.now();
        if (now - this.lastProjectileFireTime >= PROJECTILE.FIRE_COOLDOWN_MS) {
          this.lastProjectileFireTime = now;
          this.spawnProjectile(g.position);
          store.updateSessionStats({
            projectilesFired: store.sessionStats.projectilesFired + 1
          });
        }
      }
    }

    // Double-hand gesture classification triggers
    if (this.gestures.length >= 2) {
      const allFists = this.gestures.filter(g => g.gesture === 'CLOSED_FIST' && g.confidence >= 0.6);
      const allPeaces = this.gestures.filter(g => g.gesture === 'PEACE_SIGN' && g.confidence >= 0.6);
      const allPalms = this.gestures.filter(g => g.gesture === 'OPEN_PALM' && g.confidence >= 0.6);

      if (allFists.length >= 2 && this.nukeCooldown === 0) {
        this.triggerNuclearBlast(store);
      }
      if (allPeaces.length >= 2 && this.timeFreezeCooldown === 0) {
        this.triggerTimeFreeze();
      }
      if (allPalms.length >= 2 && this.forceFieldCooldown === 0) {
        this.triggerForceField();
      }
    }
  }

  private spawnProjectile(pos: Vec2): void {
    const proj: Projectile = {
      id: this.nextProjectileId++,
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: -PROJECTILE.SPEED,
      radius: PROJECTILE.RADIUS,
      active: true,
      color: COLORS.PROJECTILE_COLOR,
      lifetime: 0
    };
    this.projectiles.push(proj);
    this.audio?.playProjectile();
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.lifetime += dt * 1000;

      // Deactivate if out of bounds or lifetime exceeded
      if (p.y < -0.05 || p.lifetime >= PROJECTILE.MAX_LIFETIME_MS) {
        p.active = false;
        this.projectiles.splice(i, 1);
      }
    }
  }

  private handleCollisions(store: any): void {
    // Build shield info
    let shield: ShieldInfo = { active: false, position: { x: 0, y: 0 }, radius: 0 };
    for (const g of this.gestures) {
      if (g.gesture === 'OPEN_PALM') {
        shield = {
          active: true,
          position: g.position,
          radius: PLAYER.SHIELD_RADIUS
        };
        break;
      }
    }

    const activeObjects = this.spawner.getActiveObjects();
    const collisions = this.collisionSystem.checkCollisions(
      this.hands,
      this.gestures,
      activeObjects,
      this.projectiles,
      shield
    );

    for (const col of collisions) {
      const obj = activeObjects.find(o => o.id === col.objectId);
      if (!obj) continue;

      this.comboDecayTimer = 0; // reset decay on hit

      if (col.type === 'destroyed') {
        this.spawner.deactivate(obj.id);
        store.addScore(col.points);
        store.incrementCombo();

        // Particle and Sound
        this.particles.emit('EXPLOSION', obj.x, obj.y, obj.color);
        
        if (obj.type === 'ENEMY') {
          this.audio?.playHit();
          store.updateSessionStats({
            enemiesDestroyed: store.sessionStats.enemiesDestroyed + 1
          });
        } else if (obj.type === 'BONUS') {
          this.audio?.playBonus();
          store.updateSessionStats({
            bonusesCollected: store.sessionStats.bonusesCollected + 1
          });
        } else if (obj.type === 'TARGET') {
          this.audio?.playCoin();
          store.updateSessionStats({
            projectilesHit: store.sessionStats.projectilesHit + 1
          });
        }
      } else if (col.type === 'blocked') {
        this.spawner.deactivate(obj.id);
        store.addScore(col.points);
        store.incrementCombo();
        this.audio?.playShield();
        this.particles.emit('SHIELD_HIT', obj.x, obj.y, COLORS.NEON_BLUE);
        store.updateSessionStats({
          hazardsBlocked: store.sessionStats.hazardsBlocked + 1
        });
      } else if (col.type === 'hit') {
        if (obj.type === 'BOSS') {
          store.damageBoss(1);
          this.audio?.playHit();
          this.particles.emit('IMPACT', col.position.x, col.position.y, COLORS.BOSS_GLOW);

          if (store.bossHealth <= 0) {
            // Boss Defeated!
            this.spawner.deactivate(obj.id);
            store.defeatBoss();
            this.audio?.playBossDefeat();
            this.particles.emit('EXPLOSION', obj.x, obj.y, COLORS.BOSS_GLOW, 80);
            this.particles.emit('SHOCKWAVE', obj.x, obj.y, COLORS.BOSS_GLOW);
            store.addScore(SCORING.BOSS_DEFEAT);
          }
        } else if (obj.type === 'HAZARD') {
          // Fist/slash hits hazard -> damages player!
          this.spawner.deactivate(obj.id);
          store.resetCombo();
          store.takeDamage(PLAYER.DAMAGE_PER_HAZARD);
          this.audio?.playDamage();
          this.particles.emit('IMPACT', obj.x, obj.y, COLORS.HAZARD_GLOW);
        }
      }
    }
  }

  private handleDamageAndEscapes(store: any, _dt: number): void {
    const activeObjects = this.spawner.getActiveObjects();

    for (const obj of activeObjects) {
      if (!obj.active) continue;

      // 0. Aegis Force Field Absorption (bottom 70% dome coverage)
      if (this.forceFieldActiveTime > 0) {
        const dist = vec2Distance({ x: obj.x, y: obj.y }, { x: 0.5, y: 1.0 });
        if (dist < 0.7) {
          if (obj.type === 'BOSS') {
            store.damageBoss(2); // Shield contact deals damage
            this.audio?.playHit();
            this.particles.emit('IMPACT', obj.x, obj.y, COLORS.BOSS_GLOW);

            if (store.bossHealth <= 0) {
              this.spawner.deactivate(obj.id);
              store.defeatBoss();
              this.audio?.playBossDefeat();
              this.particles.emit('EXPLOSION', obj.x, obj.y, COLORS.BOSS_GLOW, 80);
              this.particles.emit('SHOCKWAVE', obj.x, obj.y, COLORS.BOSS_GLOW);
              store.addScore(SCORING.BOSS_DEFEAT);
            }
            // Push boss upwards and reverse its vertical velocity
            obj.y = Math.max(0.2, obj.y - 0.1);
            obj.vy = -Math.abs(obj.vy);
          } else {
            this.spawner.deactivate(obj.id);
            this.particles.emit('SHIELD_HIT', obj.x, obj.y, COLORS.NEON_BLUE);
            this.audio?.playShield();

            let points = 0;
            if (obj.type === 'ENEMY') {
              points = SCORING.ENEMY_DESTROY;
              store.updateSessionStats({ enemiesDestroyed: store.sessionStats.enemiesDestroyed + 1 });
            } else if (obj.type === 'HAZARD') {
              points = SCORING.HAZARD_BLOCK;
              store.updateSessionStats({ hazardsBlocked: store.sessionStats.hazardsBlocked + 1 });
            } else if (obj.type === 'TARGET') {
              points = SCORING.TARGET_HIT;
              store.updateSessionStats({ projectilesHit: store.sessionStats.projectilesHit + 1 });
            } else if (obj.type === 'BONUS') {
              points = SCORING.BONUS_COLLECT;
              store.updateSessionStats({ bonusesCollected: store.sessionStats.bonusesCollected + 1 });
            }

            if (store.multiplierActive) {
              points *= SCORING.THUMBS_UP_MULTIPLIER;
            }

            store.addScore(points);
            store.incrementCombo();
          }
          continue;
        }
      }

      // 1. Escaped objects past the bottom edge
      if (obj.y > 1.0) {
        this.spawner.deactivate(obj.id);
        if (obj.type === 'ENEMY') {
          // Missed enemy damages player!
          store.resetCombo();
          store.takeDamage(PLAYER.DAMAGE_PER_HIT);
          this.audio?.playDamage();
          this.particles.emit('IMPACT', obj.x, 0.95, COLORS.ENEMY_GLOW);
        } else if (obj.type === 'HAZARD') {
          // Hazard escaping does no damage (it just goes away)
        }
        continue;
      }

      // 2. Proximity/touch damage when player does NOT have active slash/shield
      for (const hand of this.hands) {
        const dist = vec2Distance(hand.wristPosition, { x: obj.x, y: obj.y });
        if (dist < obj.radius + 0.04) {
          // Hand touched object!
          // Check if player has defensive gesture on this hand
          const handGesture = this.gestures.find(g => g.hand === hand.handedness)?.gesture ?? 'NONE';
          const isSlash = ['CLOSED_FIST', 'SWIPE_LEFT', 'SWIPE_RIGHT', 'SWIPE_UP', 'SWIPE_DOWN'].includes(handGesture);
          const isShield = handGesture === 'OPEN_PALM';

          if (obj.type === 'ENEMY') {
            if (!isSlash && !isShield) {
              this.spawner.deactivate(obj.id);
              store.resetCombo();
              store.takeDamage(PLAYER.DAMAGE_PER_HIT);
              this.audio?.playDamage();
              this.particles.emit('IMPACT', obj.x, obj.y, COLORS.ENEMY_GLOW);
            }
          } else if (obj.type === 'HAZARD') {
            if (!isShield) {
              this.spawner.deactivate(obj.id);
              store.resetCombo();
              store.takeDamage(PLAYER.DAMAGE_PER_HAZARD);
              this.audio?.playDamage();
              this.particles.emit('IMPACT', obj.x, obj.y, COLORS.HAZARD_GLOW);
            }
          } else if (obj.type === 'BONUS') {
            // Touch bonus collects it!
            this.spawner.deactivate(obj.id);
            store.addScore(SCORING.BONUS_COLLECT);
            this.audio?.playBonus();
            this.particles.emit('SPARKLE', obj.x, obj.y, COLORS.BONUS_GLOW, 15);
            store.updateSessionStats({
              bonusesCollected: store.sessionStats.bonusesCollected + 1
            });
          }
        }
      }
    }
  }

  private triggerNuclearBlast(store: any): void {
    this.nukeCooldown = 20.0;
    this.nukeActiveTime = 1.0;

    this.audio?.playExplosion();
    
    // Create screen shockwave particles
    this.particles.emit('SHOCKWAVE', 0.5, 0.5, COLORS.NEON_RED);
    this.particles.emit('EXPLOSION', 0.5, 0.5, COLORS.NEON_ORANGE, 100);

    const activeObjects = this.spawner.getActiveObjects();
    for (const obj of activeObjects) {
      if (!obj.active) continue;

      if (obj.type === 'BOSS') {
        store.damageBoss(10);
        this.particles.emit('EXPLOSION', obj.x, obj.y, COLORS.BOSS_GLOW, 40);
        this.particles.emit('IMPACT', obj.x, obj.y, COLORS.BOSS_GLOW, 20);

        if (store.bossHealth <= 0) {
          this.spawner.deactivate(obj.id);
          store.defeatBoss();
          this.audio?.playBossDefeat();
          this.particles.emit('EXPLOSION', obj.x, obj.y, COLORS.BOSS_GLOW, 80);
          this.particles.emit('SHOCKWAVE', obj.x, obj.y, COLORS.BOSS_GLOW);
          store.addScore(SCORING.BOSS_DEFEAT);
        }
      } else {
        this.spawner.deactivate(obj.id);
        
        let points = 0;
        if (obj.type === 'ENEMY') {
          points = SCORING.ENEMY_DESTROY;
          store.updateSessionStats({ enemiesDestroyed: store.sessionStats.enemiesDestroyed + 1 });
        } else if (obj.type === 'HAZARD') {
          points = SCORING.HAZARD_BLOCK;
          store.updateSessionStats({ hazardsBlocked: store.sessionStats.hazardsBlocked + 1 });
        } else if (obj.type === 'TARGET') {
          points = SCORING.TARGET_HIT;
          store.updateSessionStats({ projectilesHit: store.sessionStats.projectilesHit + 1 });
        } else if (obj.type === 'BONUS') {
          points = SCORING.BONUS_COLLECT;
          store.updateSessionStats({ bonusesCollected: store.sessionStats.bonusesCollected + 1 });
        }

        if (store.multiplierActive) {
          points *= SCORING.THUMBS_UP_MULTIPLIER;
        }

        store.addScore(points);
        store.incrementCombo();
        this.particles.emit('EXPLOSION', obj.x, obj.y, obj.color, 15);
      }
    }
  }

  private triggerTimeFreeze(): void {
    this.timeFreezeCooldown = 20.0;
    this.timeFreezeActiveTime = 4.0;
    this.audio?.playTimeFreeze();
    
    // Sparkle burst across the center
    this.particles.emit('SHOCKWAVE', 0.5, 0.5, COLORS.NEON_BLUE);
    this.particles.emit('SPARKLE', 0.5, 0.5, COLORS.NEON_BLUE, 60);
  }

  private triggerForceField(): void {
    this.forceFieldCooldown = 20.0;
    this.forceFieldActiveTime = 3.0;
    this.audio?.playShield();
    
    // Wave of blue sparklies from bottom
    this.particles.emit('SHOCKWAVE', 0.5, 1.0, COLORS.NEON_BLUE);
    this.particles.emit('SPARKLE', 0.5, 0.95, COLORS.NEON_BLUE, 50);
  }

  render(ctx?: CanvasRenderingContext2D, width?: number, height?: number): void {
    if (!ctx || width === undefined || height === undefined) return;

    ctx.save();

    // Screen Shake for Nuclear Blast
    if (this.nukeActiveTime > 0) {
      const shakeX = (Math.random() - 0.5) * 24 * (this.nukeActiveTime / 1.0);
      const shakeY = (Math.random() - 0.5) * 24 * (this.nukeActiveTime / 1.0);
      ctx.translate(shakeX, shakeY);
    }

    // 1. Motion blur background clearing
    ctx.fillStyle = 'rgba(10, 10, 26, 0.25)'; // DARK_900 transparency
    ctx.fillRect(0, 0, width, height);

    const minDim = Math.min(width, height);

    // 2. Render Shield circles
    for (const g of this.gestures) {
      if (g.gesture === 'OPEN_PALM') {
        const sx = g.position.x * width;
        const sy = g.position.y * height;
        const sr = PLAYER.SHIELD_RADIUS * minDim;

        const shieldTex = this.getGlowTexture(COLORS.NEON_BLUE);
        const shieldGlowSize = sr * 2.6;

        ctx.save();
        ctx.drawImage(shieldTex, sx - shieldGlowSize/2, sy - shieldGlowSize/2, shieldGlowSize, shieldGlowSize);
        ctx.fillStyle = COLORS.SHIELD_COLOR;
        ctx.strokeStyle = COLORS.NEON_BLUE;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // 2b. Render Aegis Force Field dome
    if (this.forceFieldActiveTime > 0) {
      ctx.save();
      const fx = width / 2;
      const fy = height;
      const fr = minDim * 0.7; // 70% of screen min dimension radius

      // Draw glowing background under the dome
      const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
      grad.addColorStop(0, 'rgba(0, 212, 255, 0.15)');
      grad.addColorStop(0.8, 'rgba(0, 212, 255, 0.05)');
      grad.addColorStop(1, 'rgba(0, 212, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, Math.PI, 0);
      ctx.fill();

      // Draw the dome outer ring
      ctx.strokeStyle = COLORS.NEON_BLUE;
      ctx.lineWidth = 4 + Math.sin(performance.now() / 80) * 1.5; // pulsing line width
      ctx.shadowColor = COLORS.NEON_BLUE;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, Math.PI, 0);
      ctx.stroke();

      // Draw grid pattern inside the dome
      ctx.save();
      ctx.beginPath();
      ctx.arc(fx, fy, fr, Math.PI, 0);
      ctx.clip();

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      const step = 40;
      for (let x = fx - fr; x < fx + fr; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, fy - fr);
        ctx.lineTo(x, fy);
        ctx.stroke();
      }
      for (let y = fy - fr; y < fy; y += step) {
        ctx.beginPath();
        ctx.moveTo(fx - fr, y);
        ctx.lineTo(fx + fr, y);
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
    }

    // 3. Render GameObjects
    const activeObjects = this.spawner.getActiveObjects();
    for (const obj of activeObjects) {
      const ox = obj.x * width;
      const oy = obj.y * height;
      const or = obj.radius * minDim;

      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(obj.rotation);

      // Pulse effect for boss
      let pulseScale = 1.0;
      if (obj.type === 'BOSS') {
        pulseScale = 1.0 + Math.sin(obj.pulsePhase) * 0.08;
      }
      const r = or * pulseScale;

      // Glow texture drawing
      const glowTex = this.getGlowTexture(obj.glowColor);
      const glowSize = r * (obj.type === 'BOSS' ? 4.2 : 3.8);
      ctx.drawImage(glowTex, -glowSize/2, -glowSize/2, glowSize, glowSize);

      // Draw main body circle
      ctx.fillStyle = obj.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Inner stroke
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Symbol
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${r * 0.9}px Outfit, Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.symbol, 0, 0);

      ctx.restore();

      // Boss health bar
      if (obj.type === 'BOSS') {
        const store = useGameStore.getState();
        const barW = r * 2.2;
        const barH = 6;
        const bx = ox - barW / 2;
        const by = oy - r - 15;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx, by, barW, barH);

        // Foreground
        const hpPct = Math.max(0, store.bossHealth / store.bossMaxHealth);
        ctx.fillStyle = COLORS.NEON_GREEN;
        ctx.fillRect(bx, by, barW * hpPct, barH);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, barW, barH);
      }
    }

    // 4. Render Projectiles
    for (const p of this.projectiles) {
      if (!p.active) continue;
      const px = p.x * width;
      const py = p.y * height;
      const pr = p.radius * minDim;

      const projTex = this.getGlowTexture(p.color);
      const projGlowSize = pr * 4.5;

      ctx.save();
      ctx.drawImage(projTex, px - projGlowSize/2, py - projGlowSize/2, projGlowSize, projGlowSize);
      ctx.fillStyle = p.color;

      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Render Particles
    this.particles.render(ctx, width, height);

    // 6. Draw Time Freeze Grid Overlay
    if (this.timeFreezeActiveTime > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.12)';
      ctx.lineWidth = 1;
      const gridSize = 45;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Blue vignette glow
      const grad = ctx.createRadialGradient(width/2, height/2, minDim * 0.25, width/2, height/2, width * 0.6);
      grad.addColorStop(0, 'rgba(0, 212, 255, 0)');
      grad.addColorStop(1, 'rgba(0, 212, 255, 0.22)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 7. Draw Nuke Screen Flash Overlay
    if (this.nukeActiveTime > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 120, 20, ${0.7 * (this.nukeActiveTime / 1.0)})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 8. Draw Abilities HUD Badges (Top Center)
    ctx.save();
    const bx = width / 2 - 280;
    const by = 24;
    
    ctx.font = 'bold 12px monospace';
    ctx.textBaseline = 'middle';
    
    // Nuke badge
    ctx.textAlign = 'left';
    if (this.nukeCooldown === 0) {
      ctx.fillStyle = COLORS.NEON_RED;
      ctx.shadowColor = COLORS.NEON_RED;
      ctx.shadowBlur = 8;
      ctx.fillText('☢️ NUKE [N] (✊✊) READY', bx, by);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.shadowBlur = 0;
      ctx.fillText(`☢️ NUKE: ${this.nukeCooldown.toFixed(1)}s`, bx, by);
    }

    // Freeze badge
    if (this.timeFreezeCooldown === 0) {
      ctx.fillStyle = COLORS.NEON_BLUE;
      ctx.shadowColor = COLORS.NEON_BLUE;
      ctx.shadowBlur = 8;
      ctx.fillText('❄️ FREEZE [T] (✌️✌️) READY', bx + 195, by);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.shadowBlur = 0;
      ctx.fillText(`❄️ FREEZE: ${this.timeFreezeCooldown.toFixed(1)}s`, bx + 195, by);
    }

    // Shield badge
    if (this.forceFieldCooldown === 0) {
      ctx.fillStyle = COLORS.NEON_BLUE;
      ctx.shadowColor = COLORS.NEON_BLUE;
      ctx.shadowBlur = 8;
      ctx.fillText('🛡️ SHIELD [S] (✋✋) READY', bx + 390, by);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.shadowBlur = 0;
      ctx.fillText(`🛡️ SHIELD: ${this.forceFieldCooldown.toFixed(1)}s`, bx + 390, by);
    }
    ctx.restore();

    ctx.restore(); // restores the original translate for screen shake
  }
}
