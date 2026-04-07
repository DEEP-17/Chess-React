import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SignIn.css';

const SignIn = () => {
  const navigate = useNavigate();
  const [isLoginView, setIsLoginView] = useState(true);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rating, setRating] = useState(400);

  const [notification, setNotification] = useState(null);

  const showMessage = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/login`, {
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
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rating })
      });
      const data = await response.json();
      if (response.ok) {
        showMessage('Signup successful! Please login.', 'success');
        setIsLoginView(true);
        setPassword('');
      } else {
        showMessage(data.message || 'Signup failed', 'error');
      }
    } catch (error) {
      showMessage('An error occurred. Please try again.', 'error');
    }
  };

  return (
    <div className="signin-page">
      {/* Ambient grid background */}
      <div className="signin-bg-grid" />
      <div className="signin-bg-glow signin-bg-glow--1" />
      <div className="signin-bg-glow signin-bg-glow--2" />

      {/* Auth Card */}
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
            </svg>
          </div>
          <h1 className="auth-logo-text">CHESSMASTER</h1>
          <p className="auth-tagline">Elevate your strategy</p>
        </div>

        {/* Form */}
        <form onSubmit={isLoginView ? handleLogin : handleSignup} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">
              {isLoginView ? 'EMAIL OR USERNAME' : 'USERNAME'}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="auth-input"
              placeholder={isLoginView ? 'your@email.com' : 'Choose a username'}
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label className="auth-label">PASSWORD</label>
              {isLoginView && (
                <button type="button" className="auth-forgot-link">Forgot?</button>
              )}
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="••••••••"
            />
          </div>

          {!isLoginView && (
            <div className="auth-field">
              <label className="auth-label">SELECT YOUR LEVEL</label>
              <div className="auth-rating-grid">
                {[
                  { val: 400, label: 'Beginner', icon: '♟' },
                  { val: 800, label: 'Intermediate', icon: '♞' },
                  { val: 1200, label: 'Advanced', icon: '♝' },
                  { val: 1600, label: 'Expert', icon: '♛' }
                ].map((opt) => (
                  <div
                    key={opt.val}
                    className={`auth-rating-btn ${rating === opt.val ? 'selected' : ''}`}
                    onClick={() => setRating(opt.val)}
                  >
                    <span className="auth-rating-icon">{opt.icon}</span>
                    <span className="auth-rating-label">{opt.label}</span>
                    <span className="auth-rating-value">{opt.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="submit" className="auth-submit-btn">
            <span>{isLoginView ? 'Enter Arena' : 'Create Account'}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14m-7-7 7 7-7 7" />
            </svg>
          </button>
        </form>

        {/* Quick Access */}
        {isLoginView && (
          <div className="auth-quick-access">
            <span className="auth-divider-text">QUICK ACCESS</span>
            <div className="auth-social-row">
              <button className="auth-social-btn" type="button" title="Google">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </button>
              <button className="auth-social-btn" type="button" title="GitHub">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Toggle */}
        <div className="auth-toggle">
          <span className="auth-toggle-text">
            {isLoginView ? 'New to the game?' : 'Already have an account?'}
          </span>
          <button
            type="button"
            className="auth-toggle-link"
            onClick={() => {
              setIsLoginView(!isLoginView);
              setNotification(null);
            }}
          >
            {isLoginView ? 'Create Account' : 'Sign in'}
          </button>
        </div>

        {/* Security Footer */}
        <div className="auth-security">
          SECURE CRYPTOGRAPHIC PROTOCOL 2.4.0
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="auth-notification-wrap">
          <div className={`auth-notification ${notification.type}`}>
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default SignIn;