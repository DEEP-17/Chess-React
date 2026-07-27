import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { BOT_PERSONALITIES } from '../data/botPersonalities';
import '../styles/BotSelection.css';

const BotSelection = () => {
  return (
    <div className="bot-selection-layout">
      <Sidebar />

      <div className="bot-selection-main">
        <header className="bot-selection-header">
          <div>
            <h1 className="bot-selection-title">Play Against Bot</h1>
            <p className="bot-selection-subtitle">
              Choose your AI companion. Same engine, unique personality.
            </p>
          </div>
          <Link to="/" className="bot-selection-back">← Home</Link>
        </header>

        <div className="bot-selection-grid">
          {BOT_PERSONALITIES.map((bot) => (
            <Link
              key={bot.id}
              to={`/play-bot/${bot.id}`}
              className="bot-card"
              style={{ '--bot-accent': bot.personalityColour }}
            >
              <div className="bot-card-top">
                <div className="bot-card-avatar">{bot.avatar}</div>
                <div className="bot-card-badge">{bot.difficulty}</div>
              </div>

              <h2 className="bot-card-name">{bot.name}</h2>
              <p className="bot-card-meta">
                {bot.age} · {bot.occupation} · {bot.city}, {bot.country}
              </p>
              <p className="bot-card-bio">{bot.bio}</p>

              <div className="bot-card-details">
                <div className="bot-card-detail">
                  <span className="bot-card-label">Opening</span>
                  <span>{bot.favouriteOpening}</span>
                </div>
                <div className="bot-card-detail">
                  <span className="bot-card-label">Food</span>
                  <span>{bot.favouriteFood}</span>
                </div>
              </div>

              <span className="bot-card-cta">Play with {bot.name.split(' ')[0]} →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BotSelection;
