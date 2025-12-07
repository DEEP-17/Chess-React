// import { useState, useEffect } from 'react';
// import { Chess } from 'chess.js';
// import { Chessboard } from 'react-chessboard';
// import '../styles/PassAndPlay.css';

// const PassAndPlay = () => {
//   const [game, setGame] = useState(new Chess());
//   const [gameActive, setGameActive] = useState(false);
//   const [boardOrientation, setBoardOrientation] = useState('white');
  
//   // Timers
//   const [whiteTime, setWhiteTime] = useState(300);
//   const [blackTime, setBlackTime] = useState(300);
//   const [initialTime, setInitialTime] = useState(5);

//   // Navigation State
//   // We store the history of FEN strings to navigate back/forth visually
//   const [history, setHistory] = useState([new Chess().fen()]);
//   const [currentMoveIndex, setCurrentMoveIndex] = useState(0);

//   // --- Move Logic ---
//   const onDrop = (sourceSquare, targetSquare) => {
//     // 1. Block moves if inactive or reviewing history
//     if (!gameActive) return false;
//     if (currentMoveIndex !== history.length - 1) {
//       alert("You are reviewing past moves. Click 'Stop / Live' to resume playing.");
//       return false;
//     }

//     try {
//       // 2. CRITICAL FIX: Clone the game using PGN to preserve history
//       // We create a new instance and load the current PGN + headers
//       const gameCopy = new Chess();
//       gameCopy.loadPgn(game.pgn()); 

//       // 3. Attempt the move on the clone
//       const move = gameCopy.move({
//         from: sourceSquare,
//         to: targetSquare,
//         promotion: 'q'
//       });

//       if (move) {
//         // 4. Update state with the new game instance (preserving history)
//         setGame(gameCopy);
//         setBoardOrientation(gameCopy.turn() === 'w' ? 'white' : 'black');
        
//         // 5. Update Visual History
//         const newHistory = [...history, gameCopy.fen()];
//         setHistory(newHistory);
//         setCurrentMoveIndex(newHistory.length - 1);

//         if (gameCopy.isGameOver()) {
//           setGameActive(false);
//           let result = "Game Over";
//           if (gameCopy.isCheckmate()) result = "Checkmate!";
//           else if (gameCopy.isDraw()) result = "Draw!";
//           alert(result);
//         }
//         return true;
//       }
//     } catch (error) {
//       return false;
//     }
//     return false;
//   };

//   // --- Game Controls ---
//   const startGame = () => {
//     const newGame = new Chess();
//     setGame(newGame);
//     setGameActive(true);
//     setBoardOrientation('white');
//     setWhiteTime(initialTime * 60);
//     setBlackTime(initialTime * 60);
//     // Reset History
//     const startFen = newGame.fen();
//     setHistory([startFen]);
//     setCurrentMoveIndex(0);
//   };

//   const handleResign = (color) => {
//     if (!gameActive) return;
//     setGameActive(false);
//     alert(`${color} resigns!`);
//   };

//   // --- PGN Cleaning Helper ---
//   // This logic cleans up the header tags but keeps the move list
//   const getCleanPgn = () => {
//     // If the game hasn't started or no moves made, show placeholder
//     if (history.length <= 1) return "Moves will appear here...";

//     const rawPgn = game.pgn();
    
//     // 1. If we are in "setup" mode (custom FEN), PGN might be messy. 
//     // We try to strip headers [Event "..."] etc.
//     let movesOnly = rawPgn.replace(/\[.*?\]/gs, "").trim();

//     // 2. Remove the result asterisk if it's the only thing there
//     if (movesOnly === "*") return "";

//     return movesOnly;
//   };

//   const handleCopyPgn = () => {
//     // Copy the FULL PGN (Standard format)
//     navigator.clipboard.writeText(game.pgn());
//     alert("Full PGN copied to clipboard!");
//   };

//   // --- Navigation Handlers ---
//   const navFirst = () => setCurrentMoveIndex(0);
//   const navPrev = () => setCurrentMoveIndex(prev => Math.max(0, prev - 1));
//   const navNext = () => setCurrentMoveIndex(prev => Math.min(history.length - 1, prev + 1));
//   const navLast = () => setCurrentMoveIndex(history.length - 1);
//   const navStop = () => setCurrentMoveIndex(history.length - 1);

//   // --- Timer Logic ---
//   useEffect(() => {
//     let interval = null;
//     if (gameActive && currentMoveIndex === history.length - 1) { 
//       interval = setInterval(() => {
//         if (game.turn() === 'w') {
//           setWhiteTime(t => (t > 0 ? t - 1 : 0));
//         } else {
//           setBlackTime(t => (t > 0 ? t - 1 : 0));
//         }
//       }, 1000);
//     }
//     return () => clearInterval(interval);
//   }, [gameActive, game, currentMoveIndex]);

//   const formatTime = (t) => `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`;

//   // Use history array for visual board, but 'game' object for logic
//   const displayPosition = history[currentMoveIndex];

//   return (
//     <div className="pass-play-container">
//       <h1>Pass and Play</h1>

