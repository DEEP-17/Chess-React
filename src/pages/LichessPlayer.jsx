import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import Sidebar from '../components/Sidebar';
import { getLichessUser, getRatingHistory, getUserActivity } from '../services/lichess';
import '../styles/LichessPlayer.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const PERF_LABELS = {
  bullet: { label: 'Bullet', icon: '⚡' },
  blitz: { label: 'Blitz', icon: '🔥' },
  rapid: { label: 'Rapid', icon: '⏱' },
  classical: { label: 'Classical', icon: '🏛' },
  chess960: { label: 'Chess960', icon: '🎲' },
  ultraBullet: { label: 'UltraBullet', icon: '💨' },
  correspondence: { label: 'Correspondence', icon: '📬' },
  crazyhouse: { label: 'Crazyhouse', icon: '🏠' },
  antichess: { label: 'Antichess', icon: '♟' },
  atomic: { label: 'Atomic', icon: '💥' },
  horde: { label: 'Horde', icon: '🐝' },
  kingOfTheHill: { label: 'KotH', icon: '⛰' },
  racingKings: { label: 'Racing', icon: '🏎' },
  threeCheck: { label: '3-Check', icon: '✓' },
  puzzle: { label: 'Puzzles', icon: '🧩' },
};

const CHART_COLORS = [
  '#3b82f6', '#4edea3', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16',
];

