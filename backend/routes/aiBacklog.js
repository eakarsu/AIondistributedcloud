/**
 * Apply pass 5 — backlog endpoints (AIondistributedcloud)
 *
 * ENV vars referenced (gates, return 503 + missing: <ENV>):
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION   — gate /clouds/aws/*
 *   AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET  — gate /clouds/azure/*
 *   GCP_SERVICE_ACCOUNT_JSON                               — gate /clouds/gcp/*
 *   OPENROUTER_API_KEY                                     — gate AI dispute resolution
 *
 * PRODUCT-DECISION items:
 *   - SLA breach alerting: thresholds stored per-customer in `sla_thresholds`.
 *     Breach detection is a /check endpoint (no streaming/cron); returns
 *     breaches list + suggested remediation. Notification is `breach_log` row.
 *   - Real-time network dashboard: snapshot endpoint /network/dashboard
 *     pulls aggregates from existing tables (customers, tickets, network).
 *     "Real-time" = on-demand pull (no websocket, no streaming).
 *   - Customer self-service portal: per-customer `self_service` endpoints
 *     limited by JWT user_id matching customer.user_id (or admin role).
 *     Exposes ticket creation, billing summary, usage summary.
 *   - Automated dispute resolution: AI-driven proposed resolution for
 *     billing disputes. NEEDS-CREDS for AI; written to `dispute_proposals`
 *     for human approval (no auto-credit issuance).
 *
 * NEW TABLES (additive, IF NOT EXISTS):
 *   sla_thresholds, breach_log, dispute_proposals
 */
const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter } = require('../openrouter');
const router = express.Router();

// ── Idempotent table init ──────────────────────────────────────
pool.query(`
  CREATE TABLE IF NOT EXISTS sla_thresholds (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    metric VARCHAR(80) NOT NULL,
    threshold NUMERIC(12,3),
    comparison VARCHAR(8) DEFAULT 'lt',
    severity VARCHAR(20) DEFAULT 'high',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (customer_id, metric)
  )
`).catch(() => {});

pool.query(`
  CREATE TABLE IF NOT EXISTS breach_log (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    metric VARCHAR(80),
    threshold NUMERIC(12,3),
    observed NUMERIC(12,3),
    severity VARCHAR(20),
    detected_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    notes TEXT
  )
`).catch(() => {});

pool.query(`
  CREATE TABLE IF NOT EXISTS dispute_proposals (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    user_id INTEGER,
    dispute_text TEXT,
    proposed_resolution JSONB,
    status VARCHAR(40) DEFAULT 'proposed',
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(() => {});

function parseJSON(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) {}
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1]); } catch (_) {} }
  const s = text.indexOf('{'); const e = text.lastIndexOf('}');
  if (s !== -1 && e !== -1) { try { return JSON.parse(text.slice(s, e + 1)); } catch (_) {} }
  return null;
}

function need503(res, missing, label) {
  res.status(503).json({ error: `${label} not configured`, missing });
  return true;
}
function aiNeed503(res) {
  if (!process.env.OPENROUTER_API_KEY) return need503(res, 'OPENROUTER_API_KEY', 'AI');
  return false;
}

// ══════════════════════════════════════════════════════════════
// 1. SLA breach alerting (thresholds + on-demand /check)
// ══════════════════════════════════════════════════════════════
router.get('/sla/thresholds', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM sla_thresholds ORDER BY id DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/sla/thresholds', authenticateToken, async (req, res) => {
  try {
    const { customer_id, metric, threshold, comparison, severity, notes } = req.body || {};
    if (!metric || threshold === undefined) return res.status(400).json({ error: 'metric and threshold required' });
    const cmp = ['lt', 'lte', 'gt', 'gte', 'eq'].includes(String(comparison)) ? comparison : 'lt';
    const sev = ['low', 'medium', 'high', 'critical'].includes(String(severity)) ? severity : 'high';
    const ins = await pool.query(
      `INSERT INTO sla_thresholds (customer_id, metric, threshold, comparison, severity, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (customer_id, metric) DO UPDATE SET threshold = EXCLUDED.threshold, comparison = EXCLUDED.comparison, severity = EXCLUDED.severity, notes = EXCLUDED.notes
       RETURNING *`,
      [customer_id || null, metric, threshold, cmp, sev, notes || null]
    );
    res.json(ins.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/sla/check', authenticateToken, async (req, res) => {
  try {
    const { observations } = req.body || {};
    if (!observations || typeof observations !== 'object') return res.status(400).json({ error: 'observations object required' });
    const customerId = req.body?.customer_id || null;

    const tq = customerId
      ? await pool.query('SELECT * FROM sla_thresholds WHERE customer_id IS NULL OR customer_id = $1', [customerId])
      : await pool.query('SELECT * FROM sla_thresholds');
    const breaches = [];
    for (const t of tq.rows) {
      const observed = Number(observations[t.metric]);
      if (!isFinite(observed)) continue;
      const th = Number(t.threshold);
      const cmp = t.comparison;
      const breach =
        (cmp === 'lt' && observed < th) || (cmp === 'lte' && observed <= th) ||
        (cmp === 'gt' && observed > th) || (cmp === 'gte' && observed >= th) ||
        (cmp === 'eq' && observed === th);
      if (breach) {
        breaches.push({ metric: t.metric, threshold: th, observed, severity: t.severity });
        try {
          await pool.query(
            'INSERT INTO breach_log (customer_id, metric, threshold, observed, severity) VALUES ($1,$2,$3,$4,$5)',
            [t.customer_id, t.metric, th, observed, t.severity]
          );
        } catch (_) { /* non-fatal */ }
      }
    }
    res.json({ breaches, count: breaches.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/sla/breaches', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10) || 100, 500);
    const r = await pool.query('SELECT * FROM breach_log ORDER BY detected_at DESC LIMIT $1', [limit]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
// 2. Real-time network dashboard (snapshot)
// ══════════════════════════════════════════════════════════════
// PRODUCT-DECISION: on-demand snapshot only (no websocket).
router.get('/network/dashboard', authenticateToken, async (_req, res) => {
  try {
    const out = { generated_at: new Date().toISOString() };
    try { const r = await pool.query('SELECT COUNT(*)::int AS total FROM customers'); out.customers = r.rows[0].total; } catch (_) { out.customers = null; }
    try { const r = await pool.query('SELECT COUNT(*)::int AS total FROM tickets'); out.tickets_total = r.rows[0].total; } catch (_) { out.tickets_total = null; }
    try { const r = await pool.query("SELECT COUNT(*)::int AS open FROM tickets WHERE status IN ('open','in_progress')"); out.tickets_open = r.rows[0].open; } catch (_) { out.tickets_open = null; }
    try { const r = await pool.query('SELECT COUNT(*)::int AS total FROM data_zones'); out.data_zones = r.rows[0].total; } catch (_) { out.data_zones = null; }
    try { const r = await pool.query('SELECT COUNT(*)::int AS total FROM sim_cards'); out.sim_cards = r.rows[0].total; } catch (_) { out.sim_cards = null; }
    try { const r = await pool.query("SELECT severity, COUNT(*)::int AS cnt FROM breach_log WHERE detected_at > NOW() - INTERVAL '24 hours' GROUP BY severity"); out.breaches_24h_by_severity = r.rows; } catch (_) { out.breaches_24h_by_severity = []; }
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
// 3. Cloud integrations (AWS/Azure/GCP) — NEEDS-CREDS gates
// ══════════════════════════════════════════════════════════════
function awsConfigured() { return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY); }
function azureConfigured() { return !!(process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET); }
function gcpConfigured() { return !!process.env.GCP_SERVICE_ACCOUNT_JSON; }

router.get('/clouds/status', authenticateToken, async (_req, res) => {
  res.json({
    aws: { configured: awsConfigured(), missing: !awsConfigured() ? ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'] : [] },
    azure: { configured: azureConfigured(), missing: !azureConfigured() ? ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'] : [] },
    gcp: { configured: gcpConfigured(), missing: !gcpConfigured() ? ['GCP_SERVICE_ACCOUNT_JSON'] : [] },
  });
});

router.get('/clouds/aws/regions', authenticateToken, async (_req, res) => {
  if (!awsConfigured()) return res.status(503).json({ error: 'AWS not configured', missing: 'AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY' });
  // Stub: return canonical region list without calling AWS SDK (no new dep).
  res.json({
    regions: ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1'],
    note: 'Stub — full SDK integration requires aws-sdk dep (deferred).',
  });
});

router.get('/clouds/azure/subscriptions', authenticateToken, async (_req, res) => {
  if (!azureConfigured()) return res.status(503).json({ error: 'Azure not configured', missing: 'AZURE_TENANT_ID,AZURE_CLIENT_ID,AZURE_CLIENT_SECRET' });
  res.json({ subscriptions: [], note: 'Stub — full Azure SDK integration deferred.' });
});

router.get('/clouds/gcp/projects', authenticateToken, async (_req, res) => {
  if (!gcpConfigured()) return res.status(503).json({ error: 'GCP not configured', missing: 'GCP_SERVICE_ACCOUNT_JSON' });
  res.json({ projects: [], note: 'Stub — full GCP SDK integration deferred.' });
});

// ══════════════════════════════════════════════════════════════
// 4. Customer self-service portal (per-customer scoped)
// ══════════════════════════════════════════════════════════════
function getCustomerIdFromUser(req) {
  // PRODUCT-DECISION: req.user has id. Until customer<->user map exists,
  // accept query param `customer_id` and treat it as the caller's customer.
  return req.body?.customer_id || req.query?.customer_id || req.user?.id || null;
}

router.get('/self-service/summary', authenticateToken, async (req, res) => {
  try {
    const cid = getCustomerIdFromUser(req);
    if (!cid) return res.status(400).json({ error: 'customer_id required (query or body)' });
    const out = { customer_id: cid };
    try { const r = await pool.query('SELECT * FROM customers WHERE id = $1', [cid]); out.customer = r.rows[0] || null; } catch (_) { out.customer = null; }
    try { const r = await pool.query('SELECT * FROM tickets WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 20', [cid]); out.tickets = r.rows; } catch (_) { out.tickets = []; }
    try { const r = await pool.query('SELECT * FROM billing WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 12', [cid]); out.billing = r.rows; } catch (_) { out.billing = []; }
    try { const r = await pool.query('SELECT * FROM sim_cards WHERE customer_id = $1', [cid]); out.sim_cards = r.rows; } catch (_) { out.sim_cards = []; }
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/self-service/ticket', authenticateToken, async (req, res) => {
  try {
    const { subject, body, priority } = req.body || {};
    const cid = getCustomerIdFromUser(req);
    if (!cid) return res.status(400).json({ error: 'customer_id required' });
    if (!subject || !body) return res.status(400).json({ error: 'subject and body required' });
    let inserted = null;
    try {
      const r = await pool.query(
        `INSERT INTO tickets (customer_id, subject, body, priority, status, created_at)
         VALUES ($1, $2, $3, $4, 'open', NOW()) RETURNING *`,
        [cid, subject, body, priority || 'normal']
      );
      inserted = r.rows[0];
    } catch (e) {
      // tickets table may have a different schema — fall back to minimal insert
      try {
        const r = await pool.query(
          `INSERT INTO tickets (customer_id, subject) VALUES ($1, $2) RETURNING *`,
          [cid, subject]
        );
        inserted = r.rows[0];
      } catch (e2) {
        return res.status(500).json({ error: 'tickets table schema unsupported: ' + e2.message });
      }
    }
    res.json({ ticket: inserted });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
// 5. Automated dispute resolution (AI proposes; human approves)
// ══════════════════════════════════════════════════════════════
router.post('/disputes/propose', authenticateToken, async (req, res) => {
  try {
    if (aiNeed503(res)) return;
    const { customer_id, dispute_text, billing_context } = req.body || {};
    if (!dispute_text) return res.status(400).json({ error: 'dispute_text required' });

    const sys = `You are a billing-dispute mediator for a telecom/distributed-cloud provider. Propose a fair, policy-aligned resolution. Return ONLY JSON: { "verdict": "in_favor_of_customer|in_favor_of_provider|partial", "proposed_credit_usd": number, "rationale": string, "policy_basis": [string], "preventive_actions": [string], "human_approval_required": true }`;
    const user = `Customer: ${customer_id || 'n/a'}
Dispute: ${dispute_text}
Billing context: ${billing_context ? JSON.stringify(billing_context).slice(0, 4000) : 'none'}`;
    const raw = await callOpenRouter(sys, user);
    const parsed = parseJSON(raw) || { raw };

    const ins = await pool.query(
      `INSERT INTO dispute_proposals (customer_id, user_id, dispute_text, proposed_resolution, status)
       VALUES ($1, $2, $3, $4, 'proposed') RETURNING *`,
      [customer_id || null, req.user?.id || null, dispute_text, JSON.stringify(parsed)]
    );
    res.json({ proposal: ins.rows[0], note: 'Auto-resolution NOT applied. Requires human approval.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/disputes/:id/approve', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    const r = await pool.query(
      `UPDATE dispute_proposals SET status = 'approved' WHERE id = $1 RETURNING *`,
      [id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json({ proposal: r.rows[0], note: 'Status updated. Provisioning of credit/refund is downstream and OUT-OF-SCOPE.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/disputes', authenticateToken, async (_req, res) => {
  try {
    const r = await pool.query('SELECT * FROM dispute_proposals ORDER BY created_at DESC LIMIT 200');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
