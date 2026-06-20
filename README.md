# Gesture Arena 🎮

Gesture Arena is a fast-paced, web-based combat game that you control using your **webcam** and **hand gestures**. 

By standing in front of your camera, you can slash enemies, block electrical hazards, fire plasma projectiles, and freeze time itself. 

The game runs entirely in your web browser. No installation or setup is required.

---

## Key Features 🌟

* **Real-time Hand Tracking**: Detects both left and right hands, tracking all 21 key landmarks of your fingers.
* **Lag-Free Performance (60 FPS)**: Uses webcam frame downscaling and GPU-accelerated graphics. It runs super smoothly even on standard laptops or high-end rigs.
* **Three Ultimate Abilities**:
  * ☢️ **Nuclear Blast**: Wipe out all normal hazards and enemies on screen with a screen-shaking explosion.
  * ❄️ **Time Freeze**: Freeze all spawning and obstacle movements for 4 seconds under a matrix-style grid.
  * 🛡️ **Aegis Force Field**: Create a massive force field dome at the bottom of the screen to absorb hazards and convert them to points.
* **Procedural Synthesized Sound & Music**: All sound effects (hits, explosions, sweeps) and music are synthesized in real time using the browser's Web Audio API—no audio files to download!
* **Dynamic Difficulty**: The game scales automatically. If you play well, it speeds up; if you struggle, it scales back to keep the game fun.
* **Achievements & Leaderboard**: Unlock 12 unique achievements and record your high scores in the local leaderboard.
* **Mouse & Keyboard Fallback**: Play easily without a camera using mouse clicks and keyboard keys.

---

## Tech Stack 🛠️

* **Core Framework**: React 19 + TypeScript + Vite
* **Computer Vision**: Google MediaPipe Tasks Vision (Runs completely offline/locally)
* **Styling**: Tailwind CSS v4 + Vanilla CSS (Glassmorphism & Neon theme)
* **Animation**: GSAP (GreenSock Animation Platform)
* **State Management**: Zustand
* **Audio System**: Web Audio API (Synthesized waves and noise)

---

## Game Controls & Gestures 👐

The webcam tracks up to two hands. Show your hands clearly to the camera to use these moves:

### Basic Gestures
| Gesture | Icon | Action | Gameplay Effect |
| :--- | :---: | :--- | :--- |
| **Closed Fist / Swipe** | ✊ / ⬅️ | **Attack/Slash** | Slashes and destroys basic enemies. |
| **Open Palm** | ✋ | **Shield Bubble** | Blocks yellow electrical hazards. |
| **Pointing Finger** | 👆 | **Plasma Blaster** | Fires energy projectiles upward from your finger to shoot targets and bosses. |
| **Peace Sign** | ✌️ | **Slow Motion** | Slows down game time by 50% for 3 seconds (15s cooldown). |
| **Thumbs Up** | 👍 | **Double Multiplier** | Activates double score gains (2x) for 5 seconds (20s cooldown). |

### Double-Hand Ultimate Abilities
| Ability | Hand Gesture | Key Bind | Cooldown | Description |
| :--- | :---: | :---: | :---: | :--- |
| **Nuclear Blast** | **Double Fist** ✊✊ | `N` | 20 seconds | Clears the screen; inflicts 10 HP of damage to the boss. |
| **Time Freeze** | **Double Peace** ✌️✌️ | `T` | 20 seconds | Pauses obstacles and spawners for 4 seconds. |
| **Aegis Force Field** | **Double Palm** ✋✋ | `S` | 20 seconds | Spawns a bottom shield dome absorbing objects for 3 seconds. |

### Mouse & Keyboard Fallback
If you click **"Play with Mouse & Keyboard"** on the menu, use these keys:
* **Mouse Move** — Simulates hand position.
* **Click & Hold** — Slash / Attack.
* **Spacebar (Hold)** — Deploys Hand Shield.
* **F Key** — Fires Plasma Blaster.
* **N Key** — Triggers Nuclear Blast.
* **T Key** — Triggers Time Freeze.
* **S Key** — Triggers Aegis Force Field.

---

## Installation & Local Run 💻

Follow these simple steps to run the repository on your computer:

### 1. Requirements
Ensure you have the following installed:
* [Node.js](https://nodejs.org/) (Version 18.0.0 or higher)
* A modern browser (Chrome, Edge, Safari, or Firefox)
* A working webcam (optional, but recommended)

### 2. Setup the Repository
Clone the repository and install all dependencies:
```bash
# Clone the repository
git clone https://github.com/your-username/gesture-arena.git

# Enter the project directory
cd gesture-arena

# Install npm packages
npm install
```

### 3. Run in Development Mode
Start the local server:
```bash
npm run dev
```
Open the link **`http://localhost:5173`** in your browser.

### 4. Build for Production
To bundle the game into a high-performance static folder for deployment:
```bash
npm run build
```
The optimized files will be generated in the `dist/` directory, ready to host on GitHub Pages, Vercel, Netlify, or any static hosting.

---

## Repository Structure 📂

```
gesture-arena/
├── dist/                    # Production bundle output
├── public/                  # Static assets (MediaPipe WASM libraries and models)
└── src/
    ├── assets/              # Fonts, styles, and vector graphics
    ├── components/          # React screen UI, HUD overlay, and Camera Panels
    ├── engine/              # Physics, object pooling, collisions, audio synth
    ├── hooks/               # Custom hooks for Camera and MediaPipe loop
    ├── store/               # Zustand state stores (Game, Settings, Achievements)
    └── utils/               # Math functions and game constants
```

---

## License 📄

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute it.
