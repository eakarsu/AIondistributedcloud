import React, { useState } from 'react';
import { login } from '../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAutoFill = () => {
    setEmail(process.env.REACT_APP_DEMO_EMAIL || '');
    setPassword(process.env.REACT_APP_DEMO_PASSWORD || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-logo">
          <div style={{ fontSize: 48 }}>🛡️</div>
          <h1>TelecomGuard</h1>
          <p>Multinational Data Residency Platform</p>
        </div>
        {error && <div className="login-error">{error}</div>}
        <button className="btn btn-autofill btn-full" onClick={handleAutoFill}>
          Auto-Fill Demo Credentials
        </button>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@telecom.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter password" required />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In to Platform'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#94a3b8' }}>
          <p>Secure access to telecom data residency management</p>
          <p style={{ marginTop: 4 }}>All data processed within country of origin</p>
        </div>
      </div>
    </div>
  );
}
