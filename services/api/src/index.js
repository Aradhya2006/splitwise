const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

require('./config/db');
require('./config/redis');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const billRoutes = require('./routes/bills');
const splitRoutes = require('./routes/splits');
app.use('/api/splits', splitRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bills', billRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Split.ai API running', version: '1.0.0' });
});

// Socket.io live sessions
const sessionHandler = require('./socket/sessionHandler');
sessionHandler(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { io };