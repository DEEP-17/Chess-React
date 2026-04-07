import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import '../styles/Rules.css';

/* ── Custom SVG Illustrations per Category ── */
const IllustrationBoard = () => (
  <svg viewBox="0 0 120 120" fill="none" className="rules-illus">
    {/* 4x4 chessboard pattern */}
    <rect x="10" y="10" width="100" height="100" rx="12" fill="var(--surface-container-highest)" />
    <rect x="18" y="18" width="20" height="20" rx="3" fill="var(--surface-container)" />
    <rect x="38" y="18" width="20" height="20" rx="3" fill="var(--surface-container-high)" opacity="0.6" />
    <rect x="58" y="18" width="20" height="20" rx="3" fill="var(--surface-container)" />
    <rect x="78" y="18" width="20" height="20" rx="3" fill="var(--surface-container-high)" opacity="0.6" />
    <rect x="18" y="38" width="20" height="20" rx="3" fill="var(--surface-container-high)" opacity="0.6" />
    <rect x="38" y="38" width="20" height="20" rx="3" fill="var(--surface-container)" />
    <rect x="58" y="38" width="20" height="20" rx="3" fill="var(--surface-container-high)" opacity="0.6" />
    <rect x="78" y="38" width="20" height="20" rx="3" fill="var(--surface-container)" />
    <rect x="18" y="58" width="20" height="20" rx="3" fill="var(--surface-container)" />
    <rect x="38" y="58" width="20" height="20" rx="3" fill="var(--surface-container-high)" opacity="0.6" />
    <rect x="58" y="58" width="20" height="20" rx="3" fill="var(--surface-container)" />
    <rect x="78" y="58" width="20" height="20" rx="3" fill="var(--surface-container-high)" opacity="0.6" />
    <rect x="18" y="78" width="20" height="20" rx="3" fill="var(--surface-container-high)" opacity="0.6" />
    <rect x="38" y="78" width="20" height="20" rx="3" fill="var(--surface-container)" />
    <rect x="58" y="78" width="20" height="20" rx="3" fill="var(--surface-container-high)" opacity="0.6" />
    <rect x="78" y="78" width="20" height="20" rx="3" fill="var(--surface-container)" />
    {/* King & queen placed */}
    <text x="28" y="73" fontSize="18" textAnchor="middle" fill="var(--primary)">♚</text>
    <text x="68" y="33" fontSize="18" textAnchor="middle" fill="var(--secondary)">♛</text>
    <text x="88" y="73" fontSize="18" textAnchor="middle" fill="var(--primary)" opacity="0.5">♜</text>
  </svg>
);

const IllustrationMoves = () => (
  <svg viewBox="0 0 120 120" fill="none" className="rules-illus">
    <rect x="10" y="10" width="100" height="100" rx="12" fill="var(--surface-container-highest)" />
    {/* Knight in center */}
    <text x="60" y="62" fontSize="28" textAnchor="middle" dominantBaseline="middle" fill="var(--primary)">♞</text>
    {/* L-shape move arrows */}
    <line x1="60" y1="48" x2="60" y2="25" stroke="var(--secondary)" strokeWidth="2" strokeDasharray="4 3" opacity="0.7" />
    <line x1="60" y1="25" x2="78" y2="25" stroke="var(--secondary)" strokeWidth="2" strokeDasharray="4 3" opacity="0.7" />
    <circle cx="78" cy="25" r="5" fill="var(--secondary)" opacity="0.25" />
    <circle cx="78" cy="25" r="2.5" fill="var(--secondary)" opacity="0.6" />
    <line x1="60" y1="48" x2="60" y2="25" stroke="var(--secondary)" strokeWidth="0" />
    {/* second L */}
    <line x1="72" y1="55" x2="95" y2="55" stroke="var(--tertiary)" strokeWidth="2" strokeDasharray="4 3" opacity="0.5" />
    <line x1="95" y1="55" x2="95" y2="73" stroke="var(--tertiary)" strokeWidth="2" strokeDasharray="4 3" opacity="0.5" />
    <circle cx="95" cy="73" r="5" fill="var(--tertiary)" opacity="0.25" />
    <circle cx="95" cy="73" r="2.5" fill="var(--tertiary)" opacity="0.6" />
    {/* diagonal arrow for bishop */}
    <line x1="36" y1="36" x2="18" y2="18" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.35" />
    <line x1="84" y1="84" x2="100" y2="100" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.35" />
  </svg>
);

