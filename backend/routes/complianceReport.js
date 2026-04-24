const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter } = require('../openrouter');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_reports ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_reports WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { country, report_type, scope, period } = req.body;
    const systemPrompt = `You are a telecom regulatory compliance report generator. Generate a professional compliance report for a telecom operator in ${country}.
The report should cover ${report_type} for the period ${period} with scope: ${scope}.
Provide a JSON response with:
- title: report title
- executive_summary: 2-3 sentence summary
- findings: array of {finding, severity, recommendation}
- risk_score: number 1-100
- compliance_status: "compliant", "partially_compliant", "non_compliant"
- action_items: array of required actions
- next_review_date: suggested next review date
Respond ONLY with valid JSON, no markdown.`;
    const aiResponse = await callOpenRouter(systemPrompt, `Generate ${report_type} compliance report for ${country} covering ${scope} for period ${period}`);
    let parsed;
    try {
      parsed = JSON.parse(aiResponse);
    } catch {
      parsed = { title: `${report_type} Report - ${country}`, executive_summary: aiResponse, findings: [], risk_score: 50, compliance_status: 'partially_compliant', action_items: [], next_review_date: '2025-06-01' };
    }
    const result = await pool.query(
      `INSERT INTO compliance_reports (country, report_type, scope, period, title, executive_summary, findings, risk_score, compliance_status, action_items, ai_model, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'completed') RETURNING *`,
      [country, report_type, scope, period, parsed.title, parsed.executive_summary, JSON.stringify(parsed.findings), parsed.risk_score, parsed.compliance_status, JSON.stringify(parsed.action_items), process.env.OPENROUTER_MODEL]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM compliance_reports WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    res.json({ message: 'Report deleted', report: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
