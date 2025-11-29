import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import '../styles/PassAndPlay.css';

const createSilentAudio = () => {
  const audio = new Audio();
  audio.volume = 0.3;
  return {
    play: () => {
      audio.play().catch(() => {});
    }
  };
};

const moveSound = createSilentAudio();
const captureSound = createSilentAudio();
const checkSound = createSilentAudio();
const endSound = createSilentAudio();
const startSound = createSilentAudio();

const PassAndPlay = () => {
  console.log('PassAndPlay render start');

  const [game, setGame] = useState(new Chess());
  const [gameActive, setGameActive] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState('white');

  const [whiteTime, setWhiteTime] = useState(300);
  const [blackTime, setBlackTime] = useState(300);
  const [initialTime, setInitialTime] = useState(5);

  const [moveHistory, setMoveHistory] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [viewOnlyPosition, setViewOnlyPosition] = useState(null);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [optionSquares, setOptionSquares] = useState({});

  const gameRef = useRef(game);

  // sync ref
  useEffect(() => {
    console.log('useEffect sync gameRef -> game.fen():', game.fen());
    gameRef.current = game;
  }, [game]);

  // Log important state changes
  useEffect(() => {
    console.log('STATE UPDATE ->', {
      gameActive,
      boardOrientation,
      whiteTime,
      blackTime,
      initialTime,
      currentMoveIndex,
      viewOnlyPosition,
      selectedSquare,
      moveHistoryLength: moveHistory.length,
      optionSquaresKeys: Object.keys(optionSquares),
    });
  }, [gameActive, boardOrientation, whiteTime, blackTime, initialTime, currentMoveIndex, viewOnlyPosition, selectedSquare, optionSquares, moveHistory]);

  // Interval timer (log ticks)
  useEffect(() => {
    console.log('Timer effect: gameActive, viewOnlyPosition ->', gameActive, viewOnlyPosition);
    let interval = null;
    if (gameActive && !viewOnlyPosition) {
      interval = setInterval(() => {
        if (!gameRef.current) {
          console.warn('Timer: gameRef.current is falsy');
          return;
        }
        if (gameRef.current.turn() === 'w') {
          setWhiteTime((prev) => {
            console.log('Timer tick: whiteTime before ->', prev);
            if (prev <= 0) {
              handleGameOver('Black wins on time!');
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime((prev) => {
            console.log('Timer tick: blackTime before ->', prev);
            if (prev <= 0) {
              handleGameOver('White wins on time!');
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
        console.log('Timer cleared');
      }
    };
  }, [gameActive, viewOnlyPosition]);

  const startGame = () => {
    console.log('startGame called');
    startSound.play();
    const newGame = new Chess();
    setGame(newGame);
    gameRef.current = newGame;
    setGameActive(true);
    setBoardOrientation('white');
    setWhiteTime(initialTime * 60);
    setBlackTime(initialTime * 60);
    setMoveHistory([]);
    setCurrentMoveIndex(-1);
    setViewOnlyPosition(null);
    setSelectedSquare(null);
    setOptionSquares({});
    console.log('Game started, initial fen:', newGame.fen());
  };

  const getMoveOptions = (square) => {
    console.log('getMoveOptions for', square);
    const moves = gameRef.current.moves({
      square,
      verbose: true,
    });
    console.log('moves from chess.js ->', moves);

    if (!moves || moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares = {};
    moves.forEach((move) => {
      newSquares[move.to] = {
        background:
          gameRef.current.get(move.to) && gameRef.current.get(move.to)?.color !== gameRef.current.get(square)?.color
            ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%',
      };
    });
    newSquares[square] = {
      background: 'rgba(255, 255, 0, 0.4)',
    };
    console.log('option squares to set:', newSquares);
    setOptionSquares(newSquares);
    return true;
  };

  const makeMove = (sourceSquare, targetSquare) => {
    console.log('makeMove called', { sourceSquare, targetSquare });
    const gameCopy = new Chess(gameRef.current.fen());
    console.log('makeMove working on fen:', gameCopy.fen());

    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      console.log('chess.js move result ->', move);

      if (!move) {
        console.log('makeMove: move was invalid according to chess.js');
        return false;
      }

      if (move.captured) {
        console.log('makeMove: capture happened');
        captureSound.play();
      } else if (gameCopy.inCheck()) {
        console.log('makeMove: inCheck after move');
        checkSound.play();
      } else {
        moveSound.play();
      }

      // commit state
      setGame(gameCopy);
      gameRef.current = gameCopy;
      setSelectedSquare(null);
      setOptionSquares({});

      // move history update (safe updater)
      setMoveHistory((prev) => {
        const newHistory = [...prev.slice(0, currentMoveIndex + 1), gameCopy.fen()];
        console.log('Updating moveHistory -> newHistory length:', newHistory.length, 'newHistory last fen:', newHistory[newHistory.length - 1]);
        // update the currentMoveIndex AFTER history set (but we must update state anyway)
        setCurrentMoveIndex(newHistory.length - 1);
        return newHistory;
      });

      setBoardOrientation(gameCopy.turn() === 'w' ? 'white' : 'black');

      if (gameCopy.isGameOver()) {
        console.log('Game is over:', {
          isCheckmate: gameCopy.isCheckmate(),
          isDraw: gameCopy.isDraw(),
          isStalemate: gameCopy.isStalemate(),
        });
        endSound.play();
        setGameActive(false);
        setTimeout(() => {
          if (gameCopy.isCheckmate()) {
            alert(`Checkmate! ${gameCopy.turn() === 'w' ? 'Black' : 'White'} wins.`);
          } else if (gameCopy.isDraw()) {
            alert("Game Draw!");
          } else if (gameCopy.isStalemate()) {
            alert("Stalemate!");
          }
        }, 100);
      }

      console.log('makeMove success, new fen:', gameCopy.fen());
      return true;
    } catch (error) {
      console.error('Move error:', error);
      return false;
    }
  };

  const onDrop = (sourceSquare, targetSquare) => {
    console.log('onDrop handler called with', { sourceSquare, targetSquare, gameActive, viewOnlyPosition });
    if (!gameActive || viewOnlyPosition) {
      console.log('onDrop aborted: gameActive or viewOnlyPosition not valid', { gameActive, viewOnlyPosition });
      return false;
    }

    const moveResult = makeMove(sourceSquare, targetSquare);
    console.log('onDrop returning moveResult ->', moveResult);
    // Ensure game state is synced (temporary debug push)
    if (moveResult) {
      console.log('onDrop: move accepted, forcing setGame sync to gameRef.fen()');
      setGame(new Chess(gameRef.current.fen()));
    }
    return moveResult;
  };

  // additional hook to print currentPosition whenever it changes
  const getPGNText = useMemo(() => {
    const history = gameRef.current?.history() || [];
    return history.reduce((acc, move, index) => {
      if (index % 2 === 0) {
        return `${acc} ${Math.floor(index / 2) + 1}. ${move}`;
      }
      return `${acc} ${move}`;
    }, '');
  }, [game]);

  const currentPosition = viewOnlyPosition || game.fen();

  // watch currentPosition explicitly
  useEffect(() => {
    console.log('currentPosition changed ->', currentPosition);
  }, [currentPosition]);

  const onSquareClick = (square) => {
    console.log('onSquareClick called for', square);
    if (!gameActive || viewOnlyPosition) {
      console.log('onSquareClick aborted: game not active or view-only', { gameActive, viewOnlyPosition });
      return;
    }

    const piece = gameRef.current.get(square);
    console.log('piece at clicked square ->', piece);

    if (!selectedSquare) {
      if (piece && piece.color === gameRef.current.turn()) {
        setSelectedSquare(square);
        getMoveOptions(square);
        console.log('selectedSquare set to', square);
      }
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      setOptionSquares({});
      console.log('deselected square', square);
      return;
    }

    const moveResult = makeMove(selectedSquare, square);
    console.log('onSquareClick moveResult ->', moveResult);

    if (!moveResult) {
      if (piece && piece.color === gameRef.current.turn()) {
        setSelectedSquare(square);
        getMoveOptions(square);
      } else {
        setSelectedSquare(null);
        setOptionSquares({});
      }
    }
  };

  const handleGameOver = (message) => {
    console.log('handleGameOver called with message ->', message);
    endSound.play();
    setGameActive(false);
    setTimeout(() => alert(message), 100);
  };

  const handleResign = (color) => {
    console.log('handleResign called for', color);
    if (!gameActive) return;
    if (window.confirm(`Are you sure ${color} wants to resign?`)) {
      handleGameOver(`${color} resigns. ${color === 'White' ? 'Black' : 'White'} wins!`);
    }
  };

  const navigateHistory = (index) => {
    console.log('navigateHistory called with', index);
    if (index < -1 || index >= moveHistory.length) {
      console.log('navigateHistory aborted: index out of range', { index, min: -1, max: moveHistory.length - 1 });
      return;
    }
    setCurrentMoveIndex(index);
    if (index === -1) {
      const startPos = new Chess();
      setViewOnlyPosition(startPos.fen());
    } else {
      setViewOnlyPosition(moveHistory[index]);
    }
  };

  const goToLive = () => {
    console.log('goToLive called');
    setViewOnlyPosition(null);
    setCurrentMoveIndex(moveHistory.length - 1);
    setSelectedSquare(null);
    setOptionSquares({});
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="pass-play-container">
      <h1>Pass and Play Chess (Instrumented)</h1>

      <div className="controls">
        <div className="time-input-group">
          <label>Game Time (minutes)</label>
          <input
            type="number"
            value={initialTime}
            onChange={(e) => { const val = Math.max(1, parseInt(e.target.value) || 1); console.log('initialTime change ->', val); setInitialTime(val); }}
            min="1"
            disabled={gameActive}
          />
        </div>
        <button className="btn btn-primary" onClick={startGame}>
          {gameActive ? 'Restart Game' : 'Start New Game'}
        </button>
      </div>

      <div className="main-section">
        <div className="board-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={`clock ${game.turn() === 'b' ? 'active' : ''}`}>
            Black: {formatTime(blackTime)}
          </div>

          <div style={{ width: '480px', height: '480px' }}>
            <Chessboard
              position={currentPosition}
              // Instrumented handlers:
              onPieceDrop={(src, dst) => {
                console.log('Chessboard.onPieceDrop (instrumented) fired', { src, dst, gameActive, viewOnlyPosition });
                // forward to our onDrop so behavior matches
                const result = onDrop(src, dst);
                console.log('forwarded onPieceDrop -> onDrop returned', result);
                return result;
              }}
              onSquareClick={(sq) => {
                console.log('Chessboard.onSquareClick (instrumented) fired', sq);
                onSquareClick(sq);
              }}
              boardOrientation={boardOrientation}
              customSquareStyles={optionSquares}
              // force draggable to rule-out gating
              arePiecesDraggable={true}
              animationDuration={200}
            />
          </div>

          <div className={`clock ${game.turn() === 'w' ? 'active' : ''}`}>
            White: {formatTime(whiteTime)}
          </div>
        </div>

        <div className="pgn-container" style={{ marginLeft: 20 }}>
          <div className="pgn-display">
            {getPGNText || "Moves will appear here..."}
          </div>

          <div className="game-actions" style={{ marginTop: 12 }}>
            <button onClick={() => { console.log('Copy PGN clicked ->', gameRef.current?.pgn()); navigator.clipboard.writeText(gameRef.current.pgn()); }}>
              Copy PGN
            </button>
            <button
              className="btn-success"
              onClick={() => {
                console.log('Offer Draw clicked');
                if (gameActive && window.confirm("Agree to draw?")) {
                  handleGameOver("Game Drawn by Agreement");
                }
              }}
              disabled={!gameActive}
            >
              Offer Draw
            </button>
            <button
              className="btn-danger"
              onClick={() => handleResign('White')}
              disabled={!gameActive}
            >
              White Resign
            </button>
            <button
              className="btn-danger"
              onClick={() => handleResign('Black')}
              disabled={!gameActive}
            >
              Black Resign
            </button>
          </div>

          <div className="pgn-navigation" style={{ marginTop: 12 }}>
            <button onClick={() => navigateHistory(-1)} disabled={currentMoveIndex <= -1}>
              |◀
            </button>
            <button onClick={() => navigateHistory(currentMoveIndex - 1)} disabled={currentMoveIndex <= -1}>
              ◀
            </button>
            <button onClick={() => navigateHistory(currentMoveIndex + 1)} disabled={currentMoveIndex >= moveHistory.length - 1}>
              ▶
            </button>
            <button onClick={goToLive} disabled={!viewOnlyPosition}>
              ▶| Live
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassAndPlay;
