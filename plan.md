# ChessMaster React — Architectural Plan

> **Version:** 2.0.0 · **Date:** 2026-07-25 · **Author:** Architect Review

---

## 1. Executive Summary

**ChessMaster React** is a feature-rich, web-based chess platform built with React 18 + Vite 7. The core objective is to deliver a competitive-grade chess experience — including real-time multiplayer, engine analysis, and variant support — while maintaining a **strict zero-cost infrastructure**.

The project is a **two-repo monolith**: a React frontend (`chess-master-react`) and a Node.js backend (`ChessMaster-backend`). The backend is fully built with Express + MongoDB + Socket.IO, providing authentication, ELO calculations, matchmaking, and real-time game sync. External enrichment data is sourced from **Lichess public APIs** (no API key required).

This document defines the current state of both codebases, identifies broken or incomplete features, and lays out a phased roadmap to production readiness.

### Strategic Principles

| Principle | Implementation |
|---|---|
| Zero egress cost | Vercel (frontend) + Render/Railway free tier (backend) |
| Existing backend — don't rewrite | Keep Express + MongoDB + Socket.IO (already working) |
| Engine computation off main thread | Stockfish WASM via dedicated Web Worker |
| Real-time multiplayer | Socket.IO (already implemented in backend) |
| External enrichment | Lichess public APIs — Daily Puzzle, Player Stats, Live TV |

---

## 2. Infrastructure & Tech Stack

### 2.1 Frontend (`chess-master-react`)

| Tool | Version | Rationale |
|---|---|---|
| **React** | 18.3 | Concurrent rendering, Suspense for lazy routes |
| **Vite** | 7.2 | Sub-second HMR, native ESM, optimized production builds |
| **react-router-dom** | 7.x | File-system agnostic routing, `useSearchParams` for deep links |
| **react-chessboard** | 4.7 | Drop-in board component with drag/click/promotion support |
| **chess.js** | 1.4 | Legal move generation, PGN/FEN parsing, Chess960 support |
| **framer-motion** | 12.x | Declarative animations for modals, transitions, page mounts |
| **chart.js + react-chartjs-2** | 5.x | Profile stats visualization (Doughnut charts) |
| **socket.io-client** | 4.8 | Real-time communication with the backend |
| **lucide-react / react-icons** | Latest | Icon libraries (currently imported but underutilized) |

### 2.2 Backend (`ChessMaster-backend`) — EXISTS & FUNCTIONAL

The backend is a **single-file Node.js server** (`socket.js`, 467 LOC) that is fully built and functional when running locally.

| Tool | Version | Purpose |
|---|---|---|
| **Express** | 4.21 | REST API for auth (`/api/signup`, `/api/login`, `/health`) |
| **MongoDB Atlas** | (Free M0 cluster) | User persistence, ratings, game stats |
| **Mongoose** | 8.12 | ODM for User schema (username, bcrypt password, per-category ELO & stats) |
| **Socket.IO** | 4.8 | Real-time game sync, matchmaking, room management, chat |
| **bcryptjs** | 3.0 | Password hashing |

#### Backend Architecture Summary

```
ChessMaster-backend/
├── socket.js          # Monolithic server (Express + Socket.IO + Mongoose)
├── .env               # MONGODB_URI → Atlas cluster
└── package.json       # npm start → node ./socket.js
```

#### Existing Backend Capabilities

| Capability | Status | Implementation |
|---|---|---|
| **User signup** | ✅ Working | `POST /api/signup` — bcrypt hash, rating selection (400/800/1200/1600) |
| **User login** | ✅ Working | `POST /api/login` — returns full user object with ratings + stats |
| **Random matchmaking** | ✅ Working | `want_to_play` event → `waitingPlayers` Map → match by time control |
| **Friend rooms** | ✅ Working | `create_room` → 6-char code → `join_room` → `match_made` |
| **Move sync** | ✅ Working | `sync_state` → forwards FEN/timers/PGN to opponent via `sync_state_from_server` |
| **In-game chat** | ✅ Working | `send_message` → `receive_message` to opponent |
| **Game result handling** | ✅ Working | `update_game_result` → broadcasts to both players, updates DB stats |
| **ELO calculation** | ✅ Working | K=32, clamped [400, 1600], per time-control (bullet/blitz/rapid) |
| **Disconnect handling** | ✅ Working | Opponent wins on disconnect; stats saved |
| **Online player count** | ✅ Working | `totalplayers` event emitted on connect/disconnect |
| **Health check** | ✅ Working | `GET /health` → MongoDB connection status |

#### User Schema (MongoDB)

```js
{
  username:     String (unique),
  password:     String (bcrypt),
  rating:       Number (initial selection: 400|800|1200|1600),
  bulletRating: Number,  blitzRating: Number,  rapidRating: Number,
  bulletStats:  { whiteWins, whiteDraws, whiteGames, blackWins, blackDraws, blackGames },
  blitzStats:   { ... same shape },
  rapidStats:   { ... same shape },
  totalGames:   Number
}
```

#### What Backend DOES NOT Have (Gaps)

