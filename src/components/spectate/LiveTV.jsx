import { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { getLiveTV } from '../../services/lichess';
import './LiveTV.css';

const CHANNEL_ICONS = {
  Bullet: '⚡',
  Blitz: '🔥',
  Rapid: '⏱',
  Classical: '🏛',
  'Chess960': '🎲',
  UltraBullet: '💨',
  Crazyhouse: '🏠',
  Antichess: '♟',
};

const CHANNEL_ORDER = ['Bullet', 'Blitz', 'Rapid', 'Classical', 'Chess960'];

const LiveTV = () => {
  const [channels, setChannels] = useState(null);
  const [error, setError] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchTV = () => {
      getLiveTV()
        .then((data) => {
          if (cancelled) return;
          setChannels(data);
          if (!selectedChannel && data) {
            // Auto-select first available channel
            const first = CHANNEL_ORDER.find((ch) => data[ch]);
            if (first) setSelectedChannel(first);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError('Could not load live games');
            console.error(err);
          }
        });
    };

    fetchTV();
    const interval = setInterval(fetchTV, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div className="ltv-panel">
        <div className="ltv-header">
          <span className="ltv-live-dot" />
          <h4>LIVE GAMES</h4>
        </div>
        <div className="ltv-error">{error}</div>
      </div>
    );
  }

  if (!channels) {
    return (
      <div className="ltv-panel">
        <div className="ltv-header">
          <span className="ltv-live-dot" />
          <h4>LIVE GAMES</h4>
        </div>
        <div className="ltv-loading">
          <div className="ltv-spinner" />
          <span>Loading live games...</span>
        </div>
      </div>
    );
  }

  const availableChannels = CHANNEL_ORDER.filter((ch) => channels[ch]);
  const activeGame = selectedChannel && channels[selectedChannel];

  return (
    <div className="ltv-panel">
      <div className="ltv-header">
        <span className="ltv-live-dot" />
        <h4>LIVE GAMES</h4>
      </div>

      {/* Channel tabs */}
      <div className="ltv-tabs">
        {availableChannels.map((ch) => (
          <button
            key={ch}
            className={`ltv-tab ${selectedChannel === ch ? 'ltv-tab--active' : ''}`}
            onClick={() => setSelectedChannel(ch)}
          >
            <span className="ltv-tab-icon">{CHANNEL_ICONS[ch] || '♟'}</span>
            <span className="ltv-tab-label">{ch}</span>
          </button>
        ))}
      </div>

      {/* Active game display */}
      {activeGame && (
        <div className="ltv-game">
          <div className="ltv-player">
            {activeGame.user?.title && (
              <span className="ltv-title-badge">{activeGame.user.title}</span>
            )}
            <span className="ltv-player-name">
              {activeGame.user?.name || activeGame.user?.id || 'Anonymous'}
            </span>
            <span className="ltv-player-rating">{activeGame.rating}</span>
          </div>

          <div className="ltv-board-wrap">
            <Chessboard
              id="LiveTVBoard"
              position="start"
              boardWidth={260}
              arePiecesDraggable={false}
              customDarkSquareStyle={{ backgroundColor: '#272a2e' }}
              customLightSquareStyle={{ backgroundColor: '#3d4147' }}
              animationDuration={300}
            />
          </div>

          <a
            href={`https://lichess.org/${activeGame.gameId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ltv-watch-btn"
          >
            <span className="ltv-watch-dot" />
            Watch on Lichess →
          </a>
        </div>
      )}

      {/* All channels mini list */}
      <div className="ltv-channel-list">
        {availableChannels
          .filter((ch) => ch !== selectedChannel)
          .slice(0, 3)
          .map((ch) => {
            const g = channels[ch];
            return (
              <div
                key={ch}
                className="ltv-channel-row"
                onClick={() => setSelectedChannel(ch)}
              >
                <span className="ltv-ch-icon">{CHANNEL_ICONS[ch] || '♟'}</span>
                <div className="ltv-ch-info">
                  <span className="ltv-ch-name">{ch}</span>
                  <span className="ltv-ch-player">
                    {g.user?.title ? `${g.user.title} ` : ''}
                    {g.user?.name || g.user?.id || 'Anon'} ({g.rating})
                  </span>
                </div>
                <span className="ltv-ch-live">LIVE</span>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default LiveTV;
