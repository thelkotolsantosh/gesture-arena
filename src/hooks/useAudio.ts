// ============================================================================
// Gesture Arena — Audio Engine Hook
// ============================================================================

import { useCallback, useEffect, useRef } from 'react';
import { AudioEngine } from '../engine/AudioEngine';
import {
  useSettingsStore,
  selectEffectiveSfxVolume,
  selectEffectiveMusicVolume,
} from '../store/settingsStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseAudioReturn {
  /** The underlying AudioEngine singleton. */
  audioEngine: AudioEngine;

  // ---- Convenience methods (delegates to AudioEngine) ----
  playHit: () => void;
  playCombo: (comboLevel: number) => void;
  playShield: () => void;
  playDamage: () => void;
  playBossAppear: () => void;
  playBossDefeat: () => void;
  playBonus: () => void;
  playProjectile: () => void;
  playGameOver: () => void;
  playMenuSelect: () => void;
  playCountdown: () => void;
  startMusic: () => void;
  stopMusic: () => void;
}

// ---------------------------------------------------------------------------
// Singleton – one AudioEngine per application lifetime
// ---------------------------------------------------------------------------

let audioEngineSingleton: AudioEngine | null = null;

function getAudioEngine(): AudioEngine {
  if (!audioEngineSingleton) {
    audioEngineSingleton = new AudioEngine();
  }
  return audioEngineSingleton;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAudio(): UseAudioReturn {
  const engine = getAudioEngine();
  const engineRef = useRef(engine);
  const initializedRef = useRef(false);

  // ---- Read effective volumes from settings store ----
  const sfxVolume = useSettingsStore(selectEffectiveSfxVolume);
  const musicVolume = useSettingsStore(selectEffectiveMusicVolume);

  // ---- Sync volumes whenever settings change ----
  useEffect(() => {
    engineRef.current.setSfxVolume(sfxVolume);
  }, [sfxVolume]);

  useEffect(() => {
    engineRef.current.setMusicVolume(musicVolume);
  }, [musicVolume]);

  // ------------------------------------------------------------------
  // Initialize AudioContext on first user interaction
  // Browsers require a user gesture before creating / resuming AudioContext.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (initializedRef.current) return;

    const handleInteraction = () => {
      if (!initializedRef.current) {
        engineRef.current.initialize();
        initializedRef.current = true;
      }
      // Remove listeners once initialized
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('click', handleInteraction, { once: false });
    window.addEventListener('keydown', handleInteraction, { once: false });
    window.addEventListener('touchstart', handleInteraction, { once: false });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // ------------------------------------------------------------------
  // Cleanup on unmount (stops music, releases resources)
  // ------------------------------------------------------------------
  useEffect(() => {
    return () => {
      engineRef.current.stopMusic();
    };
  }, []);

  // ------------------------------------------------------------------
  // Convenience callbacks (stable references)
  // ------------------------------------------------------------------
  const playHit = useCallback(() => engineRef.current.playHit(), []);
  const playCombo = useCallback((level: number) => engineRef.current.playCombo(level), []);
  const playShield = useCallback(() => engineRef.current.playShield(), []);
  const playDamage = useCallback(() => engineRef.current.playDamage(), []);
  const playBossAppear = useCallback(() => engineRef.current.playBossAppear(), []);
  const playBossDefeat = useCallback(() => engineRef.current.playBossDefeat(), []);
  const playBonus = useCallback(() => engineRef.current.playBonus(), []);
  const playProjectile = useCallback(() => engineRef.current.playProjectile(), []);
  const playGameOver = useCallback(() => engineRef.current.playGameOver(), []);
  const playMenuSelect = useCallback(() => engineRef.current.playMenuSelect(), []);
  const playCountdown = useCallback(() => engineRef.current.playCountdown(), []);
  const startMusic = useCallback(() => engineRef.current.startMusic(), []);
  const stopMusic = useCallback(() => engineRef.current.stopMusic(), []);

  return {
    audioEngine: engineRef.current,
    playHit,
    playCombo,
    playShield,
    playDamage,
    playBossAppear,
    playBossDefeat,
    playBonus,
    playProjectile,
    playGameOver,
    playMenuSelect,
    playCountdown,
    startMusic,
    stopMusic,
  };
}
