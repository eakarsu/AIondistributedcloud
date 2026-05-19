// Custom Views routes — 4 endpoints for AI on distributed cloud
// 2 VIZ: workload distribution per cluster, region utilization heatmap
// 2 NON-VIZ: deployment manifest PDF, scheduling rules CRUD
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');

// Rate limiter — uses ipKeyGenerator helper for IPv6 safety where available
let ipKeyGenerator = null;
try {
  // express-rate-limit v7+ exposes ipKeyGenerator
  ({ ipKeyGenerator } = require('express-rate-limit'));
} catch (_) {}

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) =>
    (typeof ipKeyGenerator === 'function' ? ipKeyGenerator(req, res) : req.ip),
});

router.use(limiter);

// ----- Seed data (in-memory; deterministic) -----
const CLUSTERS = [
  'us-east-prod', 'us-west-prod', 'eu-central-prod', 'eu-west-edge',
  'apac-tokyo', 'apac-singapore', 'sa-saopaulo', 'me-dubai',
];
const REGIONS = [
  'us-east-1', 'us-west-2', 'eu-central-1', 'eu-west-1',
  'ap-northeast-1', 'ap-southeast-1', 'sa-east-1', 'me-south-1',
];
const WORKLOAD_TYPES = ['inference', 'training', 'fine-tune', 'embedding', 'batch'];

