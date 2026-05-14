// Apply pass 5 — backlog UI for AIondistributedcloud
// Surfaces /api/ai/sla, /clouds, /self-service, /disputes, /network/dashboard.
import React, { useState } from 'react';
import { api } from '../api';

const TABS = [
  { id: 'sla',          label: 'SLA Thresholds & Breach' },
  { id: 'dashboard',    label: 'Network Dashboard' },
  { id: 'clouds',       label: 'Cloud Integrations' },
  { id: 'self-service', label: 'Self-Service Portal' },
  { id: 'disputes',     label: 'Dispute Resolution' },
];

export default function AIBacklogPage() {
  const [tab, setTab] = useState('sla');
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState(null);
  const [err, setErr] = useState('');

  // SLA
  const [slaCustId, setSlaCustId] = useState('');
  const [slaMetric, setSlaMetric] = useState('packet_loss_pct');
  const [slaThr, setSlaThr] = useState(1);
  const [slaCmp, setSlaCmp] = useState('gt');
  const [slaSev, setSlaSev] = useState('high');
  const [slaObs, setSlaObs] = useState('{"packet_loss_pct": 2.5, "latency_ms": 80}');

  // Self-service
  const [ssCust, setSsCust] = useState('1');
  const [ssSubj, setSsSubj] = useState('Outage in zone EU-1');
  const [ssBody, setSsBody] = useState('We are experiencing intermittent connectivity in zone EU-1.');

  // Dispute
  const [dsCust, setDsCust] = useState('1');
  const [dsText, setDsText] = useState('I was overcharged $42 for data roaming on April invoice.');

  const wrap = async (fn) => {
    setLoading(true); setErr(''); setOut(null);
    try { const r = await fn(); setOut(r); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="page">
      <h1>AI Backlog Tools</h1>
      <p style={{ color: '#888' }}>Apply pass 5 features. Cloud integrations gated behind credentials (return 503).</p>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        {TABS.map((t) => (
          <button key={t.id} className={`btn ${tab === t.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => { setTab(t.id); setErr(''); setOut(null); }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sla' && (
        <div className="card" style={{ padding: 12 }}>
          <h3>SLA thresholds</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 8 }}>
            <input value={slaCustId} onChange={(e) => setSlaCustId(e.target.value)} placeholder="customer_id (opt)" />
            <input value={slaMetric} onChange={(e) => setSlaMetric(e.target.value)} placeholder="metric" />
            <input type="number" value={slaThr} onChange={(e) => setSlaThr(parseFloat(e.target.value))} placeholder="threshold" />
            <select value={slaCmp} onChange={(e) => setSlaCmp(e.target.value)}>
              <option>lt</option><option>lte</option><option>gt</option><option>gte</option><option>eq</option>
            </select>
            <select value={slaSev} onChange={(e) => setSlaSev(e.target.value)}>
              <option>low</option><option>medium</option><option>high</option><option>critical</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={loading} onClick={() => wrap(() => api('/ai/sla/thresholds', 'POST', {
              customer_id: slaCustId ? parseInt(slaCustId, 10) : null, metric: slaMetric, threshold: slaThr, comparison: slaCmp, severity: slaSev,
            }))}>Add threshold</button>
            <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => wrap(() => api('/ai/sla/thresholds'))}>List</button>
          </div>
          <h4 style={{ marginTop: 12 }}>Check observations</h4>
          <textarea value={slaObs} onChange={(e) => setSlaObs(e.target.value)} rows={4} style={{ width: '100%' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={loading} onClick={() => {
              let parsed; try { parsed = JSON.parse(slaObs); } catch { setErr('Invalid JSON'); return; }
              wrap(() => api('/ai/sla/check', 'POST', { observations: parsed, customer_id: slaCustId ? parseInt(slaCustId, 10) : null }));
            }}>Check</button>
            <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => wrap(() => api('/ai/sla/breaches'))}>Recent breaches</button>
          </div>
        </div>
      )}

      {tab === 'dashboard' && (
        <div className="card" style={{ padding: 12 }}>
          <h3>Network dashboard snapshot</h3>
          <button className="btn btn-primary btn-sm" disabled={loading} onClick={() => wrap(() => api('/ai/network/dashboard'))}>Pull snapshot</button>
        </div>
      )}

      {tab === 'clouds' && (
        <div className="card" style={{ padding: 12 }}>
          <h3>Cloud integrations (gated)</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => wrap(() => api('/ai/clouds/status'))}>Status</button>
            <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => wrap(() => api('/ai/clouds/aws/regions'))}>AWS regions</button>
            <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => wrap(() => api('/ai/clouds/azure/subscriptions'))}>Azure subs</button>
            <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => wrap(() => api('/ai/clouds/gcp/projects'))}>GCP projects</button>
          </div>
          <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>Returns 503 with `missing` field if creds unset.</p>
        </div>
      )}

      {tab === 'self-service' && (
        <div className="card" style={{ padding: 12 }}>
          <h3>Customer self-service</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 6, marginBottom: 8 }}>
            <input value={ssCust} onChange={(e) => setSsCust(e.target.value)} placeholder="customer_id" />
            <input value={ssSubj} onChange={(e) => setSsSubj(e.target.value)} placeholder="subject" />
          </div>
          <textarea value={ssBody} onChange={(e) => setSsBody(e.target.value)} rows={3} style={{ width: '100%' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => wrap(() => api(`/ai/self-service/summary?customer_id=${ssCust}`))}>Get summary</button>
            <button className="btn btn-primary btn-sm" disabled={loading} onClick={() => wrap(() => api('/ai/self-service/ticket', 'POST', { customer_id: parseInt(ssCust, 10), subject: ssSubj, body: ssBody, priority: 'normal' }))}>Open ticket</button>
          </div>
        </div>
      )}

      {tab === 'disputes' && (
        <div className="card" style={{ padding: 12 }}>
          <h3>Dispute proposals (AI advises, human approves)</h3>
          <input value={dsCust} onChange={(e) => setDsCust(e.target.value)} placeholder="customer_id" style={{ width: '100%', marginBottom: 6 }} />
          <textarea value={dsText} onChange={(e) => setDsText(e.target.value)} rows={4} style={{ width: '100%' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={loading} onClick={() => wrap(() => api('/ai/disputes/propose', 'POST', { customer_id: parseInt(dsCust, 10), dispute_text: dsText }))}>Propose</button>
            <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => wrap(() => api('/ai/disputes'))}>List proposals</button>
          </div>
        </div>
      )}

      {err && <div style={{ marginTop: 16, padding: 12, background: '#7f1d1d', color: '#fecaca', borderRadius: 4 }}>{err}</div>}
      {out && <pre style={{ marginTop: 16, padding: 12, background: '#1f2937', color: '#e5e7eb', borderRadius: 4, maxHeight: 480, overflow: 'auto' }}>{JSON.stringify(out, null, 2)}</pre>}
    </div>
  );
}
