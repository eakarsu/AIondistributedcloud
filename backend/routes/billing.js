const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM billing ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM billing WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Billing record not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { customer_name, country, invoice_number, amount, currency, billing_period, payment_status, payment_method } = req.body;
    const result = await pool.query(
      `INSERT INTO billing (customer_name, country, invoice_number, amount, currency, billing_period, payment_status, payment_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [customer_name, country, invoice_number, amount, currency, billing_period, payment_status || 'pending', payment_method]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { customer_name, country, invoice_number, amount, currency, billing_period, payment_status, payment_method } = req.body;
    const result = await pool.query(
      `UPDATE billing SET customer_name=$1, country=$2, invoice_number=$3, amount=$4, currency=$5, billing_period=$6, payment_status=$7, payment_method=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [customer_name, country, invoice_number, amount, currency, billing_period, payment_status, payment_method, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Billing record not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM billing WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Billing record not found' });
    res.json({ message: 'Billing record deleted', billing: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
