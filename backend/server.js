const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/data-zones', require('./routes/dataZones'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/network', require('./routes/network'));
app.use('/api/sim-cards', require('./routes/simCards'));
app.use('/api/roaming', require('./routes/roaming'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/translations', require('./routes/translation'));
app.use('/api/sentiment', require('./routes/sentiment'));
app.use('/api/ai-support', require('./routes/aiSupport'));
app.use('/api/intent-detection', require('./routes/intentDetection'));
app.use('/api/compliance-reports', require('./routes/complianceReport'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
