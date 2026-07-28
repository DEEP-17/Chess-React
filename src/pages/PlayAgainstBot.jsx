import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getBotById } from '../data/botPersonalities';
import { pickDialogue, isPlayerBlunder } from '../utils/botDialogue';
import BotChatPanel from '../components/bot/BotChatPanel';
import useMoveHistory from '../hooks/useMoveHistory';
import '../styles/PlayStockfish.css';
import '../styles/PlayAgainstBot.css';

const PlayAgainstBot = () => {
  const { botId } = useParams();
  const navigate = useNavigate();
  const bot = getBotById(botId);

  const [game, setGame] = useState(new Chess());
  const [gameActive, setGameActive] = useState(false);
  const [playerColor, setPlayerColor] = useState('white');
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [gameOverModal, setGameOverModal] = useState(null);

  const { history, currentMoveIndex, displayFen: displayPosition, resetHistory, recordPosition, goTo, previous, next, live } = useMoveHistory(new Chess().fen());
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});

  const gameRef = useRef(game);
  const stockfish = useRef(null);
  const playerColorRef = useRef(playerColor);
  const gameActiveRef = useRef(gameActive);
  const botRef = useRef(bot);
  const fenBeforePlayerMoveRef = useRef(null);

  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { playerColorRef.current = playerColor; }, [playerColor]);
  useEffect(() => { gameActiveRef.current = gameActive; }, [gameActive]);
  useEffect(() => { botRef.current = bot; }, [bot]);

  useEffect(() => {
    if (!bot) navigate('/play-bot', { replace: true });
  }, [bot, navigate]);

  useEffect(() => {
    if (bot) {
      setChatMessage(pickDialogue(bot, 'greetings'));
    }
  }, [bot]);

  useEffect(() => {
    if (!bot) return undefined;

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
            makeMove(from, to, promotion, true);
            setIsComputerThinking(false);
          }
        }
      };

      stockfish.current.postMessage('uci');
      stockfish.current.postMessage('isready');
    } catch (error) {
      console.error('Could not load Stockfish worker.', error);
    }

    return () => {
      if (stockfish.current) stockfish.current.terminate();
    };
  }, [bot]);

  const triggerStockfish = useCallback((gameInstance) => {
    if (!stockfish.current || !botRef.current) return;
    stockfish.current.postMessage(`position fen ${gameInstance.fen()}`);
    stockfish.current.postMessage(`go depth ${botRef.current.stockfishLevel}`);
  }, []);

  const handleGameOver = useCallback((gameCopy, outcome) => {
    setGameActive(false);
    const currentBot = botRef.current;
    if (!currentBot) return;

    let dialogueKey = 'draw';
    let title = 'Draw';
    let subtitle = 'The game ended in a draw.';

    if (outcome === 'resign') {
      dialogueKey = 'goodbye';
      title = 'You Resigned';
      subtitle = `${currentBot.name} wins this round.`;
    } else if (gameCopy.isCheckmate()) {
      const winnerIsBot =
        (gameCopy.turn() === 'w' && playerColorRef.current === 'white') ||
        (gameCopy.turn() === 'b' && playerColorRef.current === 'black');
      dialogueKey = winnerIsBot ? 'losing' : 'winning';
      title = winnerIsBot ? 'Victory!' : 'Defeat';
      subtitle = winnerIsBot
        ? `You checkmated ${currentBot.name}!`
        : `${currentBot.name} wins by checkmate.`;
    } else if (gameCopy.isDraw()) {
      dialogueKey = 'draw';
      title = 'Draw';
      subtitle = 'Neither side could force a win.';
    }

    setChatMessage(pickDialogue(currentBot, dialogueKey));
    setGameOverModal({ title, subtitle, dialogueKey });
  }, []);

  const makeMove = useCallback((from, to, promotion = 'q', isBotMove = false) => {
    const gameCopy = new Chess();
    gameCopy.loadPgn(gameRef.current.pgn());
    const fenBefore = gameCopy.fen();

    try {
      const move = gameCopy.move({ from, to, promotion });

      if (move) {
        setGame(gameCopy);
        setMoveFrom('');
        setOptionSquares({});

        recordPosition(gameCopy.fen());

        const currentBot = botRef.current;
        if (currentBot) {
          if (isBotMove) {
            if (gameCopy.isCheck()) {
              setChatMessage(pickDialogue(currentBot, 'checkGiven'));
            } else if (move.captured || move.promotion) {
              setChatMessage(pickDialogue(currentBot, 'goodMove'));
            }
          } else {
            if (gameCopy.isCheck()) {
              setChatMessage(pickDialogue(currentBot, 'checkReceived'));
            } else if (
              fenBeforePlayerMoveRef.current &&
              isPlayerBlunder(fenBeforePlayerMoveRef.current, gameCopy.fen(), playerColorRef.current)
            ) {
              setChatMessage(pickDialogue(currentBot, 'badMove'));
            }
          }
        }

        if (gameCopy.isGameOver()) {
          handleGameOver(gameCopy);
          return;
        }

        if (gameActiveRef.current && gameCopy.turn() !== playerColorRef.current[0]) {
          setIsComputerThinking(true);
          if (currentBot) setChatMessage(pickDialogue(currentBot, 'thinking'));
          setTimeout(() => triggerStockfish(gameCopy), 250);
        }
      }
    } catch (e) {
      console.error(e);
      setIsComputerThinking(false);
    } finally {
      if (!isBotMove) fenBeforePlayerMoveRef.current = fenBefore;
    }
  }, [history, triggerStockfish, handleGameOver]);

  const getMoveOptions = (square) => {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) { setOptionSquares({}); return false; }

    const newSquares = {};
    moves.forEach((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to) && game.get(move.to).color !== game.get(square).color
            ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(0,0,0,.2) 25%, transparent 25%)',
        borderRadius: '50%',
      };
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
    setMoveFrom('');
    setOptionSquares({});
  };

  const onDrop = (sourceSquare, targetSquare) => {
    if (!gameActive || isComputerThinking) return false;
    if (game.turn() !== playerColor[0]) return false;
    if (currentMoveIndex !== history.length - 1) return false;

    const moves = game.moves({ verbose: true });
    const isPromotion = moves.some(
      (m) => m.from === sourceSquare && m.to === targetSquare && m.promotion
    );
    if (isPromotion) return true;

    try {
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());
      const move = gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      if (move) {
        makeMove(sourceSquare, targetSquare, 'q');
        return true;
      }
    } catch {
      return false;
    }
    return false;
  };

  const onPromotionPieceSelect = (piece, source, target) => {
    makeMove(source, target, piece[1].toLowerCase());
    return true;
  };

  const startGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setGameActive(true);
    resetHistory(newGame.fen());
    setIsComputerThinking(false);
    setMoveFrom('');
    setOptionSquares({});
    setGameOverModal(null);
    fenBeforePlayerMoveRef.current = null;
    setChatMessage(pickDialogue(bot, 'greetings'));

    if (stockfish.current) stockfish.current.postMessage('ucinewgame');
    if (playerColor === 'black') {
      setIsComputerThinking(true);
      setChatMessage(pickDialogue(bot, 'thinking'));
      setTimeout(() => triggerStockfish(newGame), 500);
    }
  };

  const handleResign = () => {
    if (!gameActive) return;
    setChatMessage(pickDialogue(bot, 'goodbye'));
    handleGameOver(game, 'resign');
  };

  const getCleanPgnDisplay = () => {
    if (history.length <= 1) return 'Moves will appear here...';
    const moves = game.pgn().replace(/\[.*?\]\s*/g, '').trim();
    if (moves === '*') return '';
    return moves;
  };

  const handleCopyPgn = () => {
    navigator.clipboard.writeText(getCleanPgnDisplay());
    setChatMessage('PGN copied to clipboard!');
  };

  const navFirst = () => goTo(0);
  const navPrev = previous;
  const navNext = next;
  const navLast = live;
  const navStop = live;

  if (!bot) return null;

  return (
    <div
      className="stockfish-root play-against-bot-root"
      style={{ '--bot-color': bot.personalityColour }}
    >
      <div className="pab-header">
        <Link to="/play-bot" className="pab-back-link">← Choose Bot</Link>
        <h1 className="stockfish-title pab-title">Play Against {bot.name}</h1>
      </div>

      <div className="stockfish-main pab-main">
        <div className="stockfish-board-card">
          <div className="pab-opponent-bar">
            <span className="pab-opponent-avatar">{bot.avatar}</span>
            <div>
              <div className="pab-opponent-name">{bot.name}</div>
              <div className="pab-opponent-sub">{bot.difficulty} · {bot.city}</div>
            </div>
          </div>

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

        <div className="stockfish-sidebar pab-sidebar">
          <div className="pab-profile-card">
            <div className="pab-profile-header">
              <span className="pab-profile-avatar">{bot.avatar}</span>
              <div>
                <h2 className="pab-profile-name">{bot.name}</h2>
                <p className="pab-profile-meta">{bot.gender} · {bot.age} · {bot.country}</p>
              </div>
            </div>
            <p className="pab-profile-bio">{bot.bio}</p>
            <div className="pab-profile-tags">
              <span className="pab-tag">{bot.favouriteOpening}</span>
              <span className="pab-tag">{bot.favouriteFood}</span>
              <span className="pab-tag pab-tag-difficulty">{bot.difficulty}</span>
            </div>
          </div>

          <BotChatPanel
            bot={bot}
            message={chatMessage}
            isThinking={isComputerThinking}
          />

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
            </div>

            <button className="sf-btn sf-btn-primary pab-start-btn" onClick={startGame}>
              {gameActive ? 'Restart Game' : 'Start New Game'}
            </button>
          </div>

          <div className="stockfish-pgn-box">{getCleanPgnDisplay()}</div>

          <div className="stockfish-nav-buttons">
            <button onClick={navFirst} disabled={currentMoveIndex === 0} className="sf-btn-small sf-nav-btn sf-nav-btn-first">|◀</button>
            <button onClick={navPrev} disabled={currentMoveIndex === 0} className="sf-btn-small sf-nav-btn sf-nav-btn-prev">◀</button>
            <button onClick={navStop} title="Live" className="sf-btn-small sf-nav-btn sf-nav-btn-live">Live</button>
            <button onClick={navNext} disabled={currentMoveIndex === history.length - 1} className="sf-btn-small sf-nav-btn sf-nav-btn-next">▶</button>
            <button onClick={navLast} disabled={currentMoveIndex === history.length - 1} className="sf-btn-small sf-nav-btn sf-nav-btn-last">▶|</button>
          </div>

          <div className="stockfish-actions">
            <button className="sf-btn-action sf-btn-copy" onClick={handleCopyPgn}>Copy PGN</button>
            <button className="sf-btn-action sf-btn-resign" onClick={handleResign} disabled={!gameActive}>
              Resign
            </button>
          </div>
        </div>
      </div>

      {gameOverModal && (
        <div className="pab-modal-overlay" onClick={() => setGameOverModal(null)}>
          <div className="pab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pab-modal-avatar">{bot.avatar}</div>
            <h2 className="pab-modal-title">{gameOverModal.title}</h2>
            <p className="pab-modal-subtitle">{gameOverModal.subtitle}</p>
            <p className="pab-modal-message">{chatMessage}</p>
            <div className="pab-modal-actions">
              <button className="sf-btn sf-btn-primary" onClick={startGame}>Play Again</button>
              <Link to="/play-bot" className="pab-modal-link">Choose Another Bot</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayAgainstBot;
