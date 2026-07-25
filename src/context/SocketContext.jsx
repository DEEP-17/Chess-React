import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const newSocket = io(BACKEND_URL, { autoConnect: true });
    setSocket(newSocket);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('totalplayers', (count) => setOnlineCount(count));

    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineCount }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