const LichessPlayer = () => {
  const { username: paramUsername } = useParams();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState(paramUsername || '');
  const [username, setUsername] = useState(paramUsername || '');
  const [userData, setUserData] = useState(null);
  const [ratingHistory, setRatingHistory] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedChart, setSelectedChart] = useState('blitz');

  const fetchPlayerData = useCallback(async (uname) => {
    if (!uname.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const [user, history, act] = await Promise.all([
        getLichessUser(uname),
        getRatingHistory(uname).catch(() => null),
        getUserActivity(uname).catch(() => null),
      ]);
      setUserData(user);
      setRatingHistory(history);
      setActivity(act);

      // Pick the best default chart variant
      const perfs = user?.perfs || {};
      const best = ['blitz', 'bullet', 'rapid', 'classical'].find(
        (p) => perfs[p]?.games > 0
      );
      if (best) setSelectedChart(best);
    } catch (err) {
      console.error('Player fetch error:', err);
      setError(`Could not find Lichess user "${uname}".`);
      setUserData(null);
      setRatingHistory(null);
      setActivity(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (paramUsername) {
      setUsername(paramUsername);
      setSearchInput(paramUsername);
      fetchPlayerData(paramUsername);
    }
  }, [paramUsername, fetchPlayerData]);

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    if (trimmed && trimmed !== username) {
      setUsername(trimmed);
      navigate(`/lichess-player/${trimmed}`, { replace: true });
      fetchPlayerData(trimmed);
    } else if (trimmed && !userData) {
      fetchPlayerData(trimmed);
    }
  };

  // Build chart data for a specific perf type
  const getChartData = () => {
    if (!ratingHistory) return null;
    const perfData = ratingHistory.find(
      (r) => r.name?.toLowerCase() === selectedChart.toLowerCase()
    );
    if (!perfData?.points?.length) return null;

    // Points are [year, month, day, rating]
    const recentPoints = perfData.points.slice(-90);
    const labels = recentPoints.map(
      (p) => `${p[1] + 1}/${p[2]}/${p[0]}`
    );
    const data = recentPoints.map((p) => p[3]);

    return {
      labels,
      datasets: [
        {
          label: `${PERF_LABELS[selectedChart]?.label || selectedChart} Rating`,
          data,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 1,
          pointHoverRadius: 4,
        },
      ],
    };
  };

  const chartData = getChartData();

  // Format play time
  const formatPlayTime = (seconds) => {
    if (!seconds) return '—';
    const hours = Math.floor(seconds / 3600);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  // Get active perf types from user data
  const getActivePerfs = () => {
    if (!userData?.perfs) return [];
    return Object.entries(userData.perfs)
      .filter(([, val]) => val.games > 0)
      .sort((a, b) => b[1].games - a[1].games);
  };

  return (
    <div className="lp-layout">
      <Sidebar />
      <div className="lp-main">
        <header className="lp-topbar">
          <h1 className="lp-brand">Player Lookup</h1>
          <span className="lp-subtitle">Search any Lichess player</span>
        </header>

        {/* Search Bar */}
        <div className="lp-search-wrap">
          <div className="lp-search-bar">
            <svg className="lp-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="lp-search-input"
              placeholder="Enter Lichess username..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="lp-search-btn" onClick={handleSearch}>
              Search
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="lp-content">
          {loading && (
            <div className="lp-loading">
              <div className="lp-spinner" />
              <span>Loading player data...</span>
            </div>
          )}

          {error && <div className="lp-error">{error}</div>}

          {!loading && !error && userData && (
            <>
              {/* Profile Header */}
              <div className="lp-profile-header">
                <div className="lp-profile-avatar">
                  {userData.title && (
                    <span className="lp-profile-title">{userData.title}</span>
                  )}
                  <span className="lp-profile-initial">
                    {userData.username?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="lp-profile-info">
                  <h2 className="lp-profile-name">{userData.username}</h2>
                  <div className="lp-profile-meta">
                    {userData.online && (
                      <span className="lp-status-online">
                        <span className="lp-status-dot" /> Online
                      </span>
                    )}
                    {userData.count?.all != null && (
                      <span className="lp-meta-chip">
                        🎮 {userData.count.all.toLocaleString()} games
                      </span>
                    )}
                    {userData.playTime?.total != null && (
                      <span className="lp-meta-chip">
                        ⏱ {formatPlayTime(userData.playTime.total)} played
                      </span>
                    )}
                    {userData.profile?.country && (
                      <span className="lp-meta-chip">
                        🌍 {userData.profile.country}
                      </span>
                    )}
                  </div>
                  {userData.profile?.bio && (
                    <p className="lp-profile-bio">{userData.profile.bio}</p>
                  )}
                </div>
                <a
                  href={`https://lichess.org/@/${userData.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lp-lichess-link"
                >
                  View on Lichess →
                </a>
              </div>

              {/* Ratings Grid */}
              <div className="lp-section">
                <h3 className="lp-section-title">RATINGS</h3>
                <div className="lp-ratings-grid">
                  {getActivePerfs().map(([key, val], i) => {
                    const info = PERF_LABELS[key] || { label: key, icon: '♟' };
                    return (
                      <div
                        key={key}
                        className={`lp-rating-card ${selectedChart === key ? 'lp-rating-card--active' : ''}`}
                        onClick={() => setSelectedChart(key)}
                        style={{ '--accent': CHART_COLORS[i % CHART_COLORS.length] }}
                      >
                        <div className="lp-rating-icon">{info.icon}</div>
                        <div className="lp-rating-info">
                          <span className="lp-rating-label">{info.label}</span>
                          <span className="lp-rating-value">{val.rating || '?'}</span>
                        </div>
                        <div className="lp-rating-games">{val.games} games</div>
                        {val.prog != null && val.prog !== 0 && (
                          <div className={`lp-rating-prog ${val.prog > 0 ? 'lp-prog--up' : 'lp-prog--down'}`}>
                            {val.prog > 0 ? `+${val.prog}` : val.prog}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rating Chart */}
              {chartData && (
                <div className="lp-section">
                  <h3 className="lp-section-title">
                    RATING HISTORY — {PERF_LABELS[selectedChart]?.label || selectedChart}
                  </h3>
                  <div className="lp-chart-wrap">
                    <Line
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: '#1d2023',
                            borderColor: '#424754',
                            borderWidth: 1,
                            titleColor: '#e1e2e7',
                            bodyColor: '#c2c6d6',
                          },
                        },
                        scales: {
                          x: {
                            display: true,
                            ticks: { color: '#8c909f', maxTicksLimit: 8, font: { size: 10 } },
                            grid: { color: 'rgba(255,255,255,0.03)' },
                          },
                          y: {
                            ticks: { color: '#8c909f', font: { size: 10 } },
                            grid: { color: 'rgba(255,255,255,0.05)' },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {activity && Array.isArray(activity) && activity.length > 0 && (
                <div className="lp-section">
                  <h3 className="lp-section-title">RECENT ACTIVITY</h3>
                  <div className="lp-activity-list">
                    {activity.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="lp-activity-item">
                        {item.games && (
                          <div className="lp-activity-games">
                            {Object.entries(item.games).map(([variant, stats]) => (
                              <div key={variant} className="lp-activity-row">
                                <span className="lp-activity-variant">
                                  {PERF_LABELS[variant]?.icon || '♟'} {PERF_LABELS[variant]?.label || variant}
                                </span>
                                <span className="lp-activity-stats">
                                  {stats.win > 0 && <span className="lp-act-win">+{stats.win}</span>}
                                  {stats.draw > 0 && <span className="lp-act-draw">={stats.draw}</span>}
                                  {stats.loss > 0 && <span className="lp-act-loss">-{stats.loss}</span>}
                                  <span className="lp-act-rp">
                                    ({stats.rp?.before || '?'} → {stats.rp?.after || '?'})
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {item.puzzles && (
                          <div className="lp-activity-row">
                            <span className="lp-activity-variant">🧩 Puzzles</span>
                            <span className="lp-activity-stats">
                              {item.puzzles.score?.win > 0 && <span className="lp-act-win">+{item.puzzles.score.win}</span>}
                              {item.puzzles.score?.loss > 0 && <span className="lp-act-loss">-{item.puzzles.score.loss}</span>}
                              <span className="lp-act-rp">
                                ({item.puzzles.score?.rp?.before || '?'} → {item.puzzles.score?.rp?.after || '?'})
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && !error && !userData && !paramUsername && (
            <div className="lp-empty">
              <div className="lp-empty-icon">🔍</div>
              <h3>Search for a Lichess Player</h3>
              <p>Enter a username above to view their profile, ratings, and game history.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LichessPlayer;
