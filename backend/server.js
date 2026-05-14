const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/data-zones', require('./routes/dataZones'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/network', require('./routes/network'));
app.use('/api/sim-cards', require('./routes/simCards'));
app.use('/api/roaming', require('./routes/roaming'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/translations', require('./routes/translation'));
app.use('/api/sentiment', require('./routes/sentiment'));
app.use('/api/ai-support', require('./routes/aiSupport'));
app.use('/api/intent-detection', require('./routes/intentDetection'));
app.use('/api/compliance-reports', require('./routes/complianceReport'));
app.use('/api/ai', require('./routes/ai'));
// Apply pass 5 — backlog routes (SLA, dashboard, clouds, self-service, disputes)
app.use('/api/ai', require('./routes/aiBacklog'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


// === Custom Feature Mounts (batch_06) ===
app.use('/api/cf-autonomous-network-optimization', require('./routes/customFeat01_AutonomousNetworkOptimization'));
app.use('/api/cf-cost-anomaly-detection', require('./routes/customFeat02_CostAnomalyDetection'));
app.use('/api/cf-multilingual-support-agent', require('./routes/customFeat03_MultilingualSupportAgent'));
app.use('/api/cf-roaming-consortium-advisor', require('./routes/customFeat04_RoamingConsortiumAdvisor'));
app.use('/api/cf-compliance-automation', require('./routes/customFeat05_ComplianceAutomation'));


// === Batch 06 Gaps & Frontend Mounts ===
app.use('/api/gap-existing-stub-files-sentiment-intentdetection-tran', require('./routes/gapFeat_existing_stub_files_sentiment_intentdetection_tran'));
app.use('/api/gap-network-monitoring-without-network', require('./routes/gapFeat_network_monitoring_without_network'));
app.use('/api/gap-billing-without-cost', require('./routes/gapFeat_billing_without_cost'));
app.use('/api/gap-customers-without-churn', require('./routes/gapFeat_customers_without_churn'));
app.use('/api/gap-no-real', require('./routes/gapFeat_no_real'));
app.use('/api/gap-no-sla-tracking-and-breach-alerting', require('./routes/gapFeat_no_sla_tracking_and_breach_alerting'));
app.use('/api/gap-no-automated-billing-dispute-resolution', require('./routes/gapFeat_no_automated_billing_dispute_resolution'));
app.use('/api/gap-limited-customer-self', require('./routes/gapFeat_limited_customer_self'));
app.use('/api/gap-no-integrations-with-major-cloud-providers-aws-azu', require('./routes/gapFeat_no_integrations_with_major_cloud_providers_aws_azu'));
app.use('/api/gap-no-webhooks-for-external-system-events', require('./routes/gapFeat_no_webhooks_for_external_system_events'));
app.use('/api/gap-no-file-upload-for-invoice-contract-docs', require('./routes/gapFeat_no_file_upload_for_invoice_contract_docs'));

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
