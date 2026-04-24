const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter } = require('../openrouter');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sentiment_analyses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sentiment_analyses WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Analysis not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { customer_message, customer_name, country, channel } = req.body;
    const systemPrompt = `You are a telecom customer sentiment analysis AI. Analyze the following customer message and provide a JSON response with these fields:
- sentiment: "positive", "negative", or "neutral"
- confidence: a number between 0 and 1
- key_topics: an array of key topics mentioned
- urgency: "low", "medium", or "high"
- summary: a brief 1-2 sentence summary of the customer's sentiment and concerns
Respond ONLY with valid JSON, no markdown.`;
    const aiResponse = await callOpenRouter(systemPrompt, customer_message);
    let parsed;
    try {
      parsed = JSON.parse(aiResponse);
    } catch {
      parsed = { sentiment: 'neutral', confidence: 0.5, key_topics: [], urgency: 'medium', summary: aiResponse };
    }
    const result = await pool.query(
      `INSERT INTO sentiment_analyses (customer_message, customer_name, country, channel, sentiment, confidence, key_topics, urgency, ai_summary, ai_model, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'completed') RETURNING *`,
      [customer_message, customer_name, country, channel, parsed.sentiment, parsed.confidence, JSON.stringify(parsed.key_topics), parsed.urgency, parsed.summary, process.env.OPENROUTER_MODEL]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sentiment_analyses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Analysis not found' });
    res.json({ message: 'Analysis deleted', analysis: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