| Missing Capability | Impact | Resolution |
|---|---|---|
| No deployment — runs on `localhost:3001` only | Multiplayer broken when not local | Deploy to Render / Railway free tier |
| No JWT/session tokens | Auth is stateless; user data stored in `localStorage` only | Add JWT middleware or keep current approach (acceptable for MVP) |
| No game history persistence | Games are tracked in-memory `activeGames` Map — lost on restart | Add `Game` model in MongoDB; save completed games |
| No server-side timer enforcement | Client sends timer values — exploitable | Add server-side `setInterval` countdown |
| No rate limiting on auth endpoints | Brute-force vulnerable | Add `express-rate-limit` middleware |
| No input validation beyond rating check | XSS/injection risk on username | Add sanitization middleware |
| ELO capped at [400, 1600] | Artificial ceiling for skilled players | Extend to [400, 3000] or remove cap |
| `stats.blackWins` incremented on white win (L424-425) | Bug — black's wins count increases when white wins | Fix conditional logic in `saveGameStats` |

### 2.3 State Management (To Implement)

| Tool | Purpose |
|---|---|
| **React Context + useReducer** | Global game state, user session, theme preferences |
| **localStorage** | Persisted user data (already used for `chessmaster_user`) |

> **Current state:** Every page manages its own state in isolation. `Game.jsx` alone contains 30+ `useState` calls. There is no shared context.

### 2.4 External APIs (Lichess — Free, No Auth Required)

| API | Endpoint | Purpose | Target Page |
|---|---|---|---|
| **Daily Puzzle** | `GET https://lichess.org/api/puzzle/daily` | Interactive puzzle of the day | `Landing.jsx` |
| **Player Stats** | `GET https://lichess.org/api/user/{username}` | Cross-platform ELO & stats | `Profile.jsx` |
| **Live TV Channels** | `GET https://lichess.org/api/tv/channels` | Top live GM games to spectate | `Landing.jsx` |
| **Opening Explorer** | `GET https://explorer.lichess.ovh/masters?fen={fen}` | Opening book lookups | `Evaluate.jsx` |
| **Cloud Eval** | `GET https://lichess.org/api/cloud-eval?fen={fen}` | Server-side position evaluation | `Evaluate.jsx` |
| **Endgame Tablebase** | `GET https://tablebase.lichess.ovh/standard?fen={fen}` | Endgame tablebase lookups | `Evaluate.jsx` |

---

## 3. Directory Evolution

### 3.1 Current Structure

```
chess-master-react/                    ChessMaster-backend/
src/                                   ├── socket.js        # ALL server code
├── assets/          # react.svg       ├── .env             # MONGODB_URI
├── components/      # 2 components    └── package.json
├── hooks/           # EMPTY
├── pages/           # 9 monolithic pages (46KB Game.jsx)
├── styles/          # 10 CSS files (1:1 per page)
├── utils/           # chess_quotes.js, themes.js
├── App.jsx          # Flat route definitions, no lazy loading
├── index.css        # Design system tokens
└── main.jsx         # Entry point
public/
├── images/          # 12 piece PNGs
├── sounds/          # 6 audio files
└── stockfish.js     # ~954 KB Stockfish engine
```

### 3.2 Target Structure

```diff
 src/
 ├── assets/
 ├── components/
 │   ├── board/           # ChessBoard wrapper, EvalBar, CapturedPieces
 │   ├── layout/          # Sidebar, TopBar, PageShell
 │   ├── modals/          # PromotionDialog, GameOverModal, ConfirmDialog
+│   ├── puzzle/          # DailyPuzzle.jsx — interactive puzzle mini-board
+│   ├── spectate/        # LiveTV.jsx — live GM game viewer
 │   └── ui/              # Button, Clock, Badge, Chip (shared primitives)
+├── context/
+│   ├── AuthContext.jsx       # User session from backend, localStorage sync
+│   ├── GameContext.jsx       # useReducer-based game state machine
+│   ├── SocketContext.jsx     # Socket.IO singleton, connection status
+│   └── ThemeContext.jsx      # Board theme + dark/light mode
 ├── hooks/
+│   ├── useStockfish.js       # Web Worker lifecycle, postMessage API
+│   ├── useTimer.js           # Accurate chess clock (requestAnimationFrame)
+│   ├── useSound.js           # Lazy audio loading, play on events
+│   ├── useLocalStorage.js    # Type-safe get/set wrapper
+│   └── useLichess.js         # Lichess API hooks (puzzle, stats, TV)
 ├── pages/
+│   ├── Game/
+│   │   ├── Game.jsx          # Decomposed (< 300 LOC)
+│   │   ├── SetupWizard.jsx
+│   │   ├── PlayingView.jsx
+│   │   └── GameOverView.jsx
+│   └── ... (other pages, similarly decomposed)
+├── services/
+│   ├── api.js                # Backend REST client (login, signup, profile)
+│   ├── socket.js             # Socket.IO client singleton + event helpers
+│   └── lichess.js            # Lichess API: puzzle, user stats, TV, explorer, tablebase
 ├── styles/
 ├── utils/
+│   ├── chess960.js           # Extracted from PassAndPlay960.jsx
+│   ├── fen.js                # FEN parsing utilities
+│   └── pgn.js                # PGN formatting / cleaning
+├── workers/
+│   └── stockfish.worker.js   # Dedicated worker with message protocol
 ├── App.jsx
 ├── index.css
 └── main.jsx
```

### 3.3 Key Migrations

