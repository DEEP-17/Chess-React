import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getDailyPuzzle } from '../../services/lichess';
import './DailyPuzzle.css';

export default function DailyPuzzle() {
  const [game, setGame] = useState(new Chess());
  const [puzzle, setPuzzle] = useState(null);
  const [solutionIdx, setSolutionIdx] = useState(0);

  // States: 'loading' | 'playing' | 'wrong' | 'solved' | 'error'
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    // 1. Fetch the puzzle from the Lichess API service
    getDailyPuzzle()
      .then((data) => {
        const newGame = new Chess();

        // 2. The API returns a space-separated string of moves.
        // Play them all to reach the exact position where the puzzle begins.
        const moves = data.game.pgn.split(' ');
        moves.forEach((move) => {
          try {
            newGame.move(move);
          } catch {
            // skip invalid tokens (e.g. move numbers like "1.")
          }
        });

        setGame(new Chess(newGame.fen()));
        setPuzzle(data.puzzle);
        setStatus('playing');
      })
      .catch((err) => {
        console.error('Failed to fetch daily puzzle', err);
        setStatus('error');
      });
  }, []);

  function onPieceDrop(sourceSquare, targetSquare, piece) {
    if (status !== 'playing' && status !== 'wrong') return false;

    // 3. Convert the user's move into UCI format (e.g., "e2e4")
    const moveString = sourceSquare + targetSquare;

    // Handle pawn promotions (Lichess uses 'q' for queen promotion in UCI)
    const isPromotion =
      piece[1] === 'P' &&
      (targetSquare[1] === '8' || targetSquare[1] === '1');
    const uciMove = isPromotion ? moveString + 'q' : moveString;

    const expectedMove = puzzle.solution[solutionIdx];

    if (uciMove === expectedMove) {
      // ✅ Correct move! Apply it to the board.
      const gameCopy = new Chess(game.fen());
      gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: isPromotion ? 'q' : undefined,
      });
      setGame(new Chess(gameCopy.fen()));

      // 4. Check if the puzzle is completely solved
      if (solutionIdx + 1 === puzzle.solution.length) {
        setStatus('solved');
      } else {
        // 5. If not solved, auto-play the opponent's response after 500ms
        setStatus('loading'); // Temporarily lock the board
        setTimeout(() => {
          const nextMove = puzzle.solution[solutionIdx + 1];
          const oppSource = nextMove.substring(0, 2);
          const oppTarget = nextMove.substring(2, 4);
          const oppPromotion =
            nextMove.length === 5 ? nextMove[4] : undefined;

          gameCopy.move({
            from: oppSource,
            to: oppTarget,
            promotion: oppPromotion,
          });

          setGame(new Chess(gameCopy.fen()));
          setSolutionIdx((prev) => prev + 2);

          // Check if that was the last move
          if (solutionIdx + 2 >= puzzle.solution.length) {
            setStatus('solved');
          } else {
            setStatus('playing');
          }
        }, 500);
      }
      return true; // Allows the piece to snap into place
    } else {
      // ❌ Incorrect move!
      setStatus('wrong');
      // Briefly show the "wrong" state before allowing them to try again
      setTimeout(() => setStatus('playing'), 800);
      return false; // Snaps the piece back to its original square
    }
  }

  // ── Error state ──
  if (status === 'error') {
    return (
      <div className="dp-panel">
        <div className="dp-header">
          <span className="dp-header-icon">🧩</span>
          <h4>PUZZLE OF THE DAY</h4>
        </div>
        <div className="dp-error">Could not load puzzle</div>
      </div>
    );
  }

  // ── Loading state ──
  if (status === 'loading' && !puzzle) {
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

  // Determine the side to play based on whose turn it is in the FEN
  const boardOrientation = game.turn() === 'w' ? 'white' : 'black';

  return (
    <div className="dp-panel">
      <div className="dp-header">
        <span className="dp-header-icon">🧩</span>
        <h4>PUZZLE OF THE DAY</h4>
        {puzzle && <span className="dp-rating">⭐ {puzzle.rating}</span>}
      </div>

      <div className="dp-board-wrap">
        <Chessboard
          id="DailyPuzzleBoard"
          position={game.fen()}
          onPieceDrop={onPieceDrop}
          boardOrientation={boardOrientation}
          boardWidth={280}
          arePiecesDraggable={status === 'playing'}
          animationDuration={200}
          customDarkSquareStyle={{ backgroundColor: '#272a2e' }}
          customLightSquareStyle={{ backgroundColor: '#3d4147' }}
          customBoardStyle={{
            borderRadius: '4px',
            boxShadow:
              status === 'wrong'
                ? '0 0 15px rgba(239, 68, 68, 0.8)'
                : '0 2px 10px rgba(0, 0, 0, 0.5)',
            transition: 'box-shadow 0.3s ease',
          }}
        />
      </div>

      <div className="dp-status-area">
        {status === 'playing' && (
          <div className="dp-status dp-status--playing">
            <span className="dp-status-dot dp-status-dot--playing" />
            Find the best move for {boardOrientation}.
          </div>
        )}
        {status === 'loading' && puzzle && (
          <div className="dp-status dp-status--playing">
            <span className="dp-status-dot dp-status-dot--playing" />
            Opponent is responding...
          </div>
        )}
        {status === 'solved' && (
          <div className="dp-status dp-status--solved">
            <span className="dp-check">🎉</span> Puzzle Solved!
          </div>
        )}
        {status === 'wrong' && (
          <div className="dp-status dp-status--wrong">
            ✗ Incorrect move. Try again!
          </div>
        )}
      </div>

      {puzzle?.themes && puzzle.themes.length > 0 && (
        <div className="dp-themes">
          {puzzle.themes.map((t) => (
            <span key={t} className="dp-theme-chip">
              {t}
            </span>
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
}
