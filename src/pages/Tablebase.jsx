import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import Sidebar from '../components/Sidebar';
import { getTablebase } from '../services/lichess';
import '../styles/Tablebase.css';

// Common endgame presets
const PRESETS = [
  { name: 'K+Q vs K', fen: '4k3/8/8/8/8/8/8/4K2Q w - - 0 1' },
  { name: 'K+R vs K', fen: '4k3/8/8/8/8/8/8/4K2R w - - 0 1' },
  { name: 'K+P vs K', fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1' },
  { name: 'K+B+N vs K', fen: '4k3/8/8/8/8/8/8/4KBN1 w - - 0 1' },
  { name: 'K+R vs K+B', fen: '4kb2/8/8/8/8/8/8/4K2R w - - 0 1' },
  { name: 'K+R+P vs K+R', fen: '4k2r/8/8/8/8/8/4P3/4K2R w - - 0 1' },
];

const Tablebase = () => {
  const [game, setGame] = useState(new Chess());
  const [tbData, setTbData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);

  // Click-to-move state
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});

  // FEN input
  const [fenInput, setFenInput] = useState('');

  // Count pieces on the board
  const pieceCount = game
    .fen()
    .split(' ')[0]
    .replace(/[0-9/]/g, '').length;

  // Fetch tablebase data
  const fetchTablebase = useCallback(async (fen) => {
    // Tablebase only works with ≤ 7 pieces
    const count = fen.split(' ')[0].replace(/[0-9/]/g, '').length;
    if (count > 7) {
      setTbData(null);
      setError('Tablebase supports positions with 7 or fewer pieces.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getTablebase(fen);
      setTbData(data);
    } catch (err) {
      console.error('Tablebase error:', err);
      setError('Could not fetch tablebase data.');
      setTbData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (pieceCount <= 7) {
      fetchTablebase(game.fen());
    } else {
      setTbData(null);
      setError('Tablebase supports positions with 7 or fewer pieces. Play moves to simplify.');
    }
  }, [game, fetchTablebase, pieceCount]);

  // Move helpers
  function getMoveOptions(square) {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }
    const newSquares = {};
    moves.forEach((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to) && game.get(move.to).color !== game.get(square).color
            ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(0,0,0,.2) 25%, transparent 25%)',
        borderRadius: '50%',
      };
    });
    newSquares[square] = { background: 'rgba(255, 255, 0, 0.4)' };
    setOptionSquares(newSquares);
    return true;
  }

  function makeMove(from, to) {
    try {
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move({ from, to, promotion: 'q' });
      if (!result) return false;
      setGame(gameCopy);
      setMoveHistory(gameCopy.history());
      setMoveFrom('');
      setOptionSquares({});
      return true;
    } catch {
      return false;
    }
  }

  function onDrop(source, target) {
    return makeMove(source, target);
  }

  function onSquareClick(square) {
    if (optionSquares[square] && moveFrom) {
      if (makeMove(moveFrom, square)) return;
    }
    if (moveFrom === square) {
      setMoveFrom('');
      setOptionSquares({});
      return;
    }
    if (game.get(square)) {
      setMoveFrom(square);
      getMoveOptions(square);
      return;
    }
    setMoveFrom('');
    setOptionSquares({});
  }

  function loadPreset(fen) {
    try {
      const g = new Chess(fen);
      setGame(g);
      setMoveHistory([]);
      setMoveFrom('');
      setOptionSquares({});
      setFenInput(fen);
    } catch (err) {
      console.error('Invalid preset FEN:', err);
    }
  }

  function loadFen() {
    try {
      const g = new Chess(fenInput.trim());
      setGame(g);
      setMoveHistory([]);
      setMoveFrom('');
      setOptionSquares({});
    } catch {
      alert('Invalid FEN string');
    }
  }

  function resetBoard() {
    const startFen = '4k3/8/8/8/8/8/8/4K2Q w - - 0 1';
    const g = new Chess(startFen);
    setGame(g);
    setMoveHistory([]);
    setMoveFrom('');
    setOptionSquares({});
    setFenInput(startFen);
  }

  // Categorize the position result
  function getCategoryLabel(category) {
    switch (category) {
      case 'win':
        return { text: 'White wins', className: 'tb-result--win' };
      case 'maybe-win':
        return { text: 'White may win', className: 'tb-result--win' };
      case 'cursed-win':
        return { text: 'Cursed win (draw under 50-move rule)', className: 'tb-result--draw' };
      case 'draw':
        return { text: 'Draw', className: 'tb-result--draw' };
      case 'blessed-loss':
        return { text: 'Blessed loss (draw under 50-move rule)', className: 'tb-result--draw' };
      case 'maybe-loss':
        return { text: 'May lose', className: 'tb-result--loss' };
      case 'loss':
        return { text: 'Black wins', className: 'tb-result--loss' };
      default:
        return { text: category || 'Unknown', className: '' };
    }
  }

  // Categorize move
  function getMoveCategory(move) {
    const cat = move.category;
    if (cat === 'win' || cat === 'maybe-win') return 'tb-move--win';
    if (cat === 'loss' || cat === 'maybe-loss') return 'tb-move--loss';
    if (cat === 'draw' || cat === 'cursed-win' || cat === 'blessed-loss') return 'tb-move--draw';
    return '';
  }

  function getMoveResultText(move) {
    if (move.category === 'win' || move.category === 'maybe-win') {
      return move.dtz != null ? `Win (DTZ ${Math.abs(move.dtz)})` : 'Win';
    }
    if (move.category === 'loss' || move.category === 'maybe-loss') {
      return move.dtz != null ? `Loss (DTZ ${Math.abs(move.dtz)})` : 'Loss';
    }
    return 'Draw';
  }

  const resultInfo = tbData ? getCategoryLabel(tbData.category) : null;

  return (
    <div className="tb-layout">
      <Sidebar />
      <div className="tb-main">
        <header className="tb-topbar">
          <h1 className="tb-brand">Endgame Tablebase</h1>
          <span className="tb-subtitle">Syzygy 7-piece Tables</span>
        </header>

        <div className="tb-content">
          {/* LEFT: Board */}
          <div className="tb-board-section">
            <div className="tb-board-wrapper">
              <Chessboard
                position={game.fen()}
                onPieceDrop={onDrop}
                onSquareClick={onSquareClick}
                customSquareStyles={optionSquares}
                customDarkSquareStyle={{ backgroundColor: '#272a2e' }}
                customLightSquareStyle={{ backgroundColor: '#3d4147' }}
                animationDuration={200}
              />
            </div>

            {/* FEN input */}
            <div className="tb-fen-row">
              <input
                type="text"
                className="tb-fen-input"
                placeholder="Paste FEN..."
                value={fenInput}
                onChange={(e) => setFenInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadFen()}
              />
              <button className="tb-btn" onClick={loadFen}>
                Load
              </button>
              <button className="tb-btn tb-btn--secondary" onClick={resetBoard}>
                Reset
              </button>
            </div>

            {/* Presets */}
            <div className="tb-presets">
              <h4 className="tb-presets-header">PRESETS</h4>
              <div className="tb-presets-grid">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    className="tb-preset-btn"
                    onClick={() => loadPreset(p.fen)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Move history */}
            {moveHistory.length > 0 && (
              <div className="tb-history">
                {moveHistory.map((m, i) => (
                  <span key={i} className="tb-history-move">
                    {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ''}
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Tablebase results */}
          <div className="tb-results-section">
            {/* Piece count */}
            <div className="tb-info-bar">
              <span className="tb-piece-count">
                ♔ {pieceCount} pieces on board
              </span>
              {pieceCount > 7 && (
                <span className="tb-piece-warning">⚠ Max 7 pieces for tablebase</span>
              )}
            </div>

            {/* Position verdict */}
            {resultInfo && (
              <div className={`tb-verdict ${resultInfo.className}`}>
                <div className="tb-verdict-label">Position Result</div>
                <div className="tb-verdict-text">{resultInfo.text}</div>
                {tbData.dtz != null && (
                  <div className="tb-verdict-dtz">
                    DTZ: {tbData.dtz} • DTM: {tbData.dtm ?? '—'}
                  </div>
                )}
              </div>
            )}

            {loading && (
              <div className="tb-loading">
                <div className="tb-spinner" />
                <span>Looking up tablebase...</span>
              </div>
            )}

            {error && <div className="tb-error">{error}</div>}

            {/* Moves table */}
            {tbData?.moves?.length > 0 && (
              <div className="tb-moves-panel">
                <h4 className="tb-moves-title">ALL MOVES</h4>
                <table className="tb-moves-table">
                  <thead>
                    <tr>
                      <th>Move</th>
                      <th>Result</th>
                      <th>DTZ</th>
                      <th>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tbData.moves.map((move, i) => (
                      <tr
                        key={i}
                        className={`tb-move-row ${getMoveCategory(move)}`}
                        onClick={() => {
                          // Play the move
                          try {
                            const g = new Chess(game.fen());
                            g.move(move.san);
                            setGame(g);
                            setMoveHistory(g.history());
                            setMoveFrom('');
                            setOptionSquares({});
                          } catch {
                            // fallback: try UCI
                            try {
                              const g = new Chess(game.fen());
                              g.move({
                                from: move.uci.substring(0, 2),
                                to: move.uci.substring(2, 4),
                                promotion: move.uci.length === 5 ? move.uci[4] : undefined,
                              });
                              setGame(g);
                              setMoveHistory(g.history());
                            } catch { /* skip */ }
                          }
                        }}
                      >
                        <td className="tb-move-san">{move.san}</td>
                        <td className="tb-move-result">{getMoveResultText(move)}</td>
                        <td className="tb-move-dtz">{move.dtz != null ? Math.abs(move.dtz) : '—'}</td>
                        <td className="tb-move-cat">
                          <span className={`tb-cat-badge ${getMoveCategory(move)}`}>
                            {move.category === 'win' || move.category === 'maybe-win'
                              ? '✓ Winning'
                              : move.category === 'loss' || move.category === 'maybe-loss'
                                ? '✗ Losing'
                                : '= Drawing'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Checkmate / Stalemate */}
            {tbData && !tbData.moves?.length && !loading && (
              <div className="tb-terminal">
                {game.isCheckmate()
                  ? '♚ Checkmate!'
                  : game.isStalemate()
                    ? '⚖ Stalemate'
                    : 'No moves available.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tablebase;
