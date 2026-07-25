import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import Sidebar from '../components/Sidebar';
import { getLichessUser } from '../services/lichess';
import '../styles/Profile.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Lichess linking state
  const [lichessInput, setLichessInput] = useState('');
  const [lichessUsername, setLichessUsername] = useState('');
  const [lichessData, setLichessData] = useState(null);
  const [lichessLoading, setLichessLoading] = useState(false);
  const [lichessError, setLichessError] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('chessmaster_user');
    if (userData) setUser(JSON.parse(userData));

    // Load saved Lichess username
    const savedLichess = localStorage.getItem('chessmaster_lichess_username');
    if (savedLichess) {
      setLichessUsername(savedLichess);
      setLichessInput(savedLichess);
    }
  }, []);

  // Fetch Lichess data whenever username changes
  const fetchLichessData = useCallback(async (username) => {
    if (!username) return;
    setLichessLoading(true);
    setLichessError(null);
    try {
      const data = await getLichessUser(username);
      setLichessData(data);
    } catch (err) {
      setLichessError('Could not find Lichess user "' + username + '"');
      setLichessData(null);
      console.error('Lichess fetch error:', err);
    } finally {
      setLichessLoading(false);
    }
  }, []);

  useEffect(() => {
    if (lichessUsername) {
      fetchLichessData(lichessUsername);
    }
  }, [lichessUsername, fetchLichessData]);

  const handleLinkLichess = () => {
    const trimmed = lichessInput.trim();
    if (!trimmed) return;
    localStorage.setItem('chessmaster_lichess_username', trimmed);
    setLichessUsername(trimmed);
  };

  const handleUnlinkLichess = () => {
    localStorage.removeItem('chessmaster_lichess_username');
    setLichessUsername('');
    setLichessInput('');
    setLichessData(null);
    setLichessError(null);
  };

  const createChartData = (stats) => {
    if (!stats) return null;
    const totalDraws = stats.whiteDraws + stats.blackDraws;
    return {
      labels: ['Wins as White', 'Wins as Black', 'Draws'],
      datasets: [{
        data: [stats.whiteWins, stats.blackWins, totalDraws],
        backgroundColor: [
          'rgba(77, 142, 255, 0.8)',
          'rgba(173, 198, 255, 0.7)',
          'rgba(78, 222, 163, 0.7)',
        ],
        borderColor: 'rgba(17, 20, 23, 0.8)',
        borderWidth: 2,
      }],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#c2c6d6',
          font: { family: 'Inter', size: 11 },
          padding: 12,
        },
      },
    },
  };

  // Helper to extract Lichess rating for a perf type
  const getLichessRating = (perfKey) => {
    if (!lichessData?.perfs?.[perfKey]) return null;
    return lichessData.perfs[perfKey];
  };

  // Mock match history
  const matchHistory = [
    { opponent: 'GrandMaster_Y', type: 'Blitz 3+2', time: '12 mins ago', elo: '+12', result: '1 - 0', win: true },
    { opponent: 'Stockfish_15', type: 'Rapid 10+0', time: '1 hour ago', elo: '-8', result: '0 - 1', win: false },
    { opponent: 'Beth_Harmon_AI', type: 'Classical', time: '3 hours ago', elo: '0', result: '½ - ½', win: null },
  ];

  if (!user) {
    return (
      <div className="profile-layout">
        <Sidebar />
        <div className="profile-main">
          <div className="profile-empty">
            <h2>Please Log In</h2>
            <p>You need to be logged in to view your profile.</p>
            <button className="profile-btn-primary" onClick={() => navigate('/signin')}>
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-layout">
      <Sidebar />
      <div className="profile-main">
        {/* Header */}
        <header className="profile-topbar">
          <h1 className="profile-brand">ChessMaster</h1>
          <button className="profile-back-btn" onClick={() => navigate('/')}>← Back</button>
        </header>

        <div className="profile-content">
          {/* Identity Section */}
          <div className="profile-identity">
            <div className="profile-avatar-lg">
              {user.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="profile-identity-info">
              <div className="profile-name-row">
                <h2 className="profile-username">{user.username}</h2>
                <span className="profile-verified-badge">✓ verified</span>
              </div>
              <p className="profile-meta">
                Peak Elo: <strong>{user.blitzRating || user.bulletRating || 1200}</strong> • Member since 2024
              </p>
            </div>
          </div>

          {/* Lichess Account Linking */}
          <div className="profile-lichess-section">
            <div className="profile-lichess-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <h4>LINK LICHESS ACCOUNT</h4>
              {lichessUsername && lichessData && (
                <span className="profile-lichess-connected">
                  <span className="profile-lichess-connected-dot" />
                  Connected
                </span>
              )}
            </div>
            <div className="profile-lichess-body">
              <div className="profile-lichess-input-row">
                <input
                  type="text"
                  className="profile-lichess-input"
                  placeholder="Enter Lichess username..."
                  value={lichessInput}
                  onChange={(e) => setLichessInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLinkLichess()}
                />
                {lichessUsername ? (
                  <div className="profile-lichess-btn-group">
                    <button
                      className="profile-lichess-refresh-btn"
                      onClick={() => fetchLichessData(lichessUsername)}
                      disabled={lichessLoading}
                    >
                      {lichessLoading ? '...' : '↻'}
                    </button>
                    <button className="profile-lichess-unlink-btn" onClick={handleUnlinkLichess}>
                      Unlink
                    </button>
                  </div>
                ) : (
                  <button
                    className="profile-lichess-connect-btn"
                    onClick={handleLinkLichess}
                    disabled={!lichessInput.trim() || lichessLoading}
                  >
                    {lichessLoading ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
              {lichessError && (
                <div className="profile-lichess-error">{lichessError}</div>
              )}
              {lichessData && (
                <div className="profile-lichess-info-row">
                  <span className="profile-lichess-info-label">
                    {lichessData.title ? <span className="profile-lichess-title">{lichessData.title}</span> : null}
                    {lichessData.username}
                  </span>
                  <span className="profile-lichess-info-games">
                    {lichessData.count?.all?.toLocaleString() || '—'} games played
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stat Cards Row */}
          <div className="profile-stats-row">
            <div className="profile-stat-card">
              <div className="profile-stat-circle">
                <svg viewBox="0 0 36 36" className="profile-circle-chart">
                  <path className="profile-circle-bg" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="profile-circle-fill" strokeDasharray="62, 100" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="profile-stat-circle-val">62%</span>
              </div>
              <span className="profile-stat-label">Win Percentage</span>
            </div>
            <div className="profile-stat-card">
              <span className="profile-stat-big">{user.totalGames || '1,240'}</span>
              <span className="profile-stat-label">Total Games</span>
            </div>
            <div className="profile-stat-card">
              <span className="profile-stat-big">84.2%</span>
              <span className="profile-stat-label">Avg Accuracy</span>
            </div>
          </div>

          <div className="profile-two-col">
            {/* Left: Match History + Ratings */}
            <div className="profile-left-col">
              {/* Match History */}
              <div className="profile-panel">
                <div className="profile-panel-header">
                  <h4>MATCH HISTORY</h4>
                </div>
                <div className="profile-match-list">
                  {matchHistory.map((m, i) => (
                    <div key={i} className="profile-match-row">
                      <div className={`profile-match-indicator ${m.win === true ? 'win' : m.win === false ? 'loss' : 'draw'}`} />
                      <div className="profile-match-info">
                        <span className="profile-match-opponent">vs. {m.opponent}</span>
                        <span className="profile-match-meta">{m.type} • {m.time}</span>
                      </div>
                      <div className="profile-match-result-col">
                        <span className={`profile-match-elo ${parseInt(m.elo) > 0 ? 'elo-up' : parseInt(m.elo) < 0 ? 'elo-down' : ''}`}>
                          {parseInt(m.elo) > 0 ? '+' : ''}{m.elo} Elo
                        </span>
                        <span className="profile-match-result">Result: {m.result}</span>
                      </div>
                      <button className="profile-review-btn">Review</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Local Rating Cards */}
              <div className="profile-ratings-grid">
                {[
                  { label: 'Bullet', rating: user.bulletRating || 1200, stats: user.bulletStats },
                  { label: 'Blitz', rating: user.blitzRating || 1200, stats: user.blitzStats },
                  { label: 'Rapid', rating: user.rapidRating || 1200, stats: user.rapidStats },
                ].map((cat) => (
                  <div key={cat.label} className="profile-rating-card">
                    <h3 className="profile-rating-title">{cat.label}</h3>
                    <div className="profile-rating-num">{cat.rating}</div>
                    <div className="profile-chart-wrap">
                      {cat.stats
                        ? <Doughnut data={createChartData(cat.stats)} options={chartOptions} />
                        : <p className="profile-no-data">No data yet</p>
                      }
                    </div>
                  </div>
                ))}
              </div>

              {/* Lichess Rating Cards */}
              {lichessData && (
                <div className="profile-lichess-ratings">
                  <div className="profile-lichess-ratings-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" x2="9.01" y1="9" y2="9" />
                      <line x1="15" x2="15.01" y1="9" y2="9" />
                    </svg>
                    <h4>LICHESS RATINGS</h4>
                    <span className="profile-lichess-username-badge">@{lichessData.username}</span>
                  </div>
                  <div className="profile-ratings-grid">
                    {[
                      { label: 'Bullet', key: 'bullet', icon: '⚡' },
                      { label: 'Blitz', key: 'blitz', icon: '🔥' },
                      { label: 'Rapid', key: 'rapid', icon: '⏱' },
                    ].map((cat) => {
                      const perf = getLichessRating(cat.key);
                      return (
                        <div key={cat.key} className="profile-rating-card profile-rating-card--lichess">
                          <div className="profile-lichess-card-badge">
                            <span>{cat.icon}</span>
                            Lichess
                          </div>
                          <h3 className="profile-rating-title profile-rating-title--lichess">{cat.label}</h3>
                          <div className="profile-rating-num">
                            {perf ? perf.rating : '—'}
                          </div>
                          {perf && (
                            <div className="profile-lichess-perf-stats">
                              <span className="profile-lichess-games-count">
                                {perf.games?.toLocaleString() || 0} games
                              </span>
                              {perf.prog !== undefined && perf.prog !== 0 && (
                                <span className={`profile-lichess-prog ${perf.prog > 0 ? 'prog-up' : 'prog-down'}`}>
                                  {perf.prog > 0 ? '+' : ''}{perf.prog}
                                </span>
                              )}
                            </div>
                          )}
                          {!perf && (
                            <p className="profile-no-data">Not rated</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Tactical + Engine */}
            <div className="profile-right-col">
              {/* Tactical Proficiency */}
              <div className="profile-panel">
                <div className="profile-panel-header">
                  <h4>TACTICAL PROFICIENCY</h4>
                </div>
                <div className="profile-tactical-content">
                  <div className="profile-progress-item">
                    <div className="profile-progress-header">
                      <span>Opening Mastery</span>
                      <span className="profile-progress-pct">92%</span>
                    </div>
                    <div className="profile-progress-bar">
                      <div className="profile-progress-fill" style={{ width: '92%', background: 'var(--primary-container)' }} />
                    </div>
                  </div>
                  <div className="profile-progress-item">
                    <div className="profile-progress-header">
                      <span>Endgame Precision</span>
                      <span className="profile-progress-pct">48%</span>
                    </div>
                    <div className="profile-progress-bar">
                      <div className="profile-progress-fill" style={{ width: '48%', background: 'var(--tertiary-container)' }} />
                    </div>
                  </div>
                  <p className="profile-tactical-insight">
                    Your performance in middle-game tactics has improved by <strong style={{ color: 'var(--secondary)' }}>14%</strong> this month. Focus on Knight endgames to reach your next Elo milestone.
                  </p>
                </div>
              </div>

              {/* Engine Analysis */}
              <div className="profile-panel">
                <div className="profile-panel-header">
                  <h4>ENGINE ANALYSIS</h4>
                </div>
                <div className="profile-engine-content">
                  <div className="profile-engine-row">
                    <span className="profile-engine-label">Best Move</span>
                    <span className="profile-engine-value">Nf3 → d4</span>
                  </div>
                  <div className="profile-engine-row">
                    <span className="profile-engine-label">Line Analysis</span>
                    <span className="profile-engine-value">e4 e5 Nf3 Nc6</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;