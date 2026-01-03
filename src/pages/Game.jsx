import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { io } from 'socket.io-client';
import { boardThemes } from '../utils/themes';
import '../styles/Game.css';

const moveSound = new Audio('/sounds/move.mp3');
const captureSound = new Audio('/sounds/capture.mp3');
const checkSound = new Audio('/sounds/check.mp3');
const endSound = new Audio('/sounds/end.mp3');
const startSound = new Audio('/sounds/start.mp3');

const Game = () => {
  const [game, setGame] = useState(new Chess());
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const [roomId, setRoomId] = useState(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState(null);

  const [playerName, setPlayerName] = useState('Guest');
  const [opponentName, setOpponentName] = useState('Opponent');
  const [playerColor, setPlayerColor] = useState(null);

  const [isSearching, setIsSearching] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [mode, setMode] = useState('menu');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [currentTheme, setCurrentTheme] = useState('wooden');

  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [selectedTime, setSelectedTime] = useState(10);

  const [gameOverResult, setGameOverResult] = useState(null);

  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState(null);

  useEffect(() => {
    const newSocket = io("https://chess-game-backend-z158.onrender.com");
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

  useEffect(() => {
    if (!socket) return;

    socket.on('room_created', (data) => {
      setCreatedRoomCode(data.roomId);
      setRoomId(data.roomId);
      setMode('waiting_friend');
    });

    socket.on('match_made', (data) => {
      setIsSearching(false);
      setGameStarted(true);
      setMode('playing');
      setRoomId(data.roomId);

      const amIWhite = socket.id === data.white.id;
      setPlayerColor(amIWhite ? 'w' : 'b');
      setOpponentName(amIWhite ? data.blackName : data.whiteName);

      const t = parseInt(data.time) * 60;
      setWhiteTime(t);
      setBlackTime(t);

      setGame(new Chess());
      startSound.play().catch(e => {});
    });

    socket.on('sync_state_from_server', (data) => {
      const newGame = new Chess(data.fen);
      setGame(newGame);
      setWhiteTime(parseTimeString(data.whiteTime));
      setBlackTime(parseTimeString(data.blackTime));

      if (newGame.in_check()) checkSound.play().catch(e => {});
      else moveSound.play().catch(e => {});
    });

    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, { sender: data.sender, text: data.text }]);
    });

    socket.on('game_over_from_server', (data) => {
      handleGameOver(data);
    });

    socket.on('error', (msg) => {
      alert(msg);
      if (mode === 'joining') setMode('menu');
    });

    return () => {
      socket.off('room_created');
      socket.off('match_made');
      socket.off('sync_state_from_server');
      socket.off('receive_message');
      socket.off('game_over_from_server');
      socket.off('error');
    };
  }, [socket, mode, playerColor]);

  useEffect(() => {
    if (!gameStarted || gameOverResult) return;

    const timerInterval = setInterval(() => {
      if (game.turn() === 'w') {
        setWhiteTime(prev => Math.max(0, prev - 1));
      } else {
        setBlackTime(prev => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [gameStarted, game, gameOverResult]);

  function parseTimeString(timeStr) {
    if (!timeStr) return 600;
    if (typeof timeStr === 'number') return timeStr;
    const [mins, secs] = timeStr.split(':').map(Number);
    return (mins * 60) + secs;
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function findRandomMatch() {
    setIsSearching(true);
    socket.emit('want_to_play', { timer: selectedTime, playerName });
  }

  function createRoom() {
    setMode('creating');
    socket.emit('create_room', { playerName, timeControl: selectedTime });
  }

  function joinRoom() {
    if (!roomCodeInput) return alert("Please enter a code");
    setMode('joining');
    socket.emit('join_room', { roomId: roomCodeInput.trim(), playerName });
  }

  function isPromotionMove(sourceSquare, targetSquare) {
    const piece = game.get(sourceSquare);
    if (!piece || piece.type !== 'p') return false;

    const targetRank = targetSquare[1];
    if (piece.color === 'w' && targetRank === '8') return true;
    if (piece.color === 'b' && targetRank === '1') return true;

    return false;
  }

  function onDrop(sourceSquare, targetSquare) {
    if (!gameStarted || game.turn() !== playerColor) return false;

    if (isPromotionMove(sourceSquare, targetSquare)) {
      setPendingPromotion({ from: sourceSquare, to: targetSquare });
      setShowPromotionDialog(true);
      return false;
    }

    return executeMove(sourceSquare, targetSquare, 'q');
  }

  function executeMove(sourceSquare, targetSquare, promotion = 'q') {
    const gameCopy = new Chess(game.fen());

    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promotion,
      });

      if (!move) return false;

      if (move.captured) captureSound.play().catch(e => {});
      else moveSound.play().catch(e => {});

      setGame(new Chess(gameCopy.fen()));

      socket.emit('sync_state', {
        roomId,
        fen: gameCopy.fen(),
        turn: gameCopy.turn(),
        whiteTime: formatTime(whiteTime),
        blackTime: formatTime(blackTime),
        pgn: gameCopy.pgn()
      });

      return true;
    } catch (e) {
      return false;
    }
  }

  function handlePromotion(piece) {
    if (pendingPromotion) {
      executeMove(pendingPromotion.from, pendingPromotion.to, piece);
      setShowPromotionDialog(false);
      setPendingPromotion(null);
    }
  }

  function handleSendMessage() {
    if (!chatInput.trim()) return;
    socket.emit('send_message', { roomId, text: chatInput, sender: playerName });
    setMessages(prev => [...prev, { sender: 'You', text: chatInput }]);
    setChatInput('');
  }

  function handleResign() {
    if (window.confirm("Are you sure you want to resign?")) {
      const winner = playerColor === 'w' ? 'Black' : 'White';

      socket.emit('update_game_result', {
        roomId,
        playerName,
        color: playerColor,
        result: 'loss',
        reason: 'Resignation',
        winner: winner
      });

      endSound.play().catch(e => {});
      setGameOverResult({
        title: "Defeat",
        message: "You resigned. Better luck next time!"
      });
      setGameStarted(false);
    }
  }

  function handleGameOver(data) {
    endSound.play().catch(e => {});
    let title = '';
    let message = '';

    if (data.result === 'draw') {
      title = "Draw";
      message = data.reason || "Game drawn";
    } else {
      const isWinner = (playerColor === 'w' && data.winner === 'White') ||
                       (playerColor === 'b' && data.winner === 'Black');

      if (isWinner) {
        title = "Victory!";
        message = `Congratulations! You won by ${data.reason || 'checkmate'}`;
      } else {
        title = "Defeat";
        message = `Better luck next time! Lost by ${data.reason || 'checkmate'}`;
      }
    }

    setGameOverResult({ title, message });
    setGameStarted(false);
  }

  function copyRoomCode() {
    navigator.clipboard.writeText(createdRoomCode);
    alert("Code copied!");
  }

  return (
    <div className="game-page-wrapper" style={{ backgroundImage: !gameStarted ? `url('https://images.unsplash.com/photo-1528819622765-d6bcf132f793?q=80&w=2070')` : 'none' }}>

      {!gameStarted ? (
        <div className="welcome-screen">
          <h1>Chess Arena</h1>

          {mode === 'menu' && (
            <div className="menu-container">
               <p className="welcome-text">Welcome, <strong>{playerName}</strong></p>

               <div className="time-selector">
                 <label>Time Control: </label>
                 <select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="timer-dropdown">
                    <option value="1">1 Min</option>
                    <option value="5">5 Min</option>
                    <option value="10">10 Min</option>
                 </select>
               </div>

               <div className="menu-buttons">
                 <button className="timer-button primary" onClick={findRandomMatch}>
                   Play Random
                 </button>
                 <div className="divider">OR</div>
                 <button className="timer-button secondary" onClick={createRoom}>
                   Create Room
                 </button>
                 <div className="join-room-section">
                    <input
                      placeholder="Enter Room Code"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      className="room-input"
                    />
                    <button className="timer-button secondary" onClick={joinRoom}>
                      Join Room
                    </button>
                 </div>
               </div>

               {isSearching && <p className="status-text">Finding opponent...</p>}
            </div>
          )}

          {mode === 'waiting_friend' && (
            <div className="menu-container waiting-container">
                <h2>Room Created!</h2>
                <p>Share this code with your friend:</p>
                <div className="code-display" onClick={copyRoomCode}>
                    {createdRoomCode}
                    <span className="copy-hint">(Click to Copy)</span>
                </div>
                <p className="status-text">Waiting for friend to join...</p>
                <button className="timer-button cancel-btn" onClick={() => { setMode('menu'); }}>
                  Cancel
                </button>
            </div>
          )}

        </div>
      ) : (
        <div className="game-container">

          <div className="game-board-section">
            <div className="theme-selector">
              {Object.keys(boardThemes).map(theme => (
                 <div
                   key={theme}
                   className={`theme-option ${currentTheme === theme ? 'active' : ''}`}
                   style={{ background: `linear-gradient(135deg, ${boardThemes[theme].dark}, ${boardThemes[theme].light})` }}
                   title={theme}
                   onClick={() => setCurrentTheme(theme)}
                 />
              ))}
            </div>

            <div className="player-info opponent">
              <span className="player-name">{opponentName}</span>
              <div className={`clock ${game.turn() !== playerColor ? 'active' : ''}`}>
                 {formatTime(playerColor === 'w' ? blackTime : whiteTime)}
              </div>
            </div>

            <div className="chessboard-wrapper">
              <Chessboard
                id="BasicBoard"
                position={game.fen()}
                onPieceDrop={onDrop}
                boardOrientation={playerColor === 'w' ? 'white' : 'black'}
                customDarkSquareStyle={{ backgroundColor: boardThemes[currentTheme].dark }}
                customLightSquareStyle={{ backgroundColor: boardThemes[currentTheme].light }}
                animationDuration={200}
              />
            </div>

            <div className="player-info player">
              <span className="player-name">{playerName} (You)</span>
              <div className={`clock ${game.turn() === playerColor ? 'active' : ''}`}>
                {formatTime(playerColor === 'w' ? whiteTime : blackTime)}
              </div>
            </div>
          </div>

          <div className="chat-section">
            <div className="chat-header">
              <h3>Room: {roomId}</h3>
            </div>
            <div className="chat-box">
              {messages.map((msg, idx) => (
                <div key={idx} className="chat-message">
                  <strong>{msg.sender}:</strong> {msg.text}
                </div>
              ))}
            </div>
            <div className="chat-inputs">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
              />
              <button className="send-btn" onClick={handleSendMessage}>
                Send
              </button>
            </div>
            <button className="resign-btn" onClick={handleResign}>
              Resign Game
            </button>
          </div>

        </div>
      )}

      {showPromotionDialog && (
        <div className="modal-overlay">
          <div className="promotion-dialog">
            <h3>Choose Promotion Piece</h3>
            <div className="promotion-pieces">
              <div className="promotion-piece" onClick={() => handlePromotion('q')}>
                <span className="piece-icon">♛</span>
                <span className="piece-label">Queen</span>
              </div>
              <div className="promotion-piece" onClick={() => handlePromotion('r')}>
                <span className="piece-icon">♜</span>
                <span className="piece-label">Rook</span>
              </div>
              <div className="promotion-piece" onClick={() => handlePromotion('b')}>
                <span className="piece-icon">♝</span>
                <span className="piece-label">Bishop</span>
              </div>
              <div className="promotion-piece" onClick={() => handlePromotion('n')}>
                <span className="piece-icon">♞</span>
                <span className="piece-label">Knight</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameOverResult && (
        <div className="modal-overlay">
          <div className="modal-content game-over-modal">
            <h2 className={gameOverResult.title === "Victory!" ? "victory-title" : "defeat-title"}>
              {gameOverResult.title}
            </h2>
            <p className="game-over-message">{gameOverResult.message}</p>
            <button className="timer-button primary play-again-btn" onClick={() => window.location.reload()}>
              Play Again
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Game;
