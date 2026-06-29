require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
mongoose.set('bufferCommands', false);
const cors = require('cors');

const researchRoutes = require('./routes/research');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api', researchRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Database Connection
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️  Continuing without MongoDB — reports will not be saved.');
  }
}

// Server Startup
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Groq LLM: ${process.env.GROQ_API_KEY ? '✅ configured' : '❌ missing'}`);
    console.log(`🤖 Gemini fallback: ${process.env.GEMINI_API_KEY ? '✅ configured' : '❌ missing'}`);
  });
}

start();
