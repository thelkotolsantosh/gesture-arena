// ============================================================================
// Gesture Arena — Particle System
// ============================================================================

import type { Particle, ParticleEffectType } from './types';
import { PARTICLES, COLORS } from './constants';

/**
 * Pool-based particle system with neon glow rendering.
 *
 * All particles are pre-allocated at construction time. Emission functions
 * simply activate dormant particles and set their properties.
 *
 * Supports effect types: EXPLOSION, TRAIL, IMPACT, SPARKLE, SHOCKWAVE,
 * COMBO, BOSS_ENTRANCE, SHIELD_HIT.
 */
export class ParticleSystem {
  /** Pre-allocated particle pool. */
  private pool: Particle[] = [];

  /** Shockwave ring effects rendered separately. */
  private shockwaves: ShockwaveRing[] = [];

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
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(size/2, size/2, 1, size/2, size/2, size/2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.2, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }

  constructor() {
    for (let i = 0; i < PARTICLES.MAX_PARTICLES; i++) {
      this.pool.push(this.createInactive());
    }
  }

  // -------------------------------------------------------------------------
  // Pool helpers
  // -------------------------------------------------------------------------

  private createInactive(): Particle {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      radius: 2,
      color: '#fff',
      alpha: 0,
      alphaDecay: 0,
      life: 0,
      maxLife: 0,
      active: false,
      scale: 1,
      scaleDecay: 0,
    };
  }

  private acquire(): Particle | null {
    for (const p of this.pool) {
      if (!p.active) return p;
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Emit API
  // -------------------------------------------------------------------------

  /**
   * Emit particles of a given effect type at a normalized position.
   *
   * @param type   Effect type.
   * @param x      Normalized x (0–1).
   * @param y      Normalized y (0–1).
   * @param color  CSS color string.
   * @param count  Override particle count (defaults to type-specific count).
   */
  emit(type: ParticleEffectType, x: number, y: number, color: string, count?: number): void {
    switch (type) {
      case 'EXPLOSION':
        this.emitExplosion(x, y, color, count ?? PARTICLES.EXPLOSION_COUNT);
        break;
      case 'TRAIL':
        this.emitTrail(x, y, color, count ?? PARTICLES.TRAIL_COUNT);
        break;
      case 'IMPACT':
        this.emitImpact(x, y, color, count ?? PARTICLES.IMPACT_COUNT);
        break;
      case 'SPARKLE':
        this.emitSparkle(x, y, color, count ?? PARTICLES.SPARKLE_COUNT);
        break;
      case 'SHOCKWAVE':
        this.emitShockwave(x, y, color);
        break;
      case 'COMBO':
        this.emitCombo(x, y, count ?? PARTICLES.COMBO_PARTICLE_COUNT);
        break;
      case 'BOSS_ENTRANCE':
        this.emitExplosion(x, y, COLORS.BOSS_GLOW, count ?? PARTICLES.BOSS_ENTRANCE_COUNT);
        this.emitShockwave(x, y, COLORS.NEON_PURPLE);
        break;
      case 'SHIELD_HIT':
        this.emitSparkle(x, y, COLORS.NEON_BLUE, count ?? 12);
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Effect emitters
  // -------------------------------------------------------------------------

  private emitExplosion(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) return;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.2 + Math.random() * 0.6;

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.ax = 0;
      p.ay = 0.1; // slight gravity
      p.radius = 2 + Math.random() * 4;
      p.color = color;
      p.alpha = 1;
      p.alphaDecay = 1.5 + Math.random() * 1.0;
      p.life = 0;
      p.maxLife = 0.6 + Math.random() * 0.4;
      p.scale = 1;
      p.scaleDecay = 0.5;
    }
  }

  private emitTrail(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) return;

      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.02;
      p.y = y + (Math.random() - 0.5) * 0.02;
      p.vx = (Math.random() - 0.5) * 0.05;
      p.vy = (Math.random() - 0.5) * 0.05;
      p.ax = 0;
      p.ay = 0;
      p.radius = 1.5 + Math.random() * 2;
      p.color = color;
      p.alpha = 0.8;
      p.alphaDecay = 2.5;
      p.life = 0;
      p.maxLife = 0.3;
      p.scale = 1;
      p.scaleDecay = 1.0;
    }
  }

  private emitImpact(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) return;

      // Directional burst — mostly upward and outward
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 0.3 + Math.random() * 0.5;

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.ax = 0;
      p.ay = 0.3;
      p.radius = 2 + Math.random() * 3;
      p.color = color;
      p.alpha = 1;
      p.alphaDecay = 2.0;
      p.life = 0;
      p.maxLife = 0.5;
      p.scale = 1;
      p.scaleDecay = 0.8;
    }
  }

  private emitSparkle(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) return;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.15;

      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.04;
      p.y = y + (Math.random() - 0.5) * 0.04;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.ax = 0;
      p.ay = 0;
      p.radius = 1 + Math.random() * 2;
      p.color = color;
      p.alpha = 1;
      p.alphaDecay = 0.8; // slow fade
      p.life = 0;
      p.maxLife = 0.8 + Math.random() * 0.4;
      p.scale = 1;
      p.scaleDecay = 0.3;
    }
  }

  private emitShockwave(x: number, y: number, color: string): void {
    this.shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius: 0.15,
      color,
      alpha: 1,
      life: 0,
      maxLife: PARTICLES.SHOCKWAVE_DURATION,
    });
  }

  private emitCombo(x: number, y: number, count: number): void {
    // Upward burst of gold particles
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) return;

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      const speed = 0.3 + Math.random() * 0.4;

      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.04;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.ax = 0;
      p.ay = 0.15;
      p.radius = 2 + Math.random() * 3;
      p.color = COLORS.NEON_YELLOW;
      p.alpha = 1;
      p.alphaDecay = 1.2;
      p.life = 0;
      p.maxLife = 0.7 + Math.random() * 0.3;
      p.scale = 1.2;
      p.scaleDecay = 0.6;
    }
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  /**
   * Advance all active particles and shockwave rings by dt seconds.
   */
  update(dt: number): void {
    // Update particles
    for (const p of this.pool) {
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      // Physics
      p.vx += p.ax * dt;
      p.vy += p.ay * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Decay
      p.alpha -= p.alphaDecay * dt;
      p.scale -= p.scaleDecay * dt;

      if (p.alpha <= 0 || p.scale <= 0) {
        p.active = false;
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life += dt;
      const t = sw.life / sw.maxLife;
      sw.radius = sw.maxRadius * t;
      sw.alpha = 1 - t;

      if (sw.life >= sw.maxLife) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  /**
   * Draw all active particles and shockwaves onto the given canvas context.
   *
   * @param ctx          Canvas 2D rendering context.
   * @param canvasWidth  Canvas width in pixels.
   * @param canvasHeight Canvas height in pixels.
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Draw particles
    for (const p of this.pool) {
      if (!p.active || p.alpha <= 0) continue;

      const px = p.x * canvasWidth;
      const py = p.y * canvasHeight;
      const r = Math.max(p.radius * p.scale, 0.5);
      const size = r * 4.5;

      ctx.globalAlpha = Math.max(p.alpha, 0);
      const tex = this.getGlowTexture(p.color);
      ctx.drawImage(tex, px - size / 2, py - size / 2, size, size);
    }

    // Draw shockwave rings
    for (const sw of this.shockwaves) {
      const cx = sw.x * canvasWidth;
      const cy = sw.y * canvasHeight;
      const r = sw.radius * Math.min(canvasWidth, canvasHeight);

      ctx.globalAlpha = sw.alpha * 0.6;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 3 * (1 - sw.life / sw.maxLife);

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Deactivate all particles and shockwaves.
   */
  clear(): void {
    for (const p of this.pool) {
      p.active = false;
    }
    this.shockwaves.length = 0;
  }
}

// ---------------------------------------------------------------------------
// Shockwave ring helper type (internal)
// ---------------------------------------------------------------------------

interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}