//       <div className="controls">
//         <div className="time-input-group">
//           <label>Time (min):</label>
//           <input
//             type="number"
//             value={initialTime}
//             onChange={(e) => setInitialTime(Math.max(1, parseInt(e.target.value) || 1))}
//             disabled={gameActive}
//           />
//         </div>
//         <button className="btn btn-primary" onClick={startGame}>
//           {gameActive ? 'Restart Game' : 'Start New Game'}
//         </button>
//       </div>

//       <div className="main-section">
//         <div className="board-wrapper">
//           <div className={`clock ${game.turn() === 'b' ? 'active' : ''}`}>
//             Black: {formatTime(blackTime)}
//           </div>

//           <div style={{ width: '500px', height: '500px' }}>
//             <Chessboard
//               id="PassPlayBoard"
//               position={displayPosition} 
//               onPieceDrop={onDrop}
//               boardOrientation={boardOrientation}
//               arePiecesDraggable={gameActive && currentMoveIndex === history.length - 1}
//               animationDuration={200}
//             />
//           </div>

//           <div className={`clock ${game.turn() === 'w' ? 'active' : ''}`}>
//             White: {formatTime(whiteTime)}
//           </div>
//         </div>

//         <div className="pgn-container">
//           <div className="pgn-display" style={{ whiteSpace: 'pre-wrap' }}>
//             {getCleanPgn()}
//           </div>
          
//           <div className="pgn-navigation" style={{ marginBottom: '10px' }}>
//             <button onClick={navFirst} disabled={currentMoveIndex === 0}>|◀</button>
//             <button onClick={navPrev} disabled={currentMoveIndex === 0}>◀</button>
//             <button onClick={navStop} title="Return to Live Game">Live</button>
//             <button onClick={navNext} disabled={currentMoveIndex === history.length - 1}>▶</button>
//             <button onClick={navLast} disabled={currentMoveIndex === history.length - 1}>▶|</button>
//           </div>

//           <div className="game-actions">
//              <button onClick={handleCopyPgn}>Copy Full PGN</button>
//              <button className="btn-danger" onClick={() => handleResign('White')}>White Resign</button>
//              <button className="btn-danger" onClick={() => handleResign('Black')}>Black Resign</button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PassAndPlay;
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

  // --- Move Logic ---
  const onDrop = (sourceSquare, targetSquare) => {
    if (!gameActive) return false;
    if (currentMoveIndex !== history.length - 1) {
      alert("You are reviewing past moves. Click 'Live' to resume playing.");
      return false;
    }

    try {
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn()); 

      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move) {
        setGame(gameCopy);
        setBoardOrientation(gameCopy.turn() === 'w' ? 'white' : 'black');
        
        const newHistory = [...history, gameCopy.fen()];
        setHistory(newHistory);
        setCurrentMoveIndex(newHistory.length - 1);

        if (gameCopy.isGameOver()) {
          setGameActive(false);
          let result = "Game Over";
          if (gameCopy.isCheckmate()) result = "Checkmate!";
          else if (gameCopy.isDraw()) result = "Draw!";
          alert(result);
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
    const startFen = newGame.fen();
    setHistory([startFen]);
    setCurrentMoveIndex(0);
  };

  const handleResign = (color) => {
    if (!gameActive) return;
    setGameActive(false);
    alert(`${color} resigns!`);
  };

  // --- PGN Cleaning Helper ---
  const getMovesOnly = (pgnString) => {
    // Regex to remove [Header "Value"] and newlines
    // 1. Remove [ ... ] blocks
    // 2. Trim whitespace
    return pgnString.replace(/\[.*?\]\s*/g, '').trim();
  };

  const getCleanPgnDisplay = () => {
    if (history.length <= 1) return "Moves will appear here...";
    return getMovesOnly(game.pgn());
  };

  // UPDATED: Now cleans the PGN before copying
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
  const navStop = () => setCurrentMoveIndex(history.length - 1);

  // --- Timer Logic ---
  useEffect(() => {
    let interval = null;
    if (gameActive && currentMoveIndex === history.length - 1) { 
      interval = setInterval(() => {
        if (game.turn() === 'w') {
          setWhiteTime(t => (t > 0 ? t - 1 : 0));
        } else {
          setBlackTime(t => (t > 0 ? t - 1 : 0));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameActive, game, currentMoveIndex]);

  const formatTime = (t) => `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`;

  const displayPosition = history[currentMoveIndex];

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
              position={displayPosition} 
              onPieceDrop={onDrop}
              boardOrientation={boardOrientation}
              arePiecesDraggable={gameActive && currentMoveIndex === history.length - 1}
              animationDuration={200}
            />
          </div>

          <div className={`clock ${game.turn() === 'w' ? 'active' : ''}`}>
            White: {formatTime(whiteTime)}
          </div>
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

          <div className="game-actions">
             <button onClick={handleCopyPgn}>Copy Moves</button>
             <button className="btn-danger" onClick={() => handleResign('White')}>White Resign</button>
             <button className="btn-danger" onClick={() => handleResign('Black')}>Black Resign</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassAndPlay;