'use strict';
const crypto = require('crypto');

const transitions = {
  draft: ['validated'], validated: ['approval_pending', 'queued'], approval_pending: ['approved', 'rejected'],
  approved: ['queued'], queued: ['placing'], placing: ['deploying', 'failed'], deploying: ['healthy', 'failed'],
  healthy: ['degraded', 'completed'], degraded: ['failing_over', 'rolled_back'], failing_over: ['healthy', 'rolled_back', 'failed'],
  failed: ['queued', 'rolled_back'], rolled_back: ['recovered'], recovered: ['completed'], rejected: [], completed: []
};
const permissions = { viewer: ['read'], developer: ['read', 'create', 'rerun'], approver: ['read', 'approve'], operator: ['read', 'operate', 'rerun'], admin: ['read', 'create', 'approve', 'operate', 'rerun', 'configure'] };
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.keys(value).sort().reduce((out,key) => { out[key]=canonical(value[key]); return out; }, {}) : value;
const stable = value => JSON.stringify(canonical(value));
const hash = value => crypto.createHash('sha256').update(stable(value)).digest('hex');
function requireScope(actor, tenantId, action) {
  if (!actor || actor.tenantId !== tenantId) throw new Error('tenant_scope_denied');
  if (!(permissions[actor.role] || []).includes(action)) throw new Error('role_scope_denied');
}
function validateRun(input) {
  for (const field of ['repository', 'commitSha', 'workflowVersion', 'datasetVersion', 'requestedRegions', 'secretRefs']) if (!input[field] || (Array.isArray(input[field]) && !input[field].length)) throw new Error(`missing_${field}`);
  if (!input.sandbox || input.sandbox.network !== 'deny' || input.sandbox.secrets !== 'scoped') throw new Error('secure_sandbox_required');
  if (!Array.isArray(input.secretRefs) || input.secretRefs.some(ref => typeof ref !== 'string' || !ref.startsWith('secret://'))) throw new Error('secret_references_required');
  if (JSON.stringify(input.steps || []).match(/(password|api[_-]?key|token)\s*[=:]\s*[^$]/i)) throw new Error('inline_secret_forbidden');
  const write = (input.steps || []).some(step => step.effect === 'write');
  if (write && !input.approvalId) throw new Error('approval_required_for_write');
  return { ...input, inputHash: hash(input), state: 'validated', deterministicKey: hash({ repository: input.repository, commitSha: input.commitSha, workflowVersion: input.workflowVersion, datasetVersion: input.datasetVersion }) };
}
function transition(current, target, context = {}) {
  if (!(transitions[current] || []).includes(target)) throw new Error('invalid_transition');
  if (target === 'approved' && (!context.approverId || context.approverId === context.requesterId)) throw new Error('independent_approval_required');
  if (target === 'placing' && !context.placement) throw new Error('placement_decision_required');
  if (['healthy', 'rolled_back', 'recovered'].includes(target) && !context.providerReceiptId) throw new Error('confirmed_provider_receipt_required');
  if (['healthy', 'recovered'].includes(target) && context.healthCheckPassed !== true) throw new Error('passing_health_check_required');
  return target;
}
function choosePlacement(candidates, constraints) {
  const eligible = candidates.filter(c => c.capacity >= constraints.capacity && c.regions.includes(constraints.region) && (!constraints.maxCost || c.cost <= constraints.maxCost));
  if (!eligible.length) return { accepted: false, reason: 'no_eligible_capacity' };
  eligible.sort((a, b) => (a.cost - b.cost) || (b.reliability - a.reliability) || a.provider.localeCompare(b.provider));
  return { accepted: true, provider: eligible[0].provider, region: constraints.region, rationale: 'lowest_cost_then_reliability' };
}
function providerDelivery(provider, payload, idempotencyKey, receipt) {
  if (!['aws','azure','gcp','ci','scm','artifact','ticketing','telemetry'].includes(provider)) throw new Error('unsupported_provider');
  if (!idempotencyKey) throw new Error('delivery_identity_required');
  const payloadHash = hash(payload);
  if (receipt && receipt.payloadHash !== payloadHash) throw new Error('receipt_payload_mismatch');
  return { provider, payloadHash, idempotencyKey, state: receipt ? 'confirmed' : 'queued', receipt: receipt || null };
}
function evaluate(metrics, thresholds) {
  if (!thresholds || !Object.keys(thresholds).length) throw new Error('benchmark_thresholds_required');
  for (const [key, raw] of Object.entries(thresholds)) { const spec = typeof raw === 'object' ? raw : { value: raw }; if (!Number.isFinite(Number(spec.value)) || !Number.isFinite(Number(metrics[key]))) throw new Error('complete_numeric_benchmark_required'); }
  const failures = Object.keys(thresholds).filter(k => { const spec = typeof thresholds[k] === 'object' ? thresholds[k] : { direction: ['correctness','reliability','recovery','concurrency'].includes(k) ? 'min' : 'max', value: thresholds[k] }; return spec.direction === 'min' ? Number(metrics[k]) < Number(spec.value) : Number(metrics[k]) > Number(spec.value); }).sort();
  return { accepted: failures.length === 0, failures, resultHash: hash({ metrics, thresholds }) };
}
module.exports = { hash, requireScope, validateRun, transition, choosePlacement, providerDelivery, evaluate };
