import { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import CapturedPieces from '../components/CapturedPieces';
import Sidebar from '../components/Sidebar';
import '../styles/Game.css';

const moveSound = new Audio('/sounds/move.mp3');
const captureSound = new Audio('/sounds/capture.mp3');
const checkSound = new Audio('/sounds/check.mp3');
const endSound = new Audio('/sounds/end.mp3');
const startSound = new Audio('/sounds/start.mp3');

const TIME_OPTIONS = [
  { value: 1, label: '1 min', category: 'Bullet', icon: '⚡' },
  { value: 3, label: '3 min', category: 'Blitz', icon: '🔥' },
  { value: 5, label: '5 min', category: 'Rapid', icon: '⏱' },
  { value: 10, label: '10 min', category: 'Classical', icon: '🏛' },
];

const DIFFICULTY_OPTIONS = [
  { value: 1, label: 'Beginner' },
  { value: 5, label: 'Intermediate' },
  { value: 10, label: 'Advanced' },
  { value: 15, label: 'Expert' },
];

const Game = () => {
  const navigate = useNavigate();

  /* ═══ PHASE & MODE ═══ */
  const [gamePhase, setGamePhase] = useState('setup');
  const [wizardStep, setWizardStep] = useState(1);
  const [gameMode, setGameMode] = useState(null);

  /* ═══ SETUP SETTINGS ═══ */
  const [selectedTime, setSelectedTime] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState(5);
  const [aiColorChoice, setAiColorChoice] = useState('white');

  /* ═══ CORE GAME STATE ═══ */
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState('w');
  const [playerName, setPlayerName] = useState('Guest');
  const [opponentName, setOpponentName] = useState('Opponent');
  const [whiteTime, setWhiteTime] = useState(300);
  const [blackTime, setBlackTime] = useState(300);
  const [boardOrientation, setBoardOrientation] = useState('white');

  /* ═══ MOVE TRACKING ═══ */
  const [moveHistory, setMoveHistory] = useState([{ fen: new Chess().fen(), san: null }]);
  const [viewingMoveIndex, setViewingMoveIndex] = useState(-1);
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});

  /* ═══ UI STATE ═══ */
  const [rightPanelTab, setRightPanelTab] = useState('analysis');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [gameOverInfo, setGameOverInfo] = useState(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState(null);

  /* ═══ ONLINE-SPECIFIC ═══ */
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [friendSubStep, setFriendSubStep] = useState(null);
  const locallyPlayedFenRef = useRef(null);

  /* ═══ AI-SPECIFIC ═══ */
  const stockfish = useRef(null);
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const gameRef = useRef(game);
  const playerColorRef = useRef(playerColor);
  const gameModeRef = useRef(gameMode);
  const gamePhaseRef = useRef(gamePhase);

  /* ═══ REFS ═══ */
  const chatEndRef = useRef(null);
  const movesEndRef = useRef(null);

  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { playerColorRef.current = playerColor; }, [playerColor]);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  useEffect(() => { gamePhaseRef.current = gamePhase; }, [gamePhase]);

  /* ═══════════════════════════════════════
     INIT: Load user, socket
     ═══════════════════════════════════════ */
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const newSocket = io(backendUrl);
    setSocket(newSocket);
    const userData = localStorage.getItem('chessmaster_user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setPlayerName(parsed.username || 'Player');
        newSocket.emit('register_name', parsed.username);
      } catch (e) { console.error(e); }
    }
    newSocket.on('connect', () => setIsConnected(true));
    return () => newSocket.close();
  }, []);

  /* ═══════════════════════════════════════
     INIT: Stockfish Worker
     ═══════════════════════════════════════ */
  useEffect(() => {
    try {
      stockfish.current = new Worker('/stockfish.js');
      stockfish.current.onmessage = (event) => {
        const msg = event.data;
        if (msg.startsWith('bestmove')) {
          const best = msg.split(' ')[1];
          if (best && best !== '(none)' && gameModeRef.current === 'ai' && gamePhaseRef.current === 'playing') {
            const from = best.substring(0, 2);
            const to = best.substring(2, 4);
            const promo = best.length > 4 ? best[4] : 'q';
            makeAIMove(from, to, promo);
          }
        }
      };
      stockfish.current.postMessage('uci');
      stockfish.current.postMessage('isready');
    } catch (e) { console.error('Could not load Stockfish worker.', e); }
    return () => { if (stockfish.current) stockfish.current.terminate(); };
  }, []);

  function triggerStockfish(g, depth) {
    if (!stockfish.current) return;
    stockfish.current.postMessage(`position fen ${g.fen()}`);
    stockfish.current.postMessage(`go depth ${depth || aiDifficulty}`);
  }

  function makeAIMove(from, to, promotion) {
    const gameCopy = new Chess(gameRef.current.fen());
    try {
      const move = gameCopy.move({ from, to, promotion });
      if (move) {
        if (move.captured) captureSound.play().catch(() => {});
        else moveSound.play().catch(() => {});
        if (gameCopy.inCheck()) checkSound.play().catch(() => {});

        setGame(new Chess(gameCopy.fen()));
        setMoveHistory(prev => [...prev, { fen: gameCopy.fen(), san: move.san }]);
        setViewingMoveIndex(-1);
        setIsComputerThinking(false);

        if (gameCopy.isGameOver()) handleGameEnd(gameCopy);
      }
    } catch (e) { console.error(e); setIsComputerThinking(false); }
  }

  /* ═══════════════════════════════════════
     SOCKET EVENT HANDLERS
     ═══════════════════════════════════════ */
  useEffect(() => {
    if (!socket) return;

    socket.on('room_created', (data) => {
      setCreatedRoomCode(data.roomId);
      setRoomId(data.roomId);
      setFriendSubStep('waiting');
    });

    socket.on('match_made', (data) => {
      setIsSearching(false);
      setGamePhase('playing');
      setRoomId(data.roomId);
      const amIWhite = socket.id === data.white.id;
      setPlayerColor(amIWhite ? 'w' : 'b');
      setBoardOrientation(amIWhite ? 'white' : 'black');
      setOpponentName(amIWhite ? data.blackName : data.whiteName);
      const t = parseInt(data.time) * 60;
      setWhiteTime(t);
      setBlackTime(t);
      setGame(new Chess());
      setMoveHistory([{ fen: new Chess().fen(), san: null }]);
      setViewingMoveIndex(-1);
      setMoveFrom('');
      setOptionSquares({});
      setMessages([]);
      startSound.play().catch(() => {});
    });

    socket.on('sync_state_from_server', (data) => {
      if (locallyPlayedFenRef.current === data.fen) {
        locallyPlayedFenRef.current = null;
        return;
      }
      locallyPlayedFenRef.current = null;
      const newGame = new Chess(data.fen);
      setGame(newGame);
      setViewingMoveIndex(-1);
      setWhiteTime(parseTimeStr(data.whiteTime));
      setBlackTime(parseTimeStr(data.blackTime));
      setMoveHistory(prev => {
        const lastFen = prev[prev.length - 1].fen;
        let san = '?';
        try {
          const prevG = new Chess(lastFen);
          for (const m of prevG.moves({ verbose: true })) {
            const t = new Chess(lastFen);
            t.move(m);
            if (t.fen() === data.fen) { san = m.san; break; }
          }
        } catch (e) { /* ignore */ }
        return [...prev, { fen: data.fen, san }];
      });
      setMoveFrom('');
      setOptionSquares({});
      try { if (newGame.inCheck()) checkSound.play(); else moveSound.play(); } catch(e){}
    });

    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, { sender: data.sender, text: data.text }]);
    });

    socket.on('game_over_from_server', (data) => {
      handleServerGameOver(data);
    });

    socket.on('error', (msg) => {
      alert(msg);
      if (friendSubStep === 'joining') setFriendSubStep(null);
    });

    return () => {
      socket.off('room_created');
      socket.off('match_made');
      socket.off('sync_state_from_server');
      socket.off('receive_message');
      socket.off('game_over_from_server');
      socket.off('error');
    };
  }, [socket, friendSubStep, playerColor]);

  /* ═══════════════════════════════════════
     TIMER
     ═══════════════════════════════════════ */
  useEffect(() => {
    if (gamePhase !== 'playing' || gameOverInfo) return;
    const interval = setInterval(() => {
      if (game.turn() === 'w') setWhiteTime(p => Math.max(0, p - 1));
      else setBlackTime(p => Math.max(0, p - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [gamePhase, game, gameOverInfo]);

  /* ═══════════════════════════════════════
     GAME ACTIONS
     ═══════════════════════════════════════ */
  function startLocalGame() {
    const newGame = new Chess();
    setGame(newGame);
    setGamePhase('playing');
    setMoveHistory([{ fen: newGame.fen(), san: null }]);
    setViewingMoveIndex(-1);
    setMoveFrom('');
    setOptionSquares({});
    setMessages([]);
    setGameOverInfo(null);
    setIsComputerThinking(false);
    const t = selectedTime * 60;
    setWhiteTime(t);
    setBlackTime(t);
    startSound.play().catch(() => {});

    if (gameMode === 'ai') {
      let color = aiColorChoice;
      if (color === 'random') color = Math.random() < 0.5 ? 'white' : 'black';
      const pc = color === 'white' ? 'w' : 'b';
      setPlayerColor(pc);
      setBoardOrientation(color);
      setOpponentName(`Stockfish (Lv ${aiDifficulty})`);
      if (stockfish.current) stockfish.current.postMessage('ucinewgame');
      if (color === 'black') {
        setIsComputerThinking(true);
        setTimeout(() => triggerStockfish(newGame, aiDifficulty), 500);
      }
    } else if (gameMode === 'pass_and_play') {
      setPlayerColor('w');
      setBoardOrientation('white');
      setOpponentName('Black');
    }
  }

  function canMakeMove() {
    if (gamePhase !== 'playing') return false;
    if (isComputerThinking) return false;
    if (viewingMoveIndex !== -1) return false;
    if (gameMode === 'pass_and_play') return true;
    return game.turn() === playerColor;
  }

  function executeMove(from, to, promotion = 'q') {
    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({ from, to, promotion });
      if (!move) return false;

      if (move.captured) captureSound.play().catch(() => {});
      else moveSound.play().catch(() => {});

      setGame(new Chess(gameCopy.fen()));
      setMoveHistory(prev => [...prev, { fen: gameCopy.fen(), san: move.san }]);
      setViewingMoveIndex(-1);
      setMoveFrom('');
      setOptionSquares({});

      if (gameCopy.isGameOver()) {
        handleGameEnd(gameCopy);
        return true;
      }

      // Post-move behavior per mode
      if (gameMode === 'ai') {
        if (gameCopy.turn() !== playerColor) {
          setIsComputerThinking(true);
          setTimeout(() => triggerStockfish(gameCopy, aiDifficulty), 250);
        }
      } else if (gameMode === 'online_random' || gameMode === 'online_friend') {
        locallyPlayedFenRef.current = gameCopy.fen();
        socket.emit('sync_state', {
          roomId,
          fen: gameCopy.fen(),
          turn: gameCopy.turn(),
          whiteTime: formatTime(whiteTime),
          blackTime: formatTime(blackTime),
          pgn: gameCopy.pgn()
        });
      } else if (gameMode === 'pass_and_play') {
        setBoardOrientation(gameCopy.turn() === 'w' ? 'white' : 'black');
      }
      return true;
    } catch (e) { return false; }
  }

  function handleGameEnd(gameCopy) {
    endSound.play().catch(() => {});
    setGamePhase('game_over');
    let title = '', message = '';
    if (gameCopy.isCheckmate()) {
      const winner = gameCopy.turn() === 'w' ? 'Black' : 'White';
      if (gameMode === 'pass_and_play') {
        title = `${winner} Wins!`;
        message = 'Checkmate!';
      } else {
        const playerWon = (playerColor === 'w' && winner === 'White') || (playerColor === 'b' && winner === 'Black');
        title = playerWon ? 'Victory!' : 'Defeat';
        message = playerWon ? `You won by checkmate!` : `${opponentName} won by checkmate.`;
      }
    } else if (gameCopy.isDraw()) {
      title = 'Draw';
      if (gameCopy.isStalemate()) message = 'Stalemate!';
      else if (gameCopy.isThreefoldRepetition()) message = 'Threefold repetition';
      else if (gameCopy.isInsufficientMaterial()) message = 'Insufficient material';
      else message = 'Draw by 50-move rule';
    }
    setGameOverInfo({ title, message });
  }

  function handleServerGameOver(data) {
    endSound.play().catch(() => {});
    setGamePhase('game_over');
    let title = '', message = '';
    if (data.result === 'draw') {
      title = 'Draw';
      message = data.reason || 'Game drawn';
    } else {
      const isWinner = (playerColor === 'w' && data.winner === 'White') || (playerColor === 'b' && data.winner === 'Black');
      title = isWinner ? 'Victory!' : 'Defeat';
      message = isWinner ? `You won by ${data.reason || 'checkmate'}!` : `Lost by ${data.reason || 'checkmate'}.`;
    }
    setGameOverInfo({ title, message });
  }

  function handleResign() {
    if (gamePhase !== 'playing') return;
    if (!window.confirm('Are you sure you want to resign?')) return;
    endSound.play().catch(() => {});
    setGamePhase('game_over');

    if (gameMode === 'online_random' || gameMode === 'online_friend') {
      const winner = playerColor === 'w' ? 'Black' : 'White';
      socket.emit('update_game_result', {
        roomId, playerName, color: playerColor,
        result: 'loss', reason: 'Resignation', winner
      });
    }

    if (gameMode === 'pass_and_play') {
      const resigner = game.turn() === 'w' ? 'White' : 'Black';
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      setGameOverInfo({ title: `${winner} Wins!`, message: `${resigner} resigned.` });
    } else {
      setGameOverInfo({ title: 'Defeat', message: 'You resigned.' });
    }
  }

  /* ═══ CLICK / DRAG HANDLERS ═══ */
  function isPromotionMove(sq1, sq2) {
    const piece = game.get(sq1);
    if (!piece || piece.type !== 'p') return false;
    return (piece.color === 'w' && sq2[1] === '8') || (piece.color === 'b' && sq2[1] === '1');
  }

  function getMoveOptions(square) {
    const turnColor = game.turn();
    if (gameMode !== 'pass_and_play' && turnColor !== playerColor) return false;
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) { setOptionSquares({}); return false; }
    const newSq = {};
    moves.forEach(m => {
      newSq[m.to] = {
        background: game.get(m.to) && game.get(m.to).color !== game.get(square).color
          ? 'radial-gradient(circle, rgba(78,222,163,.25) 85%, transparent 85%)'
          : 'radial-gradient(circle, rgba(78,222,163,.3) 25%, transparent 25%)',
        borderRadius: '50%'
      };
    });
    newSq[square] = { background: 'rgba(59, 130, 246, 0.35)' };
    setOptionSquares(newSq);
    return true;
  }

  function onSquareClick(square) {
    if (!canMakeMove()) return;
    if (optionSquares[square] && moveFrom) {
      if (isPromotionMove(moveFrom, square)) {
        setPendingPromotion({ from: moveFrom, to: square });
        setShowPromotionDialog(true);
        return;
      }
      executeMove(moveFrom, square);
      return;
    }
    if (moveFrom === square) { setMoveFrom(''); setOptionSquares({}); return; }
    const piece = game.get(square);
    const valid = gameMode === 'pass_and_play' ? (piece && piece.color === game.turn()) : (piece && piece.color === playerColor);
    if (valid) { setMoveFrom(square); getMoveOptions(square); return; }
    setMoveFrom(''); setOptionSquares({});
  }

  function onDrop(sourceSquare, targetSquare) {
    if (!canMakeMove()) return false;
    if (isPromotionMove(sourceSquare, targetSquare)) return true;
    return executeMove(sourceSquare, targetSquare, 'q');
  }

  function onPromotionPieceSelect(piece, sourceSquare, targetSquare) {
    return executeMove(sourceSquare, targetSquare, piece[1].toLowerCase());
  }

  function handleManualPromotion(pieceType) {
    if (pendingPromotion) {
      executeMove(pendingPromotion.from, pendingPromotion.to, pieceType);
      setShowPromotionDialog(false);
      setPendingPromotion(null);
    }
  }

  /* ═══ WIZARD ACTIONS ═══ */
  function handleSelectOpponent(mode) {
    setGameMode(mode);
    if (mode === 'online_random') {
      setIsSearching(true);
      socket.emit('want_to_play', { timer: selectedTime, playerName });
    } else if (mode === 'pass_and_play') {
      startLocalGame();
    } else {
      setWizardStep(3);
    }
  }

  function handleCreateRoom() {
    setFriendSubStep('creating');
    socket.emit('create_room', { playerName, timeControl: selectedTime });
  }

  function handleJoinRoom() {
    if (!roomCodeInput) return alert('Please enter a room code');
    setFriendSubStep('joining');
    socket.emit('join_room', { roomId: roomCodeInput.trim(), playerName });
  }

  function handleWizardBack() {
    if (wizardStep === 3) {
      setWizardStep(2);
      setGameMode(null);
      setFriendSubStep(null);
      setCreatedRoomCode(null);
    } else if (wizardStep === 2) {
      setWizardStep(1);
      if (isSearching) setIsSearching(false);
    }
  }

  /* ═══ POST-GAME ACTIONS ═══ */
  function backToArena() {
    setGamePhase('setup');
    setWizardStep(1);
    setGameMode(null);
    setGameOverInfo(null);
    setGame(new Chess());
    setMoveHistory([{ fen: new Chess().fen(), san: null }]);
    setViewingMoveIndex(-1);
    setIsSearching(false);
    setFriendSubStep(null);
    setCreatedRoomCode(null);
    setIsComputerThinking(false);
  }

  function playAgain() {
    setGameOverInfo(null);
    if (gameMode === 'ai' || gameMode === 'pass_and_play') {
      startLocalGame();
    } else {
      // Re-queue online
      setGamePhase('setup');
      setWizardStep(2);
      setIsSearching(true);
      socket.emit('want_to_play', { timer: selectedTime, playerName });
    }
  }

  function goToAnalysis() {
    const pgn = game.pgn();
    navigate(`/evaluate?pgn=${encodeURIComponent(pgn)}`);
  }

  /* ═══ NAVIGATION ═══ */
  function goToMove(idx) {
    if (idx < 0 || idx >= moveHistory.length) return;
    setViewingMoveIndex(idx === moveHistory.length - 1 ? -1 : idx);
  }
  function navFirst() { goToMove(0); }
  function navPrev() { const c = viewingMoveIndex === -1 ? moveHistory.length - 1 : viewingMoveIndex; goToMove(Math.max(0, c - 1)); }
  function navNext() { const c = viewingMoveIndex === -1 ? moveHistory.length - 1 : viewingMoveIndex; goToMove(Math.min(moveHistory.length - 1, c + 1)); }
  function navLast() { setViewingMoveIndex(-1); }

  /* ═══ UTILITY ═══ */
  function parseTimeStr(ts) {
    if (!ts) return 600;
    if (typeof ts === 'number') return ts;
    const [m, s] = ts.split(':').map(Number);
    return m * 60 + s;
  }
  function formatTime(secs) {
    return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
  }
  function copyMoves() {
    const sans = moveHistory.slice(1).map(m => m.san);
    if (sans.length === 0) return alert('No moves to copy!');
    let pgn = '';
    sans.forEach((s, i) => { if (i % 2 === 0) pgn += `${Math.floor(i / 2) + 1}. `; pgn += s + ' '; });
    navigator.clipboard.writeText(pgn.trim());
    alert('Moves copied!');
  }
  function handleSendMessage() {
    if (!chatInput.trim()) return;
    socket.emit('send_message', { roomId, text: chatInput, sender: playerName });
    setMessages(prev => [...prev, { sender: 'You', text: chatInput }]);
    setChatInput('');
  }

  useEffect(() => { if (movesEndRef.current) movesEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [moveHistory]);
  useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  /* ═══ COMPUTED VALUES ═══ */
  const sanMoves = moveHistory.slice(1).map(m => m.san);
  const isViewingHistory = viewingMoveIndex !== -1;
  const displayFen = isViewingHistory ? moveHistory[viewingMoveIndex].fen : game.fen();
  const activeMoveIdx = isViewingHistory ? viewingMoveIndex : moveHistory.length - 1;
  const isOnline = gameMode === 'online_random' || gameMode === 'online_friend';

  const topPlayerColor = useMemo(() => {
    if (gameMode === 'pass_and_play') return boardOrientation === 'white' ? 'b' : 'w';
    return playerColor === 'w' ? 'b' : 'w';
  }, [gameMode, playerColor, boardOrientation]);

  const bottomPlayerColor = useMemo(() => {
    if (gameMode === 'pass_and_play') return boardOrientation === 'white' ? 'w' : 'b';
    return playerColor;
  }, [gameMode, playerColor, boardOrientation]);

  const topName = useMemo(() => {
    if (gameMode === 'pass_and_play') return boardOrientation === 'white' ? 'Black' : 'White';
    return opponentName;
  }, [gameMode, opponentName, boardOrientation]);

  const bottomName = useMemo(() => {
    if (gameMode === 'pass_and_play') return boardOrientation === 'white' ? 'White' : 'Black';
    return playerName;
  }, [gameMode, playerName, boardOrientation]);

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */
  return (
    <div className="game-layout">
      <Sidebar />
      <div className="game-main">

        {/* ── Top Bar ── */}
        <header className="game-topbar">
          <div className="game-topbar-left">
            <h1 className="game-brand">ChessMaster</h1>
            <div className="game-online-badge">
              <span className="game-online-dot" />
              <span>1,248 Online</span>
            </div>
          </div>
        </header>

        {/* ════════════════════ SETUP (WIZARD) ════════════════════ */}
        {gamePhase === 'setup' && (
          <div className="game-welcome">
            <div className="game-wizard-card">
              {/* Step Indicator */}
              <div className="game-wizard-steps">
                <div className={`game-wiz-dot ${wizardStep >= 1 ? 'active' : ''}`}>1</div>
                <div className={`game-wiz-line ${wizardStep >= 2 ? 'active' : ''}`} />
                <div className={`game-wiz-dot ${wizardStep >= 2 ? 'active' : ''}`}>2</div>
                {(gameMode === 'ai' || gameMode === 'online_friend') && (
                  <>
                    <div className={`game-wiz-line ${wizardStep >= 3 ? 'active' : ''}`} />
                    <div className={`game-wiz-dot ${wizardStep >= 3 ? 'active' : ''}`}>3</div>
                  </>
                )}
              </div>

              {/* ── STEP 1: TIME CONTROL ── */}
              {wizardStep === 1 && (
                <div className="game-wiz-content">
                  <h2 className="game-welcome-title">Chess Arena</h2>
                  <p className="game-welcome-sub">Welcome, <strong>{playerName}</strong></p>
                  <label className="game-label">SELECT TIME CONTROL</label>
                  <div className="game-time-grid">
                    {TIME_OPTIONS.map(t => (
                      <button
                        key={t.value}
                        className={`game-time-card ${selectedTime === t.value ? 'active' : ''}`}
                        onClick={() => setSelectedTime(t.value)}
                      >
                        <span className="game-time-card-icon">{t.icon}</span>
                        <span className="game-time-card-label">{t.label}</span>
                        <span className="game-time-card-cat">{t.category}</span>
                      </button>
                    ))}
                  </div>
                  <button className="game-btn game-btn--primary game-wiz-next" onClick={() => setWizardStep(2)}>
                    Continue
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 4 17 12 9 20"/></svg>
                  </button>
                </div>
              )}

              {/* ── STEP 2: OPPONENT TYPE ── */}
              {wizardStep === 2 && (
                <div className="game-wiz-content">
                  <button className="game-wiz-back" onClick={handleWizardBack}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 4 7 12 15 20"/></svg>
                    Back
                  </button>
                  <label className="game-label" style={{ marginTop: '0.75rem' }}>CHOOSE YOUR OPPONENT</label>
                  <div className="game-opponent-grid">
                    <button className="game-opponent-card" onClick={() => handleSelectOpponent('ai')}>
                      <span className="game-opp-icon">🤖</span>
                      <span className="game-opp-title">Play AI</span>
                      <span className="game-opp-desc">Challenge the engine</span>
                    </button>
                    <button className="game-opponent-card" onClick={() => handleSelectOpponent('online_random')} disabled={isSearching}>
                      <span className="game-opp-icon">⚡</span>
                      <span className="game-opp-title">Random</span>
                      <span className="game-opp-desc">Match with anyone</span>
                    </button>
                    <button className="game-opponent-card" onClick={() => handleSelectOpponent('online_friend')}>
                      <span className="game-opp-icon">👥</span>
                      <span className="game-opp-title">Friend</span>
                      <span className="game-opp-desc">Private room</span>
                    </button>
                    <button className="game-opponent-card" onClick={() => { setGameMode('pass_and_play'); handleSelectOpponent('pass_and_play'); }}>
                      <span className="game-opp-icon">🔄</span>
                      <span className="game-opp-title">Pass & Play</span>
                      <span className="game-opp-desc">Same device</span>
                    </button>
                  </div>
                  {isSearching && (
                    <div className="game-searching-status">
                      <div className="game-searching-spinner" />
                      <span>Finding an opponent...</span>
                      <button className="game-wiz-cancel" onClick={() => { setIsSearching(false); setGameMode(null); }}>Cancel</button>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 3a: AI SETTINGS ── */}
              {wizardStep === 3 && gameMode === 'ai' && (
                <div className="game-wiz-content">
                  <button className="game-wiz-back" onClick={handleWizardBack}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 4 7 12 15 20"/></svg>
                    Back
                  </button>
                  <h3 className="game-wiz-subtitle">Play vs Stockfish</h3>
                  <div className="game-ai-settings">
                    <div className="game-ai-group">
                      <label className="game-label">YOUR COLOR</label>
                      <div className="game-ai-chips">
                        {['white', 'black', 'random'].map(c => (
                          <button key={c} className={`game-ai-chip ${aiColorChoice === c ? 'active' : ''}`} onClick={() => setAiColorChoice(c)}>
                            {c === 'white' ? '♔ White' : c === 'black' ? '♚ Black' : '🎲 Random'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="game-ai-group">
                      <label className="game-label">DIFFICULTY</label>
                      <div className="game-ai-chips">
                        {DIFFICULTY_OPTIONS.map(d => (
                          <button key={d.value} className={`game-ai-chip ${aiDifficulty === d.value ? 'active' : ''}`} onClick={() => setAiDifficulty(d.value)}>
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button className="game-btn game-btn--primary game-wiz-next" onClick={startLocalGame}>
                    Start Game
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 3l14 9-14 9V3z"/></svg>
                  </button>
                </div>
              )}

              {/* ── STEP 3b: FRIEND ROOM ── */}
              {wizardStep === 3 && gameMode === 'online_friend' && (
                <div className="game-wiz-content">
                  <button className="game-wiz-back" onClick={handleWizardBack}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 4 7 12 15 20"/></svg>
                    Back
                  </button>
                  <h3 className="game-wiz-subtitle">Play with Friend</h3>

                  {!friendSubStep && (
                    <div className="game-friend-options">
                      <button className="game-btn game-btn--primary" onClick={handleCreateRoom}>Create Room</button>
                      <div className="game-divider-line"><span>OR</span></div>
                      <div className="game-join-row">
                        <input
                          placeholder="Room Code"
                          value={roomCodeInput}
                          onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                          className="game-room-input"
                        />
                        <button className="game-btn game-btn--outline game-btn--sm" onClick={handleJoinRoom}>Join</button>
                      </div>
                    </div>
                  )}

                  {friendSubStep === 'waiting' && (
                    <div className="game-friend-waiting">
                      <h4 className="game-waiting-title">Room Created!</h4>
                      <p className="game-waiting-sub">Share this code with your friend:</p>
                      <div className="game-room-code-display" onClick={() => { navigator.clipboard.writeText(createdRoomCode); alert('Code copied!'); }}>
                        {createdRoomCode}
                      </div>
                      <p className="game-status-text">Waiting for friend to join...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════ PLAYING ════════════════════ */}
        {(gamePhase === 'playing' || gamePhase === 'game_over') && (
          <div className="game-arena">
            {/* Eval Bar (visual placeholder) */}
            <div className="game-eval-bar">
              <div className="game-eval-fill" style={{ height: '50%' }} />
            </div>

            {/* Board Column */}
            <div className="game-board-col">
              {/* Top Player */}
              <div className="game-player-bar game-player-bar--opponent">
                <div className="game-player-avatar">{topName?.[0]?.toUpperCase() || 'O'}</div>
                <div className="game-player-info">
                  <span className="game-player-name">{topName}</span>
                  <CapturedPieces fen={displayFen} color={topPlayerColor} />
                </div>
                <div className={`game-clock ${game.turn() === topPlayerColor ? 'game-clock--active' : ''}`}>
                  {formatTime(topPlayerColor === 'w' ? whiteTime : blackTime)}
                </div>
              </div>

              {/* Board */}
              <div className="game-chessboard-wrap">
                {isViewingHistory && (
                  <div className="game-history-banner" onClick={navLast}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                    Viewing move {viewingMoveIndex} — Click to return to live
                  </div>
                )}
                <Chessboard
                  id="ArenaBoard"
                  position={displayFen}
                  onPieceDrop={isViewingHistory ? () => false : onDrop}
                  onPromotionPieceSelect={isViewingHistory ? () => false : onPromotionPieceSelect}
                  onSquareClick={isViewingHistory ? () => {} : onSquareClick}
                  customSquareStyles={isViewingHistory ? {} : optionSquares}
                  boardOrientation={boardOrientation}
                  customDarkSquareStyle={{ backgroundColor: '#272a2e' }}
                  customLightSquareStyle={{ backgroundColor: '#3d4147' }}
                  animationDuration={200}
                  arePiecesDraggable={!isViewingHistory && gamePhase === 'playing'}
                />
              </div>

              {/* Bottom Player */}
              <div className="game-player-bar game-player-bar--self">
                <div className="game-player-avatar game-player-avatar--self">{bottomName?.[0]?.toUpperCase() || 'P'}</div>
                <div className="game-player-info">
                  <span className="game-player-name">
                    {bottomName}
                    {gameMode !== 'pass_and_play' && <span className="game-you-tag"> (You)</span>}
                  </span>
                  <CapturedPieces fen={displayFen} color={bottomPlayerColor} />
                </div>
                <div className={`game-clock ${game.turn() === bottomPlayerColor ? 'game-clock--active' : ''}`}>
                  {formatTime(bottomPlayerColor === 'w' ? whiteTime : blackTime)}
                </div>
              </div>

              {isComputerThinking && (
                <div className="game-thinking-indicator">
                  <div className="game-thinking-dots"><span/><span/><span/></div>
                  Stockfish is thinking...
                </div>
              )}
            </div>

            {/* Right Panel */}
            <div className="game-right-panel">
              <div className="game-panel-tabs">
                <button className={`game-panel-tab ${rightPanelTab === 'analysis' ? 'game-panel-tab--active' : ''}`} onClick={() => setRightPanelTab('analysis')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  Analysis
                </button>
                {isOnline && (
                  <button className={`game-panel-tab ${rightPanelTab === 'chat' ? 'game-panel-tab--active' : ''}`} onClick={() => setRightPanelTab('chat')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Chat
                    {messages.length > 0 && <span className="game-chat-badge">{messages.length}</span>}
                  </button>
                )}
              </div>

              {/* Analysis Tab */}
              {rightPanelTab === 'analysis' && (
                <div className="game-analysis-panel">
                  <div className="game-analysis-header">
                    <h4>ANALYSIS</h4>
                    <span className="game-move-count">{sanMoves.length} moves</span>
                  </div>
                  <div className="game-analysis-moves">
                    {sanMoves.length === 0 ? (
                      <div className="game-moves-empty">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                        <span>Moves will appear here...</span>
                      </div>
                    ) : (
                      sanMoves.reduce((rows, san, i) => {
                        if (i % 2 === 0) rows.push([san]);
                        else rows[rows.length - 1].push(san);
                        return rows;
                      }, []).map((pair, rowIdx) => (
                        <div key={rowIdx} className="game-move-row">
                          <span className="game-move-num">{rowIdx + 1}.</span>
                          <button className={`game-move-box ${activeMoveIdx === (rowIdx * 2 + 1) ? 'game-move-box--active' : ''}`} onClick={() => goToMove(rowIdx * 2 + 1)}>{pair[0]}</button>
                          {pair[1] && <button className={`game-move-box game-move-box--black ${activeMoveIdx === (rowIdx * 2 + 2) ? 'game-move-box--active' : ''}`} onClick={() => goToMove(rowIdx * 2 + 2)}>{pair[1]}</button>}
                        </div>
                      ))
                    )}
                    <div ref={movesEndRef} />
                  </div>
                  <div className="game-analysis-nav">
                    <button className="game-nav-btn" onClick={navFirst} disabled={activeMoveIdx <= 0}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="6" y1="4" x2="6" y2="20"/><polyline points="18 4 10 12 18 20"/></svg></button>
                    <button className="game-nav-btn" onClick={navPrev} disabled={activeMoveIdx <= 0}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 4 7 12 15 20"/></svg></button>
                    <button className={`game-nav-btn game-nav-btn--live ${!isViewingHistory ? 'game-nav-btn--live-active' : ''}`} onClick={navLast}>Live</button>
                    <button className="game-nav-btn" onClick={navNext} disabled={!isViewingHistory}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 4 17 12 9 20"/></svg></button>
                    <button className="game-nav-btn" onClick={navLast} disabled={!isViewingHistory}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 4 14 12 6 20"/><line x1="18" y1="4" x2="18" y2="20"/></svg></button>
                  </div>
                  <div className="game-analysis-actions">
                    <button className="game-action-btn game-action-btn--copy" onClick={copyMoves}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      Copy Moves
                    </button>
                    {gamePhase === 'playing' && (
                      <button className="game-action-btn game-action-btn--resign" onClick={handleResign}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                        Resign
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Chat Tab */}
              {rightPanelTab === 'chat' && isOnline && (
                <div className="game-chat-panel">
                  <div className="game-chat-header">
                    <div className="game-chat-room-info"><div className="game-chat-room-dot" /><span>Room: {roomId}</span></div>
                    <span className="game-chat-vs">{playerName} vs {opponentName}</span>
                  </div>
                  <div className="game-chat-messages">
                    {messages.length === 0 ? (
                      <div className="game-chat-empty">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        <span>Send a message to your opponent</span>
                      </div>
                    ) : messages.map((msg, idx) => (
                      <div key={idx} className={`game-chat-bubble ${msg.sender === 'You' ? 'game-chat-bubble--self' : 'game-chat-bubble--other'}`}>
                        {msg.sender !== 'You' && <div className="game-chat-avatar">{msg.sender?.[0]?.toUpperCase() || '?'}</div>}
                        <div className="game-chat-bubble-content">
                          {msg.sender !== 'You' && <span className="game-chat-sender">{msg.sender}</span>}
                          <p className="game-chat-text">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="game-chat-input-row">
                    <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type a message..." className="game-chat-input" />
                    <button className="game-chat-send" onClick={handleSendMessage}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" x2="11" y1="2" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Promotion Modal ── */}
      {showPromotionDialog && (
        <div className="game-modal-overlay">
          <div className="game-modal">
            <h3>Choose Promotion</h3>
            <div className="game-promo-grid">
              {[{ piece: 'q', icon: '♛', label: 'Queen' }, { piece: 'r', icon: '♜', label: 'Rook' }, { piece: 'b', icon: '♝', label: 'Bishop' }, { piece: 'n', icon: '♞', label: 'Knight' }].map(p => (
                <div key={p.piece} className="game-promo-piece" onClick={() => handleManualPromotion(p.piece)}>
                  <span className="game-promo-icon">{p.icon}</span>
                  <span className="game-promo-label">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Game Over Modal ── */}
      {gameOverInfo && (
        <div className="game-modal-overlay">
          <div className="game-modal game-modal--result">
            <h2 className={gameOverInfo.title === 'Victory!' ? 'game-result--win' : gameOverInfo.title === 'Defeat' ? 'game-result--loss' : 'game-result--draw'}>
              {gameOverInfo.title}
            </h2>
            <p className="game-result-msg">{gameOverInfo.message}</p>
            <div className="game-over-actions">
              <button className="game-over-btn game-over-btn--arena" onClick={backToArena}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                Arena
              </button>
              <button className="game-over-btn game-over-btn--again" onClick={playAgain}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                Play Again
              </button>
              <button className="game-over-btn game-over-btn--analyze" onClick={goToAnalysis}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                Analyze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;