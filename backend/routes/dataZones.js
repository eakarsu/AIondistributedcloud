const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM data_zones ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM data_zones WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Data zone not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { zone_name, country, region, data_center, encryption_standard, compliance_level, max_storage_tb, status } = req.body;
    const result = await pool.query(
      `INSERT INTO data_zones (zone_name, country, region, data_center, encryption_standard, compliance_level, max_storage_tb, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [zone_name, country, region, data_center, encryption_standard, compliance_level, max_storage_tb, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { zone_name, country, region, data_center, encryption_standard, compliance_level, max_storage_tb, status } = req.body;
    const result = await pool.query(
      `UPDATE data_zones SET zone_name=$1, country=$2, region=$3, data_center=$4, encryption_standard=$5, compliance_level=$6, max_storage_tb=$7, status=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [zone_name, country, region, data_center, encryption_standard, compliance_level, max_storage_tb, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Data zone not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM data_zones WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Data zone not found' });
    res.json({ message: 'Data zone deleted', zone: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
