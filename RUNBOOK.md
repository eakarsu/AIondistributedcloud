# Authoritative distributed-cloud runbook

Install with lockfiles, copy `.env.example`, then run `npm run migrate` from `backend/` using a migration-only database role. `./start.sh backend` never installs, seeds, kills port owners, or changes schema; it refuses to start without `cloud_workflow_runs`.

Provision users with `tenant_id` and least-privilege roles. The supported surface is `/api/authoritative/cloud`; legacy/generated/direct-provider routes return 410. Configure only the typed providers used in a deployment. Provider calls carry idempotency and payload-hash headers and require bound receipts.

Alert on queued age, retry rate, dead letters, placement failure, health degradation, failover, rollback, evaluation regression, and audit-write failure. Correct the provider or capacity problem before replay. Preserve input/artifact checksums and approvals during recovery; never manually mark a delivery confirmed.
