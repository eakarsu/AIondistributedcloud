'use strict';
const express = require('express'); const cors = require('cors'); require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = require('./db'); const { authenticateToken } = require('./middleware/auth'); const app = express(); const PORT = Number(process.env.BACKEND_PORT || 3001);
const testMode = process.env.NODE_ENV === 'test';
if (testMode && !process.env.ALLOWED_ORIGINS) process.env.ALLOWED_ORIGINS = `http://127.0.0.1:${process.env.FRONTEND_PORT || 3000}`;
if (testMode && !process.env.CLOUD_WEBHOOK_SECRET) process.env.CLOUD_WEBHOOK_SECRET = process.env.JWT_SECRET;
const origins = (process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean); if (!origins.length) throw new Error('ALLOWED_ORIGINS is required');
if (!process.env.CLOUD_WEBHOOK_SECRET || process.env.CLOUD_WEBHOOK_SECRET.length < 32) throw new Error('CLOUD_WEBHOOK_SECRET must be at least 32 characters');
app.use(cors({ origin: origins, credentials: true })); app.use(express.json({ limit: '2mb', verify: (req, _res, buffer) => { req.rawBody = buffer; } }));
app.get('/api/health', async (_req, res) => { try { await pool.query('SELECT 1'); res.json({ status: 'ok' }); } catch { res.status(503).json({ status: 'unready' }); } });
app.use('/api/auth', require('./routes/auth'));
app.use('/api/authoritative/cloud', authenticateToken, require('./routes/authoritative'));
app.use('/api', authenticateToken, (_req, res) => res.status(410).json({ error: 'legacy_route_quarantined', replacement: '/api/authoritative/cloud' }));
app.use((err, _req, res, _next) => { console.error(err.message); const status = /missing_|required|invalid_|unsupported|mismatch/.test(err.message) ? 422 : /scope_denied/.test(err.message) ? 403 : 500; res.status(status).json({ error: status === 500 ? 'internal_error' : err.message }); });
async function start() { const ready = await pool.query("SELECT to_regclass('cloud_workflow_runs') AS table_name"); if (!ready.rows[0].table_name) throw new Error('Database migration missing; run npm run migrate'); app.listen(PORT, () => console.log(`cloud workflow API listening on ${PORT}`)); }
if (require.main === module) start().catch(error => { console.error(error.message); process.exit(1); }); module.exports = { app, start };
