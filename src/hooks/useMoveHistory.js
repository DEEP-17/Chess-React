import { useCallback, useMemo, useState } from 'react';

/** Slot 0 is the start position; each later slot is exactly one completed ply. */
export default function useMoveHistory(initialFen) {
  const [history, setHistory] = useState(() => [initialFen]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);

  const resetHistory = useCallback((fen) => {
    setHistory([fen]);
    setCurrentMoveIndex(0);
  }, []);

  const recordPosition = useCallback((fen) => {
    setHistory((previous) => {
      if (previous[previous.length - 1] === fen) return previous;
      const nextHistory = [...previous, fen];
      setCurrentMoveIndex(nextHistory.length - 1);
      return nextHistory;
    });
  }, []);

  const goTo = useCallback((index) => {
    setCurrentMoveIndex(() => Math.max(0, Math.min(index, history.length - 1)));
  }, [history.length]);
  const previous = useCallback(() => setCurrentMoveIndex((index) => Math.max(0, index - 1)), []);
  const next = useCallback(() => setCurrentMoveIndex((index) => Math.min(history.length - 1, index + 1)), [history.length]);
  const live = useCallback(() => setCurrentMoveIndex(history.length - 1), [history.length]);

  const isLive = currentMoveIndex === history.length - 1;
  const displayFen = history[currentMoveIndex] ?? history[history.length - 1];

  return useMemo(() => ({ history, currentMoveIndex, displayFen, isLive, resetHistory, recordPosition, goTo, previous, next, live }), [history, currentMoveIndex, displayFen, isLive, resetHistory, recordPosition, goTo, previous, next, live]);
}
