require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const analysisRoutes = require('./routes/analysis');
const { historyRouter, domainRouter } = require('./routes/domain');
const { registerSocketHandlers } = require('./agents/orchestrator');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use((req, _res, next) => { req.io = io; next(); });

app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/history', historyRouter);
app.use('/api/domains', domainRouter);
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ollama: process.env.OLLAMA_URL, model: process.env.OLLAMA_MODEL }));

io.on('connection', (socket) => {
  console.log(`[Socket] connected: ${socket.id}`);
  registerSocketHandlers(socket, io);
  socket.on('disconnect', () => console.log(`[Socket] disconnected: ${socket.id}`));
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexta')
  .then(() => {
    console.log('[DB] MongoDB connected');
    server.listen(process.env.PORT || 5000, () =>
      console.log(`[Server] http://localhost:${process.env.PORT || 5000}`)
    );
  })
  .catch(err => { console.error('[DB] Failed:', err.message); process.exit(1); });

module.exports = { app, io };
