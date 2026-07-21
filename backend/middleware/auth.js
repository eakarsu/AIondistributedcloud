const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
const JWT_SECRET = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    if (!user.tenantId || !user.id || !user.role) return res.status(403).json({ error: 'Token lacks required tenant identity' });
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken, JWT_SECRET };
