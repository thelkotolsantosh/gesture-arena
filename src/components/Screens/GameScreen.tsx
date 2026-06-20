// ============================================================================
// Gesture Arena — Game Screen (Main Gameplay View)
// ============================================================================

import { useRef, useEffect, useCallback, useState } from 'react';
import GameCanvas from '../Game/GameCanvas';
import { GameHUD } from '../HUD/GameHUD';
import CameraPanel from '../Camera/CameraPanel';
import { BossWarning } from '../Game/BossWarning';
import { AchievementPopup } from '../Game/AchievementPopup';
import { GameEngine } from '../../engine/GameEngine';
import { HandTracker } from '../../engine/HandTracker';
import { GestureRecognizer } from '../../engine/GestureRecognizer';
import { AudioEngine } from '../../engine/AudioEngine';
import { useGameStore } from '../../store/gameStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAchievementStore } from '../../store/achievementStore';
import type { HandData, GestureResult } from '../../engine/types';

interface GameScreenProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onGameOver: () => void;
}

export default function GameScreen({ videoRef, onGameOver }: GameScreenProps) {
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const handTrackerRef = useRef<HandTracker | null>(null);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const gameLoopRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const handsRef = useRef<HandData[]>([]);
  const gesturesRef = useRef<GestureResult[]>([]);
  const lastTrackingTimeRef = useRef<number>(0);

  const [isEngineReady, setIsEngineReady] = useState(false);
  const [showBossWarning, setShowBossWarning] = useState(false);

  const gameState = useGameStore(s => s.gameState);
  const health = useGameStore(s => s.health);
  const bossActive = useGameStore(s => s.bossActive);
  const settings = useSettingsStore();
  const prevBossRef = useRef(false);

  // Initialize engines
  useEffect(() => {
    const init = async () => {
      // Audio
      const audio = new AudioEngine();
      audio.initialize();
      audio.setMasterVolume(settings.masterVolume);
      audio.setSFXVolume(settings.sfxVolume);
      audio.setMusicVolume(settings.musicVolume);
      audioEngineRef.current = audio;

      // Hand tracker
      const tracker = new HandTracker();
      try {
        await tracker.initialize();
      } catch (e) {
        console.error('Hand tracker init failed:', e);
      }
      handTrackerRef.current = tracker;

      // Gesture recognizer
      const recognizer = new GestureRecognizer();
      recognizer.applySettings({ gestureSensitivity: settings.gestureSensitivity });
      gestureRecognizerRef.current = recognizer;

      // Game engine
      const engine = new GameEngine(audio);
      gameEngineRef.current = engine;

      setIsEngineReady(true);

      // Start music
      audio.resume();
      audio.playMusic();
    };

    init();

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      audioEngineRef.current?.stopMusic();
      handTrackerRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync audio volumes when settings change
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setMasterVolume(settings.masterVolume);
      audioEngineRef.current.setSFXVolume(settings.sfxVolume);
      audioEngineRef.current.setMusicVolume(settings.musicVolume);
    }
  }, [settings.masterVolume, settings.sfxVolume, settings.musicVolume]);

  // Boss warning trigger
  useEffect(() => {
    if (bossActive && !prevBossRef.current) {
      setShowBossWarning(true);
      audioEngineRef.current?.playBossWarning();
      setTimeout(() => setShowBossWarning(false), 2500);
    }
    prevBossRef.current = bossActive;
  }, [bossActive]);

  // Check game over
  useEffect(() => {
    if (health <= 0 && gameState === 'PLAYING') {
      useGameStore.getState().setGameState('GAME_OVER');
      audioEngineRef.current?.playGameOver();
      audioEngineRef.current?.stopMusic();
      onGameOver();
    }
  }, [health, gameState, onGameOver]);

  // Main game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (!gameEngineRef.current || !handTrackerRef.current || !gestureRecognizerRef.current) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Calculate delta time
    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05); // Cap at 50ms
    lastTimeRef.current = timestamp;

    const store = useGameStore.getState();
    const video = videoRef.current;

    // Hand tracking (throttled to ~30 FPS to prevent thread bottlenecking)
    const now = performance.now();
    if (video && video.readyState >= 2 && now - lastTrackingTimeRef.current >= 33) {
      lastTrackingTimeRef.current = now;
      try {
        const hands = handTrackerRef.current.detect(video, timestamp);
        handsRef.current = hands;

        // Gesture recognition
        const gestures = gestureRecognizerRef.current.recognize(hands);
        gesturesRef.current = gestures;

        // Update store with tracking info
        store.setHandsDetected(hands.length);
        if (gestures.length > 0) {
          store.setActiveGesture(gestures[0].gesture, gestures[0].confidence);
        } else {
          store.setActiveGesture('NONE', 0);
        }
        store.setTrackingFPS(handTrackerRef.current.fps);

        // Draw hand skeleton overlay
        const canvas = overlayCanvasRef.current;
        if (canvas && settings.showTracking) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const hand of hands) {
              ctx.strokeStyle = hand.handedness === 'Left' ? '#00d4ff' : '#ec4899';
              ctx.lineWidth = 3;
              
              const HAND_CONNECTIONS = [
                [0, 1], [1, 2], [2, 3], [3, 4],
                [0, 5], [5, 6], [6, 7], [7, 8],
                [0, 9], [9, 10], [10, 11], [11, 12],
                [0, 13], [13, 14], [14, 15], [15, 16],
                [0, 17], [17, 18], [18, 19], [19, 20],
                [5, 9], [9, 13], [13, 17]
              ];

              for (const conn of HAND_CONNECTIONS) {
                const p1 = hand.landmarks[conn[0]];
                const p2 = hand.landmarks[conn[1]];
                if (p1 && p2) {
                  ctx.beginPath();
                  ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                  ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
                  ctx.stroke();
                }
              }
              
              ctx.fillStyle = '#10b981';
              for (const lm of hand.landmarks) {
                ctx.beginPath();
                ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
      } catch {
        // Tracking error, continue
      }
    }

    // Update game engine
    if (store.gameState === 'PLAYING' || store.gameState === 'BOSS') {
      gameEngineRef.current.update(dt, gesturesRef.current, handsRef.current);

      // Check achievements periodically
      const achieveStore = useAchievementStore.getState();
      achieveStore.checkAchievements(store.sessionStats);
    }

    // Track render FPS
    store.setFPS(Math.round(1 / Math.max(dt, 0.001)));

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [videoRef]);

  // Start game loop when engine is ready
  useEffect(() => {
    if (isEngineReady) {
      lastTimeRef.current = 0;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [isEngineReady, gameLoop]);

  const isPlaying = gameState === 'PLAYING' || gameState === 'BOSS';

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#050510' }}>
      {/* Main game canvas */}
      <GameCanvas
        gameEngine={gameEngineRef.current}
        isPlaying={isPlaying || isEngineReady}
      />

      {/* HUD overlay */}
      {isPlaying && <GameHUD />}

      {/* Camera panel - bottom left */}
      {isPlaying && (
        <div className="absolute bottom-4 left-4 z-30" style={{ width: '240px', height: '180px' }}>
          <CameraPanel
            canvasRef={overlayCanvasRef}
            isTracking={handsRef.current.length > 0}
            showOverlay={settings.showTracking}
          />
        </div>
      )}

      {/* Boss warning overlay */}
      <BossWarning visible={showBossWarning} />

      {/* Achievement popup */}
      <AchievementPopup />
    </div>
  );
}
