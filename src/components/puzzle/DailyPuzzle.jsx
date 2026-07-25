import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getDailyPuzzle } from '../../services/lichess';
import './DailyPuzzle.css';

const DailyPuzzle = () => {
  const [puzzle, setPuzzle] = useState(null);
  const [game, setGame] = useState(null);
  const [solutionMoves, setSolutionMoves] = useState([]);
  const [solutionIdx, setSolutionIdx] = useState(0);
  const [status, setStatus] = useState('loading'); // loading | playing | solved | wrong
  const [error, setError] = useState(null);
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});
  const [highlightSquares, setHighlightSquares] = useState({});

  useEffect(() => {
    let cancelled = false;
    getDailyPuzzle()
      .then((data) => {
        if (cancelled) return;

        // Replay the game PGN to reach the puzzle starting position
        const g = new Chess();
        const pgnMoves = data.game.pgn.split(' ');
        for (const m of pgnMoves) {
          try { g.move(m); } catch { break; }
        }

        setPuzzle(data.puzzle);
        setGame(new Chess(g.fen()));
        setSolutionMoves(data.puzzle.solution);
        setSolutionIdx(0);
        setStatus('playing');

        // The first move in the solution is the opponent's move that sets up the puzzle
        // Auto-play it after a brief delay
        setTimeout(() => {
          if (cancelled) return;
          const firstMove = data.puzzle.solution[0];
          const from = firstMove.slice(0, 2);
          const to = firstMove.slice(2, 4);
          const promo = firstMove.length > 4 ? firstMove[4] : undefined;
          const nextG = new Chess(g.fen());
          try {
            nextG.move({ from, to, promotion: promo });
            setGame(new Chess(nextG.fen()));
            setHighlightSquares({
              [from]: { background: 'rgba(255, 170, 0, 0.3)' },
              [to]: { background: 'rgba(255, 170, 0, 0.3)' },
            });
            setSolutionIdx(1);
          } catch (e) {
            console.error('Failed to play first puzzle move:', e);
          }
        }, 600);
      })
      .catch((err) => {
        if (!cancelled) {
          setError('Could not load puzzle');
          console.error(err);
        }
      });

    return () => { cancelled = true; };
  }, []);

  const getMoveOptions = useCallback((square) => {
    if (!game) return;
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) { setOptionSquares({}); return false; }

    const newSq = {};
    moves.forEach((m) => {
      newSq[m.to] = {
        background: game.get(m.to) && game.get(m.to).color !== game.get(square).color
          ? 'radial-gradient(circle, rgba(78,222,163,.25) 85%, transparent 85%)'
          : 'radial-gradient(circle, rgba(78,222,163,.3) 25%, transparent 25%)',
        borderRadius: '50%',
      };
    });
    newSq[square] = { background: 'rgba(59, 130, 246, 0.35)' };
    setOptionSquares(newSq);
    return true;
  }, [game]);

  const tryMove = useCallback((from, to, promotion) => {
    if (!game || status !== 'playing' || solutionIdx >= solutionMoves.length) return false;

    const uciMove = from + to + (promotion || '');
    const expected = solutionMoves[solutionIdx];

    // Check if user move matches expected solution move
    if (uciMove === expected || (uciMove.length === 4 && expected.startsWith(uciMove))) {
      const gameCopy = new Chess(game.fen());
      try {
        const promo = expected.length > 4 ? expected[4] : promotion;
        gameCopy.move({ from, to, promotion: promo });
      } catch {
        return false;
      }

      setGame(new Chess(gameCopy.fen()));
      setMoveFrom('');
      setOptionSquares({});
      setHighlightSquares({
        [from]: { background: 'rgba(78, 222, 163, 0.3)' },
        [to]: { background: 'rgba(78, 222, 163, 0.3)' },
      });

      const nextIdx = solutionIdx + 1;

      // Check if puzzle is solved
      if (nextIdx >= solutionMoves.length) {
        setSolutionIdx(nextIdx);
        setStatus('solved');
        return true;
      }

      // Auto-play opponent's response
      setSolutionIdx(nextIdx);
      setTimeout(() => {
        const opponentMove = solutionMoves[nextIdx];
        const oFrom = opponentMove.slice(0, 2);
        const oTo = opponentMove.slice(2, 4);
        const oPromo = opponentMove.length > 4 ? opponentMove[4] : undefined;
        const nextG = new Chess(gameCopy.fen());
        try {
          nextG.move({ from: oFrom, to: oTo, promotion: oPromo });
          setGame(new Chess(nextG.fen()));
          setHighlightSquares({
            [oFrom]: { background: 'rgba(255, 170, 0, 0.3)' },
            [oTo]: { background: 'rgba(255, 170, 0, 0.3)' },
          });
          setSolutionIdx(nextIdx + 1);

          // Check if that was the last move
          if (nextIdx + 1 >= solutionMoves.length) {
            setStatus('solved');
          }
        } catch (e) {
          console.error('Failed opponent move:', e);
        }
      }, 400);

      return true;
    } else {
      // Wrong move
      setStatus('wrong');
      setMoveFrom('');
      setOptionSquares({});
      setTimeout(() => setStatus('playing'), 1200);
      return false;
    }
  }, [game, status, solutionIdx, solutionMoves]);

  const onSquareClick = useCallback((square) => {
    if (status !== 'playing' || !game) return;

    if (optionSquares[square] && moveFrom) {
      tryMove(moveFrom, square);
      return;
    }
    if (moveFrom === square) { setMoveFrom(''); setOptionSquares({}); return; }

    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      setMoveFrom(square);
      getMoveOptions(square);
      return;
    }
    setMoveFrom('');
    setOptionSquares({});
  }, [game, status, moveFrom, optionSquares, tryMove, getMoveOptions]);

  const onDrop = useCallback((sourceSquare, targetSquare) => {
    if (status !== 'playing') return false;
    return tryMove(sourceSquare, targetSquare);
  }, [status, tryMove]);

  if (error) {
    return (
      <div className="dp-panel">
        <div className="dp-header">
          <span className="dp-header-icon">🧩</span>
          <h4>PUZZLE OF THE DAY</h4>
        </div>
        <div className="dp-error">{error}</div>
      </div>
    );
  }

  if (status === 'loading' || !game) {
    return (
      <div className="dp-panel">
        <div className="dp-header">
          <span className="dp-header-icon">🧩</span>
          <h4>PUZZLE OF THE DAY</h4>
        </div>
        <div className="dp-loading">
          <div className="dp-spinner" />
          <span>Loading puzzle...</span>
        </div>
      </div>
    );
  }

  const turnToPlay = game.turn() === 'w' ? 'White' : 'Black';

  return (
    <div className="dp-panel">
      <div className="dp-header">
        <span className="dp-header-icon">🧩</span>
        <h4>PUZZLE OF THE DAY</h4>
        {puzzle && (
          <span className="dp-rating">⭐ {puzzle.rating}</span>
        )}
      </div>

      <div className="dp-board-wrap">
        <Chessboard
          id="DailyPuzzleBoard"
          position={game.fen()}
          onPieceDrop={onDrop}
          onSquareClick={onSquareClick}
          customSquareStyles={{ ...highlightSquares, ...optionSquares }}
          boardOrientation={game.turn() === 'w' ? 'white' : 'black'}
          boardWidth={280}
          arePiecesDraggable={status === 'playing'}
          animationDuration={200}
          customDarkSquareStyle={{ backgroundColor: '#272a2e' }}
          customLightSquareStyle={{ backgroundColor: '#3d4147' }}
        />
      </div>

      <div className="dp-status-area">
        {status === 'playing' && (
          <div className="dp-status dp-status--playing">
            <span className="dp-status-dot dp-status-dot--playing" />
            {turnToPlay} to play — find the best move!
          </div>
        )}
        {status === 'solved' && (
          <div className="dp-status dp-status--solved">
            <span className="dp-check">✓</span> Puzzle solved!
          </div>
        )}
        {status === 'wrong' && (
          <div className="dp-status dp-status--wrong">
            ✗ Not quite — try again!
          </div>
        )}
      </div>

      {puzzle?.themes && puzzle.themes.length > 0 && (
        <div className="dp-themes">
          {puzzle.themes.slice(0, 4).map((t) => (
            <span key={t} className="dp-theme-chip">{t}</span>
          ))}
        </div>
      )}

      <a
        href={`https://lichess.org/training/${puzzle?.id || ''}`}
        target="_blank"
        rel="noopener noreferrer"
        className="dp-lichess-link"
      >
        View on Lichess →
      </a>
    </div>
  );
};

export default DailyPuzzle;
