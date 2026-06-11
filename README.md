# DecisionIQ

DecisionIQ is an AI-powered business intelligence and decision-support platform. Upload a CSV dataset and
DecisionIQ turns it into business KPIs, trend charts, a decision score, risk flags, recommendations, and an
executive summary — all scoped privately to your account.

Live app: [decisioniq.sdcloudhub.com](https://decisioniq.sdcloudhub.com)

## Features

- **CSV upload with SHA-256 deduplication** — files are hashed client-side before upload; if the same file has
  already been analyzed by you, DecisionIQ links straight to the existing analysis instead of reprocessing it.
- **Automatic dataset profiling** — column typing (numeric, date, categorical), data quality scoring, missing
  value detection, and dataset-type detection (e.g. Business Performance, IoT Telemetry, Real Estate).
- **Business KPIs** — total revenue, total cost, total profit, and profit margin (computed when `revenue` and
  `cost` columns are present).
- **Trend analysis & charts** — per-column trend direction (upward/downward/flat) and time-series data for
  revenue/cost/profit, rendered with Chart.js.
- **Decision score** — a 0–100 score (with an Excellent/Strong/Moderate/Weak/Critical rating) derived from data
  quality, profit margin, profitability, and dataset size, with human-readable reasons.
- **Risks & recommendations** — automatically generated lists of data-quality risks and actionable next steps.
- **AI-generated executive summary** — a narrative summary of the dataset's business performance.
- **Per-user data isolation** — every upload, analysis, and result is scoped to the authenticated user. Uploads
  and results are namespaced by user ID in S3, and DynamoDB lookups use per-user GSIs (queries, never scans).
- **Big-data queueing** — files over 50 MB are queued (`status: QUEUED`, `processingMode: BIG_DATA`) instead of
  being processed synchronously in a Lambda.

## Architecture

```
frontend/   Angular 21 SPA (standalone components, signals)  -> S3 static hosting
backend/    AWS SAM app (API Gateway + Lambda + DynamoDB + S3 + Cognito)
datasets/   Sample CSV datasets for local testing
```

### Frontend

- **Angular 21**, standalone components with `signal`/`computed` for state.
- **Pages**: `dashboard` (summary stats across all your analyses), `upload` (file picker → SHA-256 hash → upload
  → analyze), `analyses` (list of past analyses), `analysis/:id` (full report with charts).
- **Routing**: all pages except the root redirect are protected by `authGuard`, which redirects unauthenticated
  users into the Cognito login flow.
- **Auth**: Cognito Hosted UI with the OAuth2 Authorization Code + PKCE flow, implemented in
  `AuthService` (`frontend/src/app/services/auth.service.ts`). Tokens are stored in `localStorage`; the Cognito
  **ID token** is sent as `Authorization: Bearer <token>` on API requests, since that's what the API Gateway
  Cognito authorizer validates.
- **Charts**: Chart.js for revenue/cost/profit trend visualizations.

### Backend

AWS SAM stack (`backend/template.yaml`) with five Node.js 20 Lambda functions behind an API Gateway REST API,
secured by a Cognito User Pool authorizer (default on all routes except `/health`):

| Endpoint | Method | Function | Description |
| --- | --- | --- | --- |
| `/health` | GET | `health` | Unauthenticated health check |
| `/upload-url` | POST | `upload` | Returns a presigned S3 PUT URL; checks for an existing analysis with the same file hash for the user (dedup) |
| `/analyze` | POST | `analyze` | Parses the uploaded CSV and runs the full analysis pipeline |
| `/analysis/{analysisId}` | GET | `get-analysis` | Fetches analysis metadata + result, enforcing ownership |
| `/analyses` | GET | `list-analyses` | Lists the caller's analyses |

**Storage**:
- `UploadBucket` (S3) — raw uploaded CSVs, keyed `raw/{userId}/{datasetId}/{fileName}`
- `ResultBucket` (S3) — analysis result JSON, keyed `analysis-results/{userId}/{analysisId}.json`
- `AnalysisTable` (DynamoDB, on-demand) — analysis metadata, with `UserIdIndex` and `FileHashIndex` GSIs for
  per-user queries and dedup lookups

**Analysis pipeline** (`backend/src/handlers/analyze.ts`) runs a chain of pure services in
`backend/src/services/`:

1. `parser.service` — CSV parsing (csv-parse)
2. `analysis.service` / `profile.service` — column typing, dataset-type detection, data quality scoring
3. `business-kpi.service` — revenue/cost/profit/margin
4. `trend.service` / `trend-series.service` — trend direction + chart series
5. `insight.service`, `recommendation.service`, `risk.service` — narrative insights, recommendations, risks
6. `decision-score.service` — 0–100 decision score and rating
7. `ai-summary.service` — executive summary

## Local development

### Backend

```bash
cd backend/src
npm install
npm run lint     # eslint
npm test         # tsc + jest unit tests
```

Run the API locally with AWS SAM (requires the [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) and Docker):

```bash
cd backend
sam build
sam local start-api    # serves the API on http://localhost:3000
```

Invoke a single function with a test event:

```bash
sam local invoke HealthFunction --event events/event.json
```

### Frontend

```bash
cd frontend
npm install
npm start   # ng serve, http://localhost:4200
```

Build for production:

```bash
npm run build   # outputs to dist/frontend/browser
```

Run tests:

```bash
npm test    # vitest, via `ng test`
```

## Deployment

Deployment is automated via GitHub Actions, triggered on push to `main`:

- **`.github/workflows/deploy-backend.yml`** — runs on changes under `backend/**`. Installs dependencies, runs
  `sam build`, and deploys the SAM stack (`sam deploy --stack-name backend`) to `us-east-1`.
- **`.github/workflows/deploy-frontend.yml`** — runs on changes under `frontend/**`. Builds the Angular app and
  syncs `dist/frontend/browser` to the S3 hosting bucket (`decisioniq-frontend-samuel`), then sets correct
  content types and cache headers per file type (long-lived immutable cache for JS/CSS/JSON, no-cache for
  `index.html`).

Both workflows authenticate to AWS using `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` repository secrets.

## Tech stack

- **Frontend**: Angular 21, TypeScript, RxJS, Chart.js, Vitest
- **Backend**: AWS SAM, Node.js 20, TypeScript, esbuild, csv-parse, AWS SDK v3 (`client-s3`,
  `client-dynamodb`, `lib-dynamodb`, `s3-request-presigner`), Jest
- **Infrastructure**: AWS Lambda, API Gateway, DynamoDB, S3, Cognito (User Pool + Hosted UI)
- **CI/CD**: GitHub Actions
