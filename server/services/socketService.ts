import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'node:http';
import { verifyToken } from '../db/authUtils.js';

let ioInstance: SocketIOServer | null = null;

export function initSocketIO(httpServer: http.Server): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    path: '/api/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next();
      }
      const user = verifyToken<any>(String(token));
      if (user) {
        (socket as any).user = user;
      }
      next();
    } catch {
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    if (user) {
      // Role rooms
      if (user.role === 'admin') socket.join('room:admin');
      if (user.role === 'hr') socket.join('room:hr');
      if (user.role === 'team_leader') socket.join('room:team_leader');
      if (user.role === 'telecaller' || user.role === 'employee') socket.join('room:telecaller');

      // User personal room
      const uid = user.employeeId || user.id;
      if (uid) socket.join(`room:user_${uid}`);

      // Squad room
      if (user.groupName) socket.join(`room:squad_${user.groupName.toLowerCase().replace(/\s+/g, '_')}`);
    }

    socket.on('join:squad', (squadName: string) => {
      if (squadName) socket.join(`room:squad_${squadName.toLowerCase().replace(/\s+/g, '_')}`);
    });

    socket.on('disconnect', () => {});
  });

  ioInstance = io;
  return io;
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

/**
 * Broadcast micro-events to specific rooms or globally
 */
export function emitSocketEvent(eventName: string, data: any, rooms?: string | string[]) {
  if (!ioInstance) return;
  try {
    if (!rooms) {
      ioInstance.emit(eventName, data);
    } else if (Array.isArray(rooms)) {
      let target = ioInstance.to(rooms[0]);
      for (let i = 1; i < rooms.length; i++) {
        target = target.to(rooms[i]);
      }
      target.emit(eventName, data);
    } else {
      ioInstance.to(rooms).emit(eventName, data);
    }
  } catch (err) {
    console.warn(`[Socket.IO] Failed to emit ${eventName}:`, err);
  }
}