| From | To | Rationale |
|---|---|---|
| `new Worker('/stockfish.js')` in 3 files | Single `workers/stockfish.worker.js` + `useStockfish` hook | Eliminate main-thread blocking; DRY |
| 30+ `useState` in `Game.jsx` | `GameContext` + `useReducer` | Predictable state transitions; testable |
| Inline `io(backendUrl)` in `Game.jsx` | `SocketContext` + `services/socket.js` | Singleton connection; shared across pages |
| Inline `fetch('/api/login')` in `SignIn.jsx` | `services/api.js` + `AuthContext` | Centralized API client; error handling |
| `generateChess960Position()` in page | `utils/chess960.js` | Reusable; testable independently |
| Hardcoded mock data in `Landing.jsx` | Lichess API calls in `services/lichess.js` | Real data: puzzle, live games, player count |

---

## 4. Implementation Roadmap

### Phase 1 — State Management & Component Refactoring

**Goal:** Reduce `Game.jsx` from 1001 LOC to < 300 LOC. Establish shared context.

| # | Task | Details |
|---|---|---|
| 1.1 | Create `src/context/GameContext.jsx` | Define state shape: `{ phase, mode, game, playerColor, moveHistory, timers, settings }`. Implement `gameReducer` with actions: `SET_PHASE`, `MAKE_MOVE`, `TICK_TIMER`, `SET_GAME_OVER`, `RESET`. |
| 1.2 | Create `src/context/AuthContext.jsx` | Wrap backend REST login/signup. Expose `{ user, signIn, signUp, signOut, loading }`. Replace all `localStorage.getItem('chessmaster_user')` calls. |
| 1.3 | Create `src/context/SocketContext.jsx` | Create Socket.IO connection once at app root. Expose `{ socket, isConnected, onlineCount }`. Replace per-page `io()` instantiation. Listen for `totalplayers` event for real online count. |
| 1.4 | Extract `useTimer` hook | Replace `setInterval`-based clock with `requestAnimationFrame` loop for sub-second accuracy. Accept `{ initialTime, onTimeout }` params. |
| 1.5 | Extract `useSound` hook | Lazy-load `Audio` objects on first user interaction (Chrome autoplay policy). Expose `playMove()`, `playCapture()`, `playCheck()`, `playEnd()`. |
| 1.6 | Decompose `Game.jsx` | Split into `SetupWizard`, `PlayingView`, `GameOverView`. Each consumes `GameContext` + `SocketContext`. |
| 1.7 | Decompose page CSS | Migrate shared patterns (clocks, buttons, modals) into component-scoped CSS or shared utility classes in `index.css`. |
| 1.8 | Extract `chess960.js` utility | Move `generateChess960Position()` and `createNewRandomGame960()` from `PassAndPlay960.jsx` to `src/utils/chess960.js`. |

### Phase 2 — Web Worker Setup for Non-Blocking Stockfish

**Goal:** Move all Stockfish computation off the main thread. Single worker instance shared across pages.

| # | Task | Details |
|---|---|---|
| 2.1 | Create `src/workers/stockfish.worker.js` | Wrapper that loads `/stockfish.js` internally. Accepts typed messages: `{ type: 'INIT' }`, `{ type: 'EVAL', fen, depth, multiPV }`, `{ type: 'BEST_MOVE', fen, depth }`, `{ type: 'STOP' }`. Posts back: `{ type: 'BEST_MOVE', move }`, `{ type: 'EVAL_LINE', lineIndex, score, pv }`. |
| 2.2 | Create `src/hooks/useStockfish.js` | Manages worker lifecycle. `const { getBestMove, getEvaluation, isReady, terminate } = useStockfish()`. Internally handles `onmessage` → Promise resolution. |
| 2.3 | Refactor `PlayStockfish.jsx` | Replace inline `new Worker()` + `onmessage` with `useStockfish()`. |
| 2.4 | Refactor `Game.jsx` AI mode | Replace inline Stockfish init with `useStockfish()`. Remove `stockfish.current` ref. |
| 2.5 | Refactor `Evaluate.jsx` | Replace inline MultiPV worker with `useStockfish({ multiPV: 3 })`. |
| 2.6 | Vite config update | Add `worker: { format: 'es' }` to `vite.config.js`. Configure `optimizeDeps.exclude: ['stockfish']` if needed. |

### Phase 3 — Backend Hardening & Deployment

**Goal:** Deploy the existing backend to a free-tier host. Fix bugs and add missing persistence.

