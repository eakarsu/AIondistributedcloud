import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getUser, logout } from './api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FeaturePage from './pages/FeaturePage';

const FEATURES = [
  { key: 'customers', label: 'Customer Management', icon: '👥', endpoint: '/api/customers', category: 'core',
    desc: 'Manage customers across all regions with data residency compliance',
    fields: [
      { name: 'name', label: 'Full Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'country', label: 'Country', type: 'text', required: true },
      { name: 'data_zone', label: 'Data Zone', type: 'text' },
      { name: 'plan_type', label: 'Plan Type', type: 'select', options: ['Standard','Business','Premium','Enterprise'] },
      { name: 'status', label: 'Status', type: 'select', options: ['active','suspended','inactive'] },
    ],
    columns: ['name','email','country','data_zone','plan_type','status'],
  },
  { key: 'data-zones', label: 'Data Residency Zones', icon: '🛡️', endpoint: '/api/data-zones', category: 'core',
    desc: 'Configure and monitor data residency zones with encryption and compliance settings',
    fields: [
      { name: 'zone_name', label: 'Zone Name', type: 'text', required: true },
      { name: 'country', label: 'Country', type: 'text', required: true },
      { name: 'region', label: 'Region', type: 'text' },
      { name: 'data_center', label: 'Data Center', type: 'text' },
      { name: 'encryption_standard', label: 'Encryption', type: 'text' },
      { name: 'compliance_level', label: 'Compliance Level', type: 'text' },
      { name: 'max_storage_tb', label: 'Max Storage (TB)', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['active','standby','decommissioned'] },
    ],
    columns: ['zone_name','country','data_center','encryption_standard','compliance_level','status'],
  },
  { key: 'billing', label: 'Billing & Invoices', icon: '💰', endpoint: '/api/billing', category: 'core',
    desc: 'Region-specific billing with multi-currency support and local payment methods',
    fields: [
      { name: 'customer_name', label: 'Customer', type: 'text', required: true },
      { name: 'country', label: 'Country', type: 'text', required: true },
      { name: 'invoice_number', label: 'Invoice #', type: 'text' },
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'currency', label: 'Currency', type: 'text' },
      { name: 'billing_period', label: 'Period', type: 'text' },
      { name: 'payment_status', label: 'Payment Status', type: 'select', options: ['pending','paid','overdue','refunded'] },
      { name: 'payment_method', label: 'Payment Method', type: 'text' },
    ],
    columns: ['customer_name','country','invoice_number','amount','currency','payment_status'],
  },
  { key: 'tickets', label: 'Support Tickets', icon: '🎫', endpoint: '/api/tickets', category: 'core',
    desc: 'Customer support tickets with priority tracking and regional routing',
    fields: [
      { name: 'customer_name', label: 'Customer', type: 'text', required: true },
      { name: 'country', label: 'Country', type: 'text', required: true },
      { name: 'subject', label: 'Subject', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'priority', label: 'Priority', type: 'select', options: ['low','medium','high','critical'] },
      { name: 'category', label: 'Category', type: 'select', options: ['Technical','Billing','Compliance','Account','Network','Sales','Security'] },
      { name: 'status', label: 'Status', type: 'select', options: ['open','in_progress','resolved','closed'] },
    ],
    columns: ['customer_name','country','subject','priority','category','status'],
  },
  { key: 'network', label: 'Network Infrastructure', icon: '🌐', endpoint: '/api/network', category: 'core',
    desc: 'Monitor network nodes, capacity, and latency across all countries',
    fields: [
      { name: 'node_name', label: 'Node Name', type: 'text', required: true },
      { name: 'country', label: 'Country', type: 'text', required: true },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'node_type', label: 'Node Type', type: 'select', options: ['Core Router','Edge Node','CDN Node','DNS Server'] },
      { name: 'ip_address', label: 'IP Address', type: 'text' },
      { name: 'capacity_gbps', label: 'Capacity (Gbps)', type: 'number' },
      { name: 'latency_ms', label: 'Latency (ms)', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['online','offline','maintenance'] },
    ],
    columns: ['node_name','country','city','node_type','capacity_gbps','status'],
  },
  { key: 'sim-cards', label: 'SIM Card Management', icon: '📱', endpoint: '/api/sim-cards', category: 'core',
    desc: 'Manage SIM cards, eSIMs, and MSISDN assignments per region',
    fields: [
      { name: 'iccid', label: 'ICCID', type: 'text' },
      { name: 'msisdn', label: 'MSISDN', type: 'text' },
      { name: 'imsi', label: 'IMSI', type: 'text' },
      { name: 'customer_name', label: 'Customer', type: 'text' },
      { name: 'country', label: 'Country', type: 'text', required: true },
      { name: 'sim_type', label: 'SIM Type', type: 'select', options: ['nano','micro','eSIM'] },
      { name: 'network_type', label: 'Network', type: 'select', options: ['5G','4G LTE','3G'] },
      { name: 'status', label: 'Status', type: 'select', options: ['active','inactive','suspended','blocked'] },
    ],
    columns: ['iccid','customer_name','country','sim_type','network_type','status'],
  },
  { key: 'roaming', label: 'Roaming Agreements', icon: '✈️', endpoint: '/api/roaming', category: 'core',
    desc: 'International roaming partnerships with bilateral and regulated agreements',
    fields: [
      { name: 'partner_name', label: 'Partner', type: 'text', required: true },
      { name: 'home_country', label: 'Home Country', type: 'text', required: true },
      { name: 'roaming_country', label: 'Roaming Country', type: 'text', required: true },
      { name: 'agreement_type', label: 'Agreement Type', type: 'select', options: ['Bilateral','EU-Regulated','GCC-Agreement','Multilateral'] },
      { name: 'data_rate_per_mb', label: 'Data Rate/MB', type: 'number' },
      { name: 'voice_rate_per_min', label: 'Voice Rate/Min', type: 'number' },
      { name: 'validity_start', label: 'Start Date', type: 'date' },
      { name: 'validity_end', label: 'End Date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['active','expired','pending','suspended'] },
    ],
    columns: ['partner_name','home_country','roaming_country','agreement_type','status'],
  },
  { key: 'compliance', label: 'Regulatory Compliance', icon: '⚖️', endpoint: '/api/compliance', category: 'core',
    desc: 'Track data protection regulations and compliance requirements per jurisdiction',
    fields: [
      { name: 'rule_name', label: 'Rule Name', type: 'text', required: true },
      { name: 'country', label: 'Country', type: 'text', required: true },
      { name: 'regulation', label: 'Regulation', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'enforcement_date', label: 'Enforcement Date', type: 'date' },
      { name: 'penalty_amount', label: 'Penalty Amount', type: 'number' },
      { name: 'currency', label: 'Currency', type: 'text' },
      { name: 'severity', label: 'Severity', type: 'select', options: ['low','medium','high','critical'] },
      { name: 'status', label: 'Status', type: 'select', options: ['active','draft','deprecated'] },
    ],
    columns: ['rule_name','country','regulation','severity','status'],
  },
  { key: 'audit', label: 'Audit Logs', icon: '📋', endpoint: '/api/audit', category: 'core',
    desc: 'Complete audit trail of all data access, transfers, and system operations',
    fields: [
      { name: 'action', label: 'Action', type: 'text', required: true },
      { name: 'entity_type', label: 'Entity Type', type: 'text' },
      { name: 'entity_id', label: 'Entity ID', type: 'text' },
      { name: 'user_email', label: 'User Email', type: 'email' },
      { name: 'country', label: 'Country', type: 'text' },
      { name: 'ip_address', label: 'IP Address', type: 'text' },
      { name: 'details', label: 'Details', type: 'textarea' },
      { name: 'risk_level', label: 'Risk Level', type: 'select', options: ['low','medium','high','critical'] },
    ],
    columns: ['action','entity_type','user_email','country','risk_level','created_at'],
    noEdit: true,
  },
  { key: 'translations', label: 'AI Real-Time Translation', icon: '🌍', endpoint: '/api/translations', category: 'ai',
    desc: 'AI-powered real-time translation for customer communications across regions',
    fields: [
      { name: 'source_text', label: 'Source Text', type: 'textarea', required: true },
      { name: 'source_language', label: 'Source Language', type: 'select', options: ['English','German','French','Japanese','Portuguese','Spanish','Arabic','Swedish','Italian','Chinese','Korean','Polish','Hindi'] },
      { name: 'target_language', label: 'Target Language', type: 'select', options: ['English','German','French','Japanese','Portuguese','Spanish','Arabic','Swedish','Italian','Chinese','Korean','Polish','Hindi'] },
      { name: 'country', label: 'Country', type: 'text' },
      { name: 'customer_name', label: 'Customer', type: 'text' },
    ],
    columns: ['source_language','target_language','country','customer_name','status'],
    isAI: true, noEdit: true,
    aiDisplay: (item) => ({
      label: 'Translation Result',
      sections: [
        { label: 'Source Text', content: item.source_text },
        { label: `Translated (${item.target_language})`, content: item.translated_text, highlight: true },
      ]
    }),
  },
  { key: 'sentiment', label: 'AI Sentiment Analysis', icon: '💭', endpoint: '/api/sentiment', category: 'ai',
    desc: 'Analyze customer sentiment from messages across all communication channels',
    fields: [
      { name: 'customer_message', label: 'Customer Message', type: 'textarea', required: true },
      { name: 'customer_name', label: 'Customer Name', type: 'text' },
      { name: 'country', label: 'Country', type: 'text' },
      { name: 'channel', label: 'Channel', type: 'select', options: ['email','chat','phone','social'] },
    ],
    columns: ['customer_name','country','channel','sentiment','urgency','status'],
    isAI: true, noEdit: true,
    aiDisplay: (item) => ({
      label: 'Sentiment Analysis',
      metrics: [
        { label: 'Sentiment', value: item.sentiment, color: item.sentiment === 'positive' ? '#16a34a' : item.sentiment === 'negative' ? '#dc2626' : '#d97706' },
        { label: 'Confidence', value: `${(parseFloat(item.confidence || 0) * 100).toFixed(0)}%` },
        { label: 'Urgency', value: item.urgency },
      ],
      sections: [
        { label: 'AI Summary', content: item.ai_summary, highlight: true },
        { label: 'Customer Message', content: item.customer_message },
      ],
      tags: (() => { try { return JSON.parse(item.key_topics || '[]'); } catch { return []; } })(),
    }),
  },
  { key: 'ai-support', label: 'AI Support Assistant', icon: '🤖', endpoint: '/api/ai-support', category: 'ai',
    desc: 'Generate intelligent support responses with data residency awareness',
    fields: [
      { name: 'customer_query', label: 'Customer Query', type: 'textarea', required: true },
      { name: 'customer_name', label: 'Customer Name', type: 'text' },
      { name: 'country', label: 'Country', type: 'text' },
      { name: 'category', label: 'Category', type: 'select', options: ['Technical','Billing','Compliance','Account','Network','Sales','Security'] },
      { name: 'language', label: 'Language', type: 'select', options: ['English','German','French','Japanese','Portuguese','Spanish','Arabic','Swedish','Italian','Chinese','Korean','Polish','Hindi'] },
    ],
    columns: ['customer_name','country','category','language','estimated_resolution','status'],
    isAI: true, noEdit: true,
    aiDisplay: (item) => ({
      label: 'AI Support Response',
      metrics: [
        { label: 'Resolution', value: item.estimated_resolution },
        { label: 'Escalation', value: item.escalation_needed ? 'Required' : 'Not Needed', color: item.escalation_needed ? '#dc2626' : '#16a34a' },
      ],
      sections: [
        { label: 'Customer Query', content: item.customer_query },
        { label: 'AI Response', content: item.ai_response, highlight: true },
      ],
      actions: (() => { try { return JSON.parse(item.suggested_actions || '[]'); } catch { return []; } })(),
    }),
  },
  { key: 'intent-detection', label: 'AI Intent Detection', icon: '🎯', endpoint: '/api/intent-detection', category: 'ai',
    desc: 'Detect customer intent and route to appropriate department automatically',
    fields: [
      { name: 'customer_message', label: 'Customer Message', type: 'textarea', required: true },
      { name: 'customer_name', label: 'Customer Name', type: 'text' },
      { name: 'country', label: 'Country', type: 'text' },
      { name: 'channel', label: 'Channel', type: 'select', options: ['email','chat','phone','social'] },
    ],
    columns: ['customer_name','country','channel','primary_intent','priority','status'],
    isAI: true, noEdit: true,
    aiDisplay: (item) => ({
      label: 'Intent Detection Result',
      metrics: [
        { label: 'Primary Intent', value: (item.primary_intent || '').replace(/_/g, ' ') },
        { label: 'Confidence', value: `${(parseFloat(item.confidence || 0) * 100).toFixed(0)}%` },
        { label: 'Priority', value: item.priority, color: item.priority === 'critical' ? '#dc2626' : item.priority === 'high' ? '#ea580c' : '#d97706' },
        { label: 'Department', value: item.recommended_department },
      ],
      sections: [
        { label: 'Customer Message', content: item.customer_message },
      ],
      tags: (() => { try { return JSON.parse(item.secondary_intents || '[]').map(i => i.replace(/_/g, ' ')); } catch { return []; } })(),
    }),
  },
  { key: 'compliance-reports', label: 'AI Compliance Reports', icon: '📊', endpoint: '/api/compliance-reports', category: 'ai',
    desc: 'AI-generated compliance reports with risk scoring and action items',
    fields: [
      { name: 'country', label: 'Country', type: 'text', required: true },
      { name: 'report_type', label: 'Report Type', type: 'select', options: ['GDPR Audit','APPI Assessment','LGPD Assessment','DPDP Assessment','PIPL Assessment','PDPL Assessment','LFPDPPP Audit','APPs Assessment','PIPA Assessment','POPIA Assessment','TKG Assessment'] },
      { name: 'scope', label: 'Scope', type: 'text', required: true },
      { name: 'period', label: 'Period', type: 'text', required: true },
    ],
    columns: ['country','report_type','compliance_status','risk_score','status'],
    isAI: true, noEdit: true,
    aiDisplay: (item) => ({
      label: item.title || 'Compliance Report',
      metrics: [
        { label: 'Status', value: (item.compliance_status || '').replace(/_/g, ' '), color: item.compliance_status === 'compliant' ? '#16a34a' : item.compliance_status === 'non_compliant' ? '#dc2626' : '#d97706' },
        { label: 'Risk Score', value: `${item.risk_score}/100` },
      ],
      riskScore: item.risk_score,
      sections: [
        { label: 'Executive Summary', content: item.executive_summary, highlight: true },
      ],
      findings: (() => { try { return JSON.parse(item.findings || '[]'); } catch { return []; } })(),
      actions: (() => { try { return JSON.parse(item.action_items || '[]'); } catch { return []; } })(),
    }),
  },
];

