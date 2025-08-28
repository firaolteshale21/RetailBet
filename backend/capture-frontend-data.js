import express from 'express';
import { logger } from './src/logger.js';

const app = express();
app.use(express.json({ limit: '10mb' }));
import cors from 'cors';

// Enable CORS for all routes
app.use(cors({
  origin: '*', // Allow all origins during development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Capture endpoint to log frontend data
app.post('/capture', (req, res) => {
  console.log('🔍 CAPTURED FRONTEND DATA:');
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📋 Body:', JSON.stringify(req.body, null, 2));
  console.log('📋 Body type:', typeof req.body);
  console.log('📋 BetObject type:', typeof req.body.BetObject);
  console.log('📋 BetObject length:', req.body.BetObject ? req.body.BetObject.length : 'null');
  
  // Try to parse the BetObject
  try {
    const parsed = JSON.parse(req.body.BetObject);
    console.log('✅ Parsed successfully:', JSON.stringify(parsed, null, 2));
  } catch (parseError) {
    console.log('❌ Parse failed:', parseError.message);
    console.log('❌ Raw BetObject:', req.body.BetObject);
  }
  
  res.json({ captured: true });
});

const PORT = 4001;
app.listen(PORT, () => {
  console.log(`🔍 Data capture server running on port ${PORT}`);
  console.log(`📝 Send your frontend requests to: http://localhost:${PORT}/capture`);
});
