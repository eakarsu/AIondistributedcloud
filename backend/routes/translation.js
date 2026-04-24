const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter } = require('../openrouter');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM translations ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM translations WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Translation not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { source_text, source_language, target_language, country, customer_name } = req.body;
    const systemPrompt = `You are a professional telecom translation service. Translate the following text from ${source_language} to ${target_language}. Provide ONLY the translation, nothing else. Maintain the tone and context appropriate for telecom customer communications.`;
    const aiResponse = await callOpenRouter(systemPrompt, source_text);
    const result = await pool.query(
      `INSERT INTO translations (source_text, translated_text, source_language, target_language, country, customer_name, ai_model, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'completed') RETURNING *`,
      [source_text, aiResponse, source_language, target_language, country, customer_name, process.env.OPENROUTER_MODEL]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM translations WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Translation not found' });
    res.json({ message: 'Translation deleted', translation: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
