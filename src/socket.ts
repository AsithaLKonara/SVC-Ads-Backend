import { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';

let io: Server;

export const initSocket = (server: HTTPServer) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Allow all origins for simplicity in this project
      methods: ['GET', 'POST', 'PATCH']
    }
  });

  io.on('connection', (socket) => {
    console.log('New WebSocket client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('WebSocket client disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    console.warn('Socket.io is not initialized yet!');
    return null;
  }
  return io;
};
