import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';

const SOCKET_URL = 'https://tradenexustradesmart.co.in';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = getAuthToken();
    socket = io(SOCKET_URL, {
      path: '/api/socket.io',
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      auth: { token: token || undefined },
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to Trade Nexus server');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection error:', err.message);
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

