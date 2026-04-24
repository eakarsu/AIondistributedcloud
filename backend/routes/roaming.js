const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roaming_agreements ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roaming_agreements WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Roaming agreement not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { partner_name, home_country, roaming_country, agreement_type, data_rate_per_mb, voice_rate_per_min, validity_start, validity_end, status } = req.body;
    const result = await pool.query(
      `INSERT INTO roaming_agreements (partner_name, home_country, roaming_country, agreement_type, data_rate_per_mb, voice_rate_per_min, validity_start, validity_end, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [partner_name, home_country, roaming_country, agreement_type, data_rate_per_mb, voice_rate_per_min, validity_start, validity_end, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { partner_name, home_country, roaming_country, agreement_type, data_rate_per_mb, voice_rate_per_min, validity_start, validity_end, status } = req.body;
    const result = await pool.query(
      `UPDATE roaming_agreements SET partner_name=$1, home_country=$2, roaming_country=$3, agreement_type=$4, data_rate_per_mb=$5, voice_rate_per_min=$6, validity_start=$7, validity_end=$8, status=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [partner_name, home_country, roaming_country, agreement_type, data_rate_per_mb, voice_rate_per_min, validity_start, validity_end, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Roaming agreement not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM roaming_agreements WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Roaming agreement not found' });
    res.json({ message: 'Roaming agreement deleted', agreement: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
