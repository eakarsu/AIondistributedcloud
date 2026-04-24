import React from 'react';

export default function Dashboard({ features, onNavigate }) {
  const coreFeatures = features.filter(f => f.category === 'core');
  const aiFeatures = features.filter(f => f.category === 'ai');

  return (
    <div>
      <div className="dashboard-header">
        <h1>Data Residency Command Center</h1>
        <p>Manage telecom operations across 15+ countries while ensuring full data residency compliance</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard label="Countries" value="16" sub="Active regions" color="#1a56db" />
        <StatCard label="Customers" value="16" sub="Across all zones" color="#059669" />
        <StatCard label="Compliance" value="94%" sub="Avg compliance rate" color="#7c3aed" />
        <StatCard label="Data Zones" value="16" sub="Secure facilities" color="#d97706" />
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#334155' }}>Core Operations</h2>
      <div className="cards-grid" style={{ marginBottom: 32 }}>
        {coreFeatures.map(f => (
          <div key={f.key} className="feature-card" onClick={() => onNavigate(`/feature/${f.key}`)}>
            <span className="card-badge badge-core">Core</span>
            <div className="card-icon">{f.icon}</div>
            <h3>{f.label}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#334155' }}>AI Intelligence</h2>
      <div className="cards-grid">
        {aiFeatures.map(f => (
          <div key={f.key} className="feature-card" onClick={() => onNavigate(`/feature/${f.key}`)}>
            <span className="card-badge badge-ai">AI</span>
            <div className="card-icon">{f.icon}</div>
            <h3>{f.label}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{sub}</div>
    </div>
  );
}
