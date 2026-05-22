import React, { useState } from 'react';

const CLUSTERS = [
  'us-east-prod', 'us-west-prod', 'eu-central-prod', 'eu-west-edge',
  'apac-tokyo', 'apac-singapore', 'sa-saopaulo', 'me-dubai',
];
const REGIONS = [
  'us-east-1', 'us-west-2', 'eu-central-1', 'eu-west-1',
  'ap-northeast-1', 'ap-southeast-1', 'sa-east-1', 'me-south-1',
];

export default function DeploymentManifestPDF() {
  const [name, setName] = useState('llm-inference-svc');
  const [cluster, setCluster] = useState(CLUSTERS[0]);
  const [region, setRegion] = useState(REGIONS[0]);
  const [replicas, setReplicas] = useState(6);
  const [status, setStatus] = useState('');

  const handleDownload = async () => {
    setStatus('Generating PDF...');
    try {
      const token = localStorage.getItem('token');
      const qs = new URLSearchParams({ name, cluster, region, replicas: String(replicas) });
      const base = (typeof window !== 'undefined' && window.__BACKEND_URL)
        ? window.__BACKEND_URL
        : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001');
      const res = await fetch(`${base}/api/custom-views/deployment-manifest-pdf?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manifest-${name}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus(`Downloaded ${blob.size} bytes`);
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Deployment Manifest PDF</h3>
      <p style={{ fontSize: 12, color: '#64748b', marginTop: 0 }}>
        Generates a downloadable PDF manifest for a containerized AI workload deployment.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={{ fontSize: 12 }}>Deployment Name
          <input value={name} onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 12 }}>Replicas
          <input type="number" value={replicas} onChange={(e) => setReplicas(e.target.value)}
            style={{ width: '100%', padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 12 }}>Cluster
          <select value={cluster} onChange={(e) => setCluster(e.target.value)}
            style={{ width: '100%', padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, marginTop: 4 }}>
            {CLUSTERS.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12 }}>Region
          <select value={region} onChange={(e) => setRegion(e.target.value)}
            style={{ width: '100%', padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, marginTop: 4 }}>
            {REGIONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </label>
      </div>
      <button onClick={handleDownload}
        style={{ marginTop: 12, background: '#2563eb', color: '#fff', border: 'none',
          padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}>
        Download Manifest PDF
      </button>
      {status && <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>{status}</div>}
    </div>
  );
}
