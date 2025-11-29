import { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { io } from 'socket.io-client';
import { boardThemes } from '../utils/themes'; // Import themes from step 1
import '../styles/Game.css';

// Audio objects (ensure these files exist in public/sounds/)
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
  
  // Player Data
  const [playerName, setPlayerName] = useState('Guest');
  const [opponentName, setOpponentName] = useState('Opponent');
  const [playerColor, setPlayerColor] = useState(null); // 'w' or 'b'
  
  // UI State
  const [isSearching, setIsSearching] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [currentTheme, setCurrentTheme] = useState('wooden');
  const [orientation, setOrientation] = useState('white');
  const [selectedSquare, setSelectedSquare] = useState(null);
  
  // Timers
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  
  // Modal State
  const [gameOverResult, setGameOverResult] = useState(null); // { title, message, icon }

  // --- Socket Initialization ---
  useEffect(() => {
    // connect to backend
    const newSocket = io("https://chess-game-backend-z158.onrender.com");
    setSocket(newSocket);

    // Get user from local storage if available
    const userData = localStorage.getItem('chessmaster_user');
    if (userData) {
      const parsed = JSON.parse(userData);
      setPlayerName(parsed.username);
      newSocket.emit('register_name', parsed.username);
    }

    newSocket.on('connect', () => setIsConnected(true));
    
    // Cleanup on unmount
    return () => newSocket.close();
  }, []);

  // --- Socket Event Listeners ---
  useEffect(() => {
    if (!socket) return;

    socket.on('match_made', (data) => {
      setIsSearching(false);
      setGameStarted(true);
      setPlayerColor(data.color);
      setOpponentName(data.opponentName);
      setOrientation(data.color === 'w' ? 'white' : 'black');
      setWhiteTime(parseInt(data.time) * 60);
      setBlackTime(parseInt(data.time) * 60);
      
      const newGame = new Chess();
      setGame(newGame);
      startSound.play();
    });

    socket.on('sync_state_from_server', (data) => {
      const newGame = new Chess(data.fen);
      setGame(newGame);
      setWhiteTime(parseTimeString(data.whiteTime));
      setBlackTime(parseTimeString(data.blackTime));
      
      // Play sounds based on move type
      if (newGame.in_check()) checkSound.play();
      else moveSound.play(); // Simplified, can be improved
    });

    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, { sender: data.sender, text: data.text }]);
    });

    socket.on('game_over_from_server', (data) => {
      handleGameOver(data);
    });

    // Cleanup listeners
    return () => {
      socket.off('match_made');
      socket.off('sync_state_from_server');
      socket.off('receive_message');
      socket.off('game_over_from_server');
    };
  }, [socket]);

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

  function findMatch(minutes) {
    if (isSearching) return;
    setIsSearching(true);
    socket.emit('register_name', playerName);
    socket.emit('want_to_play', { timer: minutes, playerName });
  }

  function onDrop(sourceSquare, targetSquare) {
    console.log('onDrop called', { sourceSquare, targetSquare, gameStarted, turn: game.turn(), playerColor });
    
    if (!gameStarted) {
      console.log('Game not started');
      setSelectedSquare(null);
      return false;
    }

    if (game.turn() !== playerColor) {
      console.log('Not player turn');
      setSelectedSquare(null);
      return false;
    }

    // Check if source square has a piece of the correct color
    const piece = game.get(sourceSquare);
    if (!piece || piece.color !== playerColor) {
      console.log('Invalid piece or color');
      setSelectedSquare(null);
      return false;
    }

    // Optimistic UI update
    const gameCopy = new Chess(game.fen());
    
    // Check if move is valid
    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // Default to queen for simplicity
      });

      if (!move) {
        console.log('Invalid move');
        setSelectedSquare(null);
        return false;
      }

      console.log('Move successful:', move.san);

      // Play sound locally
      if (move.captured) captureSound.play();
      else moveSound.play();

      setGame(gameCopy);
      setSelectedSquare(null);

      // Send to server
      if (socket) {
        socket.emit('sync_state', {
          fen: gameCopy.fen(),
          turn: gameCopy.turn(),
          whiteTime: formatTime(whiteTime),
          blackTime: formatTime(blackTime),
          pgn: gameCopy.pgn()
        });
      }

      return true;
    } catch (e) {
      console.error('Move error:', e);
      setSelectedSquare(null);
      return false;
    }
  }

  function onSquareClick(square) {
    console.log('onSquareClick called', { square, gameStarted, turn: game.turn(), playerColor, selectedSquare });
    
    if (!gameStarted) {
      setSelectedSquare(null);
      return;
    }

    if (game.turn() !== playerColor) {
      setSelectedSquare(null);
      return;
    }

    // If no square is selected, select this square if it has a piece of the current player's color
    if (!selectedSquare) {
      const piece = game.get(square);
      if (piece && piece.color === playerColor) {
        console.log('Selecting square:', square);
        setSelectedSquare(square);
      }
      return;
    }

    // If clicking the same square, deselect
    if (selectedSquare === square) {
      console.log('Deselecting square');
      setSelectedSquare(null);
      return;
    }

    // Try to make the move
    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({
        from: selectedSquare,
        to: square,
        promotion: 'q',
      });

      if (move) {
        console.log('Move successful via click:', move.san);
        
        // Play sound locally
        if (move.captured) captureSound.play();
        else moveSound.play();

        setGame(gameCopy);
        setSelectedSquare(null);

        // Send to server
        if (socket) {
          socket.emit('sync_state', {
            fen: gameCopy.fen(),
            turn: gameCopy.turn(),
            whiteTime: formatTime(whiteTime),
            blackTime: formatTime(blackTime),
            pgn: gameCopy.pgn()
          });
        }
      } else {
        console.log('Invalid move, trying to select new square');
        // Invalid move, try selecting the new square if it has a piece
        const piece = game.get(square);
        if (piece && piece.color === playerColor) {
          setSelectedSquare(square);
        } else {
          setSelectedSquare(null);
        }
      }
    } catch (e) {
      console.error('Move error via click:', e);
      setSelectedSquare(null);
    }
  }

  function handleSendMessage() {
    if (!chatInput.trim()) return;
    socket.emit('send_message', chatInput);
    setMessages(prev => [...prev, { sender: 'You', text: chatInput }]);
    setChatInput('');
  }

  function handleResign() {
    if (confirm("Are you sure you want to resign?")) {
      socket.emit('update_game_result', {
        playerName,
        color: playerColor,
        result: 'loss',
        timeControl: whiteTime, // approximate
        reason: 'Resignation'
      });
      // The server will send back the game over event
    }
  }

  function handleGameOver(data) {
    endSound.play();
    let title = '';
    let message = '';
    
    if (typeof data === 'string') {
        // Legacy handling
        message = data;
        title = "Game Over";
    } else {
        const isWinner = (playerColor === 'w' && data.winner === 'White') ||
                         (playerColor === 'b' && data.winner === 'Black');
        title = isWinner ? "Victory!" : "Defeat";
        if (data.result === 'draw') title = "Draw";
        message = data.reason || "Game Over";
    }

    setGameOverResult({ title, message });
    setGameStarted(false);
  }

  // --- Render ---
  return (
    <div className="game-page-wrapper" style={{ backgroundImage: !gameStarted ? `url('https://images.unsplash.com/photo-1528819622765-d6bcf132f793?q=80&w=2070')` : 'none' }}>
      
      {!gameStarted ? (
        <div className="welcome-screen">
          <h1>Chess Arena</h1>
          {isSearching ? (
             <div style={{ padding: '20px', background: 'rgba(0,0,0,0.8)', borderRadius: '10px' }}>
                <h2>Searching for opponent...</h2>
                <div className="loader"></div> 
                {/* You can add a spinner here */}
             </div>
          ) : (
            <>
              <p>Welcome, {playerName}. Choose your time control:</p>
              <div className="time-selection" style={{ flexDirection: 'row', justifyContent: 'center' }}>
                <button className="timer-button" onClick={() => findMatch(1)}>1 Min</button>
                <button className="timer-button" onClick={() => findMatch(5)}>5 Min</button>
                <button className="timer-button" onClick={() => findMatch(10)}>10 Min</button>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Game Interface */
        <div className="game-container">
          
          {/* Main Board Area */}
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

            {/* Opponent Info */}
            <div className="player-info">
              <span>{opponentName}</span>
              <div className={`clock ${game.turn() !== playerColor ? 'active' : ''}`}>
                 {formatTime(playerColor === 'w' ? blackTime : whiteTime)}
              </div>
            </div>

            {/* React Chessboard */}
            <div style={{ width: '500px', height: '500px' }}>
              <Chessboard 
                position={game.fen()} 
                onPieceDrop={onDrop}
                onSquareClick={onSquareClick}
                boardOrientation={orientation}
                arePiecesDraggable={() => gameStarted && game.turn() === playerColor}
                customDarkSquareStyle={{ backgroundColor: boardThemes[currentTheme].dark }}
                customLightSquareStyle={{ backgroundColor: boardThemes[currentTheme].light }}
                customSquareStyles={{
                  ...(selectedSquare ? {
                    [selectedSquare]: {
                      background: 'rgba(255, 255, 0, 0.4)',
                    },
                  } : {}),
                }}
                animationDuration={200}
              />
            </div>

            {/* Player Info */}
            <div className="player-info">
              <span>{playerName} (You)</span>
              <div className={`clock ${game.turn() === playerColor ? 'active' : ''}`}>
                {formatTime(playerColor === 'w' ? whiteTime : blackTime)}
              </div>
            </div>
          </div>

          {/* Chat & Actions */}
          <div className="chat-section">
            <h3>Chat</h3>
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