const IllustrationSpecial = () => (
  <svg viewBox="0 0 120 120" fill="none" className="rules-illus">
    <rect x="10" y="10" width="100" height="100" rx="12" fill="var(--surface-container-highest)" />
    {/* Castling: King + Rook swap */}
    <text x="35" y="50" fontSize="20" textAnchor="middle" fill="var(--primary)">♚</text>
    <text x="85" y="50" fontSize="20" textAnchor="middle" fill="var(--primary)" opacity="0.5">♜</text>
    {/* Swap arrow */}
    <path d="M 45 42 C 60 30, 70 30, 75 42" stroke="var(--secondary)" strokeWidth="2" fill="none" markerEnd="url(#arrowG)" opacity="0.7" />
    <path d="M 75 55 C 60 67, 50 67, 45 55" stroke="var(--tertiary)" strokeWidth="2" fill="none" opacity="0.5" />
    <defs>
      <marker id="arrowG" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="var(--secondary)" />
      </marker>
    </defs>
    {/* Pawn promotion sparkle */}
    <text x="60" y="88" fontSize="14" textAnchor="middle" fill="var(--on-surface-variant)">♟</text>
    <text x="60" y="104" fontSize="10" textAnchor="middle" fill="var(--tertiary)">→ ♛</text>
    {/* Sparkle */}
    <circle cx="78" cy="80" r="1.5" fill="var(--tertiary)" opacity="0.6" />
    <circle cx="82" cy="76" r="1" fill="var(--secondary)" opacity="0.5" />
    <circle cx="74" cy="84" r="1" fill="var(--primary)" opacity="0.4" />
  </svg>
);

const IllustrationCheck = () => (
  <svg viewBox="0 0 120 120" fill="none" className="rules-illus">
    <rect x="10" y="10" width="100" height="100" rx="12" fill="var(--surface-container-highest)" />
    {/* King under attack */}
    <text x="60" y="58" fontSize="30" textAnchor="middle" dominantBaseline="middle" fill="var(--error)">♚</text>
    {/* Danger ring */}
    <circle cx="60" cy="55" r="22" stroke="var(--error)" strokeWidth="2" fill="none" opacity="0.3" strokeDasharray="5 4" />
    <circle cx="60" cy="55" r="30" stroke="var(--error)" strokeWidth="1" fill="none" opacity="0.1" strokeDasharray="3 5" />
    {/* Attacking queen */}
    <text x="25" y="28" fontSize="16" textAnchor="middle" fill="var(--tertiary)" opacity="0.8">♛</text>
    <line x1="32" y1="32" x2="48" y2="45" stroke="var(--tertiary)" strokeWidth="1.5" opacity="0.4" />
    {/* Lightning bolt for emphasis */}
    <path d="M 88 18 L 82 36 L 90 36 L 84 52" stroke="var(--error)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const IllustrationDraw = () => (
  <svg viewBox="0 0 120 120" fill="none" className="rules-illus">
    <rect x="10" y="10" width="100" height="100" rx="12" fill="var(--surface-container-highest)" />
    {/* Two kings facing off — equals sign */}
    <text x="38" y="58" fontSize="24" textAnchor="middle" dominantBaseline="middle" fill="var(--primary)">♚</text>
    <text x="82" y="58" fontSize="24" textAnchor="middle" dominantBaseline="middle" fill="var(--on-surface-variant)">♚</text>
    {/* Equals / handshake symbol */}
    <line x1="50" y1="50" x2="70" y2="50" stroke="var(--outline)" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
    <line x1="50" y1="58" x2="70" y2="58" stroke="var(--outline)" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
    {/* Circular loop for repetition */}
    <circle cx="60" cy="88" r="12" stroke="var(--outline-variant)" strokeWidth="1.5" fill="none" strokeDasharray="4 3" opacity="0.4" />
    <path d="M 68 88 L 72 84 L 72 92 Z" fill="var(--outline-variant)" opacity="0.4" />
    {/* 50 text */}
    <text x="60" y="92" fontSize="8" textAnchor="middle" fill="var(--outline)" fontWeight="600">½–½</text>
  </svg>
);

