import '../styles/CapturedPieces.css';

const STARTING = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const PIECE_VALUES = { q: 9, r: 5, b: 3, n: 3, p: 1 };
const ORDER = ['q', 'r', 'b', 'n', 'p'];

// Use simple text characters that render reliably everywhere
const PIECE_CHARS = {
  w: { q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { q: '♛', r: '♜', b: '♝', n: '♞', p: '♟︎' },
};

const CapturedPieces = ({ fen, color }) => {
  if (!fen || !color) return null;

  const opponentColor = color === 'w' ? 'b' : 'w';

  // Parse FEN board section to count pieces on the board
  const counts = { w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } };
  const boardPart = fen.split(' ')[0];
  for (let i = 0; i < boardPart.length; i++) {
    const ch = boardPart[i];
    if ('pnbrqkPNBRQK'.includes(ch)) {
      const c = ch === ch.toUpperCase() ? 'w' : 'b';
      const t = ch.toLowerCase();
      counts[c][t] += 1;
    }
  }

  // Captured = starting count minus what's still on the board
  const captured = {};
  let totalCaptured = 0;
  for (const piece of ORDER) {
    const diff = STARTING[piece] - counts[opponentColor][piece];
    if (diff > 0) {
      captured[piece] = diff;
      totalCaptured += diff;
    }
  }

  // Material advantage for this player
  let playerMat = 0;
  let opponentMat = 0;
  for (const [piece, val] of Object.entries(PIECE_VALUES)) {
    playerMat += counts[color][piece] * val;
    opponentMat += counts[opponentColor][piece] * val;
  }
  const advantage = playerMat - opponentMat;

  // Nothing to show
  if (totalCaptured === 0 && advantage <= 0) return null;

  const symbols = PIECE_CHARS[opponentColor];

  return (
    <div className="captured-pieces">
      {ORDER.map(piece => {
        if (!captured[piece]) return null;
        return (
          <span key={piece} className="cp-group">
            {Array.from({ length: captured[piece] }, (_, i) => (
              <span key={i} className="cp-icon">{symbols[piece]}</span>
            ))}
          </span>
        );
      })}
      {advantage > 0 && (
        <span className="cp-adv">+{advantage}</span>
      )}
    </div>
  );
};

export default CapturedPieces;