| # | Task | Details |
|---|---|---|
| 3.1 | Fix `saveGameStats` bug | In `socket.js` L424, `blackPlayer[statsField].blackWins += 1` is incorrectly incremented when white wins. Fix: only increment winner's wins, not both players. |
| 3.2 | Add `Game` model to MongoDB | Create a Mongoose schema: `{ whiteId, blackId, timeControl, result, resultReason, pgn, fen, startedAt, endedAt }`. Save completed games in `saveGameStats()`. |
| 3.3 | Add match history REST endpoint | `GET /api/games/:username` — returns last 20 games for a user. Frontend `Profile.jsx` fetches this on mount. |
| 3.4 | Add leaderboard REST endpoint | `GET /api/leaderboard?category=blitz&limit=10` — returns top players by rating. Frontend `Landing.jsx` fetches this. |
| 3.5 | Extend ELO cap | Change `Math.max(400, Math.min(1600, ...))` to `Math.max(100, Math.min(3000, ...))`. |
| 3.6 | Add `express-rate-limit` | 5 attempts / 15 min on `/api/login` and `/api/signup`. |
| 3.7 | Add input sanitization | Sanitize `username` on signup to prevent XSS. Validate length [3, 20], alphanumeric + underscore only. |
| 3.8 | Wire real online count | Replace hardcoded `1,248 Online` in `Landing.jsx` and `Game.jsx` with the `totalplayers` Socket.IO event (already emitted by backend). |
| 3.9 | Deploy backend | Deploy `ChessMaster-backend` to **Render** (free tier: 750 hrs/month) or **Railway** (free trial). Set `MONGODB_URI` env var. Update frontend `VITE_BACKEND_URL` to deployed URL. |
| 3.10 | Deploy frontend | Deploy `chess-master-react` to **Vercel**. Set `VITE_BACKEND_URL` env var pointing to deployed backend. |

#### 3.2.1 Game Model Schema (MongoDB)

```js
const gameSchema = new mongoose.Schema({
  white:        { type: String, required: true },       // username
  black:        { type: String, required: true },       // username
  timeControl:  { type: Number, required: true },       // minutes
  result:       { type: String, enum: ['white', 'black', 'draw'] },
  resultReason: { type: String },                       // checkmate, resignation, timeout, disconnect, stalemate
  pgn:          { type: String, default: '' },
  finalFen:     { type: String, default: '' },
  whiteEloChange: { type: Number, default: 0 },
  blackEloChange: { type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now },
});
```

### Phase 4 — Lichess API Integrations

**Goal:** Enrich the platform with free Lichess API data — interactive daily puzzle, cross-platform stats, and live GM spectating.

| # | Task | Details |
|---|---|---|
| 4.1 | Create `src/services/lichess.js` | Module exporting all Lichess API functions. Includes request deduplication, in-memory cache (Map with 60s TTL), and a rate-limiting queue (max 1 req/s per Lichess guidelines). |
| 4.2 | **Daily Puzzle on Landing page** | See **§4.2.1** below. |
| 4.3 | **Cross-Platform Player Stats on Profile** | See **§4.3.1** below. |
| 4.4 | **Live TV / GM Spectating on Landing** | See **§4.4.1** below. |
| 4.5 | Opening Explorer panel | New component in `Evaluate.jsx` sidebar. Given the current FEN, fetch top master games and moves from `explorer.lichess.ovh/masters?fen={fen}`. Display move, games count, win/draw/loss percentages. |
| 4.6 | Endgame Tablebase | When ≤ 7 pieces on board, automatically query `tablebase.lichess.ovh/standard?fen={fen}`. Display DTZ (distance to zeroing) and optimal line. |
| 4.7 | Cloud Evaluation fallback | If Stockfish worker is unavailable or for quick initial eval, fetch `lichess.org/api/cloud-eval?fen={fen}`. |
| 4.8 | Rate limiting | Lichess API requests are limited to 1 req/s. Implement a request queue with 1000ms minimum interval between calls. |

#### 4.2.1 Daily Puzzle (`Landing.jsx`)

**Endpoint:** `GET https://lichess.org/api/puzzle/daily`

**Response shape (key fields):**
```json
{
  "game": {
    "pgn": "e4 e5 Nf3 Nc6 ...",
    "id": "abc123"
  },
  "puzzle": {
    "id": "abcDe",
    "rating": 1542,
    "solution": ["e2e4", "d7d5", "e4d5"],  // UCI move strings
    "themes": ["middlegame", "fork"]
  }
}
```

**Implementation:**

1. **Fetch on mount** — `Landing.jsx` calls `lichess.getDailyPuzzle()` on mount. Cache result for 24h in `localStorage` (key: `puzzle_date_{YYYY-MM-DD}`).
2. **Render mini-board** — New `<DailyPuzzle />` component renders a compact `<Chessboard />` using the puzzle's starting FEN (derived by replaying the game PGN up to the puzzle start position).
3. **Interactive solving** — Track a `solutionIndex` state. On user move:
   - If `userMove === puzzle.solution[solutionIndex]` → correct. Increment index. If next move exists and is opponent's, auto-play it after 500ms delay.
   - If all solution moves exhausted → show "✅ Puzzle solved!" with confetti animation.
   - If wrong move → shake animation, reset piece, show "Try again" toast.
4. **Display metadata** — Show puzzle rating (e.g., "⭐ 1542"), themes as chips (e.g., "fork", "pin"), and a "View on Lichess" link.

```jsx
// Pseudocode for DailyPuzzle component
function DailyPuzzle() {
  const [puzzle, setPuzzle] = useState(null);
  const [game, setGame] = useState(null);
  const [solutionIdx, setSolutionIdx] = useState(0);
  const [status, setStatus] = useState('playing'); // playing | solved | wrong

  useEffect(() => {
    lichess.getDailyPuzzle().then(data => {
      // Replay PGN to get starting position
      const g = new Chess();
      const moves = data.game.pgn.split(' ');
      moves.forEach(m => g.move(m));
      // Now the position is at puzzle start
      setPuzzle(data.puzzle);
      setGame(g);
    });
  }, []);

  function onDrop(from, to) {
    const uciMove = from + to;
    if (uciMove === puzzle.solution[solutionIdx]) {
      // Correct! Apply move, auto-play opponent response
      game.move({ from, to });
      if (solutionIdx + 1 < puzzle.solution.length) {
        // Auto-play opponent's next move after delay
        setTimeout(() => {
          const next = puzzle.solution[solutionIdx + 1];
          game.move({ from: next.slice(0,2), to: next.slice(2,4) });
          setSolutionIdx(prev => prev + 2);
        }, 500);
      } else {
        setStatus('solved');
      }
    } else {
      setStatus('wrong');
      setTimeout(() => setStatus('playing'), 1000);
    }
  }
}
```

