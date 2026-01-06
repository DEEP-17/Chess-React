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
  const [history, setHistory] = useState([new Chess().fen()]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);

  // Click-to-Move & Highlighting
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});

  // Refs
  const gameRef = useRef(game);
  const stockfish = useRef(null);
  const playerColorRef = useRef(playerColor);
  const gameActiveRef = useRef(gameActive);

  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { playerColorRef.current = playerColor; }, [playerColor]);
  useEffect(() => { gameActiveRef.current = gameActive; }, [gameActive]);

  // --- Initialize Stockfish Worker ---
  useEffect(() => {
    try {
      stockfish.current = new Worker('/stockfish.js');
      
      stockfish.current.onmessage = (event) => {
        const message = event.data;
        if (message.startsWith('bestmove')) {
          const bestMove = message.split(' ')[1];
          if (bestMove && bestMove !== '(none)') {
            const from = bestMove.substring(0, 2);
            const to = bestMove.substring(2, 4);
            const promotion = bestMove.length > 4 ? bestMove[4] : 'q';
            
            makeMove(from, to, promotion);
            setIsComputerThinking(false);
          }
        }
      };

      stockfish.current.postMessage('uci');
      stockfish.current.postMessage('isready');
    } catch (error) {
      console.error("Could not load Stockfish worker.", error);
    }

    return () => {
      if (stockfish.current) stockfish.current.terminate();
    };
  }, []); 

  // --- Game Logic ---
  const triggerStockfish = (gameInstance) => {
    if (!stockfish.current) return;
    stockfish.current.postMessage(`position fen ${gameInstance.fen()}`);
    stockfish.current.postMessage(`go depth ${difficulty}`);
  };

  const makeMove = useCallback((from, to, promotion = 'q') => {
    const gameCopy = new Chess();
    gameCopy.loadPgn(gameRef.current.pgn()); 

    try {
      const move = gameCopy.move({ from, to, promotion });
      
      if (move) {
        setGame(gameCopy);
        setMoveFrom('');
        setOptionSquares({});

        const newHistory = [...history, gameCopy.fen()];
        setHistory(newHistory);
        setCurrentMoveIndex(newHistory.length - 1);

        if (gameCopy.isGameOver()) {
          setGameActive(false);
          let msg = "Game Over";
          if (gameCopy.isCheckmate()) msg = `Checkmate! ${gameCopy.turn() === 'w' ? 'Black' : 'White'} wins!`;
          else if (gameCopy.isDraw()) msg = "Draw!";
          setTimeout(() => alert(msg), 100);
          return;
        }

        if (gameActiveRef.current && gameCopy.turn() !== playerColorRef.current[0]) {
          setIsComputerThinking(true);
          setTimeout(() => triggerStockfish(gameCopy), 250);
        }
      }
    } catch (e) {
      console.error(e);
      setIsComputerThinking(false);
    }
  }, [history, difficulty]); 

  const getMoveOptions = (square) => {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) { setOptionSquares({}); return false; }

    const newSquares = {};
    moves.map((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to) && game.get(move.to).color !== game.get(square).color
            ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(0,0,0,.2) 25%, transparent 25%)',
        borderRadius: '50%'
      };
      return move;
    });
    newSquares[square] = { background: 'rgba(255, 255, 0, 0.4)' };
    setOptionSquares(newSquares);
    return true;
  };

  const onSquareClick = (square) => {
    if (!gameActive || isComputerThinking) return;
    if (currentMoveIndex !== history.length - 1) return;

    if (optionSquares[square] && moveFrom) {
      makeMove(moveFrom, square);
      return;
    }
    if (moveFrom === square) { setMoveFrom(''); setOptionSquares({}); return; }
    const piece = game.get(square);
    if (piece && piece.color === playerColor[0]) {
      setMoveFrom(square);
      getMoveOptions(square);
      return;
    }
    setMoveFrom(''); setOptionSquares({});
  };

  const onDrop = (sourceSquare, targetSquare) => {
    if (!gameActive || isComputerThinking) return false;
    if (game.turn() !== playerColor[0]) return false;
    if (currentMoveIndex !== history.length - 1) {
      alert("You are reviewing past moves. Click 'Live' to play.");
      return false;
    }

    const moves = game.moves({ verbose: true });
    const isPromotion = moves.some(
      (m) => m.from === sourceSquare && m.to === targetSquare && m.promotion
    );

    if (isPromotion) return true;

    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn());
    try {
      const move = gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      if (move) {
        makeMove(sourceSquare, targetSquare, 'q');
        return true;
      }
    } catch (e) { return false; }
    return false;
  };

  const onPromotionPieceSelect = (piece, source, target) => {
    const promotion = piece[1].toLowerCase(); 
    makeMove(source, target, promotion);
    return true;
  };

  const startGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setGameActive(true);
    setHistory([newGame.fen()]);
    setCurrentMoveIndex(0);
    setIsComputerThinking(false);
    setMoveFrom('');
    setOptionSquares({});
    if (stockfish.current) stockfish.current.postMessage('ucinewgame');
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

  const getCleanPgnDisplay = () => {
    if (history.length <= 1) return "Moves will appear here...";
    let moves = game.pgn().replace(/\[.*?\]\s*/g, '').trim();
    if (moves === "*") return "";
    return moves;
  };

  const handleCopyPgn = () => {
    const cleanPgn = getCleanPgnDisplay();
    navigator.clipboard.writeText(cleanPgn);
    alert("Moves copied to clipboard!");
  };

  const navFirst = () => setCurrentMoveIndex(0);
  const navPrev = () => setCurrentMoveIndex(prev => Math.max(0, prev - 1));
  const navNext = () => setCurrentMoveIndex(prev => Math.min(history.length - 1, prev + 1));
  const navLast = () => setCurrentMoveIndex(history.length - 1);
  const navStop = () => setCurrentMoveIndex(history.length - 1);

  const displayPosition = history[currentMoveIndex] || game.fen();

  return (
    <div className="stockfish-root">
      <h1 className="stockfish-title">Play Against Stockfish</h1>

      <div className="stockfish-main">
        {/* LEFT: Board Wrapper */}
        <div className="stockfish-board-card">
          <div className="stockfish-board-wrapper">
            <Chessboard 
              position={displayPosition} 
              onPieceDrop={onDrop}
              onPromotionPieceSelect={onPromotionPieceSelect}
              boardOrientation={playerColor}
              onSquareClick={onSquareClick}
              customSquareStyles={optionSquares}
              arePiecesDraggable={
                gameActive && 
                !isComputerThinking && 
                currentMoveIndex === history.length - 1 &&
                game.turn() === playerColor[0]
              }
              animationDuration={200}
            />
          </div>
        </div>

        {/* RIGHT: Sidebar */}
        <div className="stockfish-sidebar">
          
          {/* Controls */}
          <div className="stockfish-sidebar-controls">
            <div className="sf-controls-row">
              <div className="sf-control-group">
                <label className="sf-label">Color</label>
                <select 
                  value={playerColor} 
                  onChange={(e) => setPlayerColor(e.target.value)}
                  disabled={gameActive}
                  className="sf-select"
                >
                  <option value="white">White</option>
                  <option value="black">Black</option>
                </select>
              </div>
              <div className="sf-control-group">
                <label className="sf-label">Skill Level</label>
                <select 
                  value={difficulty} 
                  onChange={(e) => setDifficulty(parseInt(e.target.value))}
                  disabled={gameActive}
                  className="sf-select"
                >
                  <option value="1">Beginner</option>
                  <option value="5">Intermediate</option>
                  <option value="10">Advanced</option>
                  <option value="15">Expert</option>
                </select>
              </div>
            </div>
            
            <button className="sf-btn sf-btn-primary" onClick={startGame}>
              {gameActive ? 'Restart Game' : 'Start New Game'}
            </button>
          </div>

          {/* PGN Box */}
          <div className="stockfish-pgn-box">
            {getCleanPgnDisplay()}
          </div>
          
          {/* Navigation */}
          <div className="stockfish-nav-buttons">
            <button onClick={navFirst} disabled={currentMoveIndex === 0} className="sf-btn-small sf-nav-btn sf-nav-btn-first">|◀</button>
            <button onClick={navPrev} disabled={currentMoveIndex === 0} className="sf-btn-small sf-nav-btn sf-nav-btn-prev">◀</button>
            <button onClick={navStop} title="Live" className="sf-btn-small sf-nav-btn sf-nav-btn-live">Live</button>
            <button onClick={navNext} disabled={currentMoveIndex === history.length - 1} className="sf-btn-small sf-nav-btn sf-nav-btn-next">▶</button>
            <button onClick={navLast} disabled={currentMoveIndex === history.length - 1} className="sf-btn-small sf-nav-btn sf-nav-btn-last">▶|</button>
          </div>

          {/* Actions */}
          <div className="stockfish-actions">
             <button className="sf-btn-action sf-btn-copy" onClick={handleCopyPgn}>Copy PGN</button>
             <button className="sf-btn-action sf-btn-resign" onClick={handleResign} disabled={!gameActive}>
               Resign
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayStockfish;