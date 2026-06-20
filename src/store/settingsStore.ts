// ============================================================================
// Gesture Arena — Settings Store (Zustand + localStorage persistence)
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameSettings, GraphicsQuality } from '../engine/types';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: GameSettings = {
  cameraId: '',                   // empty → use default camera
  gestureSensitivity: 0.6,
  masterVolume: 0.7,
  sfxVolume: 0.8,
  musicVolume: 0.5,
  graphicsQuality: 'high',
  showTracking: true,
  showFPS: false,
  highContrastMode: false,
  difficulty: 'auto',
};

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export interface SettingsStore extends GameSettings {
  /**
   * Generic setter — update any single setting by key.
   *
   * Usage: `setSetting('masterVolume', 0.5)`
   */
  setSetting: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void;

  /** Reset every setting to its default value. */
  resetSettings: () => void;
}

// ---------------------------------------------------------------------------
// Store implementation (auto-persisted to localStorage)
// ---------------------------------------------------------------------------

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setSetting: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
        set({ [key]: value } as Pick<GameSettings, K>),

      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'gesture-arena-settings', // localStorage key
      // Only persist actual settings, not actions
      partialize: (state) => {
        const { setSetting: _, resetSettings: __, ...settings } = state;
        return settings as GameSettings;
      },
    },
  ),
);

// ---------------------------------------------------------------------------
// Convenience selectors
// ---------------------------------------------------------------------------

/** Select the effective SFX volume (master × sfx). */
export const selectEffectiveSfxVolume = (s: SettingsStore): number =>
  s.masterVolume * s.sfxVolume;

/** Select the effective music volume (master × music). */
export const selectEffectiveMusicVolume = (s: SettingsStore): number =>
  s.masterVolume * s.musicVolume;

/** Select graphics quality. */
export const selectGraphicsQuality = (s: SettingsStore): GraphicsQuality =>
  s.graphicsQuality;
