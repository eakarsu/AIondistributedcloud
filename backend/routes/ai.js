const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter } = require('../openrouter');
const router = express.Router();

// Ensure ai_analyses table
pool.query(`
  CREATE TABLE IF NOT EXISTS ai_analyses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    endpoint VARCHAR(100),
    input_data JSONB,
    result JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(() => {});

function parseJSON(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1]); } catch {} }
  const s = text.indexOf('{'); const e = text.lastIndexOf('}');
  if (s !== -1 && e !== -1) { try { return JSON.parse(text.slice(s, e + 1)); } catch {} }
  return null;
}

async function persist(userId, endpoint, input, result) {
  try {
    await pool.query(
      'INSERT INTO ai_analyses (user_id, endpoint, input_data, result) VALUES ($1,$2,$3,$4)',
      [userId, endpoint, JSON.stringify(input), JSON.stringify(result)]
    );
  } catch {}
}

// POST /api/ai/network-anomaly-detect
router.post('/network-anomaly-detect', authenticateToken, async (req, res) => {
  try {
    const { metrics, time_window } = req.body || {};
    const systemPrompt = `You analyze telecom/distributed-cloud network metrics to detect anomalies. Return ONLY JSON: { "anomalies": [{"metric": string, "severity": "low|medium|high|critical", "description": string, "likely_cause": string, "recommended_action": string}], "summary": string, "confidence": "low|medium|high" }`;
    const userMessage = `Time window: ${time_window || 'last 1h'}\nMetrics: ${JSON.stringify(metrics || {}).slice(0, 6000)}`;
    const raw = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseJSON(raw) || { raw };
    await persist(req.user?.id, 'network-anomaly-detect', { time_window }, parsed);
    res.json(parsed);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/cost-optimization
router.post('/cost-optimization', authenticateToken, async (req, res) => {
  try {
    const { customer_id, usage_summary, billing_summary } = req.body || {};
    const systemPrompt = `You recommend cost-optimization actions for distributed-cloud and telecom usage. Return ONLY JSON: { "quick_wins": [{"action": string, "estimated_savings_usd": number, "risk": string}], "structural_changes": [{"change": string, "estimated_savings_usd": number, "rationale": string}], "consolidation_opportunities": [string], "total_potential_savings_usd": number }`;
    const userMessage = `Customer: ${customer_id || 'n/a'}\nUsage summary: ${JSON.stringify(usage_summary || {}).slice(0, 4000)}\nBilling summary: ${JSON.stringify(billing_summary || {}).slice(0, 4000)}`;
    const raw = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseJSON(raw) || { raw };
    await persist(req.user?.id, 'cost-optimization', { customer_id }, parsed);
    res.json(parsed);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/churn-predict
router.post('/churn-predict', authenticateToken, async (req, res) => {
  try {
    const { customer_id } = req.body || {};
    let customer = null, tickets = [], billing = [];
    if (customer_id) {
      try { const r = await pool.query('SELECT * FROM customers WHERE id=$1', [customer_id]); customer = r.rows[0]; } catch {}
      try { const r = await pool.query('SELECT * FROM tickets WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 30', [customer_id]); tickets = r.rows; } catch {}
      try { const r = await pool.query('SELECT * FROM billing WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 12', [customer_id]); billing = r.rows; } catch {}
    }
    const systemPrompt = `You score a telecom/cloud customer's churn risk. Return ONLY JSON: { "risk_level": "low|medium|high", "risk_score": number, "drivers": [string], "retention_actions": [{"action": string, "expected_impact": string}], "win_back_offer": string }`;
    const userMessage = `Customer: ${JSON.stringify(customer || req.body || {})}\nRecent tickets: ${JSON.stringify(tickets).slice(0,3000)}\nBilling history: ${JSON.stringify(billing).slice(0,3000)}`;
    const raw = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseJSON(raw) || { raw };
    await persist(req.user?.id, 'churn-predict', { customer_id }, parsed);
    res.json(parsed);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/roaming-consortium-advisor
// Recommends roaming-consortium / IPX peering moves for a carrier given their
// current footprint, traffic patterns and partner candidates.
router.post('/roaming-consortium-advisor', authenticateToken, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'OPENROUTER_API_KEY not configured on the server' });
    }
    const {
      carrier_name,
      home_regions,
      target_regions,
      monthly_roaming_volume_mb,
      current_partners,
      candidate_partners,
      pain_points,
      compliance_constraints,
    } = req.body || {};

    // Optional best-effort enrichment from local roaming/dataZones tables.
    let recentRoaming = [];
    try {
      const r = await pool.query(
        'SELECT * FROM roaming_agreements ORDER BY created_at DESC LIMIT 25'
      );
      recentRoaming = r.rows;
    } catch {}
    let zones = [];
    try {
      const r = await pool.query('SELECT * FROM data_zones LIMIT 20');
      zones = r.rows;
    } catch {}

    const systemPrompt = `You are an expert roaming/IPX consortium advisor for telecom and distributed-cloud carriers. Recommend consortium / peering moves that minimize cost while preserving SLA, regulatory, and data-residency constraints. Return ONLY JSON: { "recommended_consortia": [{"name": string, "rationale": string, "expected_monthly_savings_usd": number, "risks": [string]}], "partner_actions": [{"partner": string, "action": "join|expand|renegotiate|exit", "reason": string}], "ipx_recommendations": [string], "compliance_considerations": [string], "rollout_plan": [{"phase": number, "duration_weeks": number, "milestones": [string]}], "estimated_total_savings_usd": number, "confidence": "low|medium|high" }`;

    const userMessage = [
      `Carrier: ${carrier_name || 'unspecified'}`,
      `Home regions: ${JSON.stringify(home_regions || [])}`,
      `Target / underserved regions: ${JSON.stringify(target_regions || [])}`,
      `Monthly roaming volume (MB): ${monthly_roaming_volume_mb || 'unknown'}`,
      `Current partners: ${JSON.stringify(current_partners || [])}`,
      `Candidate partners: ${JSON.stringify(candidate_partners || [])}`,
      `Pain points: ${pain_points || 'none provided'}`,
      `Compliance constraints: ${compliance_constraints || 'none provided'}`,
      `Existing roaming records (best-effort): ${JSON.stringify(recentRoaming).slice(0, 3000)}`,
      `Known data zones: ${JSON.stringify(zones).slice(0, 1500)}`,
    ].join('\n');

    const raw = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseJSON(raw) || { raw };
    await persist(req.user?.id, 'roaming-consortium-advisor', { carrier_name, target_regions }, parsed);
    res.json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/ai/history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query('SELECT id, endpoint, created_at FROM ai_analyses ORDER BY created_at DESC LIMIT 100');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
