const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter } = require('../openrouter');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ai_support_responses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ai_support_responses WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Response not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { customer_query, customer_name, country, category, language } = req.body;
    const systemPrompt = `You are a professional telecom customer support AI assistant for a multinational operator. The customer is from ${country} and speaks ${language || 'English'}.
Generate a helpful, empathetic, and professional support response. Consider data residency laws - never suggest transferring customer data outside their country.
Provide your response as JSON with:
- response: the support response text
- suggested_actions: array of recommended follow-up actions
- escalation_needed: boolean
- estimated_resolution: "immediate", "1-2 hours", "24 hours", "48 hours"
Respond ONLY with valid JSON, no markdown.`;
    const aiResponse = await callOpenRouter(systemPrompt, customer_query);
    let parsed;
    try {
      parsed = JSON.parse(aiResponse);
    } catch {
      parsed = { response: aiResponse, suggested_actions: [], escalation_needed: false, estimated_resolution: '24 hours' };
    }
    const result = await pool.query(
      `INSERT INTO ai_support_responses (customer_query, customer_name, country, category, language, ai_response, suggested_actions, escalation_needed, estimated_resolution, ai_model, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'completed') RETURNING *`,
      [customer_query, customer_name, country, category, language || 'English', parsed.response, JSON.stringify(parsed.suggested_actions), parsed.escalation_needed, parsed.estimated_resolution, process.env.OPENROUTER_MODEL]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ai_support_responses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Response not found' });
    res.json({ message: 'Response deleted', response: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
