const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sim_cards ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sim_cards WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'SIM card not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { iccid, msisdn, imsi, customer_name, country, sim_type, network_type, status } = req.body;
    const result = await pool.query(
      `INSERT INTO sim_cards (iccid, msisdn, imsi, customer_name, country, sim_type, network_type, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [iccid, msisdn, imsi, customer_name, country, sim_type, network_type, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { iccid, msisdn, imsi, customer_name, country, sim_type, network_type, status } = req.body;
    const result = await pool.query(
      `UPDATE sim_cards SET iccid=$1, msisdn=$2, imsi=$3, customer_name=$4, country=$5, sim_type=$6, network_type=$7, status=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [iccid, msisdn, imsi, customer_name, country, sim_type, network_type, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'SIM card not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sim_cards WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'SIM card not found' });
    res.json({ message: 'SIM card deleted', sim: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
