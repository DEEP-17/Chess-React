import { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import '../styles/PlayStockfish.css';

const moveSound = new Audio('/sounds/move.mp3');
const captureSound = new Audio('/sounds/capture.mp3');
const checkSound = new Audio('/sounds/check.mp3');
const endSound = new Audio('/sounds/end.mp3');
const startSound = new Audio('/sounds/start.mp3');

const PlayStockfish = () => {
  const [game, setGame] = useState(new Chess());
  const [gameActive, setGameActive] = useState(false);
  const [playerColor, setPlayerColor] = useState('white');
  const [difficulty, setDifficulty] = useState(5);
  const [moveHistory, setMoveHistory] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [viewOnlyPosition, setViewOnlyPosition] = useState(null);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [isComputerThinking, setIsComputerThinking] = useState(false);

  const stockfish = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      try {
        stockfish.current = new Worker('/stockfish.js');
        stockfish.current.onmessage = handleStockfishMessage;
      } catch (error) {
        console.error('Failed to load Stockfish worker:', error);
      }
    }

    return () => {
      if (stockfish.current) {
        stockfish.current.terminate();
      }
    };
  }, []);

  const handleStockfishMessage = (event) => {
    const message = event.data;

    if (message.startsWith('bestmove')) {
      const parts = message.split(' ');
      const bestMove = parts[1];

      if (bestMove && bestMove !== '(none)') {
        const from = bestMove.substring(0, 2);
        const to = bestMove.substring(2, 4);
        const promotion = bestMove.length > 4 ? bestMove[4] : undefined;

        setTimeout(() => {
          executeMove(from, to, promotion);
        }, 300);
      }
      setIsComputerThinking(false);
    }
  };

  const startGame = () => {
    try {
      startSound.play().catch(() => {});
    } catch (e) {
      console.log('Sound play failed');
    }

    const newGame = new Chess();
    setGame(newGame);
    gameRef.current = newGame;
    setGameActive(true);
    setMoveHistory([]);
    setCurrentMoveIndex(-1);
    setViewOnlyPosition(null);
    setSelectedSquare(null);

    if (playerColor === 'black') {
      setIsComputerThinking(true);
      setTimeout(() => {
        triggerStockfish(newGame);
      }, 500);
    }
  };

  const triggerStockfish = (gameInstance) => {
    if (!stockfish.current) return;

    try {
      stockfish.current.postMessage(`position fen ${gameInstance.fen()}`);
      stockfish.current.postMessage(`go depth ${difficulty}`);
    } catch (error) {
      console.error('Failed to trigger Stockfish:', error);
    }
  };

  const executeMove = (from, to, promotion = 'q') => {
    setGame((prevGame) => {
      const gameCopy = new Chess(prevGame.fen());

      try {
        const move = gameCopy.move({
          from,
          to,
          promotion: promotion || 'q',
        });

        if (!move) {
          return prevGame;
        }

        try {
          if (move.captured) {
            captureSound.play().catch(() => {});
          } else if (gameCopy.in_check()) {
            checkSound.play().catch(() => {});
          } else {
            moveSound.play().catch(() => {});
          }
        } catch (e) {
          console.log('Sound play failed');
        }

        const newHistory = [...moveHistory, gameCopy.fen()];
        setMoveHistory(newHistory);
        setCurrentMoveIndex(newHistory.length - 1);

        if (gameCopy.game_over()) {
          try {
            endSound.play().catch(() => {});
          } catch (e) {
            console.log('Sound play failed');
          }
          setGameActive(false);

          if (gameCopy.in_checkmate()) {
            const winner = gameCopy.turn() === 'w' ? 'Black' : 'White';
            alert(`Checkmate! ${winner} wins!`);
          } else if (gameCopy.in_draw()) {
            alert('Draw!');
          }
        } else if (gameActive && gameCopy.turn() !== playerColor[0]) {
          setIsComputerThinking(true);
          setTimeout(() => {
            triggerStockfish(gameCopy);
          }, 500);
        }

        gameRef.current = gameCopy;
        return gameCopy;
      } catch (error) {
        console.error('Move execution error:', error);
        return prevGame;
      }
    });
  };

  const onPieceDrop = (sourceSquare, targetSquare) => {
    if (!gameActive || viewOnlyPosition !== null || isComputerThinking) {
      return false;
    }

    const currentGame = gameRef.current;

    if (!currentGame) {
      return false;
    }

    if (currentGame.turn() !== playerColor[0]) {
      return false;
    }

    const piece = currentGame.get(sourceSquare);
    if (!piece || piece.color !== playerColor[0]) {
      return false;
    }

    const gameCopy = new Chess(currentGame.fen());
    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) {
        return false;
      }

      setSelectedSquare(null);
      executeMove(sourceSquare, targetSquare, 'q');
      return true;
    } catch (error) {
      console.error('Drag and drop error:', error);
      return false;
    }
  };

  const onSquareClick = (square) => {
    if (!gameActive || viewOnlyPosition !== null || isComputerThinking) {
      setSelectedSquare(null);
      return;
    }

    const currentGame = gameRef.current;

    if (!currentGame) {
      return;
    }

    if (currentGame.turn() !== playerColor[0]) {
      setSelectedSquare(null);
      return;
    }

    if (!selectedSquare) {
      const piece = currentGame.get(square);
      if (piece && piece.color === playerColor[0]) {
        setSelectedSquare(square);
      }
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    const gameCopy = new Chess(currentGame.fen());
    try {
      const move = gameCopy.move({
        from: selectedSquare,
        to: square,
        promotion: 'q',
      });

      if (move) {
        setSelectedSquare(null);
        executeMove(selectedSquare, square, 'q');
      } else {
        const piece = currentGame.get(square);
        if (piece && piece.color === playerColor[0]) {
          setSelectedSquare(square);
        } else {
          setSelectedSquare(null);
        }
      }
    } catch (error) {
      console.error('Click move error:', error);
      setSelectedSquare(null);
    }
  };

  const handleResign = () => {
    if (!gameActive) return;
    if (confirm('Are you sure you want to resign?')) {
      setGameActive(false);
      try {
        endSound.play().catch(() => {});
      } catch (e) {
        console.log('Sound play failed');
      }
      alert('You resigned. Stockfish wins!');
    }
  };

  const navigateHistory = (index) => {
    if (index < -1 || index >= moveHistory.length) return;
    setCurrentMoveIndex(index);
    if (index === -1) {
      setViewOnlyPosition('start');
    } else {
      setViewOnlyPosition(moveHistory[index]);
    }
  };

  const getPGNText = () => {
    const history = gameRef.current?.history() || [];
    return history.reduce((acc, move, index) => {
      if (index % 2 === 0) return `${acc} ${Math.floor(index / 2) + 1}. ${move}`;
      return `${acc} ${move}`;
    }, '');
  };

  const boardPosition = viewOnlyPosition || gameRef.current?.fen();

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
          <label>Difficulty (Depth)</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(parseInt(e.target.value))}
            disabled={gameActive}
          >
            <option value="1">Level 1 (Beginner)</option>
            <option value="5">Level 5 (Intermediate)</option>
            <option value="10">Level 10 (Advanced)</option>
            <option value="15">Level 15 (Expert)</option>
          </select>
        </div>
        <button
          className="btn btn-primary"
          onClick={startGame}
          disabled={gameActive}
        >
          Start New Game
        </button>
      </div>

      {isComputerThinking && (
        <div className="thinking-indicator">
          <span>Stockfish is thinking...</span>
        </div>
      )}

      <div className="main-section">
        <div className="board-wrapper">
          <div style={{ width: '500px', height: '500px' }}>
            <Chessboard
              position={boardPosition}
              boardOrientation={playerColor}
              customSquareStyles={{
                ...(selectedSquare
                  ? {
                      [selectedSquare]: {
                        background: 'rgba(255, 200, 0, 0.5)',
                        borderRadius: '4px',
                      },
                    }
                  : {}),
              }}
              animationDuration={200}
              options={{
                onPieceDrop,
                onSquareClick,
                arePiecesDraggable: () =>
                  gameActive && viewOnlyPosition === null && !isComputerThinking,
              }}
            />
          </div>
          <button
            className="btn btn-danger"
            onClick={handleResign}
            disabled={!gameActive}
          >
            Resign Game
          </button>
        </div>

        <div className="pgn-container">
          <div className="pgn-display">
            {getPGNText() || 'Moves will appear here...'}
          </div>
          <div className="pgn-navigation">
            <button
              onClick={() => navigateHistory(-1)}
              disabled={currentMoveIndex === -1}
            >
              |◀
            </button>
            <button
              onClick={() => navigateHistory(currentMoveIndex - 1)}
              disabled={currentMoveIndex <= -1}
            >
              ◀
            </button>
            <button
              onClick={() => navigateHistory(currentMoveIndex + 1)}
              disabled={currentMoveIndex >= moveHistory.length - 1}
            >
              ▶
            </button>
            <button
              onClick={() => {
                setViewOnlyPosition(null);
                setCurrentMoveIndex(moveHistory.length - 1);
              }}
              disabled={currentMoveIndex === moveHistory.length - 1}
            >
              ▶| (Live)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayStockfish;