#### 4.3.1 Cross-Platform Player Stats (`Profile.jsx`)

**Endpoint:** `GET https://lichess.org/api/user/{username}`

**Response shape (key fields):**
```json
{
  "username": "DrNykterstein",
  "perfs": {
    "bullet":    { "games": 1200, "rating": 3056, "prog": 12 },
    "blitz":     { "games": 3400, "rating": 2986, "prog": -5 },
    "rapid":     { "games": 800,  "rating": 2910, "prog": 20 },
    "classical": { "games": 100,  "rating": 2850, "prog": 0 }
  },
  "count": {
    "all": 5500, "win": 3200, "loss": 1800, "draw": 500
  },
  "playTime": { "total": 8640000 }
}
```

**Implementation:**

1. **Lichess username field** — Add a `lichessUsername` field to the Profile page (stored in `localStorage` or user MongoDB document). Input with "Link Lichess Account" button.
2. **Fetch on mount** — When `lichessUsername` exists, call `lichess.getPlayerStats(username)` and display results.
3. **UI — Stat cards:** Render Lichess ratings alongside ChessMaster ratings in a comparison layout:
   ```
   ┌─────────────────────────────────────────┐
   │  Bullet                                 │
   │  ChessMaster: 1200    Lichess: 2056 ▲12 │
   │  ██████████████████░░ (1200 games)      │
   ├─────────────────────────────────────────┤
   │  Blitz                                  │
   │  ChessMaster: 1350    Lichess: 1986 ▼5  │
   │  ████████████████████████░░ (3400 games) │
   └─────────────────────────────────────────┘
   ```
4. **Win/Loss/Draw overview** — Use the `count` object to populate the existing Doughnut chart with real data instead of mock values.
5. **Error handling** — If username doesn't exist on Lichess, show "User not found on Lichess" toast. Cache successful responses for 5 minutes.

#### 4.4.1 Live TV / GM Spectating (`Landing.jsx`)

**Endpoint:** `GET https://lichess.org/api/tv/channels`

**Response shape (key fields):**
```json
{
  "Bullet": {
    "user": { "id": "player1", "name": "GM_Player", "title": "GM" },
    "rating": 3100,
    "gameId": "abc123"
  },
  "Blitz": {
    "user": { "id": "player2", "name": "IM_Player", "title": "IM" },
    "rating": 2800,
    "gameId": "def456"
  },
  "Rapid": { ... },
  "Classical": { ... },
  "Chess960": { ... }
}
```

**Implementation:**

1. **Fetch on mount + poll** — `Landing.jsx` calls `lichess.getTVChannels()` on mount. Set up a `setInterval` to re-fetch every **5 seconds** for live updates.
2. **New `<LiveTV />` component** — Replace the current hardcoded "Global Lobby" chat panel on Landing.jsx with a "🔴 Live Games" panel showing the top games across categories.
3. **UI for each channel:**
   ```
   ┌─────────────────────────────────────┐
   │ 🔴 LIVE GAMES                       │
   ├─────────────────────────────────────┤
   │ ⚡ Bullet                           │
   │   GM DrNykterstein (3100)           │
   │   [mini chessboard showing FEN]     │
   │   [Watch on Lichess →]              │
   ├─────────────────────────────────────┤
   │ 🔥 Blitz                            │
   │   IM ChessNova (2800)               │
   │   [mini chessboard]                 │
   │   [Watch on Lichess →]              │
   └─────────────────────────────────────┘
   ```
4. **Mini-board rendering** — Use `<Chessboard boardWidth={150} />` in view-only mode (`arePiecesDraggable={false}`). To get FEN updates, fetch the individual game stream: `GET https://lichess.org/api/tv/feed` (NDJSON stream) for the currently selected channel.
5. **"Watch on Lichess" link** — Each game card links to `https://lichess.org/{gameId}`.
6. **Cleanup** — Clear the polling interval on unmount to prevent memory leaks.

---

## 5. Deployment & Optimization

### 5.1 Lazy Loading Routes

```jsx
// App.jsx — target implementation
import { lazy, Suspense } from 'react';

const Landing    = lazy(() => import('./pages/Landing'));
const Game       = lazy(() => import('./pages/Game/Game'));
const Evaluate   = lazy(() => import('./pages/Evaluate'));
const PlayStockfish = lazy(() => import('./pages/PlayStockfish'));
const PassAndPlay   = lazy(() => import('./pages/PassAndPlay'));
const PassAndPlay960 = lazy(() => import('./pages/PassAndPlay960'));
const SignIn     = lazy(() => import('./pages/SignIn'));
const Profile    = lazy(() => import('./pages/Profile'));
const Rules      = lazy(() => import('./pages/Rules'));

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          {/* ... */}
        </Routes>
      </Suspense>
    </Router>
  );
}
```

