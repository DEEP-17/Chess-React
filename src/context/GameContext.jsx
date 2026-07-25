import { createContext, useContext, useReducer } from 'react';

const GameContext = createContext(null);

const initialState = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  history: [],
  orientation: 'white',
  gameMode: null, // 'pvp', 'ai', 'pass', '960'
  isGameOver: false,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_FEN':
      return { ...state, fen: action.payload };
    case 'ADD_MOVE':
      return { ...state, history: [...state.history, action.payload] };
    case 'SET_ORIENTATION':
      return { ...state, orientation: action.payload };
    case 'SET_MODE':
      return { ...state, gameMode: action.payload };
    case 'SET_GAME_OVER':
      return { ...state, isGameOver: action.payload };
    case 'RESET_GAME':
      return { ...initialState };
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