const IllustrationTournament = () => (
  <svg viewBox="0 0 120 120" fill="none" className="rules-illus">
    <rect x="10" y="10" width="100" height="100" rx="12" fill="var(--surface-container-highest)" />
    {/* Trophy / cup */}
    <path d="M 42 35 L 42 55 Q 42 72 60 72 Q 78 72 78 55 L 78 35 Z" fill="none" stroke="var(--tertiary)" strokeWidth="2" opacity="0.7" />
    <rect x="52" y="72" width="16" height="6" rx="2" fill="var(--tertiary)" opacity="0.5" />
    <rect x="48" y="78" width="24" height="4" rx="2" fill="var(--tertiary)" opacity="0.3" />
    {/* Handles */}
    <path d="M 42 40 Q 30 40 30 50 Q 30 58 42 58" stroke="var(--tertiary)" strokeWidth="1.5" fill="none" opacity="0.4" />
    <path d="M 78 40 Q 90 40 90 50 Q 90 58 78 58" stroke="var(--tertiary)" strokeWidth="1.5" fill="none" opacity="0.4" />
    {/* Star on trophy */}
    <text x="60" y="56" fontSize="14" textAnchor="middle" fill="var(--tertiary)" opacity="0.9">★</text>
    {/* Clock icon */}
    <circle cx="30" cy="90" r="10" stroke="var(--primary)" strokeWidth="1.5" fill="none" opacity="0.35" />
    <line x1="30" y1="90" x2="30" y2="84" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    <line x1="30" y1="90" x2="35" y2="92" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    {/* Pencil / notation */}
    <line x1="85" y1="95" x2="95" y2="82" stroke="var(--secondary)" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    <polygon points="95,82 93,80 97,78" fill="var(--secondary)" opacity="0.35" />
  </svg>
);

/* ─── Strategy Illustrations ─── */
const IllustrationOpening = () => (
  <svg viewBox="0 0 120 120" fill="none" className="rules-illus">
    <rect x="10" y="10" width="100" height="100" rx="12" fill="var(--surface-container-highest)" />
    {/* Center squares highlighted */}
    <rect x="42" y="42" width="18" height="18" rx="3" fill="var(--primary)" opacity="0.15" />
    <rect x="60" y="42" width="18" height="18" rx="3" fill="var(--primary)" opacity="0.15" />
    <rect x="42" y="60" width="18" height="18" rx="3" fill="var(--primary)" opacity="0.15" />
    <rect x="60" y="60" width="18" height="18" rx="3" fill="var(--primary)" opacity="0.15" />
    {/* Pawns pushing to center */}
    <text x="51" y="56" fontSize="14" textAnchor="middle" fill="var(--on-surface-variant)" opacity="0.8">♟</text>
    <text x="69" y="56" fontSize="14" textAnchor="middle" fill="var(--on-surface-variant)" opacity="0.8">♟</text>
    {/* Arrows from back rank */}
    <line x1="30" y1="90" x2="30" y2="70" stroke="var(--secondary)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
    <polygon points="30,68 27,74 33,74" fill="var(--secondary)" opacity="0.5" />
    <line x1="50" y1="90" x2="50" y2="78" stroke="var(--secondary)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
    <polygon points="50,76 47,82 53,82" fill="var(--secondary)" opacity="0.5" />
    {/* Knights developing */}
    <text x="30" y="95" fontSize="12" textAnchor="middle" fill="var(--secondary)" opacity="0.6">♞</text>
    <text x="90" y="95" fontSize="12" textAnchor="middle" fill="var(--secondary)" opacity="0.6">♝</text>
    {/* Castle hint */}
    <path d="M 75 95 Q 85 88, 95 95" stroke="var(--primary)" strokeWidth="1" strokeDasharray="3 2" fill="none" opacity="0.3" />
  </svg>
);