**Expected impact:** Initial bundle reduction of ~60% (Game.jsx alone accounts for 46KB unminified).

### 5.2 Asset Optimization

| Asset | Current | Target |
|---|---|---|
| `stockfish.js` (954 KB) | Loaded synchronously in `public/` | Move to Web Worker; load via dynamic `import()` only when needed |
| Piece images (12 PNGs) | In `public/images/` | Keep as-is; they're small and pre-cached by `react-chessboard` |
| Sound files (6 MP3s) | Loaded eagerly at module scope via `new Audio()` | Lazy-load on first user interaction; use `useSound` hook |
| `chess_quotes.js` (82 KB) | Statically imported | Lazy-load or split into chunks; not needed on initial render |

### 5.3 Vite Build Optimization

```js
// vite.config.js — target
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'chess-engine': ['chess.js'],
          'chessboard': ['react-chessboard'],
          'charts': ['chart.js', 'react-chartjs-2'],
          'animations': ['framer-motion'],
        },
      },
    },
    target: 'esnext',
    minify: 'terser',
  },
  worker: {
    format: 'es',
  },
});
```

### 5.4 Deployment Architecture

```
┌──────────────────────────────────────────────────┐
│                  VERCEL (Free)                    │
│              chess-master-react                   │
│         Static SPA + Edge CDN                     │
│    VITE_BACKEND_URL → render backend             │
└─────────────────────┬────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼────────────────────────────┐
│              RENDER (Free Tier)                   │
│           ChessMaster-backend                     │
│     Express REST + Socket.IO WebSocket            │
│       MONGODB_URI → Atlas (Free M0)               │
└─────────────────────┬────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│         MONGODB ATLAS (Free M0 Cluster)           │
│     512 MB storage, shared RAM                    │
│     Users collection + Games collection           │
└──────────────────────────────────────────────────┘
                      │
         Lichess Public APIs (no auth)
         ├── /api/puzzle/daily
         ├── /api/user/{username}
         ├── /api/tv/channels
         ├── /api/cloud-eval
         └── explorer.lichess.ovh
```

