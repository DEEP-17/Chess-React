import { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import '../styles/Evaluate.css';

const Evaluate = () => {
  const [game, setGame] = useState(new Chess());
  const [pgnInput, setPgnInput] = useState('');
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [history, setHistory] = useState([]);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  
  // Analysis State
  const [evalScore, setEvalScore] = useState(0); // 0 is equal, + is white advantage
  const [mateScore, setMateScore] = useState(null); // Moves to mate
  const [bestLine, setBestLine] = useState('');
  
  const stockfish = useRef(null);

  // 1. Initialize Stockfish Worker
  useEffect(() => {
    // Ensure stockfish.js is in your public folder!
    stockfish.current = new Worker('/stockfish.js');
    
    stockfish.current.onmessage = (event) => {
      const message = event.data;
      
      // Parse "score cp" (centipawns) or "score mate"
      if (message.startsWith('info') && message.includes('score')) {
        const cpMatch = message.match(/score cp (-?\d+)/);
        const mateMatch = message.match(/score mate (-?\d+)/);

        if (cpMatch) {
          const cp = parseInt(cpMatch[1]);
          // If it's black's turn to move in analysis, Stockfish gives score relative to mover.
          // We normalize to: Positive = White Winning, Negative = Black Winning.
          const score = game.turn() === 'w' ? cp : -cp;
          setEvalScore(score / 100); // Convert to pawns
          setMateScore(null);
        } else if (mateMatch) {
          const mate = parseInt(mateMatch[1]);
          setMateScore(mate);
        }
      }

      // Parse "pv" (Principal Variation - Best Line)
      if (message.startsWith('info') && message.includes('pv')) {
        const pvMatch = message.match(/ pv (.+)/);
        if (pvMatch) {
          setBestLine(pvMatch[1]);
        }
      }
    };

    return () => {
      stockfish.current.terminate();
    };
  }, [game]); // Re-bind if game instance drastically changes (though we usually mutate)

  // 2. Trigger Analysis when board updates
  useEffect(() => {
    if (stockfish.current) {
      stockfish.current.postMessage('stop');
      stockfish.current.postMessage(`position fen ${game.fen()}`);
      stockfish.current.postMessage('go depth 15');
    }
  }, [game]);

  // 3. Handle Board Moves (Manual play)
  function onDrop(sourceSquare, targetSquare) {
    console.log('Evaluate onDrop called', { sourceSquare, targetSquare, isViewingHistory });
    
    if (isViewingHistory) {
      setSelectedSquare(null);
      return false;
    }

    // Check if source square has a piece
    const piece = game.get(sourceSquare);
    if (!piece) {
      console.log('No piece on source square');
      setSelectedSquare(null);
      return false;
    }

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) {
        console.log('Invalid move');
        setSelectedSquare(null);
        return false;
      }

      console.log('Move successful:', move.san);

      setGame(gameCopy);
      setHistory(gameCopy.history());
      setCurrentMoveIndex(prev => prev + 1);
      setSelectedSquare(null);
      setIsViewingHistory(false);
      return true;
    } catch (error) {
      console.error('Move error:', error);
      setSelectedSquare(null);
      return false;
    }
  }

  function onSquareClick(square) {
    console.log('Evaluate onSquareClick called', { square, isViewingHistory, selectedSquare });
    
    if (isViewingHistory) {
      setSelectedSquare(null);
      return;
    }

    // If no square is selected, select this square if it has a piece
    if (!selectedSquare) {
      const piece = game.get(square);
      if (piece) {
        console.log('Selecting square:', square);
        setSelectedSquare(square);
      }
      return;
    }

    // If clicking the same square, deselect
    if (selectedSquare === square) {
      console.log('Deselecting square');
      setSelectedSquare(null);
      return;
    }

    // Try to make the move
    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: selectedSquare,
        to: square,
        promotion: 'q',
      });

      if (move) {
        console.log('Move successful via click:', move.san);
        setGame(gameCopy);
        setHistory(gameCopy.history());
        setCurrentMoveIndex(prev => prev + 1);
        setSelectedSquare(null);
        setIsViewingHistory(false);
      } else {
        console.log('Invalid move, trying to select new square');
        // Invalid move, try selecting the new square if it has a piece
        const piece = game.get(square);
        if (piece) {
          setSelectedSquare(square);
        } else {
          setSelectedSquare(null);
        }
      }
    } catch (e) {
      console.error('Move error via click:', e);
      setSelectedSquare(null);
    }
  }

  // 4. Load PGN
  const handleLoadPGN = () => {
    try {
      const newGame = new Chess();
      newGame.loadPgn(pgnInput);
      setGame(newGame);
      setHistory(newGame.history());
      setCurrentMoveIndex(newGame.history().length - 1);
    } catch (e) {
      alert('Invalid PGN');
    }
  };

  // 5. Navigation Logic (Replaying moves)
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
    setSelectedSquare(null);
  };

  const handleFirst = () => navigateToMove(-1);
  const handlePrev = () => {
    if (currentMoveIndex >= 0) navigateToMove(currentMoveIndex - 1);
  };
  const handleNext = () => {
    if (currentMoveIndex < history.length - 1) navigateToMove(currentMoveIndex + 1);
  };
  const handleLast = () => navigateToMove(history.length - 1);

  // 6. Calculate Bar Height (Visual)
  // Clamp score between -5 and +5 for visual display
  const getBarHeight = () => {
    if (mateScore !== null) {
      return mateScore > 0 ? '100%' : '0%'; // White mate = full bar, Black mate = empty
    }
    // Simple logistic-like curve or clamped linear for bar
    // 50% is 0.0. +5 is 95%, -5 is 5%.
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
              customSquareStyles={{
                ...(selectedSquare ? {
                  [selectedSquare]: {
                    background: 'rgba(255, 255, 0, 0.4)',
                  },
                } : {}),
              }}
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