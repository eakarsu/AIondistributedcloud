import React, { useState, act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import FullAIExamples, { useFullAIExamples } from './components/FullAIExamples.jsx';
import AIReport from './components/AIReport';
import Login from './pages/Login';
import FeaturePage from './pages/FeaturePage';
import AIInsightsPage from './pages/AIInsightsPage';
import { api } from './api';
import AIWorkspace from './components/AIWorkspace';

jest.mock('./api', () => ({ api: jest.fn(), login: jest.fn() }));

global.IS_REACT_ACT_ENVIRONMENT = true;

function mount(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, cleanup: () => act(() => { root.unmount(); host.remove(); }) };
}

test('preset fills optional text and JSON, preserves real reference, and does not submit', () => {
  let submissions = 0;
  function Fixture() {
    const controller = useFullAIExamples();
    const [fields, setFields] = useState({ note: '', details: '', customerId: 'real-record', file: '' });
    const change = (key) => (event) => setFields((old) => ({ ...old, [key]: event.target.value }));
    return <div data-full-ai-workspace="fixture"><FullAIExamples controller={controller} />
      <form onSubmit={(event) => { event.preventDefault(); submissions++; }}>
        <input aria-label="Optional note" value={fields.note} onChange={change('note')} data-full-ai-field={controller.bind({ current: fields.note, change: change('note'), label: 'note' }, 'note')} />
        <textarea aria-label="Details JSON" value={fields.details} onChange={change('details')} data-full-ai-field={controller.bind({ current: fields.details, change: change('details'), label: 'details', json: true, sample: '{"count":0,"enabled":false,"caption":""}' }, 'details')} />
        <input aria-label="Customer ID" value={fields.customerId} onChange={change('customerId')} data-full-ai-field={controller.bind({ current: fields.customerId, change: change('customerId'), label: 'customerId', reference: true }, 'customerId')} />
        <input type="file" aria-label="Evidence file" data-full-ai-field={controller.bind({ current: fields.file, change: change('file'), label: 'file' }, 'file')} />
      </form>
    </div>;
  }
  const { host, cleanup } = mount(<Fixture />);
  act(() => host.querySelector('button').click());
  expect(host.querySelector('[aria-label="Optional note"]').value).not.toBe('');
  const details = JSON.parse(host.querySelector('[aria-label="Details JSON"]').value);
  expect(details.count).toBe(0);
  expect(details.enabled).toBe(false);
  expect(details.caption).not.toBe('');
  expect(host.querySelector('[aria-label="Customer ID"]').value).toBe('real-record');
  expect(host.querySelector('[aria-label="Evidence file"]').files).toHaveLength(0);
  expect(submissions).toBe(0);
  cleanup();
});

test('structured report renders nested facts, table, false, zero, and empty string', () => {
  const html = renderToStaticMarkup(<AIReport response={{ result: { summary: { enabled: false, count: 0, caption: '' }, rows: [{ name: 'First', score: 0 }] } }} />);
  expect(html).toContain('Summary');
  expect(html).toContain('Enabled');
  expect(html).toContain('No');
  expect(html).toContain('Count');
  expect(html).toContain('0');
  expect(html).toContain('<table');
  expect(html).toContain('Caption');
  expect(html).not.toContain('{&quot;');
});

test('demo fill with missing configuration stays on login and does not submit', () => {
  const previousEmail = process.env.REACT_APP_DEMO_EMAIL;
  const previousPassword = process.env.REACT_APP_DEMO_PASSWORD;
  delete process.env.REACT_APP_DEMO_EMAIL;
  delete process.env.REACT_APP_DEMO_PASSWORD;
  let loggedIn = false;
  const { host, cleanup } = mount(<Login onLogin={() => { loggedIn = true; }} />);
  act(() => host.querySelector('.btn-autofill').click());
  expect(host.textContent).toContain('Demo credentials are not configured');
  expect(host.querySelector('input[type="email"]').value).toBe('');
  expect(loggedIn).toBe(false);
  cleanup();
  if (previousEmail === undefined) delete process.env.REACT_APP_DEMO_EMAIL; else process.env.REACT_APP_DEMO_EMAIL = previousEmail;
  if (previousPassword === undefined) delete process.env.REACT_APP_DEMO_PASSWORD; else process.env.REACT_APP_DEMO_PASSWORD = previousPassword;
});

