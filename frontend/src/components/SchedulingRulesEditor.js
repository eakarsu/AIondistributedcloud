import React, { useEffect, useState } from 'react';
import { api } from '../api';

const CLUSTERS = [
  'us-east-prod', 'us-west-prod', 'eu-central-prod', 'eu-west-edge',
  'apac-tokyo', 'apac-singapore', 'sa-saopaulo', 'me-dubai',
];

const EMPTY = {
  name: '', type: 'affinity', target_label: '', match_label: '',
  weight: 50, cluster: CLUSTERS[0], enabled: true,
};

export default function SchedulingRulesEditor() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const r = await api('/custom-views/scheduling-rules');
      setRules(r.rules || []);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api(`/custom-views/scheduling-rules/${editingId}`, 'PUT', form);
      } else {
        await api('/custom-views/scheduling-rules', 'POST', form);
      }
      setForm(EMPTY);
      setEditingId(null);
      await load();
    } catch (e) { setError(e.message); }
  };

  const edit = (r) => {
    setEditingId(r.id);
    setForm({
      name: r.name, type: r.type, target_label: r.target_label,
      match_label: r.match_label, weight: r.weight, cluster: r.cluster, enabled: r.enabled,
    });
  };

  const del = async (id) => {
    if (!window.confirm('Delete rule?')) return;
    try {
      await api(`/custom-views/scheduling-rules/${id}`, 'DELETE');
      await load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Scheduling Rules (Affinity / Anti-Affinity)</h3>
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 8, borderRadius: 4, marginBottom: 8 }}>{error}</div>}
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        <input placeholder="Rule name" required value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 4 }} />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
          style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 4 }}>
          <option value="affinity">affinity</option>
          <option value="anti-affinity">anti-affinity</option>
        </select>
        <select value={form.cluster} onChange={(e) => setForm({ ...form, cluster: e.target.value })}
          style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 4 }}>
          {CLUSTERS.map(c => <option key={c}>{c}</option>)}
        </select>
        <input placeholder="Target label (e.g. workload=training)" value={form.target_label}
          onChange={(e) => setForm({ ...form, target_label: e.target.value })}
          style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 4 }} />
        <input placeholder="Match label (e.g. gpu=a100)" value={form.match_label}
          onChange={(e) => setForm({ ...form, match_label: e.target.value })}
          style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 4 }} />
        <input type="number" placeholder="weight" value={form.weight}
          onChange={(e) => setForm({ ...form, weight: e.target.value })}
          style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 4 }} />
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
          enabled
        </label>
        <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer' }}>
          {editingId ? 'Update Rule' : 'Add Rule'}
        </button>
        {editingId && (
          <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }}
            style={{ background: '#94a3b8', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer' }}>
            Cancel
          </button>
        )}
      </form>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            <th style={{ padding: 6, textAlign: 'left' }}>Name</th>
            <th style={{ padding: 6, textAlign: 'left' }}>Type</th>
            <th style={{ padding: 6, textAlign: 'left' }}>Cluster</th>
            <th style={{ padding: 6, textAlign: 'left' }}>Target</th>
            <th style={{ padding: 6, textAlign: 'left' }}>Match</th>
            <th style={{ padding: 6, textAlign: 'left' }}>Weight</th>
            <th style={{ padding: 6, textAlign: 'left' }}>Enabled</th>
            <th style={{ padding: 6, textAlign: 'left' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: 6 }}>{r.name}</td>
              <td style={{ padding: 6 }}>
                <span style={{ padding: '2px 6px', borderRadius: 3,
                  background: r.type === 'affinity' ? '#dcfce7' : '#fee2e2',
                  color: r.type === 'affinity' ? '#166534' : '#991b1b' }}>{r.type}</span>
              </td>
              <td style={{ padding: 6 }}>{r.cluster}</td>
              <td style={{ padding: 6, fontFamily: 'monospace' }}>{r.target_label}</td>
              <td style={{ padding: 6, fontFamily: 'monospace' }}>{r.match_label}</td>
              <td style={{ padding: 6 }}>{r.weight}</td>
              <td style={{ padding: 6 }}>{r.enabled ? 'Yes' : 'No'}</td>
              <td style={{ padding: 6 }}>
                <button onClick={() => edit(r)} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: 3, marginRight: 4, cursor: 'pointer' }}>Edit</button>
                <button onClick={() => del(r.id)} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: 3, cursor: 'pointer' }}>Del</button>
              </td>
            </tr>
          ))}
          {!rules.length && <tr><td colSpan={8} style={{ padding: 12, textAlign: 'center', color: '#94a3b8' }}>No rules yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
