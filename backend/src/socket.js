const { Server } = require('socket.io');
const prisma = require('./utils/prisma');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: 'https://splitwise.yashkhurana.dev', credentials: true }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-expense', (expenseId) => {
      const room = `expense_${expenseId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    });

    socket.on('send-message', async (data) => {
      try {
        const { expenseId, userId, content } = data;
        
        // 1. Save to Database
        const message = await prisma.chatMessage.create({
          data: { expenseId, userId, content },
          include: { user: { select: { id: true, name: true } } }
        });

        // 2. Emit to Room
        io.to(`expense_${expenseId}`).emit('message-received', message);
      } catch (error) {
        console.error('Socket send-message error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

module.exports = { initializeSocket };