function seededRandom(seed) {
  // deterministic PRNG
  let x = seed;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

function buildWorkloadDistribution() {
  const rng = seededRandom(42);
  return CLUSTERS.map((cluster, idx) => {
    const breakdown = WORKLOAD_TYPES.map((t) => ({
      type: t,
      pods: Math.floor(8 + rng() * 60),
      gpu_hours: Math.round((10 + rng() * 200) * 10) / 10,
    }));
    const total_pods = breakdown.reduce((s, b) => s + b.pods, 0);
    return {
      cluster,
      region: REGIONS[idx % REGIONS.length],
      total_pods,
      gpu_count: 16 + (idx * 8),
      node_count: 4 + idx,
      breakdown,
    };
  });
}

function buildRegionHeatmap() {
  const rng = seededRandom(99);
  const metrics = ['cpu', 'gpu', 'memory', 'network'];
  const cells = [];
  REGIONS.forEach((region) => {
    metrics.forEach((metric) => {
      cells.push({
        region,
        metric,
        utilization: Math.round(rng() * 100),
      });
    });
  });
  return { regions: REGIONS, metrics, cells };
}

// ----- Scheduling rules CRUD (in-memory) -----
let nextRuleId = 1;
const schedulingRules = [
  {
    id: nextRuleId++, name: 'gpu-training-affinity', type: 'affinity',
    target_label: 'workload=training', match_label: 'gpu=a100',
    weight: 80, cluster: 'us-east-prod', enabled: true,
    created_at: new Date().toISOString(),
  },
  {
    id: nextRuleId++, name: 'avoid-noisy-neighbor', type: 'anti-affinity',
    target_label: 'workload=inference', match_label: 'workload=batch',
    weight: 100, cluster: 'eu-central-prod', enabled: true,
    created_at: new Date().toISOString(),
  },
  {
    id: nextRuleId++, name: 'region-sticky-tokyo', type: 'affinity',
    target_label: 'service=embedding', match_label: 'region=ap-northeast-1',
    weight: 60, cluster: 'apac-tokyo', enabled: false,
    created_at: new Date().toISOString(),
  },
];

// ===== 1) VIZ — workload distribution per cluster =====
router.get('/workload-distribution', authenticateToken, (req, res) => {
  const data = buildWorkloadDistribution();
  res.json({
    generated_at: new Date().toISOString(),
    clusters: data,
    summary: {
      cluster_count: data.length,
      total_pods: data.reduce((s, c) => s + c.total_pods, 0),
      total_gpus: data.reduce((s, c) => s + c.gpu_count, 0),
    },
  });
});

// ===== 2) VIZ — region utilization heatmap =====
router.get('/region-utilization', authenticateToken, (req, res) => {
  const h = buildRegionHeatmap();
  res.json({
    generated_at: new Date().toISOString(),
    ...h,
  });
});

// ===== 3) NON-VIZ — deployment manifest PDF =====
// Builds a minimal valid PDF with deployment manifest details, no external deps.
function escapePdfText(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildManifestPdf(manifest) {
  const lines = [];
  lines.push('AI on Distributed Cloud — Deployment Manifest');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Deployment: ${manifest.name}`);
  lines.push(`Cluster: ${manifest.cluster}`);
  lines.push(`Region: ${manifest.region}`);
  lines.push(`Image: ${manifest.image}`);
  lines.push(`Replicas: ${manifest.replicas}`);
  lines.push(`GPU: ${manifest.gpu}`);
  lines.push('');
  lines.push('Resource Requests:');
  lines.push(`  cpu: ${manifest.cpu}`);
  lines.push(`  memory: ${manifest.memory}`);
  lines.push(`  gpu: ${manifest.gpu}`);
  lines.push('');
  lines.push('Scheduling Rules:');
  schedulingRules.filter(r => r.enabled).slice(0, 5).forEach((r) => {
    lines.push(`  - [${r.type}] ${r.name} (weight ${r.weight})`);
  });
  lines.push('');
  lines.push('Status: READY FOR ROLLOUT');

  // Build PDF stream
  let y = 760;
  let stream = 'BT /F1 11 Tf 50 780 Td (AI on Distributed Cloud — Deployment Manifest) Tj ET\n';
  lines.forEach((ln) => {
    stream += `BT /F1 10 Tf 50 ${y} Td (${escapePdfText(ln)}) Tj ET\n`;
    y -= 14;
    if (y < 60) y = 60;
  });

  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

router.get('/deployment-manifest-pdf', authenticateToken, (req, res) => {
  const manifest = {
    name: req.query.name || 'llm-inference-svc',
    cluster: req.query.cluster || 'us-east-prod',
    region: req.query.region || 'us-east-1',
    image: 'registry.cloud/ai/llm-inference:v2.4.1',
    replicas: parseInt(req.query.replicas, 10) || 6,
    cpu: '4',
    memory: '16Gi',
    gpu: 'nvidia.com/gpu: 1',
  };
  try {
    const pdf = buildManifestPdf(manifest);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="manifest-${manifest.name}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    res.status(200).end(pdf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 4) NON-VIZ — scheduling rules editor CRUD =====
router.get('/scheduling-rules', authenticateToken, (req, res) => {
  res.json({ rules: schedulingRules, count: schedulingRules.length });
});

router.post('/scheduling-rules', authenticateToken, (req, res) => {
  const { name, type, target_label, match_label, weight, cluster, enabled } = req.body || {};
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });
  if (!['affinity', 'anti-affinity'].includes(type))
    return res.status(400).json({ error: 'type must be affinity or anti-affinity' });
  const rule = {
    id: nextRuleId++,
    name, type,
    target_label: target_label || '',
    match_label: match_label || '',
    weight: Number.isFinite(+weight) ? +weight : 50,
    cluster: cluster || CLUSTERS[0],
    enabled: enabled !== false,
    created_at: new Date().toISOString(),
  };
  schedulingRules.push(rule);
  res.status(201).json(rule);
});

router.put('/scheduling-rules/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const rule = schedulingRules.find(r => r.id === id);
  if (!rule) return res.status(404).json({ error: 'not found' });
  const { name, type, target_label, match_label, weight, cluster, enabled } = req.body || {};
  if (name !== undefined) rule.name = name;
  if (type !== undefined && ['affinity', 'anti-affinity'].includes(type)) rule.type = type;
  if (target_label !== undefined) rule.target_label = target_label;
  if (match_label !== undefined) rule.match_label = match_label;
  if (weight !== undefined && Number.isFinite(+weight)) rule.weight = +weight;
  if (cluster !== undefined) rule.cluster = cluster;
  if (enabled !== undefined) rule.enabled = !!enabled;
  res.json(rule);
});

router.delete('/scheduling-rules/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = schedulingRules.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const [removed] = schedulingRules.splice(idx, 1);
  res.json({ deleted: true, rule: removed });
});

module.exports = router;
