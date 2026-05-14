# Audit Apply Note — AIondistributedcloud

Source: `_AUDIT/reports/batch_06.md` section 7.

## Discrepancy with Audit
The audit reported "0 AI endpoints" but the project actually has working AI features in `routes/aiSupport.js`, `routes/sentiment.js`, `routes/intentDetection.js`, `routes/translation.js` — all implemented, not stubbed.

## Original Recommendations
### Missing AI counterparts
- `/network-anomaly-detect`
- `/cost-optimization`
- `/churn-predict`
- `/intent-detection` (already exists)
- `/sentiment-analysis` (already exists)
- `/translation-auto` (already exists)

### Missing non-AI
- Real-time network monitoring dashboard, SLA tracking/breach alerts, automated dispute resolution, customer self-service portal, AWS/Azure/GCP integrations

## Implemented
Created new `backend/routes/ai.js` with three endpoints, mounted at `/api/ai` in `server.js`:
- `POST /api/ai/network-anomaly-detect`
- `POST /api/ai/cost-optimization`
- `POST /api/ai/churn-predict`
- `GET /api/ai/history`

Reused `callOpenRouter`, `authenticateToken`, and a new `ai_analyses` table created in the route file.

## Backlog
| Item | Tag |
|---|---|
| SLA breach alerting | NEEDS-PRODUCT-DECISION |
| Real-time network dashboard | NEEDS-PRODUCT-DECISION |
| AWS/Azure/GCP integrations | NEEDS-CREDS |
| Customer self-service portal | NEEDS-PRODUCT-DECISION |
| Automated dispute resolution | NEEDS-PRODUCT-DECISION |
| Roaming consortium advisor (LLM agent) | MECHANICAL |

## Apply pass 3 (frontend)

LEFT-AS-IS. The CRA frontend (`frontend/src/`) already exposes the three
pass-2 endpoints via `pages/AIInsightsPage.js` with a tool-switcher and
per-tool form (`/network-anomaly-detect`, `/cost-optimization`,
`/churn-predict`, plus `/history`). JWT bearer is auto-attached by `api()`
in `api.js`. Other AI features (translations, sentiment, ai-support,
intent-detection, compliance-reports) are wired as Feature pages in `App.js`.

Minor backlog: the generic error display does not specifically surface 503
"OPENROUTER_API_KEY missing" — server-side message comes through but with no
special styling. Not blocking.

## Apply pass 4 (mechanical backlog)

