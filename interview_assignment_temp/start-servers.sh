#!/bin/bash

# Start WebSocket server in background
echo "Starting WebSocket server on port 3001..."
cd /Users/harshrohitshah/WebstormProjects/interview_assignment/interview_assignment_temp
node -e "
const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-document', (data) => {
    console.log('User joined document:', data);
    socket.join(data.documentId);
    socket.to(data.documentId).emit('user-joined', data);
  });
  
  socket.on('cursor-position', (data) => {
    socket.to(data.documentId).emit('cursor-update', data);
  });
  
  socket.on('operation', (data) => {
    socket.to(data.documentId).emit('document-update', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log('WebSocket server running on port', PORT);
});
" &
WS_PID=$!

# Wait a moment for WebSocket server to start
sleep 2

# Start Next.js dev server
echo "Starting Next.js dev server..."
npm run dev &
NEXT_PID=$!

# Wait for both processes
wait $WS_PID $NEXT_PID