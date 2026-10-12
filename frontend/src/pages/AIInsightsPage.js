
import FullAIExamples, { useFullAIExamples } from "../components/FullAIExamples.jsx";
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import AIReport from '../components/AIReport';

const TOOLS = [
  { id: 'network-anomaly-detect', label: 'Network Anomaly Detect', endpoint: '/ai/network-anomaly-detect' },
  { id: 'cost-optimization', label: 'Cost Optimization', endpoint: '/ai/cost-optimization' },
  { id: 'churn-predict', label: 'Churn Predict', endpoint: '/ai/churn-predict' },
  { id: 'roaming-consortium-advisor', label: 'Roaming Consortium Advisor', endpoint: '/ai/roaming-consortium-advisor' },
];

export default function AIInsightsPage() {
  const fullAIExamples = useFullAIExamples();

  const [activeTool, setActiveTool] = useState('network-anomaly-detect');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);

  const [anomalyForm, setAnomalyForm] = useState({
    region: '',
    metrics: '',
    baseline: '',
    period: 'last_24h',
  });
  const [costForm, setCostForm] = useState({
    region: '',
    workloads: '',
    monthly_spend: '',
    constraints: '',
  });
  const [churnForm, setChurnForm] = useState({
    customers: '',
    timeframe: 'next_quarter',
    plan_type: '',
  });
  const [roamingForm, setRoamingForm] = useState({
    carrier_name: '',
    home_regions: '',
    target_regions: '',
    monthly_roaming_volume_mb: '',
    current_partners: '',
    candidate_partners: '',
    pain_points: '',
    compliance_constraints: '',
  });

  const loadHistory = async () => {
    try {
      const r = await api('/ai/history');
      const rows = Array.isArray(r) ? r : r?.data;
      if (!Array.isArray(rows)) throw new Error('The AI history response did not contain a list.');
      setHistory(rows);
    } catch (failure) {
      setError(failure.message);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const parseJsonOrText = (s) => {
    if (!s || !s.trim()) return undefined;
    try { return JSON.parse(s); } catch { return s; }
  };

  const run = async () => {
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const tool = TOOLS.find((t) => t.id === activeTool);
      let body;
      if (activeTool === 'network-anomaly-detect') {
        body = {
          region: anomalyForm.region,
          metrics: parseJsonOrText(anomalyForm.metrics),
          baseline: parseJsonOrText(anomalyForm.baseline),
          period: anomalyForm.period,
        };
      } else if (activeTool === 'cost-optimization') {
        body = {
          region: costForm.region,
          workloads: parseJsonOrText(costForm.workloads),
          monthly_spend: costForm.monthly_spend ? parseFloat(costForm.monthly_spend) : undefined,
          constraints: costForm.constraints,
        };
      } else if (activeTool === 'churn-predict') {
        body = {
          customers: parseJsonOrText(churnForm.customers),
          timeframe: churnForm.timeframe,
          plan_type: churnForm.plan_type,
        };
      } else {
        body = {
          carrier_name: roamingForm.carrier_name,
          home_regions: parseJsonOrText(roamingForm.home_regions),
          target_regions: parseJsonOrText(roamingForm.target_regions),
          monthly_roaming_volume_mb: roamingForm.monthly_roaming_volume_mb
            ? parseFloat(roamingForm.monthly_roaming_volume_mb)
            : undefined,
          current_partners: parseJsonOrText(roamingForm.current_partners),
          candidate_partners: parseJsonOrText(roamingForm.candidate_partners),
          pain_points: roamingForm.pain_points,
          compliance_constraints: roamingForm.compliance_constraints,
        };
      }
      const res = await api(tool.endpoint, 'POST', body);
      setResult(res);
      loadHistory();
    } catch (err) {
      setError(err.message || 'AI request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-full-ai-workspace="AIInsightsPage"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} />
      <h1>AI Insights</h1>
      <p style={{ color: '#64748b' }}>Network anomalies, cost optimization, and churn prediction</p>

      <div style={{ display: 'flex', gap: 8, margin: '20px 0', flexWrap: 'wrap' }}>
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`btn ${activeTool === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTool(t.id); setResult(null); setError(''); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        {activeTool === 'network-anomaly-detect' && (
          <>
            <h3>Network Anomaly Detection</h3>
            <div className="form-group">
              <label>Region</label>
              <input value={anomalyForm.region} onChange={(e) => setAnomalyForm({ ...anomalyForm, region: e.target.value })} placeholder="EU-West" data-full-ai-field={fullAIExamples.bind({ current: anomalyForm.region, change: (e) => setAnomalyForm({ ...anomalyForm, region: e.target.value }), label: "anomalyForm.region", manual: false, json: false, sample: '' }, "p1-4580", undefined)} />
            </div>
            <div className="form-group">
              <label>Metrics (JSON)</label>
              <textarea rows={4} value={anomalyForm.metrics} onChange={(e) => setAnomalyForm({ ...anomalyForm, metrics: e.target.value })} placeholder='[{"node":"core-1","latency_ms":420}]' data-full-ai-field={fullAIExamples.bind({ current: anomalyForm.metrics, change: (e) => setAnomalyForm({ ...anomalyForm, metrics: e.target.value }), label: "anomalyForm.metrics", manual: false, json: false, sample: '' }, "p1-4834", undefined)} />
            </div>
            <div className="form-group">
              <label>Baseline (JSON)</label>
              <textarea rows={3} value={anomalyForm.baseline} onChange={(e) => setAnomalyForm({ ...anomalyForm, baseline: e.target.value })} placeholder='{"latency_ms":80,"packet_loss_pct":0.2}' data-full-ai-field={fullAIExamples.bind({ current: anomalyForm.baseline, change: (e) => setAnomalyForm({ ...anomalyForm, baseline: e.target.value }), label: "anomalyForm.baseline", json: true, sample: '{"latency_ms":80,"packet_loss_pct":0.2}' }, "p1-5132", undefined)} />
            </div>
            <div className="form-group">
              <label>Period</label>
              <select value={anomalyForm.period} onChange={(e) => setAnomalyForm({ ...anomalyForm, period: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: anomalyForm.period, change: (e) => setAnomalyForm({ ...anomalyForm, period: e.target.value }), label: "anomalyForm.period", manual: false, json: false, sample: 'last_24h' }, "p1-5372", undefined)}>
                <option value="last_24h">Last 24h</option>
                <option value="last_7d">Last 7d</option>
                <option value="last_30d">Last 30d</option>
              </select>
            </div>
          </>
        )}

        {activeTool === 'cost-optimization' && (
          <>
            <h3>Cost Optimization</h3>
            <div className="form-group">
              <label>Region</label>
              <input value={costForm.region} onChange={(e) => setCostForm({ ...costForm, region: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: costForm.region, change: (e) => setCostForm({ ...costForm, region: e.target.value }), label: "costForm.region", manual: false, json: false, sample: '' }, "p1-5921", undefined)} />
            </div>
            <div className="form-group">
              <label>Workloads (JSON)</label>
              <textarea rows={4} value={costForm.workloads} onChange={(e) => setCostForm({ ...costForm, workloads: e.target.value })} placeholder='[{"name":"api","cpu":4,"mem_gb":16}]' data-full-ai-field={fullAIExamples.bind({ current: costForm.workloads, change: (e) => setCostForm({ ...costForm, workloads: e.target.value }), label: "costForm.workloads", manual: false, json: false, sample: '' }, "p1-6146", undefined)} />
            </div>
            <div className="form-group">
              <label>Monthly Spend ($)</label>
              <input type="number" value={costForm.monthly_spend} onChange={(e) => setCostForm({ ...costForm, monthly_spend: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: costForm.monthly_spend, change: (e) => setCostForm({ ...costForm, monthly_spend: e.target.value }), label: "costForm.monthly_spend", manual: false, json: false, sample: '' }, "p1-6441", undefined)} />
            </div>
            <div className="form-group">
              <label>Constraints</label>
              <textarea rows={2} value={costForm.constraints} onChange={(e) => setCostForm({ ...costForm, constraints: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: costForm.constraints, change: (e) => setCostForm({ ...costForm, constraints: e.target.value }), label: "costForm.constraints", manual: false, json: false, sample: '' }, "p1-6689", undefined)} />
            </div>
          </>
        )}

        {activeTool === 'roaming-consortium-advisor' && (
          <>
            <h3>Roaming Consortium Advisor</h3>
            <div className="form-group">
              <label>Carrier Name</label>
              <input value={roamingForm.carrier_name} onChange={(e) => setRoamingForm({ ...roamingForm, carrier_name: e.target.value })} placeholder="Acme Telecom" data-full-ai-field={fullAIExamples.bind({ current: roamingForm.carrier_name, change: (e) => setRoamingForm({ ...roamingForm, carrier_name: e.target.value }), label: "roamingForm.carrier_name", manual: false, json: false, sample: '' }, "p1-7077", undefined)} />
            </div>
            <div className="form-group">
              <label>Home Regions (JSON array)</label>
              <textarea rows={2} value={roamingForm.home_regions} onChange={(e) => setRoamingForm({ ...roamingForm, home_regions: e.target.value })} placeholder='["EU-West","UK"]' data-full-ai-field={fullAIExamples.bind({ current: roamingForm.home_regions, change: (e) => setRoamingForm({ ...roamingForm, home_regions: e.target.value }), label: "roamingForm.home_regions", manual: false, json: false, sample: '' }, "p1-7359", undefined)} />
            </div>
            <div className="form-group">
              <label>Target / Underserved Regions (JSON array)</label>
              <textarea rows={2} value={roamingForm.target_regions} onChange={(e) => setRoamingForm({ ...roamingForm, target_regions: e.target.value })} placeholder='["LATAM","SEA"]' data-full-ai-field={fullAIExamples.bind({ current: roamingForm.target_regions, change: (e) => setRoamingForm({ ...roamingForm, target_regions: e.target.value }), label: "roamingForm.target_regions", manual: false, json: false, sample: '' }, "p1-7673", undefined)} />
            </div>
            <div className="form-group">
              <label>Monthly Roaming Volume (MB)</label>
              <input type="number" value={roamingForm.monthly_roaming_volume_mb} onChange={(e) => setRoamingForm({ ...roamingForm, monthly_roaming_volume_mb: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: roamingForm.monthly_roaming_volume_mb, change: (e) => setRoamingForm({ ...roamingForm, monthly_roaming_volume_mb: e.target.value }), label: "roamingForm.monthly_roaming_volume_mb", manual: false, json: false, sample: '' }, "p1-7976", undefined)} />
            </div>
            <div className="form-group">
              <label>Current Partners (JSON)</label>
              <textarea rows={2} value={roamingForm.current_partners} onChange={(e) => setRoamingForm({ ...roamingForm, current_partners: e.target.value })} placeholder='[{"name":"PartnerA","region":"EU"}]' data-full-ai-field={fullAIExamples.bind({ current: roamingForm.current_partners, change: (e) => setRoamingForm({ ...roamingForm, current_partners: e.target.value }), label: "roamingForm.current_partners", manual: false, json: false, sample: '' }, "p1-8269", undefined)} />
            </div>
            <div className="form-group">
              <label>Candidate Partners (JSON)</label>
              <textarea rows={2} value={roamingForm.candidate_partners} onChange={(e) => setRoamingForm({ ...roamingForm, candidate_partners: e.target.value })} placeholder='[{"name":"NewCarrierX","region":"LATAM"}]' data-full-ai-field={fullAIExamples.bind({ current: roamingForm.candidate_partners, change: (e) => setRoamingForm({ ...roamingForm, candidate_partners: e.target.value }), label: "roamingForm.candidate_partners", manual: false, json: false, sample: '' }, "p1-8594", undefined)} />
            </div>
            <div className="form-group">
              <label>Pain Points</label>
              <textarea rows={2} value={roamingForm.pain_points} onChange={(e) => setRoamingForm({ ...roamingForm, pain_points: e.target.value })} placeholder="High wholesale rates in LATAM, sluggish onboarding..." data-full-ai-field={fullAIExamples.bind({ current: roamingForm.pain_points, change: (e) => setRoamingForm({ ...roamingForm, pain_points: e.target.value }), label: "roamingForm.pain_points", manual: false, json: false, sample: '' }, "p1-8915", undefined)} />
            </div>
            <div className="form-group">
              <label>Compliance Constraints</label>
              <textarea rows={2} value={roamingForm.compliance_constraints} onChange={(e) => setRoamingForm({ ...roamingForm, compliance_constraints: e.target.value })} placeholder="GDPR data residency, lawful intercept obligations..." data-full-ai-field={fullAIExamples.bind({ current: roamingForm.compliance_constraints, change: (e) => setRoamingForm({ ...roamingForm, compliance_constraints: e.target.value }), label: "roamingForm.compliance_constraints", manual: false, json: false, sample: '' }, "p1-9245", undefined)} />
            </div>
          </>
        )}

        {activeTool === 'churn-predict' && (
          <>
            <h3>Customer Churn Prediction</h3>
            <div className="form-group">
              <label>Customers (JSON)</label>
              <textarea rows={5} value={churnForm.customers} onChange={(e) => setChurnForm({ ...churnForm, customers: e.target.value })} placeholder='[{"id":1,"plan":"Premium","tickets_30d":4}]' data-full-ai-field={fullAIExamples.bind({ current: churnForm.customers, change: (e) => setChurnForm({ ...churnForm, customers: e.target.value }), label: "churnForm.customers", manual: false, json: false, sample: '' }, "p1-9721", undefined)} />
            </div>
            <div className="form-group">
              <label>Timeframe</label>
              <select value={churnForm.timeframe} onChange={(e) => setChurnForm({ ...churnForm, timeframe: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: churnForm.timeframe, change: (e) => setChurnForm({ ...churnForm, timeframe: e.target.value }), label: "churnForm.timeframe", manual: false, json: false, sample: 'next_quarter' }, "p1-10018", undefined)}>
                <option value="next_month">Next Month</option>
                <option value="next_quarter">Next Quarter</option>
                <option value="next_year">Next Year</option>
              </select>
            </div>
            <div className="form-group">
              <label>Plan Type Filter</label>
              <input value={churnForm.plan_type} onChange={(e) => setChurnForm({ ...churnForm, plan_type: e.target.value })} placeholder="Standard, Business..." data-full-ai-field={fullAIExamples.bind({ current: churnForm.plan_type, change: (e) => setChurnForm({ ...churnForm, plan_type: e.target.value }), label: "churnForm.plan_type", manual: false, json: false, sample: '' }, "p1-10466", undefined)} />
            </div>
          </>
        )}

        <button className="btn btn-primary" onClick={run} disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'Running...' : 'Run AI'}
        </button>

        {error && <div style={{ color: '#dc2626', marginTop: 12 }}>{error}</div>}
      </div>

      {result !== null && (
        <div style={{ marginTop: 24, background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <h3>Result</h3>
          <AIReport response={result} title={`${TOOLS.find((tool) => tool.id === activeTool)?.label || 'AI'} result`} />
        </div>
      )}

      <div style={{ marginTop: 24, background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <h3>Recent AI Analyses</h3>
        {history.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 14 }}>No analyses yet</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {history.slice(0, 10).map((item) => (
              <li key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>
                {item.result !== undefined ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedHistory(selectedHistory === item.id ? null : item.id)} aria-expanded={selectedHistory === item.id}>
                  #{item.id} · {item.endpoint || item.type} · {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                </button> : <span>#{item.id} · {item.endpoint || item.type} · Saved output unavailable from this API</span>}
                {selectedHistory === item.id && <AIReport response={item.result} title={`${item.endpoint || 'Saved AI'} analysis`} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
