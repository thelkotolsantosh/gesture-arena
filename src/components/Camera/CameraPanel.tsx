// ============================================================================
// Gesture Arena — Camera Panel (Webcam Feed + Hand Skeleton Overlay)
// ============================================================================

import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { COLORS } from '../../engine/constants';

export interface CameraPanelProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isTracking: boolean;
  showOverlay: boolean;
}

export const CameraPanel: React.FC<CameraPanelProps> = ({
  canvasRef,
  isTracking,
  showOverlay,
}) => {
  const fps = useGameStore((s) => s.trackingFps);
  const handsDetected = useGameStore((s) => s.handsDetected);

  return (
    <div
      className="camera-panel"
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
      }}
    >

      {/* Overlay canvas for hand skeleton */}
      {showOverlay && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: 'scaleX(-1)',
          }}
        />
      )}

      {/* Tracking indicator dot */}
      <div
        className="flex items-center gap-1.5"
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 5,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: isTracking ? COLORS.NEON_GREEN : COLORS.NEON_RED,
            boxShadow: isTracking
              ? `0 0 6px ${COLORS.NEON_GREEN}, 0 0 12px ${COLORS.NEON_GREEN}60`
              : `0 0 6px ${COLORS.NEON_RED}, 0 0 12px ${COLORS.NEON_RED}60`,
            transition: 'background-color 0.3s, box-shadow 0.3s',
          }}
        />
        <span
          style={{
            fontSize: '0.5rem',
            fontFamily: 'var(--font-family-mono)',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: isTracking ? COLORS.NEON_GREEN : COLORS.NEON_RED,
            textShadow: `0 1px 3px rgba(0,0,0,0.8)`,
          }}
        >
          {isTracking ? 'TRACKING' : 'NO SIGNAL'}
        </span>
      </div>

      {/* Corner stats: FPS + hands count */}
      <div
        className="flex items-center gap-2"
        style={{
          position: 'absolute',
          bottom: 6,
          right: 8,
          zIndex: 5,
        }}
      >
        <span
          style={{
            fontSize: '0.5rem',
            fontFamily: 'var(--font-family-mono)',
            color: 'rgba(255,255,255,0.5)',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}
        >
          {Math.round(fps)} FPS
        </span>
        <span
          style={{
            fontSize: '0.5rem',
            fontFamily: 'var(--font-family-mono)',
            color: 'rgba(255,255,255,0.5)',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}
        >
          ✋{handsDetected}
        </span>
      </div>

      {/* Subtle scanline effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />
    </div>
  );
};

export default CameraPanel;
