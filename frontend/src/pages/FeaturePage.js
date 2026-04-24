import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

function formatValue(val) {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return new Date(val).toLocaleString();
  }
  return String(val);
}

function StatusBadge({ value }) {
  if (!value) return '-';
  const cls = `status-badge status-${value.toLowerCase().replace(/\s/g, '_')}`;
  return <span className={cls}>{value.replace(/_/g, ' ')}</span>;
}

function AIResultDisplay({ data, feature }) {
  if (!feature.aiDisplay || !data) return null;
  const display = feature.aiDisplay(data);

  return (
    <div className="ai-result">
      <div className="ai-result-header">
        <span className="ai-badge">AI Powered</span>
        <span>{display.label}</span>
      </div>
      <div className="ai-result-content">
        {display.metrics && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {display.metrics.map((m, i) => (
              <div key={i} className="ai-metric">
                <span style={{ color: '#64748b', fontSize: 12 }}>{m.label}:</span>
                <span style={{ color: m.color || '#1e293b', fontWeight: 700, textTransform: 'capitalize' }}>{m.value}</span>
              </div>
            ))}
          </div>
        )}

        {display.riskScore !== undefined && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Risk Score</div>
            <div className="risk-meter">
              <div className="risk-bar">
                <div className={`risk-fill ${display.riskScore <= 25 ? 'risk-low' : display.riskScore <= 50 ? 'risk-medium' : display.riskScore <= 75 ? 'risk-high' : 'risk-critical'}`}
                  style={{ width: `${display.riskScore}%` }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{display.riskScore}/100</span>
            </div>
          </div>
        )}

        {display.sections && display.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{s.label}</div>
            <div style={{
              background: s.highlight ? 'white' : 'rgba(255,255,255,0.5)',
              padding: s.highlight ? 16 : 12,
              borderRadius: 8,
              fontSize: 14,
              lineHeight: 1.7,
              borderLeft: s.highlight ? '4px solid #8b5cf6' : 'none',
              whiteSpace: 'pre-wrap',
            }}>{s.content || '-'}</div>
          </div>
        ))}

        {display.tags && display.tags.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Key Topics</div>
            <div className="ai-tags">
              {display.tags.map((t, i) => <span key={i} className="ai-tag">{t}</span>)}
            </div>
          </div>
        )}

        {display.findings && display.findings.length > 0 && (
          <div className="ai-findings">
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Findings</div>
            {display.findings.map((f, i) => (
              <div key={i} className="ai-finding">
                <div className={`finding-severity severity-${(f.severity || 'medium').toLowerCase()}`}>{f.severity || 'Medium'}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{f.finding}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{f.recommendation}</div>
              </div>
            ))}
          </div>
        )}

        {display.actions && display.actions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Suggested Actions</div>
            <ul className="ai-actions-list">
              {display.actions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        )}

        {data.ai_model && (
          <div style={{ marginTop: 16, padding: '8px 12px', background: 'rgba(139,92,246,0.1)', borderRadius: 6, fontSize: 11, color: '#6d28d9' }}>
            Model: {data.ai_model} | Generated: {data.created_at ? new Date(data.created_at).toLocaleString() : 'Just now'}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailView({ item, feature, onClose, onDelete, onEdit }) {
  const fields = feature.fields;
  const allFields = Object.keys(item).filter(k => k !== 'id');

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={e => e.stopPropagation()}>
        <div className="detail-header">
          <h2>{feature.icon} {item[fields[0]?.name] || `Record #${item.id}`}</h2>
          <button className="detail-close" onClick={onClose}>x</button>
        </div>
        <div className="detail-body">
          <div className="detail-grid">
            {allFields.map(key => {
              const isStatus = key === 'status' || key === 'payment_status' || key === 'risk_level' || key === 'severity' || key === 'priority' || key === 'compliance_status' || key === 'sentiment' || key === 'urgency';
              const isLong = ['description', 'details', 'source_text', 'translated_text', 'customer_message', 'ai_response', 'customer_query', 'executive_summary', 'ai_summary'].includes(key);
              const isJson = ['findings', 'action_items', 'suggested_actions', 'key_topics', 'secondary_intents', 'entities'].includes(key);

              if (isJson && feature.aiDisplay) return null;

              return (
                <div key={key} className={`detail-field ${isLong ? 'full-width' : ''}`}>
                  <label>{key.replace(/_/g, ' ')}</label>
                  {isStatus ? (
                    <StatusBadge value={item[key]} />
                  ) : isLong ? (
                    <div className="value" style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 13 }}>{formatValue(item[key])}</div>
                  ) : (
                    <div className="value">{formatValue(item[key])}</div>
                  )}
                </div>
              );
            })}
          </div>

          {feature.aiDisplay && <AIResultDisplay data={item} feature={feature} />}
        </div>
        <div className="detail-actions">
          {!feature.noEdit && (
            <button className="btn btn-warning btn-sm" onClick={() => onEdit(item)}>Edit</button>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}>Delete</button>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function FormModal({ feature, item, onClose, onSave }) {
  const [formData, setFormData] = useState(() => {
    if (item) {
      const d = {};
      feature.fields.forEach(f => {
        let val = item[f.name];
        if (f.type === 'date' && val) val = val.split('T')[0];
        d[f.name] = val || '';
      });
      return d;
    }
    const d = {};
    feature.fields.forEach(f => { d[f.name] = ''; });
    return d;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSave(formData, item?.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{item ? 'Edit' : 'New'} {feature.label.replace(/^AI\s+/, '')}</h2>
          <button className="detail-close" onClick={onClose}>x</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}
            {feature.isAI && !item && (
              <div style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', padding: 16, borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#5b21b6', border: '1px solid #c4b5fd' }}>
                This will use AI (OpenRouter) to process your request. Results will be generated automatically.
              </div>
            )}
            {feature.fields.map(f => (
              <div key={f.name} className="form-group">
                <label>{f.label} {f.required && '*'}</label>
                {f.type === 'textarea' ? (
                  <textarea value={formData[f.name]} onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                    required={f.required} rows={4} />
                ) : f.type === 'select' ? (
                  <select value={formData[f.name]} onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                    required={f.required}>
                    <option value="">Select...</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type || 'text'} value={formData[f.name]}
                    onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                    required={f.required} step={f.type === 'number' ? 'any' : undefined} />
                )}
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (feature.isAI && !item ? 'Processing with AI...' : 'Saving...') : (feature.isAI && !item ? 'Run AI Analysis' : (item ? 'Update' : 'Create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FeaturePage({ feature }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api(feature.endpoint);
      setItems(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [feature.endpoint]);

  useEffect(() => {
    loadItems();
    setSelectedItem(null);
    setShowForm(false);
    setEditItem(null);
  }, [loadItems]);

  const handleSave = async (formData, id) => {
    if (id) {
      await api(`${feature.endpoint}/${id}`, 'PUT', formData);
      showToast('Record updated successfully');
    } else {
      await api(feature.endpoint, 'POST', formData);
      showToast(feature.isAI ? 'AI analysis completed successfully' : 'Record created successfully');
    }
    loadItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await api(`${feature.endpoint}/${id}`, 'DELETE');
      showToast('Record deleted successfully');
      setSelectedItem(null);
      loadItems();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(null);
    setEditItem(item);
    setShowForm(true);
  };

  const columns = feature.columns || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{feature.icon} {feature.label}</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{feature.desc}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadItems}>Refresh</button>
          <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
            {feature.isAI ? '+ New AI Analysis' : '+ New Record'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading...</div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                {columns.map(col => (
                  <th key={col}>{col.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No records found. Create your first record.</td></tr>
              ) : items.map((item, idx) => (
                <tr key={item.id} onClick={() => setSelectedItem(item)}>
                  <td style={{ fontWeight: 600, color: '#94a3b8' }}>{idx + 1}</td>
                  {columns.map(col => {
                    const val = item[col];
                    const isStatus = ['status', 'payment_status', 'risk_level', 'severity', 'priority', 'compliance_status', 'sentiment', 'urgency'].includes(col);
                    return (
                      <td key={col}>
                        {isStatus ? <StatusBadge value={val} /> : formatValue(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 13, color: '#94a3b8' }}>
            Showing {items.length} records
          </div>
        </div>
      )}

      {selectedItem && (
        <DetailView
          item={selectedItem}
          feature={feature}
          onClose={() => setSelectedItem(null)}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      )}

      {showForm && (
        <FormModal
          feature={feature}
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSave={handleSave}
        />
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
