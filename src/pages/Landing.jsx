import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import DailyPuzzle from '../components/puzzle/DailyPuzzle';
import LiveTV from '../components/spectate/LiveTV';
import '../styles/Landing.css';

const Landing = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    try {
      const userData = localStorage.getItem('chessmaster_user');
      if (userData) setUser(JSON.parse(userData));
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('chessmaster_user');
    setUser(null);
    setIsDropdownOpen(false);
  };

  const handlePlayNow = (e) => {
    e.preventDefault();
    if (user) navigate('/game');
    else navigate('/signin');
  };

  // Mock data for lobby
  const onlineCount = 1248;

  return (
    <div className="lobby-layout">
      <Sidebar />

      <div className="lobby-main">
        {/* ── Top Bar ── */}
        <header className="lobby-topbar">
          <div className="lobby-topbar-left">
            <h1 className="lobby-brand">ChessMaster</h1>
            <div className="lobby-online-badge">
              <span className="lobby-online-dot" />
              <span>{onlineCount.toLocaleString()} Online</span>
            </div>
          </div>
          <div className="lobby-topbar-right">
            {user ? (
              <div className="lobby-user-menu">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="lobby-profile-btn"
                >
                  <span className="lobby-avatar">{user.username?.[0]?.toUpperCase() || 'U'}</span>
                  <span>{user.username}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                </button>
                {isDropdownOpen && (
                  <div className="lobby-dropdown">
                    <button onClick={() => navigate('/profile')}>Profile</button>
                    <button onClick={handleLogout}>Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => navigate('/signin')} className="lobby-signin-btn">Sign In</button>
            )}
          </div>
        </header>

        {/* ── Content ── */}
        <div className="lobby-content">
          {/* LEFT: Action Cards */}
          <div className="lobby-cards-area">
            {/* Quick Match */}
            <div className="lobby-action-card lobby-action-card--primary" onClick={handlePlayNow}>
              <div className="lobby-action-card-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 2h6l-2 5h4l-7 9 2-6H8z" />
                </svg>
              </div>
              <div className="lobby-action-card-text">
                <h3>Quick Match</h3>
                <p>Get paired instantly with a player of your skill level. 3+2 time control.</p>
              </div>
              <button className="lobby-find-match-btn" onClick={handlePlayNow}>FIND MATCH</button>
            </div>

            {/* Tournaments */}
            <div className="lobby-action-card" onClick={() => navigate('/game')}>
              <div className="lobby-action-card-icon lobby-action-card-icon--secondary">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
              </div>
              <div className="lobby-action-card-text">
                <h3>Tournaments</h3>
                <p>Join the Master's Open. $5,000 Prize Pool. Starts in 2h 45m.</p>
              </div>
            </div>

            {/* Play with Friend */}
            <div className="lobby-action-card" onClick={() => navigate('/game')}>
              <div className="lobby-action-card-icon lobby-action-card-icon--tertiary">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="lobby-action-card-text">
                <h3>Play with Friend</h3>
                <p>Invite a colleague or friend to a private table with custom rules.</p>
              </div>
            </div>

            {/* More Features Row */}
            <div className="lobby-feature-row">
              <Link to="/stockfish" className="lobby-feature-chip">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 4V2" /><path d="M15 4V2" /><path d="M9 20v2" /><path d="M15 20v2" /><path d="M20 9h2" /><path d="M20 15h2" /><path d="M4 9H2" /><path d="M4 15H2" /></svg>
                Play vs AI
              </Link>
              <Link to="/evaluate" className="lobby-feature-chip">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                Analysis
              </Link>
              <Link to="/pass-play" className="lobby-feature-chip">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" /></svg>
                Pass & Play
              </Link>
              <Link to="/PassAndPlay960" className="lobby-feature-chip">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M6 6l2 2M18 6l-2 2M4 12h4M16 12h4M7 17l2-2M17 17l-2-2M12 18v4" /></svg>
                Chess960
              </Link>
            </div>
          </div>

          {/* RIGHT: Daily Puzzle & Live TV */}
          <div className="lobby-right-panel">
            <DailyPuzzle />
            <LiveTV />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;