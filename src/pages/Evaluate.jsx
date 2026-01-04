import { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import '../styles/Evaluate.css';

const Evaluate = () => {
  const [game, setGame] = useState(new Chess());
  const [pgnInput, setPgnInput] = useState('');
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [history, setHistory] = useState([]);
  
  // Selection & Highlighting State
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  
  // Analysis State
  const [evalScore, setEvalScore] = useState(0); // 0 is equal, + is white advantage
  const [mateScore, setMateScore] = useState(null); // Moves to mate
  const [bestLine, setBestLine] = useState('');
  
  const stockfish = useRef(null);

  // 1. Initialize Stockfish Worker
  useEffect(() => {
    try {
      stockfish.current = new Worker('/stockfish.js');
      
      stockfish.current.onmessage = (event) => {
        const message = event.data;
        
        // Parse "score cp" or "score mate"
        if (message.startsWith('info') && message.includes('score')) {
          const cpMatch = message.match(/score cp (-?\d+)/);
          const mateMatch = message.match(/score mate (-?\d+)/);

          if (cpMatch) {
            const cp = parseInt(cpMatch[1]);
            const score = game.turn() === 'w' ? cp : -cp;
            setEvalScore(score / 100);
            setMateScore(null);
          } else if (mateMatch) {
            const mate = parseInt(mateMatch[1]);
            setMateScore(mate);
          }
        }

        // Parse "pv" (Principal Variation)
        if (message.startsWith('info') && message.includes('pv')) {
          const pvMatch = message.match(/ pv (.+)/);
          if (pvMatch) {
            setBestLine(pvMatch[1]);
          }
        }
      };
      
      stockfish.current.postMessage('uci');
      stockfish.current.postMessage('isready');
    } catch (error) {
      console.error("Stockfish failed to load", error);
    }

    return () => {
      if (stockfish.current) stockfish.current.terminate();
    };
  }, []); // Run once on mount

  // 2. Trigger Analysis when board updates
  useEffect(() => {
    if (stockfish.current) {
      stockfish.current.postMessage('stop');
      stockfish.current.postMessage(`position fen ${game.fen()}`);
      stockfish.current.postMessage('go depth 15');
    }
  }, [game]);

  // --- Helper: Make a move safely ---
  function safeGameMutate(modify) {
    setGame((g) => {
      const update = new Chess(g.fen());
      modify(update);
      return update;
    });
  }

  // --- Helper: Calculate Legal Moves for Highlighting ---
  function getMoveOptions(square) {
    const moves = game.moves({
      square,
      verbose: true
    });

    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

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
    
    newSquares[square] = {
      background: 'rgba(255, 255, 0, 0.4)' // Highlight selected piece
    };
    
    setOptionSquares(newSquares);
    return true;
  }

  // 3. Handle Board Moves (Drag & Drop)
  function onDrop(sourceSquare, targetSquare) {
    if (isViewingHistory) return false;

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;

      setGame(gameCopy);
      setHistory(gameCopy.history());
      setCurrentMoveIndex(prev => prev + 1);
      
      // Clear highlights
      setMoveFrom('');
      setOptionSquares({});
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // 4. Handle Click-to-Move
  function onSquareClick(square) {
    if (isViewingHistory) return;

    // A. If clicking a legal move target -> Make Move
    if (optionSquares[square] && moveFrom) {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: moveFrom,
        to: square,
        promotion: 'q'
      });

      if (move) {
        setGame(gameCopy);
        setHistory(gameCopy.history());
        setCurrentMoveIndex(prev => prev + 1);
        setMoveFrom('');
        setOptionSquares({});
        return;
      }
    }

    // B. If clicking same square -> Deselect
    if (moveFrom === square) {
      setMoveFrom('');
      setOptionSquares({});
      return;
    }

    // C. If clicking a piece -> Select it
    const piece = game.get(square);
    if (piece) {
      setMoveFrom(square);
      getMoveOptions(square);
      return;
    }

    // D. Clicking empty/invalid -> Deselect
    setMoveFrom('');
    setOptionSquares({});
  }

  // 5. Load PGN
  const handleLoadPGN = () => {
    try {
      const newGame = new Chess();
      newGame.loadPgn(pgnInput);
      setGame(newGame);
      setHistory(newGame.history());
      setCurrentMoveIndex(newGame.history().length - 1);
      setMoveFrom('');
      setOptionSquares({});
      setIsViewingHistory(false);
    } catch (e) {
      alert('Invalid PGN');
    }
  };

  // 6. Navigation Logic (Replaying moves)
  const navigateToMove = (index) => {
    const newGame = new Chess();
    // Replay moves up to the specific index
    for (let i = 0; i <= index; i++) {
      if (history[i]) {
        newGame.move(history[i]);
      }
    }
    setGame(newGame);
    setCurrentMoveIndex(index);
    setIsViewingHistory(index < history.length - 1);
    setMoveFrom('');
    setOptionSquares({});
  };

  const handleFirst = () => navigateToMove(-1);
  const handlePrev = () => {
    if (currentMoveIndex >= 0) navigateToMove(currentMoveIndex - 1);
  };
  const handleNext = () => {
    if (currentMoveIndex < history.length - 1) navigateToMove(currentMoveIndex + 1);
  };
  const handleLast = () => navigateToMove(history.length - 1);

  // 7. Calculate Bar Height (Visual)
  const getBarHeight = () => {
    if (mateScore !== null) {
      return mateScore > 0 ? '100%' : '0%';
    }
    const clampedScore = Math.max(-5, Math.min(5, evalScore));
    const percentage = 50 + (clampedScore * 10); 
    return `${percentage}%`;
  };

  return (
    <div className="evaluate-container">
      <div className="evaluate-header">
        <h1>Chess Analysis Board</h1>
      </div>

      <div className="input-section">
        <textarea
          rows="4"
          placeholder="Paste your PGN notation here..."
          value={pgnInput}
          onChange={(e) => setPgnInput(e.target.value)}
        />
        <button onClick={handleLoadPGN}>Load PGN</button>
      </div>

      <div className="main-section">
        <div className="board-wrapper">
          {/* Evaluation Bar */}
          <div className="eval-bar-container">
            <div 
              className="eval-bar-fill" 
              style={{ height: getBarHeight() }}
            >
              <span className="eval-score">
                {mateScore ? `M${Math.abs(mateScore)}` : evalScore.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Chess Board */}
          <div style={{ width: '560px', height: '560px' }}>
            <Chessboard 
              position={game.fen()} 
              onPieceDrop={onDrop}
              onSquareClick={onSquareClick}
              arePiecesDraggable={() => !isViewingHistory}
              boardWidth={560}
              customDarkSquareStyle={{ backgroundColor: '#779954' }}
              customLightSquareStyle={{ backgroundColor: '#e9edcc' }}
              
              // Apply the custom styles for dots and selection
              customSquareStyles={optionSquares}
            />
          </div>
        </div>

        {/* PGN & Controls */}
        <div className="pgn-section">
          <div className="pgn-display">
            {history.map((move, i) => (
              <span key={i} style={{ 
                fontWeight: i === currentMoveIndex ? 'bold' : 'normal',
                backgroundColor: i === currentMoveIndex ? '#4CAF50' : 'transparent',
                padding: '0 4px'
              }}>
                {i % 2 === 0 ? `${Math.floor(i/2) + 1}.` : ''} {move}{' '}
              </span>
            ))}
            {history.length === 0 && "Game moves will appear here..."}
          </div>
          <div className="pgn-navigation">
            <button onClick={handleFirst}>|◀</button>
            <button onClick={handlePrev}>◀</button>
            <button onClick={handleNext}>▶</button>
            <button onClick={handleLast}>▶|</button>
          </div>
        </div>
      </div>

      {/* Engine Analysis Output */}
      <div className="analysis-section">
        <h3>Engine Analysis</h3>
        <table className="engine-analysis">
          <thead>
            <tr>
              <th>Evaluation</th>
              <th>Best Line (PV)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {mateScore 
                  ? `Mate in ${Math.abs(mateScore)}` 
                  : evalScore > 0 ? `+${evalScore}` : evalScore}
              </td>
              <td>{bestLine}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Evaluate;