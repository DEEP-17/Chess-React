/**
 * Pick a random line from a bot's dialogue category.
 */
export function pickDialogue(bot, category) {
  const lines = bot?.dialogues?.[category];
  if (!lines?.length) return '';
  return lines[Math.floor(Math.random() * lines.length)];
}

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * Returns material balance from white's perspective for a FEN string.
 */
export function getMaterialBalance(fen) {
  const rows = fen.split(' ')[0].split('/');
  let balance = 0;
  for (const row of rows) {
    for (const char of row) {
      if (/\d/.test(char)) continue;
      const isWhite = char === char.toUpperCase();
      const type = char.toLowerCase();
      const value = PIECE_VALUES[type] ?? 0;
      balance += isWhite ? value : -value;
    }
  }
  return balance;
}

/**
 * Detect if the player's last move was a significant blunder (3+ material lost).
 */
export function isPlayerBlunder(fenBefore, fenAfter, playerColor) {
  const before = getMaterialBalance(fenBefore);
  const after = getMaterialBalance(fenAfter);
  const playerIsWhite = playerColor === 'white';
  const playerBefore = playerIsWhite ? before : -before;
  const playerAfter = playerIsWhite ? after : -after;
  return playerAfter <= playerBefore - 3;
}
