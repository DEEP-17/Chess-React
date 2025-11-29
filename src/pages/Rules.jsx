import { useState } from 'react';
import '../styles/Rules.css';

const Rules = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const rulesData = [
    {
      title: "Basic Setup",
      items: [
        "The chessboard consists of 64 squares in an 8x8 grid, alternating between light and dark colors",
        "White pieces are placed on the first two rows, black pieces on the last two rows",
        "Each player starts with 16 pieces: 1 king, 1 queen, 2 rooks, 2 knights, 2 bishops, and 8 pawns",
        "The queen starts on her own color (white queen on white square, black queen on black square)",
        "The board must be positioned so each player has a white square in their bottom-right corner"
      ]
    },
    {
      title: "Movement Rules",
      items: [
        "The king moves one square in any direction",
        "The queen moves any number of squares diagonally, horizontally, or vertically",
        "Rooks move any number of squares horizontally or vertically",
        "Bishops move any number of squares diagonally",
        "Knights move in an L-shape: two squares in one direction and then one square perpendicular",
        "Pawns move forward one square at a time, but can move two squares on their first move",
        "Pawns capture diagonally one square forward",
        "Pieces cannot jump over other pieces (except knights)",
        "No piece can move to a square occupied by a piece of the same color"
      ]
    },
    {
      title: "Special Moves",
      items: [
        "Castling involves moving the king two squares toward a rook and placing the rook on the other side",
        "En passant allows a pawn to capture an opponent's pawn that has just moved two squares",
        "Pawn promotion occurs when a pawn reaches the opposite end of the board",
        "When promoting, a pawn can become any piece except a king"
      ]
    },
    {
      title: "Game Flow",
      items: [
        "White always moves first",
        "Players must alternate turns",
        "Each turn consists of moving one piece according to its rules",
        "A piece must be moved if a legal move is available",
        "The game continues until checkmate or a draw occurs"
      ]
    },
    {
      title: "Check and Checkmate",
      items: [
        "Check occurs when a king is under threat of capture",
        "When in check, the player must move to remove the threat",
        "Only three options exist when in check: move the king, block the check, or capture the threatening piece",
        "Checkmate occurs when a king is in check and no legal move can prevent capture",
        "A player cannot make a move that puts or leaves their own king in check"
      ]
    },
    {
      title: "Draw Conditions",
      items: [
        "Stalemate occurs when a player has no legal moves but is not in check",
        "Threefold repetition: same position occurs three times with the same player to move",
        "Fifty-move rule: no pawn moves or captures in the last 50 moves",
        "Insufficient material: neither player has enough pieces to force checkmate",
        "Players can agree to a draw at any time"
      ]
    },
    {
      title: "Basic Strategy",
      items: [
        "Control the center of the board",
        "Develop your pieces early in the game",
        "Castle early to protect your king",
        "Don't bring your queen out too early",
        "Connect your rooks by moving pieces between them",
        "Create a strong pawn structure",
        "Look for forced moves and combinations",
        "Think about your opponent's threats",
        "Plan several moves ahead",
        "Protect your king's position"
      ]
    },
    {
      title: "Tournament Rules",
      items: [
        "Touch-move rule: if you touch a piece, you must move it if possible",
        "Games may be timed using a chess clock",
        "Players must record their moves in standard notation",
        "Players must offer draws verbally and during their own turn",
        "Players should shake hands before and after the game"
      ]
    }
  ];

  // Search Filter Logic
  const filteredRules = rulesData.filter(category => {
    const searchLower = searchTerm.toLowerCase();
    const titleMatch = category.title.toLowerCase().includes(searchLower);
    const itemMatch = category.items.some(item => item.toLowerCase().includes(searchLower));
    return titleMatch || itemMatch;
  });

  return (
    <div className="rules-page-container">
      <div className="rules-content-wrapper">
        <header className="rules-header">
          <h1>Chess Rules</h1>
          <div className="search-container">
            <input 
              type="text" 
              className="search-input"
              placeholder="Search rules..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        <div className="rules-list">
          {filteredRules.length > 0 ? (
            filteredRules.map((category, index) => (
              <div key={index} className="rule-category">
                <h2>{category.title}</h2>
                <ul>
                  {category.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', fontSize: '1.2rem', color: '#888' }}>
              No rules found matching "{searchTerm}"
            </div>
          )}
        </div>

        <footer className="rules-footer">
          <p>Learn and master the game of chess with these fundamental rules.</p>
        </footer>
      </div>
    </div>
  );
};

export default Rules;