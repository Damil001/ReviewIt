import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config.js';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        setSocket(null);
        setConnectedUsers([]);
        setCursors({});
      }
      return;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        userId: user._id || user.id,
        userName: user.name || user.email,
      },
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnectedUsers([]);
      setCursors({});
    });

    newSocket.on('user-joined', (data) => {
      setConnectedUsers(prev => {
        if (!prev.find(u => u.socketId === data.socketId)) {
          return [...prev, { socketId: data.socketId, ...data }];
        }
        return prev;
      });
    });

    newSocket.on('user-left', (data) => {
      setConnectedUsers(prev => prev.filter(u => u.socketId !== data.socketId));
      setCursors(prev => {
        const updated = { ...prev };
        delete updated[data.socketId];
        return updated;
      });
    });

    newSocket.on('cursor-update', (data) => {
      setCursors(prev => ({
        ...prev,
        [data.socketId]: {
          x: data.x,
          y: data.y,
          author: data.author,
        },
      }));
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const joinProject = (projectId) => {
    if (socketRef.current) {
      socketRef.current.emit('join-project', { projectId });
    }
  };

  const leaveProject = (projectId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-project', { projectId });
    }
  };

  const sendCursorUpdate = (projectId, x, y) => {
    if (socketRef.current) {
      socketRef.current.emit('cursor-move', {
        projectId,
        x,
        y,
        author: user?.name || 'Anonymous',
      });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connectedUsers,
        cursors,
        joinProject,
        leaveProject,
        sendCursorUpdate,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