### 5.5 Vercel Config

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/stockfish.js",
      "headers": [
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" }
      ]
    }
  ]
}
```

> **COOP/COEP headers** are required for `SharedArrayBuffer` support, which Stockfish WASM uses for multi-threaded mode.

### 5.6 Deployment Checklist

- [ ] Deploy backend to Render — `npm start` → `node ./socket.js`
- [ ] Set Render env var: `MONGODB_URI`
- [ ] Update frontend `.env`: `VITE_BACKEND_URL=https://your-app.onrender.com`
- [ ] Connect GitHub repo to Vercel
- [ ] Set Vercel env var: `VITE_BACKEND_URL`
- [ ] Enable Vercel Analytics (free tier: 2.5K events/month)
- [ ] Test COOP/COEP headers for Stockfish SharedArrayBuffer
- [ ] Verify SPA fallback routing works
- [ ] Test Socket.IO connection over deployed HTTPS (wss://)

---

## 6. Feature Audit — What's Working vs. What's Broken

### 6.1 ✅ Working Features

| Feature | Page | Status | Notes |
|---|---|---|---|
| Local Pass & Play | `PassAndPlay.jsx` | ✅ Working | Timer, PGN display, drag + click-to-move, promotion all functional |
| Chess960 Pass & Play | `PassAndPlay960.jsx` | ✅ Working | Random position generation, board flip per turn, timer |
| Play vs Stockfish (standalone) | `PlayStockfish.jsx` | ✅ Working | Worker loads from `/stockfish.js`, color/difficulty selection, PGN nav |
| Analysis Board | `Evaluate.jsx` | ✅ Working | MultiPV (3 lines), eval bar, PGN import, move navigation, click-to-move |
| PGN from URL (post-game analyze) | `Evaluate.jsx` | ✅ Working | `?pgn=` query param auto-loads game for review |
| Chess Rules page | `Rules.jsx` | ✅ Working | Static content — renders correctly |
| Board themes definition | `utils/themes.js` | ✅ Defined | 10 themes defined but **not wired to any UI selector** |
| Design system | `index.css` | ✅ Working | Comprehensive CSS custom properties, Google Fonts loaded |
| Navigation sidebar | `Sidebar.jsx` | ✅ Working | Active state highlighting, hover effects, route navigation |
| Captured pieces display | `CapturedPieces.jsx` | ✅ Working | FEN parsing, material advantage calculation |

### 6.2 ⚠️ Features That Work ONLY With Backend Running Locally

These features are **fully implemented** in both frontend and backend code. They work when the backend is running on `localhost:3001` but appear broken without it.

| Feature | Frontend | Backend | Issue |
|---|---|---|---|
| **User Sign Up** | `SignIn.jsx` → `POST /api/signup` | `socket.js` L76-96 | ✅ Works with backend. Broken in prod (no deployment). |
| **User Login** | `SignIn.jsx` → `POST /api/login` | `socket.js` L98-120 | ✅ Works with backend. Returns full user object with ratings. |
| **Random Matchmaking** | `Game.jsx` → `want_to_play` | `socket.js` L152-167 | ✅ Works with backend. Matches by time control. |
| **Friend Room (Create)** | `Game.jsx` → `create_room` | `socket.js` L172-187 | ✅ Works with backend. 6-char room code. |
| **Friend Room (Join)** | `Game.jsx` → `join_room` | `socket.js` L190-213 | ✅ Works with backend. Validates room exists. |
| **Move Sync** | `Game.jsx` → `sync_state` | `socket.js` L217-242 | ✅ Works with backend. Forwards FEN/timers to opponent. |
| **In-game Chat** | `Game.jsx` → `send_message` | `socket.js` L244-257 | ✅ Works with backend. Relays to opponent. |
| **Game Over / Resign** | `Game.jsx` → `update_game_result` | `socket.js` L266-280 | ✅ Works with backend. Updates ELO in DB. |
| **ELO Calculation** | N/A (server-side) | `socket.js` L446-460 | ✅ K=32 system. Per time-control tracking. |
| **Online Player Count** | Hardcoded `1,248` | `socket.js` L143-144 | ⚠️ Backend emits real count via `totalplayers` but frontend ignores it |

### 6.3 ❌ Broken / Non-Functional Features (Independent of Backend)

| Feature | Page | Issue | Root Cause |
|---|---|---|---|
| **Google OAuth** | `SignIn.jsx` | ❌ Non-functional | Button exists but has no `onClick` handler; purely decorative |
| **GitHub OAuth** | `SignIn.jsx` | ❌ Non-functional | Button exists but has no `onClick` handler; purely decorative |
| **"Forgot Password"** | `SignIn.jsx` | ❌ Non-functional | Button exists but has no handler |
| **Online count badge** | `Landing.jsx`, `Game.jsx` | ❌ Fake | Hardcoded `1,248 Online` — backend emits real count but frontend doesn't listen on Landing |
| **Global lobby chat** | `Landing.jsx` | ❌ Fake | Static mock messages array — not connected to any real-time feed |
| **Leaderboard** | `Landing.jsx` | ❌ Fake | Hardcoded `topPlayers` array — no leaderboard endpoint in backend |
| **Tournament card** | `Landing.jsx` | ❌ Fake | "$5,000 Prize Pool" text — no tournament system exists |
| **Profile stats** | `Profile.jsx` | ❌ Partially fake | Win %, accuracy are hardcoded mock values. Ratings come from backend (if logged in). |
| **Match history** | `Profile.jsx` | ❌ Fake | Hardcoded 3-item array — backend doesn't persist game history |
| **Tactical proficiency** | `Profile.jsx` | ❌ Fake | Hardcoded progress bars (92%, 48%) — no data source |
| **Engine analysis on Profile** | `Profile.jsx` | ❌ Fake | Static "Nf3 → d4" text — not connected to any engine |
| **Rating charts (Doughnut)** | `Profile.jsx` | ⚠️ Conditional | Chart renders if `user.bulletStats` exists — only available after backend login |
| **Board theme selector** | N/A | ❌ Missing | `themes.js` defines 10 themes but no UI to switch them |
| **Timer runs out = win** | `PassAndPlay.jsx` | ❌ Missing | Timer counts to 0 but game doesn't end automatically |
| **Timer runs out = win** | `Game.jsx` | ❌ Missing | Timer counts to 0 but no game-over logic triggers |
| **Sound on moves (standalone pages)** | `PlayStockfish.jsx`, `PassAndPlay.jsx`, `PassAndPlay960.jsx` | ❌ Missing | No sound effects — only `Game.jsx` has audio |
| **"Review" button on match history** | `Profile.jsx` | ❌ Non-functional | Button has no `onClick` handler |

### 6.4 🐛 Backend Bugs

| Bug | Location | Description | Fix |
|---|---|---|---|
| **Wrong stats incremented** | `socket.js` L424-425 | When White wins (`score === 1`), `blackPlayer.blackWins` is also incremented. This means a loss is counted as a win for Black. | Only increment the winner's wins field. Remove L425. |
| **No game persistence** | `socket.js` `activeGames` Map | Games exist only in server memory. Server restart = all active games lost, no history. | Add `Game` Mongoose model; save on game end. |
| **ELO ceiling at 1600** | `socket.js` L457-458 | `Math.min(1600, ...)` caps ratings arbitrarily low. | Raise to 3000 or remove cap. |
| **No CORS origin restriction** | `socket.js` L16 | `origin: "*"` allows any origin. | Restrict to frontend URL in production. |
| **`nodemon` as production dep** | `package.json` L21 | Should be in `devDependencies`. | Move to devDependencies. |

### 6.5 ⚠️ Architectural Issues

| Issue | Location | Impact | Fix |
|---|---|---|---|
| **God Component** | `Game.jsx` (1001 LOC, 46 KB) | Unmaintainable, untestable, massive re-renders | Decompose into sub-components + Context |
| **Stockfish on main thread** | 3 pages each do `new Worker('/stockfish.js')` | Up to 3 concurrent workers; blocks UI if Worker API unavailable | Centralize in `useStockfish` hook |
| **Stale closure in Stockfish callback** | `Game.jsx` L118-133 | `makeAIMove` may read stale `game` via `gameRef`; race conditions possible | Use reducer dispatch instead of setState |
| **`setInterval` timer drift** | `Game.jsx` L248-255, `PassAndPlay.jsx` L205-217 | ~15ms/sec drift over long games | Replace with `requestAnimationFrame` + timestamp delta |
| **Audio autoplay blocked** | `Game.jsx` L10-14 | `new Audio()` at module scope; Chrome blocks until user gesture | Lazy init in `useSound` hook after first click |
| **No error boundaries** | Entire app | Stockfish crash or bad FEN = white screen | Add `ErrorBoundary` component at route level |
| **No 404 route** | `App.jsx` | Invalid URLs show blank page | Add `<Route path="*" element={<NotFound />} />` |
| **Inconsistent route casing** | `App.jsx` L25 | `/PassAndPlay960` vs `/pass-play` (kebab-case inconsistency) | Normalize to `/chess960` |
| **No meta tags / SEO** | `index.html` | Title is just `chess-master-react`; no description, no OG tags | Add proper meta tags |
| **`lucide-react` + `react-icons` both installed** | `package.json` | Duplicate icon libraries; increased bundle | Pick one, remove the other |
| **Socket.IO created per-page** | `Game.jsx` L97-110 | New socket connection on every `/game` mount; no sharing | Move to `SocketContext` at App root |

### 6.6 Features to Implement (New)

| Priority | Feature | Difficulty | Depends On |
|---|---|---|---|
| 🔴 Critical | Deploy backend to Render/Railway | Low | Phase 3.9 |
| 🔴 Critical | Deploy frontend to Vercel | Low | Phase 3.10 |
| 🔴 Critical | Fix `saveGameStats` bug (wrong wins counted) | Low | Phase 3.1 |
| 🟡 High | Web Worker Stockfish (non-blocking) | Medium | Phase 2 |
| 🟡 High | Game state Context (shared state) | Medium | Phase 1 |
| 🟡 High | Socket.IO Context (singleton connection) | Low | Phase 1.3 |
| 🟡 High | Timer timeout = game over | Low | Phase 1 |
| 🟡 High | Board theme selector UI | Low | Phase 1 |
| 🟡 High | Game history persistence (MongoDB) | Medium | Phase 3.2 |
| 🟢 Medium | **Daily Puzzle on Landing** (Lichess API) | Medium | Phase 4.2 |
| 🟢 Medium | **Live TV / GM Spectating** (Lichess API) | Medium | Phase 4.4 |
| 🟢 Medium | **Cross-Platform Player Stats** (Lichess API) | Medium | Phase 4.3 |
| 🟢 Medium | Lichess Opening Explorer integration | Medium | Phase 4.5 |
| 🟢 Medium | Lichess Endgame Tablebase | Medium | Phase 4.6 |
| 🟢 Medium | Real leaderboard endpoint | Medium | Phase 3.4 |
| 🟢 Medium | Real match history endpoint | Medium | Phase 3.3 |
| 🟢 Medium | Sound effects on all game pages | Low | Phase 1 |
| 🟢 Medium | Wire real online player count | Low | Phase 3.8 |
| 🔵 Low | Google/GitHub OAuth | Medium | Future |
| 🔵 Low | ELO rating cap extension | Low | Phase 3.5 |
| 🔵 Low | Game review / replay from profile | Medium | Phase 3.3 |
| 🔵 Low | Puzzle / tactics trainer | High | Future |
| 🔵 Low | Tournament system | Very High | Future |

---

## 7. Timeline Estimate

| Phase | Duration | Deliverables |
|---|---|---|
| **Phase 1** — State & Refactor | 1–2 weeks | Context providers (Auth, Game, Socket), decomposed Game.jsx, hooks, timer fix, sounds |
| **Phase 2** — Web Worker | 3–5 days | Centralized Stockfish worker, `useStockfish` hook, all pages migrated |
| **Phase 3** — Backend Harden & Deploy | 1–2 weeks | Bug fixes, Game model, match history API, leaderboard API, deploy to Render + Vercel |
| **Phase 4** — Lichess API Integrations | 1–2 weeks | Daily Puzzle, Player Stats, Live TV, opening explorer, tablebase, rate-limited API service |
| **Polish & Deploy** | 3–5 days | Lazy loading, SEO, error boundaries, performance audit |

**Total estimated timeline: 5–7 weeks** for a solo developer working part-time.

---

## 8. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Render free tier cold starts (30s spin-up) | High | Medium — first connection slow | Display "Connecting..." UI; keep-alive cron ping every 14 min |
| MongoDB Atlas M0 connection limits (500) | Low | High — concurrent users capped | Connection pooling in Mongoose; monitor in Atlas dashboard |
| Stockfish WASM requires SharedArrayBuffer + COOP/COEP | Medium | Medium — fallback to single-threaded | Configure headers in `vercel.json`; test in staging first |
| Lichess API rate limiting (429) | Medium | Low — degraded UX | Request queue with 1000ms interval; show cached data on throttle |
| Socket.IO over Render free tier — WebSocket upgrade issues | Medium | High — multiplayer broken | Test wss:// explicitly; fallback to long-polling if needed |
| Chess960 castling edge cases | Low | Medium — illegal moves | Use `chess.js` built-in Chess960 support; add integration tests |
| Large `chess_quotes.js` (82 KB) delays FCP | Low | Low | Lazy-load; or reduce to 50 quotes and load rest on demand |

---

*End of document. This plan should be reviewed and approved before Phase 1 begins.*