test('configured demo button fills only; sign in remains a separate action', () => {
  const previousEmail = process.env.REACT_APP_DEMO_EMAIL;
  const previousPassword = process.env.REACT_APP_DEMO_PASSWORD;
  process.env.REACT_APP_DEMO_EMAIL = ['sample', '@example.test'].join('');
  process.env.REACT_APP_DEMO_PASSWORD = ['fixture', 'only'].join('-');
  let loggedIn = false;
  const { host, cleanup } = mount(<Login onLogin={() => { loggedIn = true; }} />);
  act(() => host.querySelector('.btn-autofill').click());
  expect(host.querySelector('input[type="email"]').value).toBe(process.env.REACT_APP_DEMO_EMAIL);
  expect(host.querySelector('input[type="password"]').value).toBe(process.env.REACT_APP_DEMO_PASSWORD);
  expect(loggedIn).toBe(false);
  cleanup();
  if (previousEmail === undefined) delete process.env.REACT_APP_DEMO_EMAIL; else process.env.REACT_APP_DEMO_EMAIL = previousEmail;
  if (previousPassword === undefined) delete process.env.REACT_APP_DEMO_PASSWORD; else process.env.REACT_APP_DEMO_PASSWORD = previousPassword;
});

test('native AI form presets fill required and optional fields without saving', async () => {
  api.mockResolvedValue([]);
  const feature = { label: 'AI review', icon: 'AI', desc: '', endpoint: '/fixture', isAI: true, noEdit: true,
    fields: [{ name: 'customer_message', label: 'Message', type: 'textarea', required: true }, { name: 'country', label: 'Country', type: 'text' }, { name: 'channel', label: 'Channel', type: 'select', options: ['email', 'chat'] }], columns: [] };
  const { host, cleanup } = mount(<FeaturePage feature={feature} />);
  await act(async () => { await Promise.resolve(); });
  act(() => Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('New AI Analysis')).click());
  const preset = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Network outage');
  expect(preset).toBeDefined();
  act(() => preset.click());
  expect(host.querySelector('textarea').value).toContain('Berlin');
  expect(Array.from(host.querySelectorAll('.form-group input')).find((input) => input.value === 'Germany')).toBeDefined();
  expect(host.querySelector('select').value).toBe('email');
  expect(api).toHaveBeenCalledTimes(1);
  cleanup();
  api.mockReset();
});

test('native saved AI detail renders JSON sections instead of raw JSON', async () => {
  api.mockResolvedValue([{ id: 4, customer_query: 'Review service', ai_response: '{"approved":false,"open_items":[{"name":"Review","count":0}]}' }]);
  const feature = { label: 'AI support', icon: 'AI', desc: '', endpoint: '/fixture', isAI: true, noEdit: true,
    fields: [{ name: 'customer_query', label: 'Query', type: 'textarea', required: true }], columns: ['customer_query'],
    aiDisplay: (item) => ({ label: 'Support result', sections: [{ label: 'Response', content: item.ai_response }] }) };
  const { host, cleanup } = mount(<FeaturePage feature={feature} />);
  await act(async () => { await Promise.resolve(); });
  act(() => host.querySelector('tbody tr').click());
  expect(host.textContent).toContain('Approved');
  expect(host.textContent).toContain('No');
  expect(host.querySelector('.ai-report-table')).not.toBeNull();
  expect(host.textContent).not.toContain('{"approved"');
  cleanup();
  api.mockReset();
});