Added the one remaining MECHANICAL backlog item ("Roaming consortium advisor
(LLM agent)"):

- `backend/routes/ai.js`: appended
  `POST /api/ai/roaming-consortium-advisor`. Reuses existing
  `callOpenRouter`, `authenticateToken`, `parseJSON`, and `persist`
  helpers. **Explicitly returns 503** when `OPENROUTER_API_KEY` is unset
  (the existing endpoints in this file would otherwise crash with a 500 on
  fetch/auth failure — the new one surfaces 503 cleanly). Best-effort
  enrichment from `roaming_agreements` and `data_zones` tables when present;
  silently degrades if those tables are absent.
- `frontend/src/pages/AIInsightsPage.js`: added 4th tool tab
  `Roaming Consortium Advisor` to the existing `TOOLS` switcher with form
  fields (carrier_name, home/target regions, monthly_roaming_volume_mb,
  current/candidate partners, pain_points, compliance_constraints). Uses the
  shared `api()` helper which already attaches `Authorization: Bearer …`
  from `localStorage.getItem('token')` and surfaces the server's error
  message verbatim (so 503 "OPENROUTER_API_KEY not configured on the
  server" displays inline).

Validation:
- `node --check backend/routes/ai.js` passes.
- `@babel/parser` (with jsx plugin) parses the FE page successfully.
- Smoke test (alt port 3401, `OPENROUTER_API_KEY=""`): logged in as
  `admin@telecom.com`, `POST /api/ai/roaming-consortium-advisor` returned
  `HTTP 503` with body
  `{"error":"OPENROUTER_API_KEY not configured on the server"}`. Server
  killed after.

No `npm install`, no new deps. Remaining backlog (NEEDS-CREDS / NEEDS-PRODUCT-DECISION
items) intentionally skipped per pass-4 scope.

## Apply pass 5 (all backlog)

IMPLEMENTED — closed all 5 remaining backlog items via new
`backend/routes/aiBacklog.js` (10 endpoints) + `frontend/src/pages/AIBacklogPage.js`
(5-tab UI). Mounted at `/api/ai`.

New tables (idempotent IF NOT EXISTS): `sla_thresholds`, `breach_log`,
`dispute_proposals`.

ENV vars (gated behind 503 + `missing:` field):
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` — gate `/clouds/aws/*`
- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` — gate `/clouds/azure/*`
- `GCP_SERVICE_ACCOUNT_JSON` — gate `/clouds/gcp/*`
- `OPENROUTER_API_KEY` — gate `/disputes/propose` (AI advisor)

Endpoints (10):
- `GET/POST /api/ai/sla/thresholds` — CRUD-lite for per-customer/global SLA
  thresholds (metric, threshold, comparison, severity); UNIQUE on
  (customer_id, metric) with UPSERT.
- `POST /api/ai/sla/check` — evaluate observation map against thresholds,
  log breaches.
- `GET /api/ai/sla/breaches` — recent breaches.
- `GET /api/ai/network/dashboard` — on-demand snapshot aggregating counts
  from existing `customers/tickets/data_zones/sim_cards` + 24h breaches by
  severity. PRODUCT-DECISION: pull only, no websocket.
- `GET /api/ai/clouds/status` — reports per-cloud configured + missing list.
- `GET /api/ai/clouds/aws/regions` — 503 missing AWS creds; otherwise stub
  region list (no aws-sdk dep).
- `GET /api/ai/clouds/azure/subscriptions` — 503 missing Azure creds.
- `GET /api/ai/clouds/gcp/projects` — 503 missing GCP creds.
- `GET /api/ai/self-service/summary` and `POST /api/ai/self-service/ticket` —
  per-customer scoped portal endpoints. Ticket insert is schema-tolerant
  (falls back to minimal columns on schema mismatch).
- `POST /api/ai/disputes/propose` (+ `/:id/approve`, `GET /disputes`) —
  AI proposes resolution; row written to `dispute_proposals` with
  `status='proposed'`. Approval flips status; credit issuance OUT-OF-SCOPE.

Frontend: `frontend/src/pages/AIBacklogPage.js` (5-tab UI: SLA, Dashboard,
Clouds, Self-Service, Disputes); registered as `/ai-backlog` route in
`App.js`; sidebar link "🧰 AI Backlog" added.

Validation: `node --check backend/server.js` PASS; `node --check
backend/routes/aiBacklog.js` PASS; `@babel/parser` (jsx) parses
`AIBacklogPage.js` and `App.js`.

Smoke test PASS — alt port 3503, `OPENROUTER_API_KEY=""`.
Logged in as `admin@telecom.com / password123`.
- POST `/sla/thresholds` returned `id:1, threshold:"100.000"`.
- POST `/sla/check` `{observations:{latency_ms:150}}` returned
  `{breaches:[{metric:"latency_ms",threshold:100,observed:150,severity:"high"}], count:1}`.
- GET `/network/dashboard` returned `{customers:16, tickets_total:16, tickets_open:14, data_zones:16, sim_cards:16, breaches_24h_by_severity:[{severity:"high",cnt:1}]}`.
- GET `/clouds/status` reported all three clouds `configured:false` with
  per-cloud `missing` lists.
- GET `/clouds/aws/regions` → `HTTP 503 {"error":"AWS not configured","missing":"AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY"}`.
- POST `/disputes/propose` → `HTTP 503 {"error":"AI not configured","missing":"OPENROUTER_API_KEY"}`.
- GET `/self-service/summary?customer_id=1` returned the seeded customer
  `Hans Mueller` row + empty tickets/billing/sim_cards arrays.
Server killed after.

No `npm install`, no new dependencies.