const IllustrationMiddlegame = () => (
  <svg viewBox="0 0 120 120" fill="none" className="rules-illus">
    <rect x="10" y="10" width="100" height="100" rx="12" fill="var(--surface-container-highest)" />
    {/* Fork: Knight attacking two pieces */}
    <text x="60" y="60" fontSize="22" textAnchor="middle" dominantBaseline="middle" fill="var(--primary)">♞</text>
    {/* Two targets */}
    <text x="35" y="35" fontSize="16" textAnchor="middle" fill="var(--error)" opacity="0.7">♜</text>
    <text x="88" y="35" fontSize="16" textAnchor="middle" fill="var(--error)" opacity="0.7">♛</text>
    {/* Attack lines */}
    <line x1="55" y1="48" x2="40" y2="38" stroke="var(--secondary)" strokeWidth="2" opacity="0.5" />
    <line x1="66" y1="48" x2="82" y2="38" stroke="var(--secondary)" strokeWidth="2" opacity="0.5" />
    {/* Lightning bolts */}
    <path d="M 36 42 L 33 48 L 38 48 L 35 54" stroke="var(--tertiary)" strokeWidth="1.5" fill="none" opacity="0.4" />
    <path d="M 86 42 L 83 48 L 88 48 L 85 54" stroke="var(--tertiary)" strokeWidth="1.5" fill="none" opacity="0.4" />
    {/* "FORK" label */}
    <text x="60" y="90" fontSize="8" textAnchor="middle" fill="var(--outline)" fontWeight="700" letterSpacing="0.1em">FORK</text>
    <line x1="38" y1="86" x2="82" y2="86" stroke="var(--outline-variant)" strokeWidth="0.5" opacity="0.3" />
  </svg>
);

const IllustrationPositional = () => (
  <svg viewBox="0 0 120 120" fill="none" className="rules-illus">
    <rect x="10" y="10" width="100" height="100" rx="12" fill="var(--surface-container-highest)" />
    {/* Pawn chain */}
    <text x="30" y="85" fontSize="12" textAnchor="middle" fill="var(--on-surface-variant)" opacity="0.8">♟</text>
    <text x="45" y="72" fontSize="12" textAnchor="middle" fill="var(--on-surface-variant)" opacity="0.8">♟</text>
    <text x="60" y="59" fontSize="12" textAnchor="middle" fill="var(--on-surface-variant)" opacity="0.8">♟</text>
    <text x="75" y="72" fontSize="12" textAnchor="middle" fill="var(--on-surface-variant)" opacity="0.8">♟</text>
    <text x="90" y="85" fontSize="12" textAnchor="middle" fill="var(--on-surface-variant)" opacity="0.8">♟</text>
    {/* Chain links */}
    <line x1="33" y1="80" x2="42" y2="70" stroke="var(--primary)" strokeWidth="1" opacity="0.3" strokeDasharray="2 2" />
    <line x1="48" y1="68" x2="57" y2="57" stroke="var(--primary)" strokeWidth="1" opacity="0.3" strokeDasharray="2 2" />
    <line x1="63" y1="57" x2="72" y2="68" stroke="var(--primary)" strokeWidth="1" opacity="0.3" strokeDasharray="2 2" />
    <line x1="78" y1="68" x2="87" y2="80" stroke="var(--primary)" strokeWidth="1" opacity="0.3" strokeDasharray="2 2" />
    {/* Knight on outpost */}
    <text x="60" y="38" fontSize="16" textAnchor="middle" fill="var(--secondary)">♞</text>
    <rect x="50" y="28" width="20" height="16" rx="4" stroke="var(--secondary)" strokeWidth="1" fill="none" opacity="0.25" strokeDasharray="3 2" />
    {/* Open file arrow for rook */}
    <line x1="25" y1="30" x2="25" y2="60" stroke="var(--primary-container)" strokeWidth="2" opacity="0.35" />
    <polygon points="25,28 22,34 28,34" fill="var(--primary-container)" opacity="0.35" />
    <text x="25" y="68" fontSize="10" textAnchor="middle" fill="var(--primary-container)" opacity="0.5">♜</text>
  </svg>
);

const IllustrationEndgame = () => (
  <svg viewBox="0 0 120 120" fill="none" className="rules-illus">
    <rect x="10" y="10" width="100" height="100" rx="12" fill="var(--surface-container-highest)" />
    {/* Active king marching forward */}
    <text x="60" y="55" fontSize="26" textAnchor="middle" dominantBaseline="middle" fill="var(--primary)">♔</text>
    {/* Crown glow */}
    <circle cx="60" cy="50" r="18" stroke="var(--primary)" strokeWidth="1" fill="none" opacity="0.15" />
    {/* Passed pawn racing */}
    <text x="88" y="40" fontSize="14" textAnchor="middle" fill="var(--secondary)">♟</text>
    <line x1="88" y1="36" x2="88" y2="20" stroke="var(--secondary)" strokeWidth="2" strokeDasharray="3 3" opacity="0.5" />
    <polygon points="88,18 85,24 91,24" fill="var(--secondary)" opacity="0.5" />
    {/* Promotion crown at top */}
    <text x="88" y="18" fontSize="8" textAnchor="middle" fill="var(--tertiary)" opacity="0.7">♛</text>
    {/* Opposition markers */}
    <text x="32" y="90" fontSize="18" textAnchor="middle" fill="var(--error)" opacity="0.4">♚</text>
    <line x1="42" y1="83" x2="50" y2="60" stroke="var(--outline-variant)" strokeWidth="1" strokeDasharray="2 3" opacity="0.25" />
    {/* VS dots */}
    <circle cx="60" cy="85" r="2" fill="var(--outline)" opacity="0.3" />
    <circle cx="60" cy="92" r="2" fill="var(--outline)" opacity="0.3" />
  </svg>
);

