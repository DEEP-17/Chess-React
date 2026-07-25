import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import Sidebar from '../components/Sidebar';
import { getOpeningExplorer } from '../services/lichess';
import '../styles/OpeningExplorer.css';

const OpeningExplorer = () => {
  const [game, setGame] = useState(new Chess());
  const [explorerData, setExplorerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);

  // Click-to-move state
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});

  // Fetch explorer data whenever the position changes
  const fetchExplorer = useCallback(async (fen) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOpeningExplorer(fen);
      setExplorerData(data);
    } catch (err) {
      console.error('Explorer fetch error:', err);
      setError('Could not load opening data for this position.');
      setExplorerData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExplorer(game.fen());
  }, [game, fetchExplorer]);

  // Get move options for click-to-move
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

  // Play a move from the explorer table by SAN
  function playExplorerMove(san) {
    try {
      const gameCopy = new Chess(game.fen());
      gameCopy.move(san);
      setGame(gameCopy);
      setMoveHistory(gameCopy.history());
      setMoveFrom('');
      setOptionSquares({});
    } catch (err) {
      console.error('Invalid explorer move:', err);
    }
  }

  // Navigate to a specific point in history
  function navigateTo(idx) {
    const g = new Chess();
    for (let i = 0; i <= idx; i++) g.move(moveHistory[i]);
    setGame(g);
    setMoveFrom('');
    setOptionSquares({});
  }

  function resetBoard() {
    setGame(new Chess());
    setMoveHistory([]);
    setMoveFrom('');
    setOptionSquares({});
  }

  // Calculate percentages for the moves table
  function getPercentages(move) {
    const total = move.white + move.draws + move.black;
    if (total === 0) return { white: 0, draws: 0, black: 0, total: 0 };
    return {
      white: ((move.white / total) * 100).toFixed(1),
      draws: ((move.draws / total) * 100).toFixed(1),
      black: ((move.black / total) * 100).toFixed(1),
      total,
    };
  }

  // Total games for current position
  const totalGames = explorerData
    ? (explorerData.white || 0) + (explorerData.draws || 0) + (explorerData.black || 0)
    : 0;

  const positionPercentages =
    totalGames > 0
      ? {
          white: ((explorerData.white / totalGames) * 100).toFixed(1),
          draws: ((explorerData.draws / totalGames) * 100).toFixed(1),
          black: ((explorerData.black / totalGames) * 100).toFixed(1),
        }
      : { white: 0, draws: 0, black: 0 };

  return (
    <div className="oe-layout">
      <Sidebar />
      <div className="oe-main">
        <header className="oe-topbar">
          <h1 className="oe-brand">Opening Explorer</h1>
          <span className="oe-subtitle">Master Games Database</span>
        </header>

        <div className="oe-content">
          {/* LEFT: Board */}
          <div className="oe-board-section">
            <div className="oe-board-wrapper">
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

            {/* Move history + nav */}
            <div className="oe-history-section">
              <div className="oe-move-list">
                {moveHistory.length === 0 ? (
                  <span className="oe-move-placeholder">Play a move to explore...</span>
                ) : (
                  moveHistory.map((m, i) => (
                    <span
                      key={i}
                      className={`oe-move ${i === moveHistory.length - 1 ? 'oe-move--active' : ''}`}
                      onClick={() => navigateTo(i)}
                    >
                      {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ''}
                      {m}
                    </span>
                  ))
                )}
              </div>
              <div className="oe-nav-buttons">
                <button className="oe-nav-btn" onClick={resetBoard} title="Reset">
                  ↺
                </button>
                <button
                  className="oe-nav-btn"
                  onClick={() => navigateTo(-1)}
                  title="Start"
                  disabled={moveHistory.length === 0}
                >
                  |◀
                </button>
                <button
                  className="oe-nav-btn"
                  onClick={() =>
                    moveHistory.length > 0 &&
                    navigateTo(
                      Math.max(
                        -1,
                        moveHistory.indexOf(
                          moveHistory[moveHistory.length - 1]
                        ) - 1
                      )
                    )
                  }
                  title="Back"
                  disabled={moveHistory.length === 0}
                >
                  ◀
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Explorer Data */}
          <div className="oe-explorer-section">
            {/* Opening Name */}
            {explorerData?.opening && (
              <div className="oe-opening-name">
                <span className="oe-opening-icon">📖</span>
                <div>
                  <div className="oe-opening-title">{explorerData.opening.name}</div>
                  {explorerData.opening.eco && (
                    <span className="oe-opening-eco">{explorerData.opening.eco}</span>
                  )}
                </div>
              </div>
            )}

            {/* Position stats bar */}
            {totalGames > 0 && (
              <div className="oe-position-stats">
                <div className="oe-stats-header">
                  <span>{totalGames.toLocaleString()} master games</span>
                </div>
                <div className="oe-stats-bar">
                  <div
                    className="oe-stats-bar-white"
                    style={{ width: `${positionPercentages.white}%` }}
                  >
                    {parseFloat(positionPercentages.white) > 10 && `${positionPercentages.white}%`}
                  </div>
                  <div
                    className="oe-stats-bar-draw"
                    style={{ width: `${positionPercentages.draws}%` }}
                  >
                    {parseFloat(positionPercentages.draws) > 10 && `${positionPercentages.draws}%`}
                  </div>
                  <div
                    className="oe-stats-bar-black"
                    style={{ width: `${positionPercentages.black}%` }}
                  >
                    {parseFloat(positionPercentages.black) > 10 && `${positionPercentages.black}%`}
                  </div>
                </div>
                <div className="oe-stats-legend">
                  <span className="oe-legend-item oe-legend-white">⬜ White {positionPercentages.white}%</span>
                  <span className="oe-legend-item oe-legend-draw">⬛ Draw {positionPercentages.draws}%</span>
                  <span className="oe-legend-item oe-legend-black">⬛ Black {positionPercentages.black}%</span>
                </div>
              </div>
            )}

            {/* Moves table */}
            <div className="oe-moves-panel">
              <div className="oe-moves-header">
                <h4>MOVES</h4>
                {loading && <div className="oe-mini-spinner" />}
              </div>

              {error && <div className="oe-error">{error}</div>}

              {!loading && explorerData?.moves?.length === 0 && (
                <div className="oe-no-data">
                  No master games found for this position.
                </div>
              )}

              {explorerData?.moves?.length > 0 && (
                <table className="oe-moves-table">
                  <thead>
                    <tr>
                      <th>Move</th>
                      <th>Games</th>
                      <th>White</th>
                      <th>Draw</th>
                      <th>Black</th>
                      <th className="oe-th-bar">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {explorerData.moves.map((move) => {
                      const pcts = getPercentages(move);
                      return (
                        <tr
                          key={move.san || move.uci}
                          className="oe-move-row"
                          onClick={() => playExplorerMove(move.san)}
                        >
                          <td className="oe-move-san">{move.san}</td>
                          <td className="oe-move-games">
                            {pcts.total.toLocaleString()}
                          </td>
                          <td className="oe-pct oe-pct-white">{pcts.white}%</td>
                          <td className="oe-pct oe-pct-draw">{pcts.draws}%</td>
                          <td className="oe-pct oe-pct-black">{pcts.black}%</td>
                          <td className="oe-mini-bar-cell">
                            <div className="oe-mini-bar">
                              <div
                                className="oe-mini-bar-w"
                                style={{ width: `${pcts.white}%` }}
                              />
                              <div
                                className="oe-mini-bar-d"
                                style={{ width: `${pcts.draws}%` }}
                              />
                              <div
                                className="oe-mini-bar-b"
                                style={{ width: `${pcts.black}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Top Games */}
            {explorerData?.topGames?.length > 0 && (
              <div className="oe-top-games">
                <h4 className="oe-top-games-header">TOP GAMES</h4>
                {explorerData.topGames.slice(0, 5).map((g, i) => (
                  <div key={i} className="oe-top-game-row">
                    <div className="oe-top-game-players">
                      <span className="oe-top-game-white">{g.white?.name || '?'}</span>
                      <span className="oe-top-game-vs">vs</span>
                      <span className="oe-top-game-black">{g.black?.name || '?'}</span>
                    </div>
                    <div className="oe-top-game-meta">
                      <span
                        className={`oe-top-game-result ${
                          g.winner === 'white'
                            ? 'oe-result-white'
                            : g.winner === 'black'
                              ? 'oe-result-black'
                              : 'oe-result-draw'
                        }`}
                      >
                        {g.winner === 'white' ? '1-0' : g.winner === 'black' ? '0-1' : '½-½'}
                      </span>
                      {g.year && <span className="oe-top-game-year">{g.year}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpeningExplorer;
