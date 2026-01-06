import { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import '../styles/Evaluate.css';

const Evaluate = () => {
  const [game, setGame] = useState(new Chess());
  const [pgnInput, setPgnInput] = useState('');
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [history, setHistory] = useState([]);
  
  // Highlighting & Analysis State
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [engineLines, setEngineLines] = useState([]); 
  const [aiMessage, setAiMessage] = useState("Ready to analyze!");
  
  const stockfish = useRef(null);

  // --- Logic (Stockfish Init) ---
  useEffect(() => {
    try {
      stockfish.current = new Worker('/stockfish.js');
      stockfish.current.onmessage = (event) => {
        const message = event.data;
        if (message.startsWith('info') && message.includes('score') && message.includes('pv')) {
          const multipvMatch = message.match(/multipv (\d+)/);
          const lineIndex = multipvMatch ? parseInt(multipvMatch[1]) : 1;
          
          let scoreDisplay = "";
          let rawScoreVal = 0;
          const cpMatch = message.match(/score cp (-?\d+)/);
          const mateMatch = message.match(/score mate (-?\d+)/);

          if (mateMatch) {
            const moves = parseInt(mateMatch[1]);
            scoreDisplay = `M${Math.abs(moves)}`;
            rawScoreVal = moves > 0 ? 10000 : -10000; 
          } else if (cpMatch) {
            const cp = parseInt(cpMatch[1]);
            const normalized = game.turn() === 'w' ? cp : -cp;
            rawScoreVal = normalized;
            scoreDisplay = (normalized / 100).toFixed(2);
            if (parseFloat(scoreDisplay) > 0) scoreDisplay = "+" + scoreDisplay;
          }

          const pvMatch = message.match(/ pv (.+)/);
          const pv = pvMatch ? pvMatch[1] : "";

          setEngineLines(prev => {
            const newLines = [...prev];
            while(newLines.length < 3) newLines.push({ id: newLines.length+1, score: "...", pv: "" });
            newLines[lineIndex - 1] = { id: lineIndex, score: scoreDisplay, rawScore: rawScoreVal, pv: pv };
            return newLines;
          });
        }
      };
      stockfish.current.postMessage('uci');
      stockfish.current.postMessage('setoption name MultiPV value 3'); 
      stockfish.current.postMessage('isready');
    } catch (error) { console.error(error); }
    return () => { if (stockfish.current) stockfish.current.terminate(); };
  }, []);

  // Trigger Analysis
  useEffect(() => {
    if (stockfish.current) {
      setEngineLines([]); 
      setAiMessage("Thinking...");
      stockfish.current.postMessage('stop');
      stockfish.current.postMessage(`position fen ${game.fen()}`);
      stockfish.current.postMessage('go depth 15');
    }
  }, [game]);

  // AI Message Update
  useEffect(() => {
    if (engineLines.length > 0) {
      const score = engineLines[0].rawScore;
      let msg = "";
      if (score > 500) msg = "White is winning decisively!";
      else if (score < -500) msg = "Black is winning decisively!";
      else if (score > 100) msg = "White has a clear advantage.";
      else if (score < -100) msg = "Black has a clear advantage.";
      else msg = "The position is balanced.";
      setAiMessage(msg);
    }
  }, [engineLines]);

  // --- Handlers ---
  function getMoveOptions(square) {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) { setOptionSquares({}); return false; }
    const newSquares = {};
    moves.map((move) => {
      newSquares[move.to] = {
        background: game.get(move.to) && game.get(move.to).color !== game.get(square).color
            ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(0,0,0,.2) 25%, transparent 25%)',
        borderRadius: '50%'
      };
      return move;
    });
    newSquares[square] = { background: 'rgba(255, 255, 0, 0.4)' };
    setOptionSquares(newSquares);
    return true;
  }

  function onDrop(source, target) {
    if (isViewingHistory) return false;
    try {
      const copy = new Chess(game.fen());
      if (!copy.move({ from: source, to: target, promotion: 'q' })) return false;
      setGame(copy); setHistory(copy.history()); setCurrentMoveIndex(prev => prev+1);
      setMoveFrom(''); setOptionSquares({});
      return true;
    } catch { return false; }
  }

  function onSquareClick(square) {
    if (isViewingHistory) return;
    if (optionSquares[square] && moveFrom) {
      const copy = new Chess(game.fen());
      if (copy.move({ from: moveFrom, to: square, promotion: 'q' })) {
        setGame(copy); setHistory(copy.history()); setCurrentMoveIndex(prev => prev+1);
        setMoveFrom(''); setOptionSquares({});
        return;
      }
    }
    if (moveFrom === square) { setMoveFrom(''); setOptionSquares({}); return; }
    if (game.get(square)) { setMoveFrom(square); getMoveOptions(square); return; }
    setMoveFrom(''); setOptionSquares({});
  }

  const handleLoadPGN = () => {
    try {
      const newGame = new Chess();
      newGame.loadPgn(pgnInput);
      setGame(newGame);
      setHistory(newGame.history());
      setCurrentMoveIndex(newGame.history().length - 1);
      setMoveFrom(''); setOptionSquares({}); setIsViewingHistory(false);
      setPgnInput(''); 
    } catch { alert('Invalid PGN'); }
  };

  const navigateTo = (idx) => {
    const g = new Chess();
    for(let i=0; i<=idx; i++) g.move(history[i]);
    setGame(g); setCurrentMoveIndex(idx);
    setIsViewingHistory(idx < history.length - 1);
    setMoveFrom(''); setOptionSquares({});
  };

  const getBarHeight = () => {
    const score = engineLines[0] ? engineLines[0].rawScore : 0;
    const clamped = Math.max(-500, Math.min(500, score));
    return `${50 + (clamped / 10)}%`;
  };

  return (
    <div className="evaluate-root">
      <h1 className="evaluate-title">Analysis Board</h1>

      <div className="evaluate-main">
        
        {/* LEFT: Board Card (Board + Eval Bar) */}
        <div className="evaluate-board-card">
          <div className="eval-bar-container">
            <div className="eval-bar-fill" style={{ height: getBarHeight() }}>
              <span className="eval-score">{engineLines[0]?.score || "0.0"}</span>
            </div>
          </div>

          <div className="evaluate-board-wrapper">
            <Chessboard 
              position={game.fen()} 
              onPieceDrop={onDrop}
              onSquareClick={onSquareClick}
              arePiecesDraggable={() => !isViewingHistory}
              customSquareStyles={optionSquares}
              customDarkSquareStyle={{ backgroundColor: '#b8941f' }} /* Gold Dark */
              customLightSquareStyle={{ backgroundColor: '#ffffff' }} /* White */
              animationDuration={200}
            />
          </div>
        </div>

        {/* RIGHT: Sidebar */}
        <div className="evaluate-sidebar">
          
          {/* 1. Input Row */}
          <div className="evaluate-input-row">
            <input 
              className="evaluate-input-field"
              placeholder="Paste PGN here..." 
              value={pgnInput}
              onChange={e => setPgnInput(e.target.value)}
            />
            <button className="eval-btn eval-btn-primary" onClick={handleLoadPGN}>Load</button>
          </div>

          {/* 2. AI Coach */}
          <div className="ai-coach-box">
            <div className="ai-header">
              <span>🤖</span> AI Analysis
            </div>
            <div className="ai-message">{aiMessage}</div>
          </div>

          {/* 3. Engine Lines Table */}
          <div className="analysis-box">
            <table className="engine-table">
              <thead><tr><th>Move</th><th>Eval</th><th>Line</th></tr></thead>
              <tbody>
                {[0, 1, 2].map((i) => (
                  <tr key={i}>
                    <td className={i===0?"label-best":i===1?"label-great":"label-good"}>
                      {i===0 ? "Best" : i===1 ? "Great" : "Good"}
                    </td>
                    <td>{engineLines[i]?.score || "-"}</td>
                    <td title={engineLines[i]?.pv}>
                      {engineLines[i]?.pv.split(' ').slice(0, 4).join(' ') || "..."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 4. PGN Display (Flexible Height) */}
          <div className="evaluate-pgn-box">
            {history.length === 0 ? "Moves will appear here..." : history.map((m, i) => (
              <span 
                key={i} 
                className={`pgn-move ${i === currentMoveIndex ? 'active' : ''}`}
                onClick={() => navigateTo(i)}
              >
                {i % 2 === 0 ? `${Math.floor(i/2) + 1}.` : ''}{m}
              </span>
            ))}
          </div>

          {/* 5. Navigation */}
          <div className="evaluate-nav-buttons">
            <button className="eval-nav-btn nav-first" onClick={() => navigateTo(-1)}>|◀</button>
            <button className="eval-nav-btn nav-prev" onClick={() => currentMoveIndex >= 0 && navigateTo(currentMoveIndex - 1)}>◀</button>
            <button className="eval-nav-btn nav-next" onClick={() => currentMoveIndex < history.length - 1 && navigateTo(currentMoveIndex + 1)}>▶</button>
            <button className="eval-nav-btn nav-last" onClick={() => navigateTo(history.length - 1)}>▶|</button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Evaluate;