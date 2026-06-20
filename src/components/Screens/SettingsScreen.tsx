// ============================================================================
// Gesture Arena — Settings Screen
// ============================================================================

import React from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { COLORS } from '../../engine/constants';
import type { GraphicsQuality } from '../../engine/types';

export interface SettingsScreenProps {
  onBack: () => void;
  devices: MediaDeviceInfo[];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** Format the displayed value, default shows percentage */
  format?: (v: number) => string;
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span
        style={{
          fontSize: '0.8rem',
          fontWeight: 500,
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '0.75rem',
          fontFamily: 'var(--font-family-mono)',
          color: COLORS.NEON_BLUE,
          fontWeight: 600,
        }}
      >
        {format ? format(value) : `${Math.round(value * 100)}%`}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ pointerEvents: 'auto' }}
    />
  </div>
);

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, checked, onChange }) => (
  <label
    className="flex items-center justify-between cursor-pointer"
    style={{ pointerEvents: 'auto' }}
  >
    <span
      style={{
        fontSize: '0.8rem',
        fontWeight: 500,
        color: 'rgba(255,255,255,0.7)',
      }}
    >
      {label}
    </span>
    <div
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        padding: 2,
        background: checked
          ? `linear-gradient(135deg, ${COLORS.NEON_PURPLE}, ${COLORS.NEON_BLUE})`
          : 'rgba(255,255,255,0.1)',
        transition: 'background 0.3s',
        cursor: 'pointer',
        boxShadow: checked ? `0 0 10px ${COLORS.NEON_PURPLE}40` : 'none',
      }}
      onClick={() => onChange(!checked)}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  </label>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, devices }) => {
  const settings = useSettingsStore();
  const setSetting = useSettingsStore((s) => s.setSetting);

  const qualityOptions: { value: GraphicsQuality; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  const difficultyOptions = [
    { value: 'auto' as const, label: 'Auto' },
    { value: 'easy' as const, label: 'Easy' },
    { value: 'medium' as const, label: 'Medium' },
    { value: 'hard' as const, label: 'Hard' },
  ];

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(5, 5, 16, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div
        className="flex flex-col gap-5 animate-scale-in"
        style={{
          maxWidth: 520,
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          paddingRight: 4,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              margin: 0,
              background: `linear-gradient(135deg, ${COLORS.NEON_BLUE}, ${COLORS.NEON_PURPLE})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ⚙ Settings
          </h2>
          <button
            className="neon-btn"
            onClick={onBack}
            style={{
              padding: '8px 20px',
              fontSize: '0.75rem',
              pointerEvents: 'auto',
            }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>← BACK</span>
          </button>
        </div>

        {/* Camera section */}
        <div className="glass-card" style={{ padding: '18px 22px' }}>
          <h3
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: COLORS.NEON_BLUE,
              marginBottom: 12,
            }}
          >
            📷 Camera
          </h3>
          <select
            value={settings.cameraId}
            onChange={(e) => setSetting('cameraId', e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-family-display)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10,
              color: '#fff',
              outline: 'none',
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}
          >
            <option value="" style={{ background: COLORS.DARK_800 }}>
              Default Camera
            </option>
            {devices
              .filter((d) => d.kind === 'videoinput')
              .map((d) => (
                <option key={d.deviceId} value={d.deviceId} style={{ background: COLORS.DARK_800 }}>
                  {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
          </select>
        </div>

        {/* Controls section */}
        <div className="glass-card" style={{ padding: '18px 22px' }}>
          <h3
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: COLORS.NEON_BLUE,
              marginBottom: 12,
            }}
          >
            🎮 Controls
          </h3>
          <SliderRow
            label="Gesture Sensitivity"
            value={settings.gestureSensitivity}
            min={0.1}
            max={1.0}
            step={0.05}
            onChange={(v) => setSetting('gestureSensitivity', v)}
            format={(v) => v.toFixed(2)}
          />
        </div>

        {/* Audio section */}
        <div className="glass-card flex flex-col gap-4" style={{ padding: '18px 22px' }}>
          <h3
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: COLORS.NEON_BLUE,
            }}
          >
            🔊 Audio
          </h3>
          <SliderRow
            label="Master Volume"
            value={settings.masterVolume}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => setSetting('masterVolume', v)}
          />
          <SliderRow
            label="SFX Volume"
            value={settings.sfxVolume}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => setSetting('sfxVolume', v)}
          />
          <SliderRow
            label="Music Volume"
            value={settings.musicVolume}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => setSetting('musicVolume', v)}
          />
        </div>

        {/* Graphics section */}
        <div className="glass-card" style={{ padding: '18px 22px' }}>
          <h3
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: COLORS.NEON_BLUE,
              marginBottom: 12,
            }}
          >
            🖥️ Graphics
          </h3>
          <div className="flex items-center gap-3">
            {qualityOptions.map((opt) => {
              const isActive = settings.graphicsQuality === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSetting('graphicsQuality', opt.value)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                    background: isActive
                      ? `linear-gradient(135deg, ${COLORS.NEON_PURPLE}30, ${COLORS.NEON_BLUE}20)`
                      : 'rgba(255,255,255,0.03)',
                    border: isActive
                      ? `1px solid ${COLORS.NEON_PURPLE}60`
                      : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: isActive ? `0 0 10px ${COLORS.NEON_PURPLE}20` : 'none',
                    pointerEvents: 'auto',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Display section */}
        <div className="glass-card flex flex-col gap-4" style={{ padding: '18px 22px' }}>
          <h3
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: COLORS.NEON_BLUE,
            }}
          >
            👁️ Display
          </h3>
          <ToggleRow
            label="Show Tracking Overlay"
            checked={settings.showTracking}
            onChange={(v) => setSetting('showTracking', v)}
          />
          <ToggleRow
            label="Show FPS Counter"
            checked={settings.showFPS}
            onChange={(v) => setSetting('showFPS', v)}
          />
          <ToggleRow
            label="High Contrast Mode"
            checked={settings.highContrastMode}
            onChange={(v) => setSetting('highContrastMode', v)}
          />
        </div>

        {/* Difficulty section */}
        <div className="glass-card" style={{ padding: '18px 22px' }}>
          <h3
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: COLORS.NEON_BLUE,
              marginBottom: 12,
            }}
          >
            ⚔️ Difficulty
          </h3>
          <div className="flex items-center gap-2">
            {difficultyOptions.map((opt) => {
              const isActive = settings.difficulty === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSetting('difficulty', opt.value)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                    background: isActive
                      ? `linear-gradient(135deg, ${COLORS.NEON_PURPLE}30, ${COLORS.NEON_BLUE}20)`
                      : 'rgba(255,255,255,0.03)',
                    border: isActive
                      ? `1px solid ${COLORS.NEON_PURPLE}60`
                      : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: isActive ? `0 0 10px ${COLORS.NEON_PURPLE}20` : 'none',
                    pointerEvents: 'auto',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
