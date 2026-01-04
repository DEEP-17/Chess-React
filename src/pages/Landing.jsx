// Landing.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Landing.css';

const Landing = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentPiece, setCurrentPiece] = useState('♔');
  const [scrolled, setScrolled] = useState(false);

  const chessPieces = ['♔', '♕', '♖', '♗', '♘', '♙'];

  // Check auth on mount
  useEffect(() => {
    try {
      const userData = localStorage.getItem('chessmaster_user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }, []);

  // Handle scroll for header effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animate Chess Piece
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPiece(prev => {
        const currentIndex = chessPieces.indexOf(prev);
        const nextIndex = (currentIndex + 1) % chessPieces.length;
        return chessPieces[nextIndex];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleLogout = () => {
    localStorage.removeItem('chessmaster_user');
    setUser(null);
    setIsDropdownOpen(false);
  };

  const handlePlayNow = (e) => {
    e.preventDefault();
    if (user) {
      navigate('/game');
    } else {
      navigate('/signin');
    }
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      {/* Animated Background Grid */}
      <div className="background-grid">
        <div className="grid-pattern"></div>
        <div className="glow-orb glow-orb-1"></div>
        <div className="glow-orb glow-orb-2"></div>
      </div>

      {/* Header */}
      <header className={`landing-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-container header-content">
          <div className="logo" onClick={() => navigate('/')}>
            <div className="logo-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" className="crown-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
              </svg>
            </div>
            <span className="logo-text">ChessMaster</span>
          </div>

          <nav className="landing-nav">
            <ul>
              <li onClick={() => scrollToSection('features')}>
                <a>Features</a>
              </li>
              <li onClick={() => scrollToSection('about')}>
                <a>About</a>
              </li>
              {/* REMOVED Contact Link since the section is gone */}
            </ul>
          </nav>

          <div className="auth-container">
            {user ? (
              <div className="user-menu">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                  className="profile-btn"
                >
                  {user.username}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>
                {isDropdownOpen && (
                  <div className="dropdown">
                    <button onClick={() => navigate('/profile')}>Profile</button>
                    <button onClick={handleLogout}>Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => navigate('/signin')} className="sign-in-btn">
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="landing-container hero-content">
          <div className="chess-piece-container">
            <div className="chess-piece">{currentPiece}</div>
          </div>

          <h1 className="hero-title">
            <span className="gradient-text">Master the</span>
            <br />
            <span className="white-text">Royal Game</span>
          </h1>

          <p className="hero-description">
            Experience chess like never before with cutting-edge AI, comprehensive training, and a global community of players.
          </p>

          <div className="hero-buttons">
            <button onClick={handlePlayNow} className="primary-btn">
              <span>Play Now</span>
            </button>
            <button onClick={() => navigate('/rules')} className="secondary-btn">
              Learn More
            </button>
          </div>

          <div className="scroll-indicator">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
            </svg>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="landing-container">
          <div className="section-header">
            <h2 className="section-title">
              Why Choose <span className="gradient-text">ChessMaster</span>
            </h2>
            <p className="section-subtitle">Elevate your game with powerful features</p>
          </div>

          <div className="feature-cards">
            {/* Feature 1: Advanced AI */}
            <Link to="/stockfish" className="feature-card">
              <div className="feature-card-bg"></div>
              <div className="feature-card-content">
                <div className="feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  {/* The main chip body */}
  <rect x="4" y="4" width="16" height="16" rx="2"></rect>
  
  {/* The Crown inside the chip */}
  <path d="m8 11 2 4h4l2-4-4 2-4-2z"></path>
  <path d="M9 15v2h6v-2"></path>
  
  {/* Chip pins/legs */}
  <path d="M9 4V2"></path>
  <path d="M15 4V2"></path>
  <path d="M9 20v2"></path>
  <path d="M15 20v2"></path>
  <path d="M20 9h2"></path>
  <path d="M20 15h2"></path>
  <path d="M4 9H2"></path>
  <path d="M4 15H2"></path>
</svg>
                </div>
                <h3>Advanced AI</h3>
                <p>Challenge yourself against state-of-the-art chess engines powered by cutting-edge machine learning.</p>
              </div>
            </Link>

            {/* Feature 2: Game Analysis */}
            <Link to="/evaluate" className="feature-card">
              <div className="feature-card-bg"></div>
              <div className="feature-card-content">
                <div className="feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </div>
                <h3>Game Analysis</h3>
                <p>Deep dive into your games with comprehensive analysis and personalized improvement suggestions.</p>
              </div>
            </Link>
            
            {/* Feature 3: Pass & Play */}
            <Link to="/pass-play" className="feature-card">
              <div className="feature-card-bg"></div>
              <div className="feature-card-content">
                <div className="feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                </div>
                <h3>Pass & Play</h3>
                <p>Challenge friends on the same device with local pass-and-play mode and timer support.</p>
              </div>
            </Link>

            {/* Feature 4: Chess960 */}
            <Link to="/PassAndPlay960" className="feature-card feature-card-960">
              <div className="feature-card-bg"></div>
              <div className="feature-card-content">
                <div className="feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 11V7a4 4 0 0 0-8 0v4"/>
                    <path d="M15 17h1a4 4 0 0 0 0-8h-2c0-1.5-.5-3-2-3s-2 1.5-2 3H8a4 4 0 0 0 0 8h1"/>
                    <path d="M7 17v4h10v-4"/>
                    <path d="M3 21h18"/>
                    <path d="M6 3L4 5"/> 
                    <path d="M18 3L20 5"/>
                  </svg>
                </div>
                <h3>Chess960 (FR)</h3>
                <p>Play Fischer Random Chess (Chess960) locally. Embrace unique starting positions and pure strategy.</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about">
        <div className="landing-container">
          <div className="section-header">
            <h2 className="section-title">About ChessMaster</h2>
            <p className="about-text">
              More than just a platform—it's a complete ecosystem designed to help players of all levels master the royal game. From beginners to grandmasters, we provide the tools and community you need.
            </p>
          </div>

          <div className="stats">
            <div className="stat-card">
              <div className="stat-number">1M+</div>
              <div className="stat-label">Active Players</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">50K+</div>
              <div className="stat-label">Daily Matches</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">100+</div>
              <div className="stat-label">Grandmasters</div>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="footer">
        <div className="landing-container">
          <div className="footer-content">
            <div className="logo">
              <svg xmlns="http://www.w3.org/2000/svg" className="crown-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
              </svg>
              <span>ChessMaster</span>
            </div>

            <div className="social-links">
              <a href="#" className="social-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a href="#" className="social-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a href="#" className="social-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} ChessMaster. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;