# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

DecisionIQ is an AI-powered business intelligence platform that converts uploaded CSV datasets into KPIs,
forecasts, insights, recommendations, and executive reports. It has two independently deployed parts:

- `frontend/` — Angular 21 SPA (signals-based, standalone components), deployed to S3 (`decisioniq.sdcloudhub.com`)
- `backend/` — AWS SAM serverless app (Node 20 Lambdas behind API Gateway, DynamoDB, S3, Cognito)

## Commands

### Backend (`backend/src`)

```bash
cd backend/src
npm install
npm run lint        # eslint --fix on *.ts
npm run compile     # tsc
npm run unit        # jest (single test file pattern: tests/unit/*.test.ts)
npm test            # compile + unit
```

Run a single test file: `npx jest tests/unit/test-handler.test.ts`

SAM build/deploy/local invoke (run from `backend/`):

```bash
sam build
sam local start-api          # serves API Gateway locally on :3000
sam local invoke <FunctionName> --event events/event.json
sam deploy --guided
```

### Frontend (`frontend/`)

```bash
cd frontend
npm install
npm start            # ng serve, http://localhost:4200
npm run build        # ng build -> dist/frontend/browser
npm test             # vitest (via `ng test`)
```

## Architecture

### Backend: SAM stack (`backend/template.yaml`)

Five Lambda functions, each with a single `EntryPoint` under `backend/src/handlers/`, all built with esbuild:

- `health.ts` (`app.ts`) → `GET /health` — no auth
- `upload.ts` → `POST /upload-url` — returns a presigned S3 PUT URL; checks `AnalysisTable` (via `FileHashIndex` GSI)
  for an existing analysis with the same `fileHash` + `userId` to support client-side dedup (SHA-256 hash computed
  in the browser before upload)
- `analyze.ts` → `POST /analyze` — the core pipeline (see below)
- `get-analysis.ts` → `GET /analysis/{analysisId}` — fetches metadata from DynamoDB + result JSON from
  `ResultBucket`; enforces `metadata.userId === userId` (403 if not owner)
- `list-analyses.ts` → `GET /analyses` — queries `AnalysisTable` via `UserIdIndex` GSI for the caller's analyses

All endpoints except `/health` are protected by `DecisionIQCognitoAuthorizer` (Cognito User Pool authorizer
configured as the API's `DefaultAuthorizer` in `Globals.Api.Auth`).

**Per-user data isolation** is load-bearing throughout the backend:
- `getUserIdFromEvent()` (`utils/auth.util.ts`) reads `requestContext.authorizer.claims.sub`, falling back to
  manually decoding the `Authorization: Bearer <jwt>` header (for local/no-authorizer testing).
- S3 keys are namespaced per user: uploads go to `raw/{userId}/{datasetId}/{fileName}`, results to
  `analysis-results/{userId}/{analysisId}.json`.
- DynamoDB items always carry `userId`; `AnalysisTable` has GSIs `UserIdIndex` and `FileHashIndex` (the latter
  filtered by `userId` in `findAnalysisByFileHashAndUser`) — queries, never scans.

### `analyze.ts` pipeline

Given `{ bucket, key, fileHash? }`:

1. If the source object exceeds `LARGE_FILE_THRESHOLD_BYTES` (50 MB), persist a `QUEUED` / `BIG_DATA` metadata
   record and return 202 immediately (big-data path is not yet implemented beyond this stub).
2. Otherwise read the CSV from S3 (`s3.service`), parse it (`parser.service`, csv-parse), and run it through a
   chain of pure analysis services in `backend/src/services/`:
   - `analysis.service` / `profile.service` — column typing (numeric/date/categorical via `utils/data-type.util`),
     dataset type detection, data quality scoring
   - `business-kpi.service` — revenue/cost/profit/margin (only computed if every row has `revenue` and `cost`)
   - `trend.service` / `trend-series.service` — per-column trend direction + time series for charts
   - `insight.service`, `recommendation.service`, `risk.service`, `decision-score.service`,
     `ai-summary.service` — derive narrative insights, recommendations, risks, a 0–100 decision score, and an
     executive summary from the profile/KPIs/trends above
3. Writes the full result JSON to `ResultBucket` and an `AnalysisTable` item summarizing the run (status
   `COMPLETED`, scores, counts, `resultBucket`/`resultKey` pointer).

When adding a new derived metric, add a service module following this pattern (pure function taking
profile/KPIs/rows, returning plain data) and wire it into `analyze.ts`'s pipeline + the result/metadata objects.

### Frontend (`frontend/src/app`)

Standalone Angular components, routed via `app.routes.ts`, all behind `authGuard` except the root redirect:

- `pages/upload` — file picker; computes the SHA-256 hash client-side (Web Crypto), calls
  `ApiService.getUploadUrl` → PUTs the file directly to S3 → calls `ApiService.analyze` → navigates to
  `/analysis/:id`. If the upload-url response says `duplicate: true`, skips straight to the existing analysis.
- `pages/dashboard`, `pages/analyses`, `pages/analysis-detail` — list and detail views for past analyses (use
  Chart.js for trend charts).

**Auth**: Cognito Hosted UI with PKCE, implemented manually in `services/auth.service.ts` (not via the
`angular-auth-oidc-client` config in `app.config.ts`/`auth/auth.config.ts`, which appear unused by the actual
flow). `AuthService` generates the code verifier/challenge, redirects to the Cognito hosted domain, exchanges the
code for tokens via `fetch`, and stores `id_token`/`access_token` in `localStorage`. `ApiService` sends the
**ID token** (not access token) as the `Authorization: Bearer` header — this is what the API Gateway Cognito
authorizer validates. `authGuard` redirects unauthenticated users into `AuthService.login()`.

`ApiService.apiUrl` and the upload bucket name in `pages/upload/upload.ts` are hardcoded to the deployed
API Gateway/S3 endpoint — update both if the backend stack is redeployed under a new name.

## Deployment

- `.github/workflows/deploy-backend.yml` — on push to `main` touching `backend/**`, runs `sam build` /
  `sam deploy --stack-name backend` (region `us-east-1`).
- `.github/workflows/deploy-frontend.yml` — on push to `main` touching `frontend/**`, builds with `ng build` and
  syncs `dist/frontend/browser` to `s3://decisioniq-frontend-samuel`, then fixes up content-types/cache headers
  per file type (JS/CSS/JSON immutable cache, `index.html` no-cache).
