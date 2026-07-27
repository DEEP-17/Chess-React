const BotChatPanel = ({ bot, message, isThinking }) => (
  <div className="bot-chat-panel" style={{ '--bot-color': bot.personalityColour }}>
    <div className="bot-chat-header">
      <div className="bot-chat-avatar" aria-hidden="true">
        {bot.avatar}
      </div>
      <div className="bot-chat-meta">
        <span className="bot-chat-name">{bot.name}</span>
        <span className="bot-chat-location">{bot.city}, {bot.country}</span>
      </div>
      {isThinking && (
        <span className="bot-chat-thinking-badge">Thinking…</span>
      )}
    </div>
    <div className="bot-chat-bubble">
      {message || '…'}
    </div>
  </div>
);

export default BotChatPanel;