test('saved analysis opens as a structured report without a provider call', async () => {
  api.mockResolvedValue([{ id: 7, endpoint: 'network-anomaly-detect', result: { summary: { healthy: false, incidents: 0 }, anomalies: [{ node: 'core', severity: 'low' }] } }]);
  const { host, cleanup } = mount(<AIInsightsPage />);
  await act(async () => { await Promise.resolve(); });
  const historyButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('#7'));
  expect(historyButton).toBeDefined();
  act(() => historyButton.click());
  expect(host.querySelector('.ai-report')).not.toBeNull();
  expect(host.textContent).toContain('Healthy');
  expect(host.textContent).toContain('No');
  expect(host.querySelector('.ai-report-table')).not.toBeNull();
  expect(api).toHaveBeenCalledTimes(1);
  cleanup();
  api.mockReset();
});

test('workspace preset fills all ten fields and saved detail renders structured data', async () => {
  const previousFetch = global.fetch;
  const calls = [];
  global.fetch = jest.fn(async (_url, options = {}) => {
    calls.push(options.method || 'GET');
    return { ok: true, json: async () => ({ items: [{ id: 3, input: { goal: 'Review network' }, result: { ready: false, incidents: 0, items: [{ name: 'core' }] }, created_at: '2026-10-10T12:00:00Z', model: 'fixture' }] }) };
  });
  const { host, cleanup } = mount(<AIWorkspace feature={{ id: 'fixture', title: 'Fixture review', description: 'Fixture' }} />);
  await act(async () => { await Promise.resolve(); });
  act(() => Array.from(host.querySelectorAll('.ai-preset-bar button'))[0].click());
  expect(Array.from(host.querySelectorAll('.ai-form-grid input, .ai-form-grid textarea, .ai-form-grid select')).every((field) => field.value !== '')).toBe(true);
  expect(calls).toEqual(['GET']);
  act(() => host.querySelector('.ai-history-row').click());
  expect(document.body.textContent).toContain('Ready');
  expect(document.body.textContent).toContain('No');
  expect(document.body.querySelector('.ai-report-table')).not.toBeNull();
  cleanup();
  global.fetch = previousFetch;
});

test('record table renders fifteen paginated API rows without a runtime error', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  api.mockResolvedValue({ data: Array.from({ length: 15 }, (_, index) => ({ id: index + 1, name: `Customer ${index + 1}` })), pagination: { total: 15 } });
  const feature = { label: 'Customers', icon: '', desc: '', endpoint: '/api/customers', fields: [{ name: 'name', label: 'Name', required: true }], columns: ['name'] };
  const { host, cleanup } = mount(<FeaturePage feature={feature} />);
  await act(async () => { await Promise.resolve(); });
  expect(host.querySelectorAll('tbody tr')).toHaveLength(15);
  expect(host.textContent).toContain('Showing 15 records');
  expect(consoleError).not.toHaveBeenCalled();
  cleanup();
  consoleError.mockRestore();
  api.mockReset();
});

test('invalid record payload gives an explicit load error without crashing', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  api.mockResolvedValue({ data: { rows: [] } });
  const feature = { label: 'Customers', icon: '', desc: '', endpoint: '/api/customers', fields: [], columns: ['name'] };
  const { host, cleanup } = mount(<FeaturePage feature={feature} />);
  await act(async () => { await Promise.resolve(); });
  expect(host.querySelector('[role="alert"]').textContent).toContain('did not contain a list');
  expect(consoleError).not.toHaveBeenCalled();
  cleanup();
  consoleError.mockRestore();
  api.mockReset();
});

test('API client sends feature routes with one API prefix', async () => {
  const previousFetch = global.fetch;
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => [] }));
  await jest.requireActual('./api').api('/api/customers');
  expect(new URL(global.fetch.mock.calls[0][0]).pathname).toBe('/api/customers');
  global.fetch = previousFetch;
});
