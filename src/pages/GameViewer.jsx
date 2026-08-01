import { useState, useRef, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import Sidebar from '../components/Sidebar';
import { getGame } from '../services/lichess';
import '../styles/GameViewer.css';

const GameViewer = () => {
  const [gameId, setGameId] = useState('');
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Replay state
  const [moves, setMoves] = useState([]);
  const [positions, setPositions] = useState(['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Board sizing
  const boardContainerRef = useRef(null);
  const [boardSize, setBoardSize] = useState(400);

  // Auto-play
  const [autoPlaying, setAutoPlaying] = useState(false);
  const autoPlayRef = useRef(null);

  // Responsive board sizing
  useEffect(() => {
    const updateSize = () => {
      if (boardContainerRef.current) {
        const width = boardContainerRef.current.offsetWidth;
        setBoardSize(Math.min(width, 520));
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (boardContainerRef.current) observer.observe(boardContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Parse game ID from URL or raw input
  const parseGameId = (input) => {
    const trimmed = input.trim();
    // Handle full URLs like https://lichess.org/abcd1234 or https://lichess.org/abcd1234/black
    const urlMatch = trimmed.match(/lichess\.org\/(\w{8,12})/);
    if (urlMatch) return urlMatch[1];
    // Handle raw IDs
    const idMatch = trimmed.match(/^(\w{8,12})$/);
    if (idMatch) return idMatch[1];
    return trimmed;
  };

  const handleLoad = async () => {
    const id = parseGameId(gameId);
    if (!id) return;

    setLoading(true);
    setError(null);
    setAutoPlaying(false);

    try {
      const data = await getGame(id);
      setGameData(data);

      // Parse moves
      const chess = new Chess();
      const moveList = data.moves?.split(' ').filter(Boolean) || [];
      const positionList = [chess.fen()];
      const sanMoves = [];

      for (const move of moveList) {
        try {
          const result = chess.move(move);
          if (result) {
            sanMoves.push(result.san);
            positionList.push(chess.fen());
          }
        } catch {
          // Skip invalid moves
          break;
        }
      }

      setMoves(sanMoves);
      setPositions(positionList);
      setCurrentIdx(0);
    } catch (err) {
      console.error('Game fetch error:', err);
      setError(`Could not load game. Make sure the ID is correct.`);
      setGameData(null);
    } finally {
      setLoading(false);
    }
  };

  // Navigation
  const goTo = useCallback((idx) => {
    setCurrentIdx(Math.max(0, Math.min(idx, positions.length - 1)));
  }, [positions.length]);

  const goFirst = () => { goTo(0); setAutoPlaying(false); };
  const goPrev = () => { goTo(currentIdx - 1); setAutoPlaying(false); };
  const goNext = () => goTo(currentIdx + 1);
  const goLast = () => { goTo(positions.length - 1); setAutoPlaying(false); };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Home') goFirst();
      if (e.key === 'End') goLast();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  // Auto-play
  useEffect(() => {
    if (autoPlaying) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIdx((prev) => {
          if (prev >= positions.length - 1) {
            setAutoPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [autoPlaying, positions.length]);

  const toggleAutoPlay = () => {
    if (currentIdx >= positions.length - 1) {
      setCurrentIdx(0);
      setAutoPlaying(true);
    } else {
      setAutoPlaying(!autoPlaying);
    }
  };

  // Result formatting
  const getResultText = (status, winner) => {
    if (status === 'draw') return '½-½ Draw';
    if (status === 'stalemate') return '½-½ Stalemate';
    if (winner === 'white') return '1-0 White wins';
    if (winner === 'black') return '0-1 Black wins';
    if (status === 'resign') return winner === 'white' ? '1-0 Black resigned' : '0-1 White resigned';
    return status || '—';
  };

  // Format clock
  const formatClock = (clock) => {
    if (!clock) return '';
    const mins = Math.floor(clock.initial / 60);
    const inc = clock.increment;
    return `${mins}+${inc}`;
  };

  return (
    <div className="gv-layout">
      <Sidebar />
      <div className="gv-main">
        <header className="gv-topbar">
          <h1 className="gv-brand">Game Viewer</h1>
          <span className="gv-subtitle">Replay any Lichess game</span>
        </header>

        {/* Search Bar */}
        <div className="gv-search-wrap">
          <div className="gv-search-bar">
            <svg className="gv-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <path d="M8 12h8M12 8v8" />
            </svg>
            <input
              type="text"
              className="gv-search-input"
              placeholder="Paste Lichess game ID or URL..."
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
            />
            <button className="gv-search-btn" onClick={handleLoad} disabled={loading}>
              {loading ? 'Loading...' : 'Load Game'}
            </button>
          </div>
          <p className="gv-search-hint">
            Example: <code>TJxUmbWK</code> or <code>https://lichess.org/TJxUmbWK</code>
          </p>
        </div>

        {/* Content */}
        <div className="gv-content">
          {error && <div className="gv-error">{error}</div>}

          {gameData && (
            <div className="gv-game-area">
              {/* Board Section */}
              <div className="gv-board-section">
                {/* Black player (top) */}
                <div className="gv-player-bar gv-player-bar--black">
                  <span className="gv-player-color gv-player-color--black" />
                  {gameData.players?.black?.user?.title && (
                    <span className="gv-title-badge">{gameData.players.black.user.title}</span>
                  )}
                  <span className="gv-player-name">
                    {gameData.players?.black?.user?.name || gameData.players?.black?.user?.id || 'Anonymous'}
                  </span>
                  <span className="gv-player-rating">
                    ({gameData.players?.black?.rating || '?'})
                  </span>
                </div>

                {/* Board */}
                <div className="gv-board-container" ref={boardContainerRef}>
                  <Chessboard
                    position={positions[currentIdx]}
                    boardWidth={boardSize}
                    arePiecesDraggable={false}
                    customDarkSquareStyle={{ backgroundColor: '#272a2e' }}
                    customLightSquareStyle={{ backgroundColor: '#3d4147' }}
                    animationDuration={200}
                  />
                </div>

                {/* White player (bottom) */}
                <div className="gv-player-bar gv-player-bar--white">
                  <span className="gv-player-color gv-player-color--white" />
                  {gameData.players?.white?.user?.title && (
                    <span className="gv-title-badge">{gameData.players.white.user.title}</span>
                  )}
                  <span className="gv-player-name">
                    {gameData.players?.white?.user?.name || gameData.players?.white?.user?.id || 'Anonymous'}
                  </span>
                  <span className="gv-player-rating">
                    ({gameData.players?.white?.rating || '?'})
                  </span>
                </div>

                {/* Navigation Controls */}
                <div className="gv-controls">
                  <button className="gv-nav-btn" onClick={goFirst} title="First">
                    ⏮
                  </button>
                  <button className="gv-nav-btn" onClick={goPrev} title="Previous">
                    ◀
                  </button>
                  <button className={`gv-nav-btn gv-nav-btn--play ${autoPlaying ? 'gv-nav-btn--active' : ''}`} onClick={toggleAutoPlay} title={autoPlaying ? 'Pause' : 'Play'}>
                    {autoPlaying ? '⏸' : '▶'}
                  </button>
                  <button className="gv-nav-btn" onClick={goNext} title="Next">
                    ▶
                  </button>
                  <button className="gv-nav-btn" onClick={goLast} title="Last">
                    ⏭
                  </button>
                  <span className="gv-move-counter">
                    {currentIdx} / {positions.length - 1}
                  </span>
                </div>
              </div>

              {/* Info Panel */}
              <div className="gv-info-section">
                {/* Game Info */}
                <div className="gv-info-card">
                  <h4 className="gv-info-title">GAME INFO</h4>
                  <div className="gv-info-grid">
                    {gameData.clock && (
                      <div className="gv-info-item">
                        <span className="gv-info-label">Time Control</span>
                        <span className="gv-info-value">⏱ {formatClock(gameData.clock)}</span>
                      </div>
                    )}
                    {gameData.speed && (
                      <div className="gv-info-item">
                        <span className="gv-info-label">Speed</span>
                        <span className="gv-info-value">{gameData.speed}</span>
                      </div>
                    )}
                    {gameData.variant && (
                      <div className="gv-info-item">
                        <span className="gv-info-label">Variant</span>
                        <span className="gv-info-value">{gameData.variant}</span>
                      </div>
                    )}
                    <div className="gv-info-item">
                      <span className="gv-info-label">Result</span>
                      <span className={`gv-info-value gv-result ${gameData.winner === 'white' ? 'gv-result--white' : gameData.winner === 'black' ? 'gv-result--black' : 'gv-result--draw'}`}>
                        {getResultText(gameData.status, gameData.winner)}
                      </span>
                    </div>
                    {gameData.opening && (
                      <div className="gv-info-item gv-info-item--full">
                        <span className="gv-info-label">Opening</span>
                        <span className="gv-info-value">
                          {gameData.opening.eco} {gameData.opening.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <a
                    href={`https://lichess.org/${gameData.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gv-lichess-link"
                  >
                    View on Lichess →
                  </a>
                </div>

                {/* Move List */}
                <div className="gv-moves-panel">
                  <h4 className="gv-moves-title">MOVES</h4>
                  <div className="gv-move-list">
                    {moves.map((move, i) => (
                      <span
                        key={i}
                        className={`gv-move ${i + 1 === currentIdx ? 'gv-move--active' : ''}`}
                        onClick={() => goTo(i + 1)}
                      >
                        {i % 2 === 0 && (
                          <span className="gv-move-num">{Math.floor(i / 2) + 1}.</span>
                        )}
                        {move}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!gameData && !loading && !error && (
            <div className="gv-empty">
              <div className="gv-empty-icon">🎬</div>
              <h3>Replay a Lichess Game</h3>
              <p>
                Paste a Lichess game ID or URL above to load and replay the game
                move-by-move with full game info.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameViewer;
