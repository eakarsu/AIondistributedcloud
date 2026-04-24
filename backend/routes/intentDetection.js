const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter } = require('../openrouter');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customer_intents ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customer_intents WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Intent not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { customer_message, customer_name, country, channel } = req.body;
    const systemPrompt = `You are a telecom customer intent detection AI. Analyze the customer message and detect their intent.
Provide a JSON response with:
- primary_intent: the main intent (e.g., "billing_inquiry", "technical_support", "plan_upgrade", "cancellation", "data_usage", "roaming_query", "complaint", "new_service", "account_change", "general_inquiry")
- confidence: number between 0 and 1
- secondary_intents: array of other possible intents
- entities: object with extracted entities (phone numbers, plan names, dates, etc.)
- recommended_department: which department should handle this
- priority: "low", "medium", "high", "critical"
Respond ONLY with valid JSON, no markdown.`;
    const aiResponse = await callOpenRouter(systemPrompt, customer_message);
    let parsed;
    try {
      parsed = JSON.parse(aiResponse);
    } catch {
      parsed = { primary_intent: 'general_inquiry', confidence: 0.5, secondary_intents: [], entities: {}, recommended_department: 'General Support', priority: 'medium' };
    }
    const result = await pool.query(
      `INSERT INTO customer_intents (customer_message, customer_name, country, channel, primary_intent, confidence, secondary_intents, entities, recommended_department, priority, ai_model, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'completed') RETURNING *`,
      [customer_message, customer_name, country, channel, parsed.primary_intent, parsed.confidence, JSON.stringify(parsed.secondary_intents), JSON.stringify(parsed.entities), parsed.recommended_department, parsed.priority, process.env.OPENROUTER_MODEL]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM customer_intents WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Intent not found' });
    res.json({ message: 'Intent deleted', intent: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
