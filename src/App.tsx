// ============================================================================
// Gesture Arena — Main Application Component
// ============================================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import StartScreen from './components/Screens/StartScreen';
import CountdownScreen from './components/Screens/CountdownScreen';
import GameScreen from './components/Screens/GameScreen';
import GameOverScreen from './components/Screens/GameOverScreen';
import SettingsScreen from './components/Screens/SettingsScreen';
import { useGameStore } from './store/gameStore';
import { useSettingsStore } from './store/settingsStore';



type AppScreen = 'menu' | 'settings' | 'leaderboard' | 'countdown' | 'playing' | 'gameover';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('menu');
  const [countdownValue, setCountdownValue] = useState(3);
  const [isTrackingReady, setIsTrackingReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const settings = useSettingsStore();
  const highContrast = settings.highContrastMode;

  // Load leaderboard on mount
  useEffect(() => {
    useGameStore.getState().loadLeaderboard();
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      // Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameraDevices(videoDevices);

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
          ...(settings.cameraId ? { deviceId: { ideal: settings.cameraId } } : {}),
        },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn('Strict constraints failed, trying fallback constraints:', firstErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (secondErr) {
          console.error('All camera attempts failed:', secondErr);
          throw secondErr;
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsTrackingReady(true);
        setCameraError(null);
      }
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setCameraError(err.message || 'Could not start camera source. It may be in use by another app.');
      setIsTrackingReady(false);
    }
  }, [settings.cameraId]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsTrackingReady(false);
  }, []);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Handle start game with countdown
  const handleStartGame = useCallback(() => {
    setCountdownValue(3);
    setScreen('countdown');

    // Countdown sequence: 3 -> 2 -> 1 -> GO
    let count = 3;
    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownValue(count);
      } else {
        clearInterval(timer);
        // Start the game
        useGameStore.getState().resetGame();
        useGameStore.getState().setGameState('PLAYING');
        setScreen('playing');
      }
    }, 1000);
  }, []);

  const handleGameOver = useCallback(() => {
    setScreen('gameover');
  }, []);

  const handlePlayAgain = useCallback(() => {
    handleStartGame();
  }, [handleStartGame]);

  const handleMainMenu = useCallback(() => {
    setScreen('menu');
  }, []);

  const handleSettings = useCallback(() => {
    setScreen('settings');
  }, []);

  const handleSettingsBack = useCallback(() => {
    setScreen('menu');
  }, []);

  const handleLeaderboard = useCallback(() => {
    // Show game over screen as leaderboard view
    setScreen('leaderboard');
  }, []);

  return (
    <div className={`w-full h-full relative ${highContrast ? 'high-contrast' : ''}`}>
      {/* Video element for camera feed (invisible in menu, positioned in corner during play) */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={
          screen === 'playing'
            ? {
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                width: '240px',
                height: '180px',
                zIndex: 20,
                transform: 'scaleX(-1)',
                objectFit: 'cover',
                borderRadius: '12px',
                border: '2px solid rgba(0, 212, 255, 0.2)',
                boxShadow: '0 0 15px rgba(0, 212, 255, 0.15)',
                opacity: 0.85,
                pointerEvents: 'none',
              }
            : {
                position: 'absolute',
                width: '1px',
                height: '1px',
                opacity: 0,
                pointerEvents: 'none',
              }
        }
      />

      {/* Animated background for menu screens */}
      {(screen === 'menu' || screen === 'settings' || screen === 'leaderboard') && (
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `
              radial-gradient(ellipse at 20% 50%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 20%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 80%, rgba(236, 72, 153, 0.08) 0%, transparent 50%),
              linear-gradient(180deg, #050510 0%, #0a0a1a 50%, #12122a 100%)
            `,
          }}
        />
      )}

      {/* Screen transitions */}
      {screen === 'menu' && (
        <StartScreen
          onStart={handleStartGame}
          onSettings={handleSettings}
          onLeaderboard={handleLeaderboard}
          isTrackingReady={isTrackingReady}
          cameraError={cameraError}
          onRetryCamera={startCamera}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          onBack={handleSettingsBack}
          devices={cameraDevices}
        />
      )}

      {screen === 'countdown' && (
        <CountdownScreen count={countdownValue} />
      )}

      {screen === 'playing' && (
        <GameScreen
          videoRef={videoRef}
          onGameOver={handleGameOver}
        />
      )}

      {(screen === 'gameover' || screen === 'leaderboard') && (
        <GameOverScreen
          onPlayAgain={handlePlayAgain}
          onMainMenu={handleMainMenu}
        />
      )}
    </div>
  );
}
