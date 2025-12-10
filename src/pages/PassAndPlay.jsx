import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import '../styles/PassAndPlay.css';

const PassAndPlay = () => {
  const [game, setGame] = useState(new Chess());
  const [gameActive, setGameActive] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState('white');

  // Timers
  const [whiteTime, setWhiteTime] = useState(300);
  const [blackTime, setBlackTime] = useState(300);
  const [initialTime, setInitialTime] = useState(5);

  // Navigation State
  const [history, setHistory] = useState([new Chess().fen()]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);

  const applyMove = (from, to, promotion) => {
    try {
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());

      const moveConfig = { from, to };
      if (promotion) moveConfig.promotion = promotion;

      const move = gameCopy.move(moveConfig);
      if (!move) return false;

      setGame(gameCopy);
      setBoardOrientation(gameCopy.turn() === 'w' ? 'white' : 'black');

      const newHistory = [...history, gameCopy.fen()];
      setHistory(newHistory);
      setCurrentMoveIndex(newHistory.length - 1);

      if (gameCopy.isGameOver()) {
        setGameActive(false);
        let result = 'Game Over';
        if (gameCopy.isCheckmate()) result = 'Checkmate!';
        else if (gameCopy.isDraw()) result = 'Draw!';
        alert(result);
      }

      return true;
    } catch (err) {
      console.error('Move error', err);
      return false;
    }
  };

  const isPromotionMove = (sourceSquare, targetSquare, piece) => {
    if (!piece) return false;
    const color = piece[0];
    const type = piece[1];
    if (type !== 'P') return false;

    const fromRank = sourceSquare[1];
    const toRank = targetSquare[1];
    const isForwardOneOrDiag =
      Math.abs(sourceSquare.charCodeAt(0) - targetSquare.charCodeAt(0)) <= 1;

    if (
      (color === 'w' && fromRank === '7' && toRank === '8' && isForwardOneOrDiag) ||
      (color === 'b' && fromRank === '2' && toRank === '1' && isForwardOneOrDiag)
    ) {
      return true;
    }
    return false;
  };

  const onDrop = (sourceSquare, targetSquare, piece) => {
    if (!gameActive) return false;
    if (currentMoveIndex !== history.length - 1) {
      alert("You are reviewing past moves. Click 'Live' to resume playing.");
      return false;
    }

    if (isPromotionMove(sourceSquare, targetSquare, piece)) {
      // Let react-chessboard show the square promotion UI
      return true;
    }

    return applyMove(sourceSquare, targetSquare);
  };

  const onPromotionPieceSelect = (piece, fromSquare, toSquare) => {
    const promotionType = piece[1].toLowerCase(); // 'q','r','b','n'
    return applyMove(fromSquare, toSquare, promotionType);
  };

  const startGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setGameActive(true);
    setBoardOrientation('white');
    setWhiteTime(initialTime * 60);
    setBlackTime(initialTime * 60);
    const startFen = newGame.fen();
    setHistory([startFen]);
    setCurrentMoveIndex(0);
  };

  const handleResign = (color) => {
    if (!gameActive) return;
    setGameActive(false);
    alert(`${color} resigns!`);
  };

  const getMovesOnly = (pgnString) => {
    return pgnString.replace(/\[.*?\]\s*/g, '').trim();
  };

  const getCleanPgnDisplay = () => {
    if (history.length <= 1) return 'Moves will appear here...';
    return getMovesOnly(game.pgn());
  };

  const handleCopyPgn = () => {
    const cleanPgn = getMovesOnly(game.pgn());
    navigator.clipboard.writeText(cleanPgn);
    alert('Moves copied to clipboard!');
  };

  const navFirst = () => setCurrentMoveIndex(0);
  const navPrev = () =>
    setCurrentMoveIndex((prev) => Math.max(0, prev - 1));
  const navNext = () =>
    setCurrentMoveIndex((prev) => Math.min(history.length - 1, prev + 1));
  const navLast = () => setCurrentMoveIndex(history.length - 1);
  const navStop = () => setCurrentMoveIndex(history.length - 1);

  useEffect(() => {
    let interval = null;
    if (gameActive && currentMoveIndex === history.length - 1) {
      interval = setInterval(() => {
        if (game.turn() === 'w') {
          setWhiteTime((t) => (t > 0 ? t - 1 : 0));
        } else {
          setBlackTime((t) => (t > 0 ? t - 1 : 0));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameActive, game, currentMoveIndex]);

  const formatTime = (t) =>
    `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`;

  const displayPosition = history[currentMoveIndex];

  return (
    <div className="passplay-root">
      <h1 className="passplay-title">Pass and Play</h1>

      <div className="passplay-main">
        <div className="passplay-board-card">
          <div className="passplay-clocks">
            <div
              className={
                'pp-clock pp-clock-white ' +
                (game.turn() === 'w' ? 'pp-clock-active-white' : '')
              }
            >
              ⚪ White: {formatTime(whiteTime)}
            </div>

            <div
              className={
                'pp-clock pp-clock-black ' +
                (game.turn() === 'b' ? 'pp-clock-active-black' : '')
              }
            >
              ⚫ Black: {formatTime(blackTime)}
            </div>
          </div>

          <div className="passplay-board-wrapper">
            <Chessboard
              id="PassPlayBoard"
              position={displayPosition}
              onPieceDrop={onDrop}
              onPromotionPieceSelect={onPromotionPieceSelect}
              autoPromoteToQueen={false}
              boardOrientation={boardOrientation}
              arePiecesDraggable={
                gameActive && currentMoveIndex === history.length - 1
              }
              animationDuration={200}
            />
          </div>
        </div>

        <div className="passplay-sidebar">
          {/* ⏱ Time controls now inside sidebar */}
          <div className="passplay-sidebar-controls">
            <div className="passplay-time-input">
              <label className="passplay-time-label">Time (min):</label>
              <input
                type="number"
                value={initialTime}
                onChange={(e) =>
                  setInitialTime(Math.max(1, parseInt(e.target.value) || 1))
                }
                disabled={gameActive}
                className="passplay-time-input-field"
              />
            </div>
            <button
              onClick={startGame}
              className="pp-btn pp-btn-primary"
            >
              {gameActive ? 'Restart Game' : 'Start New Game'}
            </button>
          </div>

          <div className="passplay-pgn-box">{getCleanPgnDisplay()}</div>

          <div className="passplay-nav-buttons">
            <button
              onClick={navFirst}
              disabled={currentMoveIndex === 0}
              className="pp-btn-small pp-nav-btn pp-nav-btn-first"
            >
              |◀
            </button>

            <button
              onClick={navPrev}
              disabled={currentMoveIndex === 0}
              className="pp-btn-small pp-nav-btn pp-nav-btn-prev"
            >
              ◀
            </button>

            <button
              onClick={navStop}
              className="pp-btn-small pp-nav-btn pp-nav-btn-live"
            >
              Live
            </button>

            <button
              onClick={navNext}
              disabled={currentMoveIndex === history.length - 1}
              className="pp-btn-small pp-nav-btn pp-nav-btn-next"
            >
              ▶
            </button>

            <button
              onClick={navLast}
              disabled={currentMoveIndex === history.length - 1}
              className="pp-btn-small pp-nav-btn pp-nav-btn-last"
            >
              ▶|
            </button>
          </div>

          <div className="passplay-actions">
            <button
              onClick={handleCopyPgn}
              className="pp-btn-action pp-btn-copy"
            >
              Copy Moves
            </button>

            <button
              onClick={() => handleResign('White')}
              className="pp-btn-action pp-btn-resign"
            >
              White Resign
            </button>

            <button
              onClick={() => handleResign('Black')}
              className="pp-btn-action pp-btn-resign"
            >
              Black Resign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassAndPlay;
