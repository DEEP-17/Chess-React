import { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { io } from 'socket.io-client';
import { boardThemes } from '../utils/themes'; 
import '../styles/Game.css';

// Audio objects
const moveSound = new Audio('/sounds/move.mp3');
const captureSound = new Audio('/sounds/capture.mp3');
const checkSound = new Audio('/sounds/check.mp3');
const endSound = new Audio('/sounds/end.mp3');
const startSound = new Audio('/sounds/start.mp3');

const Game = () => {
  // --- State Management ---
  const [game, setGame] = useState(new Chess());
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Game & Room Data
  const [roomId, setRoomId] = useState(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState(null); 
  
  // Player Data
  const [playerName, setPlayerName] = useState('Guest');
  const [opponentName, setOpponentName] = useState('Opponent');
  const [playerColor, setPlayerColor] = useState(null); // 'w' or 'b'
  
  // UI State
  const [isSearching, setIsSearching] = useState(false); 
  const [gameStarted, setGameStarted] = useState(false);
  const [mode, setMode] = useState('menu'); // 'menu', 'creating', 'joining', 'playing', 'waiting_friend'
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [currentTheme, setCurrentTheme] = useState('wooden');
  
  // Timers
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [selectedTime, setSelectedTime] = useState(10); 
  
  // Modal State
  const [gameOverResult, setGameOverResult] = useState(null); 

  // --- Socket Initialization ---
  useEffect(() => {
    // Update with your actual deployed backend URL if different
    const newSocket = io("http://localhost:3001"); 
    setSocket(newSocket);

    const userData = localStorage.getItem('chessmaster_user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setPlayerName(parsed.username || 'Player');
        // Register immediately on connect
        newSocket.emit('register_name', parsed.username);
      } catch (e) { console.error(e); }
    }

    newSocket.on('connect', () => setIsConnected(true));
    
    return () => newSocket.close();
  }, []);

  // --- Socket Event Listeners ---
  useEffect(() => {
    if (!socket) return;

    // 1. Room Created
    socket.on('room_created', (data) => {
      setCreatedRoomCode(data.roomId);
      setRoomId(data.roomId);
      setMode('waiting_friend');
    });

    // 2. Match Made (Random or Friend)
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

    // 3. Game Sync
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
      // Reset if joining failed
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
  }, [socket, mode]);

  // --- Timer Logic ---
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

  // --- Helper Functions ---
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

  // --- Interaction Handlers ---

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

  function onDrop(sourceSquare, targetSquare) {
    if (!gameStarted || game.turn() !== playerColor) return false;

    // Use robust logic: Create new instance from current FEN
    const gameCopy = new Chess(game.fen());
    
    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) return false;

      if (move.captured) captureSound.play().catch(e => {});
      else moveSound.play().catch(e => {});

      // Update Local State immediately
      setGame(new Chess(gameCopy.fen())); // Force re-render with new instance

      // Broadcast
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

  function handleSendMessage() {
    if (!chatInput.trim()) return;
    socket.emit('send_message', { roomId, text: chatInput, sender: playerName });
    setMessages(prev => [...prev, { sender: 'You', text: chatInput }]);
    setChatInput('');
  }

  function handleResign() {
    if (confirm("Are you sure you want to resign?")) {
      socket.emit('update_game_result', {
        roomId,
        playerName,
        color: playerColor,
        result: 'loss',
        reason: 'Resignation'
      });
    }
  }

  function handleGameOver(data) {
    endSound.play().catch(e => {});
    let title = '';
    let message = '';
    
    if (data.result === 'draw') {
        title = "Draw";
    } else {
        const isWinner = (playerColor === 'w' && data.winner === 'White') ||
                         (playerColor === 'b' && data.winner === 'Black');
        title = isWinner ? "Victory!" : "Defeat";
    }
    message = data.reason || "Game Over";

    setGameOverResult({ title, message });
    setGameStarted(false);
  }

  function copyRoomCode() {
    navigator.clipboard.writeText(createdRoomCode);
    alert("Code copied!");
  }

  // --- Render ---
  return (
    <div className="game-page-wrapper" style={{ backgroundImage: !gameStarted ? `url('https://images.unsplash.com/photo-1528819622765-d6bcf132f793?q=80&w=2070')` : 'none' }}>
      
      {!gameStarted ? (
        <div className="welcome-screen">
          <h1>Chess Arena</h1>
          
          {/* Main Menu */}
          {mode === 'menu' && (
            <div className="menu-container" style={{ background: 'rgba(0,0,0,0.8)', padding: '2rem', borderRadius: '15px' }}>
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
                 <button className="timer-button primary" onClick={findRandomMatch}>Play Random</button>
                 <div className="divider">OR</div>
                 <button className="timer-button" onClick={createRoom}>Create Room</button>
                 <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <input 
                      placeholder="Enter Room Code" 
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      className="room-input"
                    />
                    <button className="timer-button" onClick={joinRoom}>Join</button>
                 </div>
               </div>
               
               {isSearching && <p className="status-text">Finding opponent...</p>}
            </div>
          )}

          {/* Waiting Room UI */}
          {mode === 'waiting_friend' && (
            <div className="menu-container" style={{ background: 'rgba(0,0,0,0.8)', padding: '2rem', borderRadius: '15px', textAlign: 'center' }}>
                <h2>Room Created!</h2>
                <p>Share this code with your friend:</p>
                <div className="code-display" onClick={copyRoomCode}>
                    {createdRoomCode} 
                    <span style={{fontSize:'0.8rem', marginLeft:'10px', color: '#888'}}> (Click to Copy)</span>
                </div>
                <p className="status-text">Waiting for friend to join...</p>
                <button className="timer-button" onClick={() => { setMode('menu'); /* Add cancel room logic on server if needed */ }}>Cancel</button>
            </div>
          )}

        </div>
      ) : (
        /* Game Interface */
        <div className="game-container">
          
          <div className="game-board-section">
            <div className="theme-selector">
              {Object.keys(boardThemes).map(theme => (
                 <div 
                   key={theme} 
                   className="theme-option"
                   style={{ background: `linear-gradient(45deg, ${boardThemes[theme].dark}, ${boardThemes[theme].light})` }}
                   title={theme}
                   onClick={() => setCurrentTheme(theme)}
                 />
              ))}
            </div>

            <div className="player-info">
              <span>{opponentName}</span>
              <div className={`clock ${game.turn() !== playerColor ? 'active' : ''}`}>
                 {formatTime(playerColor === 'w' ? blackTime : whiteTime)}
              </div>
            </div>

            <div style={{ width: '500px', height: '500px' }}>
              <Chessboard 
                position={game.fen()} 
                onPieceDrop={onDrop}
                boardOrientation={playerColor === 'w' ? 'white' : 'black'}
                customDarkSquareStyle={{ backgroundColor: boardThemes[currentTheme].dark }}
                customLightSquareStyle={{ backgroundColor: boardThemes[currentTheme].light }}
                animationDuration={200}
              />
            </div>

            <div className="player-info">
              <span>{playerName} (You)</span>
              <div className={`clock ${game.turn() === playerColor ? 'active' : ''}`}>
                {formatTime(playerColor === 'w' ? whiteTime : blackTime)}
              </div>
            </div>
          </div>

          <div className="chat-section">
            <h3>Room: {roomId}</h3>
            <div className="chat-box">
              {messages.map((msg, idx) => (
                <div key={idx} className="chat-message">
                  <strong>{msg.sender}: </strong> {msg.text}
                </div>
              ))}
            </div>
            <div className="chat-inputs">
              <input 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type..."
              />
              <button className="timer-button" onClick={handleSendMessage}>Send</button>
            </div>
            <button className="timer-button" style={{ borderColor: 'red', color: 'red', marginTop: '10px' }} onClick={handleResign}>
              Resign
            </button>
          </div>

        </div>
      )}

      {/* Game Over Modal */}
      {gameOverResult && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ color: '#FFD700' }}>{gameOverResult.title}</h2>
            <p>{gameOverResult.message}</p>
            <button className="timer-button" onClick={() => window.location.reload()}>
              Play Again
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Game;