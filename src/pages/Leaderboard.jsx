import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getLeaderboard } from '../services/lichess';
import '../styles/Leaderboard.css';

const PERF_TYPES = [
  { key: 'bullet', label: 'Bullet', icon: '⚡' },
  { key: 'blitz', label: 'Blitz', icon: '🔥' },
  { key: 'rapid', label: 'Rapid', icon: '⏱' },
  { key: 'classical', label: 'Classical', icon: '🏛' },
  { key: 'chess960', label: 'Chess960', icon: '🎲' },
  { key: 'ultraBullet', label: 'UltraBullet', icon: '💨' },
];

const Leaderboard = () => {
  const navigate = useNavigate();
  const [perf, setPerf] = useState('blitz');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getLeaderboard(perf, 50)
      .then((data) => {
        if (cancelled) return;
        setPlayers(data.users || []);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Leaderboard fetch error:', err);
          setError('Could not load leaderboard data.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [perf]);

  const currentPerf = PERF_TYPES.find((p) => p.key === perf) || PERF_TYPES[1];

  return (
    <div className="lb-layout">
      <Sidebar />
      <div className="lb-main">
        <header className="lb-topbar">
          <h1 className="lb-brand">Leaderboard</h1>
          <span className="lb-subtitle">
            Top Lichess Players — {currentPerf.icon} {currentPerf.label}
          </span>
        </header>

        {/* Perf Type Tabs */}
        <div className="lb-tabs-wrap">
          <div className="lb-tabs">
            {PERF_TYPES.map((p) => (
              <button
                key={p.key}
                className={`lb-tab ${perf === p.key ? 'lb-tab--active' : ''}`}
                onClick={() => setPerf(p.key)}
              >
                <span className="lb-tab-icon">{p.icon}</span>
                <span className="lb-tab-label">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lb-content">
          {loading && (
            <div className="lb-loading">
              <div className="lb-spinner" />
              <span>Loading top players...</span>
            </div>
          )}

          {error && <div className="lb-error">{error}</div>}

          {!loading && !error && players.length > 0 && (
            <div className="lb-table-wrap">
              <table className="lb-table">
                <thead>
                  <tr>
                    <th className="lb-th-rank">#</th>
                    <th>Player</th>
                    <th className="lb-th-rating">Rating</th>
                    <th className="lb-th-progress">Progress</th>
                    <th className="lb-th-status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, idx) => {
                    const rating = player.perfs?.[perf]?.rating || '?';
                    const progress = player.perfs?.[perf]?.progress || 0;
                    const isOnline = player.online;
                    const title = player.title;

                    return (
                      <tr
                        key={player.id}
                        className="lb-row"
                        onClick={() => navigate(`/lichess-player/${player.username}`)}
                      >
                        <td className="lb-rank">
                          <span className={`lb-rank-badge ${idx < 3 ? `lb-rank--top${idx + 1}` : ''}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="lb-player-cell">
                          {title && (
                            <span className="lb-title-badge">{title}</span>
                          )}
                          <span className="lb-player-name">{player.username}</span>
                          {player.patron && <span className="lb-patron">🦁</span>}
                        </td>
                        <td className="lb-rating">{rating}</td>
                        <td className={`lb-progress ${progress > 0 ? 'lb-progress--up' : progress < 0 ? 'lb-progress--down' : ''}`}>
                          {progress > 0 ? `+${progress}` : progress === 0 ? '—' : progress}
                        </td>
                        <td className="lb-status-cell">
                          {isOnline ? (
                            <span className="lb-online-badge">
                              <span className="lb-online-dot" />
                              Online
                            </span>
                          ) : (
                            <span className="lb-offline-badge">Offline</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && players.length === 0 && (
            <div className="lb-empty">No players found for this category.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
