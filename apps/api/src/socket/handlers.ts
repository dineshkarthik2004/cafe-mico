import { Server as SocketIOServer, Socket } from 'socket.io';

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join a table session room (for customers)
    socket.on('join_session', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
      console.log(`  → Socket ${socket.id} joined session:${sessionId}`);
    });

    // Join kitchen room
    socket.on('join_kitchen', () => {
      socket.join('kitchen');
      console.log(`  → Socket ${socket.id} joined kitchen`);
    });

    // Join staff room
    socket.on('join_staff', () => {
      socket.join('staff');
      console.log(`  → Socket ${socket.id} joined staff`);
    });

    // Join admin room
    socket.on('join_admin', () => {
      socket.join('admin');
      console.log(`  → Socket ${socket.id} joined admin`);
    });

    // Leave session room
    socket.on('leave_session', (sessionId: string) => {
      socket.leave(`session:${sessionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  console.log('📡 Socket.IO handlers initialized');
}
