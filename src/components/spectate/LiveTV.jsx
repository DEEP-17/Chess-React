import { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getLiveTV, streamLiveTVFeed } from '../../services/lichess';
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

  // Streaming state for the featured (Top Rated) game
  const [streamFen, setStreamFen] = useState('start');
  const [streamPlayers, setStreamPlayers] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [streamActive, setStreamActive] = useState(false);
  const streamController = useRef(null);
  const gameRef = useRef(new Chess());

  // Fetch channel list for tabs + mini channel list
  useEffect(() => {
    let cancelled = false;

    const fetchTV = () => {
      getLiveTV()
        .then((data) => {
          if (cancelled) return;
          setChannels(data);
          if (!selectedChannel && data) {
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
    const interval = setInterval(fetchTV, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Stream the featured TV game
  useEffect(() => {
    // Abort previous stream
    if (streamController.current) {
      streamController.current.abort();
      streamController.current = null;
    }

    setStreamFen('start');
    setStreamPlayers(null);
    setLastMove(null);
    setStreamActive(false);
    gameRef.current = new Chess();

    const controller = streamLiveTVFeed(
      (event) => {
        if (event.t === 'featured') {
          // New featured game — contains full FEN + player data
          gameRef.current = new Chess();
          if (event.d?.fen) {
            gameRef.current.load(event.d.fen);
            setStreamFen(event.d.fen);
          }
          setStreamPlayers({
            white: {
              name: event.d?.players?.[0]?.user?.name || event.d?.players?.[0]?.user?.id || 'Anonymous',
              title: event.d?.players?.[0]?.user?.title || null,
              rating: event.d?.players?.[0]?.rating || '?',
            },
            black: {
              name: event.d?.players?.[1]?.user?.name || event.d?.players?.[1]?.user?.id || 'Anonymous',
              title: event.d?.players?.[1]?.user?.title || null,
              rating: event.d?.players?.[1]?.rating || '?',
            },
          });
          setLastMove(null);
          setStreamActive(true);
        } else if (event.t === 'fen') {
          // Move update — contains new FEN + last move in UCI
          if (event.d?.fen) {
            setStreamFen(event.d.fen);
            gameRef.current.load(event.d.fen);
          }
          if (event.d?.lm) {
            setLastMove({
              from: event.d.lm.substring(0, 2),
              to: event.d.lm.substring(2, 4),
            });
          }
        }
      },
      (err) => {
        console.error('TV stream error:', err);
        setStreamActive(false);
      }
    );

    streamController.current = controller;

    return () => {
      controller.abort();
    };
  }, []);

  // Highlight last move squares
  const lastMoveStyles = {};
  if (lastMove) {
    lastMoveStyles[lastMove.from] = {
      background: 'rgba(255, 255, 0, 0.25)',
    };
    lastMoveStyles[lastMove.to] = {
      background: 'rgba(255, 255, 0, 0.35)',
    };
  }

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
        {streamActive && <span className="ltv-stream-badge">● STREAMING</span>}
      </div>

      {/* Featured game (streamed in real time) */}
      {streamPlayers && (
        <div className="ltv-game">
          {/* Black player (top) */}
          <div className="ltv-player">
            {streamPlayers.black.title && (
              <span className="ltv-title-badge">{streamPlayers.black.title}</span>
            )}
            <span className="ltv-player-name">{streamPlayers.black.name}</span>
            <span className="ltv-player-rating">{streamPlayers.black.rating}</span>
          </div>

          <div className="ltv-board-wrap">
            <Chessboard
              id="LiveTVBoard"
              position={streamFen}
              boardWidth={260}
              arePiecesDraggable={false}
              customDarkSquareStyle={{ backgroundColor: '#272a2e' }}
              customLightSquareStyle={{ backgroundColor: '#3d4147' }}
              customSquareStyles={lastMoveStyles}
              animationDuration={300}
            />
          </div>

          {/* White player (bottom) */}
          <div className="ltv-player">
            {streamPlayers.white.title && (
              <span className="ltv-title-badge">{streamPlayers.white.title}</span>
            )}
            <span className="ltv-player-name">{streamPlayers.white.name}</span>
            <span className="ltv-player-rating">{streamPlayers.white.rating}</span>
          </div>

          <div className="ltv-status-bar">
            <span className="ltv-watch-dot" />
            <span>Watching live on ChessMaster</span>
          </div>
        </div>
      )}

      {/* Fallback if stream hasn't started yet */}
      {!streamPlayers && activeGame && (
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
              id="LiveTVBoardFallback"
              position="start"
              boardWidth={260}
              arePiecesDraggable={false}
              customDarkSquareStyle={{ backgroundColor: '#272a2e' }}
              customLightSquareStyle={{ backgroundColor: '#3d4147' }}
              animationDuration={300}
            />
          </div>

          <div className="ltv-status-bar">
            <div className="ltv-spinner ltv-spinner--small" />
            <span>Connecting to stream...</span>
          </div>
        </div>
      )}

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
