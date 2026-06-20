// ============================================================================
// Gesture Arena — Collision Detection System
// ============================================================================

import type { HandData, GestureResult, GestureType, GameObject, Projectile, Vec2 } from './types';
import { vec2Distance } from '../utils/math';

// ---------------------------------------------------------------------------
// Collision result types
// ---------------------------------------------------------------------------

export interface CollisionResult {
  objectId: number;
  type: 'destroyed' | 'blocked' | 'hit';
  points: number;
  /** Position of the collision in normalized coords. */
  position: Vec2;
}

// ---------------------------------------------------------------------------
// Gesture → interaction radii
// ---------------------------------------------------------------------------

const INTERACTION_RADII: Partial<Record<GestureType, number>> = {
  CLOSED_FIST: 0.08,
  SWIPE_LEFT: 0.12,
  SWIPE_RIGHT: 0.12,
  SWIPE_UP: 0.12,
  SWIPE_DOWN: 0.12,
  OPEN_PALM: 0.12,
  POINTING: 0, // projectile-based, not direct contact
};

// ---------------------------------------------------------------------------
// Shield state passed in from GameEngine
// ---------------------------------------------------------------------------

export interface ShieldInfo {
  active: boolean;
  position: Vec2;
  radius: number;
}

/**
 * Performs hit detection between hands/gestures/projectiles and game objects.
 *
 * Collision methods:
 * - Circle-circle for direct contact (fist, slash, bonus collection)
 * - Shield collision for palm vs hazard objects
 * - Point-circle / projectile-radius for projectile hits
 */
export class CollisionSystem {
  /**
   * Check all collisions for the current frame.
   *
   * @param hands        Tracked hand data.
   * @param gestures     Recognized gestures for each hand.
   * @param objects      Active game objects.
   * @param projectiles  Active projectiles.
   * @param shield       Current shield state (from OPEN_PALM).
   * @returns            Array of collision results.
   */
  checkCollisions(
    _hands: HandData[],
    gestures: GestureResult[],
    objects: GameObject[],
    projectiles: Projectile[],
    shield: ShieldInfo,
  ): CollisionResult[] {
    const results: CollisionResult[] = [];

    // Track which objects have already been collided to avoid double-counting
    const hitObjectIds = new Set<number>();

    // 1. Direct hand-gesture vs object collisions
    for (const gesture of gestures) {
      const radius = INTERACTION_RADII[gesture.gesture] ?? 0;
      if (radius <= 0) continue;
      if (gesture.gesture === 'OPEN_PALM') continue; // handled by shield logic
      if (gesture.gesture === 'POINTING') continue;  // handled by projectile logic

      for (const obj of objects) {
        if (!obj.active || hitObjectIds.has(obj.id)) continue;

        const dist = vec2Distance(gesture.position, { x: obj.x, y: obj.y });
        if (dist < radius + obj.radius) {
          // Contact!
          hitObjectIds.add(obj.id);
          results.push(this.resolveContact(gesture.gesture, obj, gesture.position));
        }
      }
    }

    // 2. Shield (OPEN_PALM) vs hazard collisions
    if (shield.active) {
      for (const obj of objects) {
        if (!obj.active || hitObjectIds.has(obj.id)) continue;

        const dist = vec2Distance(shield.position, { x: obj.x, y: obj.y });
        if (dist < shield.radius + obj.radius) {
          hitObjectIds.add(obj.id);

          if (obj.type === 'HAZARD') {
            results.push({
              objectId: obj.id,
              type: 'blocked',
              points: 50,
              position: { x: obj.x, y: obj.y },
            });
          } else if (obj.type === 'BONUS') {
            results.push({
              objectId: obj.id,
              type: 'destroyed',
              points: 150,
              position: { x: obj.x, y: obj.y },
            });
          } else if (obj.type === 'ENEMY') {
            results.push({
              objectId: obj.id,
              type: 'destroyed',
              points: 100,
              position: { x: obj.x, y: obj.y },
            });
          }
        }
      }
    }

    // 3. Projectile vs object collisions
    for (const proj of projectiles) {
      if (!proj.active) continue;

      for (const obj of objects) {
        if (!obj.active || hitObjectIds.has(obj.id)) continue;

        const dist = vec2Distance({ x: proj.x, y: proj.y }, { x: obj.x, y: obj.y });
        if (dist < proj.radius + obj.radius) {
          hitObjectIds.add(obj.id);
          proj.active = false;

          if (obj.type === 'BOSS') {
            // Boss takes a hit but isn't necessarily destroyed
            results.push({
              objectId: obj.id,
              type: 'hit',
              points: 75,
              position: { x: obj.x, y: obj.y },
            });
          } else if (obj.type === 'TARGET') {
            results.push({
              objectId: obj.id,
              type: 'destroyed',
              points: 200,
              position: { x: obj.x, y: obj.y },
            });
          } else {
            results.push({
              objectId: obj.id,
              type: 'destroyed',
              points: 100,
              position: { x: obj.x, y: obj.y },
            });
          }
        }
      }
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Resolve a direct-contact collision (fist, slash, etc.) into a result.
   */
  private resolveContact(
    _gesture: GestureType,
    obj: GameObject,
    contactPos: Vec2,
  ): CollisionResult {
    switch (obj.type) {
      case 'ENEMY':
        return {
          objectId: obj.id,
          type: 'destroyed',
          points: 100,
          position: contactPos,
        };

      case 'HAZARD':
        // Fist/slash doesn't block hazards — player takes damage
        // (damage is handled by GameEngine; here we just flag the collision)
        return {
          objectId: obj.id,
          type: 'hit',
          points: 0,
          position: contactPos,
        };

      case 'BONUS':
        return {
          objectId: obj.id,
          type: 'destroyed',
          points: 150,
          position: contactPos,
        };

      case 'TARGET':
        return {
          objectId: obj.id,
          type: 'destroyed',
          points: 200,
          position: contactPos,
        };

      case 'BOSS':
        return {
          objectId: obj.id,
          type: 'hit',
          points: 75,
          position: contactPos,
        };

      default:
        return {
          objectId: obj.id,
          type: 'destroyed',
          points: 100,
          position: contactPos,
        };
    }
  }
}