function Sidebar({ currentPath, onNavigate, user }) {
  const coreFeatures = FEATURES.filter(f => f.category === 'core');
  const aiFeatures = FEATURES.filter(f => f.category === 'ai');

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <h2>TelecomGuard</h2>
        <p>Data Residency Platform</p>
      </div>
      <button className={`sidebar-link ${currentPath === '/' ? 'active' : ''}`} onClick={() => onNavigate('/')}>
        <span className="icon">📊</span> Dashboard
      </button>
      <div className="sidebar-section">Core Operations</div>
      {coreFeatures.map(f => (
        <button key={f.key} className={`sidebar-link ${currentPath === `/feature/${f.key}` ? 'active' : ''}`}
          onClick={() => onNavigate(`/feature/${f.key}`)}>
          <span className="icon">{f.icon}</span> {f.label}
        </button>
      ))}
      <div className="sidebar-section">AI Intelligence</div>
      {aiFeatures.map(f => (
        <button key={f.key} className={`sidebar-link ${currentPath === `/feature/${f.key}` ? 'active' : ''}`}
          onClick={() => onNavigate(`/feature/${f.key}`)}>
          <span className="icon">{f.icon}</span> {f.label}
        </button>
      ))}
      <div className="sidebar-user">
        <div className="user-name">{user?.name || 'User'}</div>
        <div className="user-role">{user?.role || 'operator'} | {user?.country || 'Global'}</div>
        <button className="btn btn-sm btn-secondary" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
          onClick={() => { logout(); window.location.href = '/'; }}>
          Logout
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(getUser());

  useEffect(() => {
    setUser(getUser());
  }, [location]);

  if (!isAuthenticated()) {
    return (
      <Routes>
        <Route path="*" element={<Login onLogin={() => { setUser(getUser()); navigate('/'); }} />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar currentPath={location.pathname} onNavigate={(path) => navigate(path)} user={user} />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard features={FEATURES} onNavigate={(path) => navigate(path)} />} />
          {FEATURES.map(f => (
            <Route key={f.key} path={`/feature/${f.key}`} element={<FeaturePage feature={f} />} />
          ))}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
