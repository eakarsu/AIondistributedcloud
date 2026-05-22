import React, { useEffect, useState } from 'react';
import { api } from '../api';

function colorFor(v) {
  // 0 = green, 50 = amber, 100 = red
  if (v < 40) return `rgb(16,185,129)`;
  if (v < 70) return `rgb(245,158,11)`;
  return `rgb(239,68,68)`;
}

export default function RegionUtilizationHeatmap() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/custom-views/region-utilization')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ color: '#dc2626', padding: 12 }}>Error: {error}</div>;
  if (!data) return <div style={{ padding: 12 }}>Loading heatmap...</div>;

  const valueOf = (region, metric) => {
    const c = data.cells.find(x => x.region === region && x.metric === metric);
    return c ? c.utilization : 0;
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Region Utilization Heatmap</h3>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {data.regions.length} regions x {data.metrics.length} metrics
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Region</th>
              {data.metrics.map(m => (
                <th key={m} style={{ padding: 8, borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.regions.map(r => (
              <tr key={r}>
                <td style={{ padding: 6, fontWeight: 600 }}>{r}</td>
                {data.metrics.map(m => {
                  const v = valueOf(r, m);
                  return (
                    <td key={m} style={{ padding: 4 }}>
                      <div style={{
                        background: colorFor(v),
                        color: '#fff',
                        textAlign: 'center',
                        padding: '8px 4px',
                        borderRadius: 4,
                        fontWeight: 600,
                      }}>{v}%</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: 11, color: '#475569' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgb(16,185,129)', borderRadius: 2, marginRight: 4 }} />&lt; 40% healthy</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgb(245,158,11)', borderRadius: 2, marginRight: 4 }} />40-70% busy</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgb(239,68,68)', borderRadius: 2, marginRight: 4 }} />&gt; 70% saturated</span>
      </div>
    </div>
  );
}
