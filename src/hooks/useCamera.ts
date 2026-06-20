// ============================================================================
// Gesture Arena — Camera Management Hook
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { CAMERA_WIDTH, CAMERA_HEIGHT } from '../engine/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseCameraReturn {
  /** Ref to attach to a <video> element. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Currently active MediaStream (null when stopped). */
  stream: MediaStream | null;
  /** Available video input devices. */
  devices: MediaDeviceInfo[];
  /** Start (or restart) the camera with an optional deviceId. */
  startCamera: (deviceId?: string) => Promise<void>;
  /** Stop the camera and release resources. */
  stopCamera: () => void;
  /** True once the video element is receiving frames. */
  isReady: boolean;
  /** Human-readable error message (null when no error). */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the active stream in a ref so cleanup always sees the latest value
  const streamRef = useRef<MediaStream | null>(null);

  // ------------------------------------------------------------------
  // Enumerate available video devices
  // ------------------------------------------------------------------
  const enumerateDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = all.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);
    } catch {
      // enumerateDevices may fail in insecure contexts — not critical
      setDevices([]);
    }
  }, []);

  // ------------------------------------------------------------------
  // Stop all active tracks
  // ------------------------------------------------------------------
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setIsReady(false);
  }, []);

  // ------------------------------------------------------------------
  // Start or restart the camera
  // ------------------------------------------------------------------
  const startCamera = useCallback(
    async (deviceId?: string) => {
      // Stop any previous stream first
      stopCamera();
      setError(null);

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: CAMERA_WIDTH },
          height: { ideal: CAMERA_HEIGHT },
          frameRate: { ideal: 30 },
          facingMode: 'user',
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
        audio: false,
      };

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;

          // Wait for the video to actually start producing frames
          videoRef.current.onloadedmetadata = () => {
            videoRef.current
              ?.play()
              .then(() => setIsReady(true))
              .catch(() => {
                // Autoplay blocked — user must interact first
                setError('Camera autoplay blocked. Click anywhere to start.');
              });
          };
        }

        // Re-enumerate so labels are available (browsers require an active
        // stream before exposing device labels)
        await enumerateDevices();
      } catch (err: unknown) {
        const msg = err instanceof DOMException ? err.message : String(err);

        if (msg.includes('NotAllowed') || msg.includes('Permission')) {
          setError(
            'Camera permission denied. Please allow camera access in your browser settings.',
          );
        } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
          setError('No camera found. Please connect a camera and reload.');
        } else if (msg.includes('NotReadable') || msg.includes('TrackStartError')) {
          setError('Camera is in use by another application. Close other apps and retry.');
        } else {
          setError(`Camera error: ${msg}`);
        }
      }
    },
    [stopCamera, enumerateDevices],
  );

  // ------------------------------------------------------------------
  // Enumerate devices on mount (before any stream — labels may be blank)
  // ------------------------------------------------------------------
  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  // ------------------------------------------------------------------
  // Cleanup on unmount
  // ------------------------------------------------------------------
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { videoRef, stream, devices, startCamera, stopCamera, isReady, error };
}
