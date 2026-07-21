BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE users SET tenant_id = 'default-tenant' WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS cloud_users_tenant_idx ON users (tenant_id, id);
CREATE TABLE IF NOT EXISTS cloud_workflow_runs (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, requester_id TEXT NOT NULL, owner_id TEXT NOT NULL, state TEXT NOT NULL,
 repository TEXT NOT NULL, commit_sha TEXT NOT NULL, workflow_version TEXT NOT NULL, dataset_version TEXT NOT NULL,
 input_hash CHAR(64) NOT NULL, deterministic_key CHAR(64) NOT NULL, input_config JSONB NOT NULL, sandbox JSONB NOT NULL, placement JSONB,
 approval_id TEXT, rerun_of TEXT REFERENCES cloud_workflow_runs(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(tenant_id, deterministic_key, id)
);
CREATE TABLE IF NOT EXISTS cloud_run_artifacts (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, run_id TEXT NOT NULL REFERENCES cloud_workflow_runs(id), kind TEXT NOT NULL,
 uri TEXT NOT NULL, checksum CHAR(64) NOT NULL, provenance JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS cloud_provider_deliveries (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, run_id TEXT NOT NULL REFERENCES cloud_workflow_runs(id), provider TEXT NOT NULL,
 operation TEXT NOT NULL, idempotency_key TEXT NOT NULL, payload_hash CHAR(64) NOT NULL, payload JSONB NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','leased','retrying','confirmed','dead_letter')),
 attempts INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL DEFAULT 5, next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 last_error TEXT, receipt JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(tenant_id, provider, idempotency_key)
);
CREATE TABLE IF NOT EXISTS cloud_webhook_receipts (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, provider TEXT NOT NULL, provider_event_id TEXT NOT NULL, payload_hash CHAR(64) NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), processed_at TIMESTAMPTZ, UNIQUE(tenant_id,provider,provider_event_id)
);
CREATE TABLE IF NOT EXISTS cloud_evaluations (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, run_id TEXT NOT NULL REFERENCES cloud_workflow_runs(id), suite_version TEXT NOT NULL,
 metrics JSONB NOT NULL, thresholds JSONB NOT NULL, accepted BOOLEAN NOT NULL, failures JSONB NOT NULL, result_hash CHAR(64) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS cloud_audit (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, action TEXT NOT NULL,
 resource_type TEXT NOT NULL, resource_id TEXT NOT NULL, before_hash CHAR(64), after_hash CHAR(64), metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION cloud_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'cloud_audit is append-only'; END; $$;
DROP TRIGGER IF EXISTS cloud_audit_no_update ON cloud_audit;
CREATE TRIGGER cloud_audit_no_update BEFORE UPDATE OR DELETE ON cloud_audit FOR EACH ROW EXECUTE FUNCTION cloud_audit_immutable();
COMMIT;
