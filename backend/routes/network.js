const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM network_nodes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM network_nodes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Network node not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { node_name, country, city, node_type, ip_address, capacity_gbps, latency_ms, status } = req.body;
    const result = await pool.query(
      `INSERT INTO network_nodes (node_name, country, city, node_type, ip_address, capacity_gbps, latency_ms, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [node_name, country, city, node_type, ip_address, capacity_gbps, latency_ms, status || 'online']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { node_name, country, city, node_type, ip_address, capacity_gbps, latency_ms, status } = req.body;
    const result = await pool.query(
      `UPDATE network_nodes SET node_name=$1, country=$2, city=$3, node_type=$4, ip_address=$5, capacity_gbps=$6, latency_ms=$7, status=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [node_name, country, city, node_type, ip_address, capacity_gbps, latency_ms, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Network node not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM network_nodes WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Network node not found' });
    res.json({ message: 'Network node deleted', node: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
