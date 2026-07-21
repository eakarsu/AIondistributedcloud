'use strict';
const adapters = {
  aws: ['AWS_ORCHESTRATOR_URL', 'AWS_ORCHESTRATOR_TOKEN'], azure: ['AZURE_ORCHESTRATOR_URL', 'AZURE_ORCHESTRATOR_TOKEN'],
  gcp: ['GCP_ORCHESTRATOR_URL', 'GCP_ORCHESTRATOR_TOKEN'], ci: ['CI_PROVIDER_URL', 'CI_PROVIDER_TOKEN'],
  scm: ['SCM_PROVIDER_URL', 'SCM_PROVIDER_TOKEN'], artifact: ['ARTIFACT_PROVIDER_URL', 'ARTIFACT_PROVIDER_TOKEN'],
  ticketing: ['TICKETING_PROVIDER_URL', 'TICKETING_PROVIDER_TOKEN'], telemetry: ['TELEMETRY_PROVIDER_URL', 'TELEMETRY_PROVIDER_TOKEN']
};
async function dispatch(delivery) {
  const config = adapters[delivery.provider]; if (!config) throw new Error('unsupported_provider');
  const [urlName, tokenName] = config; const url = process.env[urlName]; const token = process.env[tokenName];
  if (!url || !token) throw new Error(`provider_not_configured:${delivery.provider}`);
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), Number(process.env.PROVIDER_TIMEOUT_MS || 10000));
  try { const response = await fetch(url, { method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'idempotency-key': delivery.idempotency_key, 'x-payload-hash': delivery.payload_hash }, body: JSON.stringify({ operation: delivery.operation, payload: delivery.payload }) }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(`provider_${response.status}`); if (!body.providerRequestId || body.payloadHash !== delivery.payload_hash) throw new Error('invalid_provider_receipt'); return body; } finally { clearTimeout(timeout); }
}
module.exports = { dispatch, adapters };
