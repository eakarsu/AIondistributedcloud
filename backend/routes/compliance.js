const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_rules ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_rules WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compliance rule not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { rule_name, country, regulation, description, enforcement_date, penalty_amount, currency, severity, status } = req.body;
    const result = await pool.query(
      `INSERT INTO compliance_rules (rule_name, country, regulation, description, enforcement_date, penalty_amount, currency, severity, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [rule_name, country, regulation, description, enforcement_date, penalty_amount, currency, severity, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { rule_name, country, regulation, description, enforcement_date, penalty_amount, currency, severity, status } = req.body;
    const result = await pool.query(
      `UPDATE compliance_rules SET rule_name=$1, country=$2, regulation=$3, description=$4, enforcement_date=$5, penalty_amount=$6, currency=$7, severity=$8, status=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [rule_name, country, regulation, description, enforcement_date, penalty_amount, currency, severity, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compliance rule not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM compliance_rules WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compliance rule not found' });
    res.json({ message: 'Compliance rule deleted', rule: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
