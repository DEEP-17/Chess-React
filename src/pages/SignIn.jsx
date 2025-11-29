import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SignIn.css';

const SignIn = () => {
  const navigate = useNavigate();
  const [isLoginView, setIsLoginView] = useState(true);
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rating, setRating] = useState(400);
  
  // Notification State
  const [notification, setNotification] = useState(null);

  // Helper to show notification
  const showMessage = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("https://chess-game-backend-z158.onrender.com/api/login", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('chessmaster_user', JSON.stringify(data.user));
        showMessage('Login successful! Redirecting...', 'success');
        setTimeout(() => navigate('/'), 1500);
      } else {
        showMessage(data.message || 'Login failed', 'error');
      }
    } catch (error) {
      showMessage('An error occurred. Please try again.', 'error');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("https://chess-game-backend-z158.onrender.com/api/signup", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rating })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('Signup successful! Please login.', 'success');
        setIsLoginView(true); // Switch to login view
        setPassword(''); // Clear password for security
      } else {
        showMessage(data.message || 'Signup failed', 'error');
      }
    } catch (error) {
      showMessage('An error occurred. Please try again.', 'error');
    }
  };

  return (
    <div className="signin-page-wrapper">
      {/* Background Decorations */}
      <div className="signin-bg-king">♔</div>
      <div className="signin-bg-queen">♕</div>
      <div className="chess-piece-floating" style={{top: '25%', left: '25%', fontSize: '8rem'}}>♗</div>
      <div className="chess-piece-floating" style={{top: '60%', left: '75%', fontSize: '12rem'}}>♘</div>
      <div className="chess-piece-floating" style={{top: '15%', right: '20%', fontSize: '10rem'}}>♖</div>
      <div className="chess-piece-floating" style={{bottom: '20%', left: '10%', fontSize: '9rem'}}>♙</div>

      {/* Main Container */}
      <div className="auth-container">
        <h2>{isLoginView ? 'ChessMaster' : 'Join ChessMaster'}</h2>
        
        <form onSubmit={isLoginView ? handleLogin : handleSignup}>
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              required 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {!isLoginView && (
            <div className="form-group">
              <label>Select Your Level</label>
              <div className="rating-buttons">
                {[
                  { val: 400, label: 'Beginner', icon: '♟' },
                  { val: 800, label: 'Intermediate', icon: '♞' },
                  { val: 1200, label: 'Advanced', icon: '♝' },
                  { val: 1600, label: 'Expert', icon: '♛' }
                ].map((opt) => (
                  <div 
                    key={opt.val}
                    className={`rating-btn ${rating === opt.val ? 'selected' : ''}`}
                    onClick={() => setRating(opt.val)}
                  >
                    <span className="rating-icon">{opt.icon}</span>
                    <span className="rating-label">{opt.label}</span>
                    <span className="rating-value">{opt.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="submit" className="submit-btn">
            {isLoginView ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <div className="toggle-form">
          <button 
            className="toggle-btn" 
            onClick={() => {
              setIsLoginView(!isLoginView);
              setNotification(null);
            }}
          >
            {isLoginView ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="notifications-container">
          <div className={`message ${notification.type}`}>
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default SignIn;