/* ── Icon map ── */
const rulesIllustrations = {
  'Basic Setup': <IllustrationBoard />,
  'Movement Rules': <IllustrationMoves />,
  'Special Moves': <IllustrationSpecial />,
  'Check and Checkmate': <IllustrationCheck />,
  'Draw Conditions': <IllustrationDraw />,
  'Tournament Rules': <IllustrationTournament />,
};

const strategyIllustrations = {
  'Opening Principles': <IllustrationOpening />,
  'Middlegame Tactics': <IllustrationMiddlegame />,
  'Positional Strategy': <IllustrationPositional />,
  'Endgame Fundamentals': <IllustrationEndgame />,
};

/* ── Accent colors per category ── */
const categoryAccents = {
  'Basic Setup': 'var(--primary)',
  'Movement Rules': 'var(--secondary)',
  'Special Moves': 'var(--tertiary)',
  'Check and Checkmate': 'var(--error)',
  'Draw Conditions': 'var(--outline)',
  'Tournament Rules': 'var(--tertiary)',
  'Opening Principles': 'var(--primary)',
  'Middlegame Tactics': 'var(--secondary)',
  'Positional Strategy': 'var(--primary-container)',
  'Endgame Fundamentals': 'var(--tertiary)',
};

const Rules = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('rules');
  const [searchTerm, setSearchTerm] = useState('');

  const pieces = [
    { name: 'King', symbol: '♚', value: 'K', desc: 'Moves one square in any direction. Invaluable.', color: 'var(--primary)' },
    { name: 'Queen', symbol: '♛', value: '9', desc: 'Moves any number of squares along rank, file, or diagonal.', color: 'var(--primary-container)' },
    { name: 'Rook', symbol: '♜', value: '5', desc: 'Moves any number of squares along rank or file.', color: 'var(--secondary)' },
    { name: 'Bishop', symbol: '♝', value: '3', desc: 'Moves any number of squares diagonally.', color: 'var(--tertiary)' },
    { name: 'Knight', symbol: '♞', value: '3', desc: "Moves in an 'L' shape. Can jump over other pieces.", color: 'var(--primary)' },
    { name: 'Pawn', symbol: '♟', value: '1', desc: 'Moves forward one square, captures diagonally.', color: 'var(--on-surface-variant)' },
  ];

  const rulesData = [
    {
      title: "Basic Setup",
      items: [
        "The chessboard consists of 64 squares in an 8×8 grid, alternating between light and dark colors",
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

  const strategyData = [
    {
      title: "Opening Principles",
      items: [
        "Control the center of the board with pawns and pieces",
        "Develop your minor pieces (knights and bishops) early",
        "Castle early to protect your king and connect your rooks",
        "Don't bring your queen out too early — it can become a target",
        "Avoid moving the same piece twice in the opening without reason",
        "Aim to develop all pieces before launching an attack"
      ]
    },
    {
      title: "Middlegame Tactics",
      items: [
        "Look for forks — attacking two pieces at once with one piece",
        "Use pins to immobilize your opponent's pieces",
        "Create discovered attacks by moving a piece to reveal an attack from another",
        "Set up skewers to attack a valuable piece hiding behind a lesser one",
        "Sacrifice material for a stronger positional advantage when appropriate",
        "Always calculate forced lines before making a move"
      ]
    },
    {
      title: "Positional Strategy",
      items: [
        "Control open files with your rooks",
        "Place knights on outpost squares deep in enemy territory",
        "Create a strong pawn structure — avoid isolated and doubled pawns",
        "Build a pawn chain to support your center control",
        "Maintain piece activity — a well-placed piece is worth more than a passive one",
        "Think about your opponent's threats before making your own plans"
      ]
    },
    {
      title: "Endgame Fundamentals",
      items: [
        "Activate your king in the endgame — it becomes a strong piece",
        "Push passed pawns toward promotion",
        "Use the opposition to gain control in king-and-pawn endgames",
        "Rook endgames: place your rook behind passed pawns (yours or opponent's)",
        "Learn basic checkmate patterns: King + Queen, King + Rook",
        "Simplify to favorable endgames when you have a material advantage"
      ]
    }
  ];

  const currentData = activeTab === 'rules' ? rulesData : strategyData;
  const currentIllustrations = activeTab === 'rules' ? rulesIllustrations : strategyIllustrations;

  const filteredData = currentData.filter(category => {
    const searchLower = searchTerm.toLowerCase();
    const titleMatch = category.title.toLowerCase().includes(searchLower);
    const itemMatch = category.items.some(item => item.toLowerCase().includes(searchLower));
    return titleMatch || itemMatch;
  });

  return (
    <div className="rules-layout">
      <Sidebar />

      <div className="rules-main">
        {/* Top Bar */}
        <header className="rules-topbar">
          <h1 className="rules-brand">ChessMaster</h1>
          <nav className="rules-nav-tabs">
            <button
              className={`rules-tab ${activeTab === 'rules' ? 'active' : ''}`}
              onClick={() => { setActiveTab('rules'); setSearchTerm(''); }}
            >Rules</button>
            <button
              className={`rules-tab ${activeTab === 'strategy' ? 'active' : ''}`}
              onClick={() => { setActiveTab('strategy'); setSearchTerm(''); }}
            >Strategy</button>
            <button className="rules-tab" onClick={() => navigate('/game')}>Play</button>
          </nav>
          <button className="rules-home-btn" onClick={() => navigate('/')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
              <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </button>
        </header>

        <div className="rules-content">
          {/* Hero Banner */}
          <div className="rules-hero">
            <div className="rules-hero-bg" />
            <div className="rules-hero-text">
              <h2 className="rules-hero-title">
                {activeTab === 'rules' ? 'Master the Art of the Gambit' : 'Dominate the Board'}
              </h2>
              <p className="rules-hero-sub">
                {activeTab === 'rules'
                  ? 'Learn the rules, understand the flow of the game, and dominate the board with fundamental strategies.'
                  : 'Advanced strategies and tactics to elevate your game from amateur to grandmaster level.'}
              </p>
              <button className="rules-hero-cta" onClick={() => navigate('/game')}>
                PLAY NOW →
              </button>
            </div>
          </div>

          {/* Pieces Section (only on rules tab) */}
          {activeTab === 'rules' && (
            <section className="rules-pieces-section">
              <h3 className="rules-section-title">The Pieces</h3>
              <div className="rules-pieces-grid">
                {pieces.map((piece) => (
                  <div key={piece.name} className="rules-piece-card">
                    <div className="rules-piece-icon-box">
                      <span className="rules-piece-symbol" style={{ color: piece.color }}>{piece.symbol}</span>
                    </div>
                    <div className="rules-piece-header">
                      <span className="rules-piece-name">{piece.name}</span>
                      <span className="rules-piece-value">{piece.value}</span>
                    </div>
                    <p className="rules-piece-desc">{piece.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Search */}
          <div className="rules-search-bar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              className="rules-search-input"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Illustrated Category Cards */}
          <div className="rules-categories">
            {filteredData.length > 0 ? (
              filteredData.map((category, index) => (
                <div key={index} className="rules-category-card">
                  <div className="rules-category-top">
                    {/* Illustration */}
                    <div className="rules-category-illus">
                      {currentIllustrations[category.title] || null}
                    </div>
                    {/* Text content */}
                    <div className="rules-category-body">
                      <div className="rules-category-title-row">
                        <span
                          className="rules-category-accent-bar"
                          style={{ background: categoryAccents[category.title] || 'var(--primary)' }}
                        />
                        <h3 className="rules-category-title">{category.title}</h3>
                      </div>
                      <ul className="rules-category-list">
                        {category.items.map((item, i) => (
                          <li key={i} className="rules-category-item">
                            <span
                              className="rules-item-dot"
                              style={{ background: categoryAccents[category.title] || 'var(--primary)' }}
                            />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rules-empty">
                No {activeTab} found matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rules;