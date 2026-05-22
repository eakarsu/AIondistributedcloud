import React, { useEffect, useState } from 'react';
import { api } from '../api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function WorkloadDistributionChart() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/custom-views/workload-distribution')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ color: '#dc2626', padding: 12 }}>Error: {error}</div>;
  if (!data) return <div style={{ padding: 12 }}>Loading workload distribution...</div>;

  const maxPods = Math.max(...data.clusters.map(c => c.total_pods), 1);

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Workload Distribution per Cluster</h3>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {data.summary.cluster_count} clusters | {data.summary.total_pods} pods | {data.summary.total_gpus} GPUs
        </span>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {['inference','training','fine-tune','embedding','batch'].map((t, i) => (
          <span key={t} style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, background: COLORS[i], borderRadius: 2, display: 'inline-block' }} /> {t}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.clusters.map((c) => (
          <div key={c.cluster}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <strong>{c.cluster}</strong>
              <span style={{ color: '#64748b' }}>{c.region} | {c.total_pods} pods | {c.gpu_count} GPUs</span>
            </div>
            <div style={{ display: 'flex', height: 22, borderRadius: 4, overflow: 'hidden', background: '#f1f5f9' }}>
              {c.breakdown.map((b, i) => {
                const w = (b.pods / c.total_pods) * 100;
                return (
                  <div key={b.type} title={`${b.type}: ${b.pods} pods`}
                    style={{ width: `${w}%`, background: COLORS[i], color: '#fff', fontSize: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {w > 8 ? b.pods : ''}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 4, fontSize: 10, color: '#94a3b8' }}>
              Capacity: {((c.total_pods / maxPods) * 100).toFixed(0)}% of largest cluster
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
