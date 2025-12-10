import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import '../styles/PlayStockfish.css';

const PlayStockfish = () => {
  const [game, setGame] = useState(new Chess());
  const [gameActive, setGameActive] = useState(false);
  
  // Game Settings
  const [playerColor, setPlayerColor] = useState('white');
  const [difficulty, setDifficulty] = useState(5);
  const [isComputerThinking, setIsComputerThinking] = useState(false);

  // Navigation State
  // We store the full history of FENs to allow navigation
  const [history, setHistory] = useState([new Chess().fen()]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);

  // Refs for Worker Communication (Prevents stale closures)
  const gameRef = useRef(game);
  const stockfish = useRef(null);
  const playerColorRef = useRef(playerColor);
  const gameActiveRef = useRef(gameActive);

  // Sync refs with state
  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { playerColorRef.current = playerColor; }, [playerColor]);
  useEffect(() => { gameActiveRef.current = gameActive; }, [gameActive]);

  // --- Initialize Stockfish Worker ---
  useEffect(() => {
    stockfish.current = new Worker('/stockfish.js');
    
    stockfish.current.onmessage = (event) => {
      const message = event.data;
      if (message.startsWith('bestmove')) {
        const bestMove = message.split(' ')[1];
        if (bestMove && bestMove !== '(none)') {
          const from = bestMove.substring(0, 2);
          const to = bestMove.substring(2, 4);
          const promotion = bestMove.length > 4 ? bestMove[4] : 'q';
          
          // Execute computer move
          makeMove(from, to, promotion);
          setIsComputerThinking(false);
        }
      }
    };

    return () => stockfish.current.terminate();
  }, []); 

  // --- Game Logic ---

  const triggerStockfish = (gameInstance) => {
    if (!stockfish.current) return;
    stockfish.current.postMessage(`position fen ${gameInstance.fen()}`);
    stockfish.current.postMessage(`go depth ${difficulty}`);
  };

  const makeMove = useCallback((from, to, promotion = 'q') => {
    // 1. Create a clone of the current game state to apply the move
    const gameCopy = new Chess();
    // Load PGN to preserve move history (1. e4 e5...)
    gameCopy.loadPgn(gameRef.current.pgn()); 

    try {
      const move = gameCopy.move({ from, to, promotion });
      
      if (move) {
        setGame(gameCopy);
        
        // Update History
        const newHistory = [...history, gameCopy.fen()];
        setHistory(newHistory);
        setCurrentMoveIndex(newHistory.length - 1);

        // Check Game Over
        if (gameCopy.isGameOver()) {
          setGameActive(false);
          let msg = "Game Over";
          if (gameCopy.isCheckmate()) msg = `Checkmate! ${gameCopy.turn() === 'w' ? 'Black' : 'White'} wins!`;
          else if (gameCopy.isDraw()) msg = "Draw!";
          
          setTimeout(() => alert(msg), 100);
          return;
        }

        // If it's now the computer's turn, trigger it
        // We use Refs here to ensure we read the latest active state inside callbacks
        if (gameActiveRef.current && gameCopy.turn() !== playerColorRef.current[0]) {
          setIsComputerThinking(true);
          setTimeout(() => triggerStockfish(gameCopy), 500);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [history, difficulty]); 

  const onDrop = (sourceSquare, targetSquare) => {
    // 1. Basic checks
    if (!gameActive || isComputerThinking) return false;
    
    // 2. Ensure it's player's turn
    if (game.turn() !== playerColor[0]) return false;

    // 3. Ensure we are in "Live" mode (not reviewing history)
    if (currentMoveIndex !== history.length - 1) {
      alert("You are reviewing past moves. Click 'Live' to play.");
      return false;
    }

    // 4. Attempt Move logic (Optimistic UI update)
    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn());

    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move) {
        makeMove(sourceSquare, targetSquare, 'q'); // Call main handler
        return true;
      }
    } catch (e) { return false; }
    return false;
  };

  // --- Controls ---

  const startGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setGameActive(true);
    // Reset history
    const startFen = newGame.fen();
    setHistory([startFen]);
    setCurrentMoveIndex(0);
    
    setIsComputerThinking(false);

    // If player chose black, computer moves first
    if (playerColor === 'black') {
      setIsComputerThinking(true);
      setTimeout(() => triggerStockfish(newGame), 500);
    }
  };

  const handleResign = () => {
    if (!gameActive) return;
    setGameActive(false);
    alert("You resigned. Stockfish wins!");
  };

  // --- PGN Cleaning Helper ---
  const getMovesOnly = (pgnString) => {
    // Regex to remove [Header "Value"] blocks
    let moves = pgnString.replace(/\[.*?\]\s*/g, '').trim();
    // Remove standalone result asterisk if it exists alone
    if (moves === "*") return "";
    return moves;
  };

  const getCleanPgnDisplay = () => {
    if (history.length <= 1) return "Moves will appear here...";
    return getMovesOnly(game.pgn());
  };

  const handleCopyPgn = () => {
    const cleanPgn = getMovesOnly(game.pgn());
    navigator.clipboard.writeText(cleanPgn);
    alert("Moves copied to clipboard!");
  };

  // --- Navigation Handlers ---
  const navFirst = () => setCurrentMoveIndex(0);
  const navPrev = () => setCurrentMoveIndex(prev => Math.max(0, prev - 1));
  const navNext = () => setCurrentMoveIndex(prev => Math.min(history.length - 1, prev + 1));
  const navLast = () => setCurrentMoveIndex(history.length - 1);
  const navStop = () => setCurrentMoveIndex(history.length - 1); // Live

  // Determine display position (History vs Live)
  const displayPosition = history[currentMoveIndex] || game.fen();

  return (
    <div className="stockfish-container">
      <h1>Play Chess Against Stockfish</h1>

      <div className="controls">
        <div className="control-group">
          <label>Choose Color</label>
          <select 
            value={playerColor} 
            onChange={(e) => setPlayerColor(e.target.value)}
            disabled={gameActive}
          >
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </div>
        <div className="control-group">
          <label>Difficulty</label>
          <select 
            value={difficulty} 
            onChange={(e) => setDifficulty(parseInt(e.target.value))}
            disabled={gameActive}
          >
            <option value="1">Beginner</option>
            <option value="5">Intermediate</option>
            <option value="10">Advanced</option>
            <option value="15">Expert</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={startGame}>
          {gameActive ? 'Restart Game' : 'Start New Game'}
        </button>
      </div>

      <div className="main-section">
        <div className="board-wrapper">
          <div style={{ width: '500px', height: '500px' }}>
            <Chessboard 
              position={displayPosition} 
              onPieceDrop={onDrop}
              boardOrientation={playerColor}
              // Only allow drag if active, player's turn, and computer isn't thinking
              arePiecesDraggable={
                gameActive && 
                !isComputerThinking && 
                currentMoveIndex === history.length - 1 && // Must be in live view
                game.turn() === playerColor[0]
              }
              animationDuration={200}
            />
          </div>
          {isComputerThinking && <p style={{color: '#aaa', marginTop: '10px'}}>Stockfish is thinking...</p>}
        </div>

        <div className="pgn-container">
          <div className="pgn-display" style={{ whiteSpace: 'pre-wrap' }}>
            {getCleanPgnDisplay()}
          </div>
          
          <div className="pgn-navigation" style={{ marginBottom: '10px' }}>
            <button onClick={navFirst} disabled={currentMoveIndex === 0}>|◀</button>
            <button onClick={navPrev} disabled={currentMoveIndex === 0}>◀</button>
            <button onClick={navStop} title="Return to Live Game">Live</button>
            <button onClick={navNext} disabled={currentMoveIndex === history.length - 1}>▶</button>
            <button onClick={navLast} disabled={currentMoveIndex === history.length - 1}>▶|</button>
          </div>

          <div className="game-actions" style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
             <button className="btn" style={{flex: 1}} onClick={handleCopyPgn}>Copy PGN</button>
             <button className="btn btn-danger" style={{flex: 1}} onClick={handleResign} disabled={!gameActive}>
               Resign
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayStockfish;