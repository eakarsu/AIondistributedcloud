'use strict';
const express = require('express');
const pool = require('../db');
const router = express.Router();

router.post('/cloud-advice', async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object' || !Object.keys(req.body).length) return res.status(400).json({ error: 'workload_context_required' });
    const { OPENROUTER_API_KEY: key, OPENROUTER_MODEL: model, OPENROUTER_BASE_URL: base } = process.env;
    if (base !== 'https://openrouter.ai/api/v1' || !key || !model) throw new Error('OpenRouter runtime configuration is incomplete');
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [
        { role: 'system', content: 'Give concise distributed-cloud placement advice emphasizing residency, reliability, and cost tradeoffs.' },
        { role: 'user', content: JSON.stringify(req.body) },
      ] }),
    });
    if (!response.ok) throw new Error(`OpenRouter request failed with status ${response.status}`);
    const body = await response.json();
    const result = body.choices?.[0]?.message?.content;
    if (!result) throw new Error('OpenRouter returned no usable content');
    const saved = await pool.query(
      `INSERT INTO cloud_ai_results(tenant_id,user_id,input,result,model)
       VALUES($1,$2,$3::jsonb,$4::jsonb,$5) RETURNING id,created_at`,
      [req.user.tenantId, req.user.id, JSON.stringify(req.body), JSON.stringify({ text: result }), body.model || model],
    );
    return res.json({ success: true, result, model: body.model || model, persisted: saved.rows[0] });
  } catch (error) { return next(error); }
});

module.exports = router;
