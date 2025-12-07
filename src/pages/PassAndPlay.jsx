import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import '../styles/PassAndPlay.css';

const PassAndPlay = () => {
  // 1. Using the pattern from your video (Direct State)
  const [game, setGame] = useState(new Chess());
  
  // Game Status State
  const [gameActive, setGameActive] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState('white');
  
  // Timers
  const [whiteTime, setWhiteTime] = useState(300);
  const [blackTime, setBlackTime] = useState(300);
  const [initialTime, setInitialTime] = useState(5);

  // --- Move Logic (The Video Pattern) ---
  const onDrop = (sourceSquare, targetSquare) => {
    // Prevent moves if game isn't active
    if (!gameActive) return false;

    try {
      // 1. Create a copy of the game state to attempt the move
      // We don't mutate 'game' directly until we know it's valid
      const gameCopy = new Chess(game.fen());

      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to queen for simplicity
      });

      // 2. If move is valid, update the state with the NEW game instance
      if (move) {
        setGame(new Chess(gameCopy.fen())); // This forces the re-render!
        
        // Flip board for Pass & Play
        setBoardOrientation(gameCopy.turn() === 'w' ? 'white' : 'black');

        // Check for Game Over
        if (gameCopy.isGameOver()) {
          setGameActive(false);
          if (gameCopy.isCheckmate()) alert("Checkmate!");
          else if (gameCopy.isDraw()) alert("Draw!");
          else alert("Game Over");
        }
        return true;
      }
    } catch (error) {
      return false;
    }
    return false;
  };

  // --- Game Controls ---
  const startGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setGameActive(true);
    setBoardOrientation('white');
    setWhiteTime(initialTime * 60);
    setBlackTime(initialTime * 60);
  };

  const handleResign = (color) => {
    if (!gameActive) return;
    setGameActive(false);
    alert(`${color} resigns!`);
  };

  // --- Timer Logic ---
  useEffect(() => {
    let interval = null;
    if (gameActive) {
      interval = setInterval(() => {
        // We check the turn directly from the game state
        if (game.turn() === 'w') {
          setWhiteTime(t => {
            if (t <= 0) { setGameActive(false); return 0; }
            return t - 1;
          });
        } else {
          setBlackTime(t => {
            if (t <= 0) { setGameActive(false); return 0; }
            return t - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameActive, game]); // Dependency on 'game' ensures timer switches when turn switches

  // Helper for time format
  const formatTime = (t) => {
    const m = Math.floor(t / 60).toString().padStart(2, '0');
    const s = (t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="pass-play-container">
      <h1>Pass and Play</h1>

      <div className="controls">
        <div className="time-input-group">
          <label>Time (min):</label>
          <input
            type="number"
            value={initialTime}
            onChange={(e) => setInitialTime(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={gameActive}
          />
        </div>
        <button className="btn btn-primary" onClick={startGame}>
          {gameActive ? 'Restart Game' : 'Start New Game'}
        </button>
      </div>

      <div className="main-section">
        <div className="board-wrapper">
          
          <div className={`clock ${game.turn() === 'b' ? 'active' : ''}`}>
            Black: {formatTime(blackTime)}
          </div>

          <div style={{ width: '500px', height: '500px' }}>
            <Chessboard
              id="PassPlayBoard"
              position={game.fen()} 
              onPieceDrop={onDrop}
              boardOrientation={boardOrientation}
              // Force draggable if game is active
              arePiecesDraggable={gameActive}
              animationDuration={200}
            />
          </div>

          <div className={`clock ${game.turn() === 'w' ? 'active' : ''}`}>
            White: {formatTime(whiteTime)}
          </div>

        </div>

        <div className="pgn-container">
          <div className="pgn-display">
            {game.pgn() || "Moves will appear here..."}
          </div>
          <div className="game-actions">
             <button className="btn-danger" onClick={() => handleResign('White')}>White Resign</button>
             <button className="btn-danger" onClick={() => handleResign('Black')}>Black Resign</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassAndPlay;