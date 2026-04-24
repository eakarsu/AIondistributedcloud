const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tickets ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { customer_name, country, subject, description, priority, category, status } = req.body;
    const result = await pool.query(
      `INSERT INTO tickets (customer_name, country, subject, description, priority, category, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [customer_name, country, subject, description, priority, category, status || 'open']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { customer_name, country, subject, description, priority, category, status } = req.body;
    const result = await pool.query(
      `UPDATE tickets SET customer_name=$1, country=$2, subject=$3, description=$4, priority=$5, category=$6, status=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [customer_name, country, subject, description, priority, category, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tickets WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ message: 'Ticket deleted', ticket: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
