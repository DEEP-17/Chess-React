const LICHESS_API = 'https://lichess.org/api';
const EXPLORER_API = 'https://explorer.lichess.ovh';
const TABLEBASE_API = 'https://tablebase.lichess.ovh';

// Simple in-memory cache with TTL
const cache = new Map();

function getCached(key, ttlMs) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ttlMs) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Rate limiter: max 1 request per second to Lichess
let lastRequestTime = 0;

async function rateLimitedFetch(url) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
  }
  lastRequestTime = Date.now();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Lichess API error: ${res.status}`);
  return res.json();
}

// ─── Daily Puzzle ───────────────────────────────────────────
export async function getDailyPuzzle() {
  const cacheKey = `puzzle_${new Date().toISOString().slice(0, 10)}`;
  const cached = getCached(cacheKey, 24 * 60 * 60 * 1000); // 24h TTL
  if (cached) return cached;

  const data = await rateLimitedFetch(`${LICHESS_API}/puzzle/daily`);
  setCache(cacheKey, data);
  return data;
}

// ─── Player Stats ───────────────────────────────────────────
export async function getLichessUser(username) {
  const cacheKey = `user_${username}`;
  const cached = getCached(cacheKey, 5 * 60 * 1000); // 5 min TTL
  if (cached) return cached;

  const data = await rateLimitedFetch(`${LICHESS_API}/user/${username}`);
  setCache(cacheKey, data);
  return data;
}

// ─── Live TV Channels ───────────────────────────────────────
export async function getLiveTV() {
  const cacheKey = 'tv_channels';
  const cached = getCached(cacheKey, 5000); // 5s TTL (polled frequently)
  if (cached) return cached;

  const data = await rateLimitedFetch(`${LICHESS_API}/tv/channels`);
  setCache(cacheKey, data);
  return data;
}

// ─── Opening Explorer ───────────────────────────────────────
export async function getOpeningExplorer(fen) {
  const cacheKey = `explorer_${fen}`;
  const cached = getCached(cacheKey, 60 * 1000); // 1 min TTL
  if (cached) return cached;

  const encodedFen = encodeURIComponent(fen);
  const data = await rateLimitedFetch(
    `${EXPLORER_API}/masters?fen=${encodedFen}`
  );
  setCache(cacheKey, data);
  return data;
}

// ─── Cloud Evaluation ───────────────────────────────────────
export async function getCloudEval(fen) {
  const cacheKey = `cloud_eval_${fen}`;
  const cached = getCached(cacheKey, 60 * 1000); // 1 min TTL
  if (cached) return cached;

  const encodedFen = encodeURIComponent(fen);
  const data = await rateLimitedFetch(
    `${LICHESS_API}/cloud-eval?fen=${encodedFen}`
  );
  setCache(cacheKey, data);
  return data;
}

// ─── Endgame Tablebase ──────────────────────────────────────
export async function getTablebase(fen) {
  const cacheKey = `tablebase_${fen}`;
  const cached = getCached(cacheKey, 60 * 1000); // 1 min TTL
  if (cached) return cached;

  const encodedFen = encodeURIComponent(fen);
  const data = await rateLimitedFetch(
    `${TABLEBASE_API}/standard?fen=${encodedFen}`
  );
  setCache(cacheKey, data);
  return data;
}
