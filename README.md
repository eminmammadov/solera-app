# Solera Monorepo

Solera is a centralized-by-design monorepo with:

1. `apps/web`: Next.js frontend, public UI, admin UI, proxy routes
2. `apps/api`: NestJS backend, orchestration, policy, mirrors, admin APIs
3. `packages/*`: shared TypeScript packages
4. `programs/*`: Anchor Solana programs

## Central Architecture Status

The architecture is now considered centrally organized at the application level.

Completed:

- Request access is domain-based and centralized
- Admin access is capability-based and centralized
- Frontend admin flows use shared async/resource patterns
- Frontend public flows use shared domain clients
- Backend env/config access is centralized
- Source-of-truth boundaries are explicit in code
- Staking no longer uses `LEGACY_FALLBACK`
- Stake and claim flows now require the on-chain path
- Devnet staking mirror is integrated into the backend orchestration layer

Important note:

- The system is centralized, not monolithic
- Domains stay separated on purpose
- `blog`, `docs`, `news`, `tokens`, `staking`, `system` remaining modular is correct

## Source Of Truth

1. Main application data:
   - source of truth: `DATABASE_URL`
2. OHLC candles and ticker history:
   - source of truth: `OHLC_DATABASE_URL`
3. Admin audit trail:
   - source of truth: `LOG_DATABASE_URL`
4. Rate limiting and short-lived coordination:
   - source of truth: Redis for cache, locks, rate limits only
5. RA runtime and platform settings:
   - source of truth: application database
6. Solana staking config and positions:
   - source of truth: Anchor programs
7. Devnet staking read model:
   - source of truth: chain mirror in `SOLANA_DEVNET_DATABASE_URL`
8. Frontend session/auth state:
   - source of truth: backend-issued auth cookies
   - UI mirrors: Zustand and React state only

## Runtime Structure

1. Public UI:
   - `apps/web/app/(pages)`
2. Admin UI:
   - `apps/web/app/admin`
3. Public proxy:
   - `apps/web/app/api/backend/[...path]`
4. Admin proxy:
   - `apps/web/app/admin/api/backend/[...path]`
5. Backend API:
   - `apps/api`

## Environment Files

Use separate environment files per runtime.

1. Frontend:
   - `apps/web/.env.local`
   - template: `apps/web/.env.example`
2. Backend:
   - `apps/api/.env`
   - template: `apps/api/.env.example`

Rules:

1. `SOLERA_PROXY_SHARED_KEY` must match between web and api
2. Paid RPC URLs must remain server-side
3. Production env values should come from the deployment platform, not committed files
4. Anchor program IDs are sourced from backend env and synced into `programs/Anchor.toml` by `npm run staking:devnet:sync-ids`

Primary stores:

1. `DATABASE_URL`
2. `OHLC_DATABASE_URL`
3. `LOG_DATABASE_URL`
4. `RATE_LIMIT_REDIS_URL`
5. `SOLANA_DEVNET_DATABASE_URL`

## Local Development

Install dependencies:

```bash
npm install
```

Start infrastructure:

```bash
docker compose up -d
```

Start the repo:

```bash
npm run dev
```

This starts:

1. web on `http://localhost:3000`
2. api on `http://localhost:3001/api`
3. optional devnet staking mirror DB on `localhost:5435`

## Cloud Run Topology

This monorepo can be deployed to Google Cloud Run, but not as a direct `docker compose` lift-and-shift.

Recommended target split:

1. `apps/web` -> Cloud Run web service
2. `apps/api` -> Cloud Run api service
3. PostgreSQL containers -> Cloud SQL for PostgreSQL
4. Redis container -> Memorystore for Redis
5. secrets -> Secret Manager

Recommended domain layout:

1. staging
   - `staging.solera.work` -> web
   - `api-staging.solera.work` -> api
2. production
   - `app.solera.work` -> web
   - `api.solera.work` -> api

Operational note:

- The current same-origin proxy model can still be preserved on Cloud Run.
- `apps/web` can continue serving `/api/backend/*` while calling `apps/api` through `SOLERA_API_INTERNAL_URL`.
- You can also front both services with a Google Cloud external HTTP(S) load balancer if you want path-based routing under one public domain.

Recommended data layout:

1. staging/devnet:
   - separate Cloud SQL instance or isolated staging databases
   - separate Redis instance
2. production:
   - separate Cloud SQL instance
   - separate Redis instance

For the current Solera runtime, the closest managed database mapping is:

1. `DATABASE_URL`
2. `OHLC_DATABASE_URL`
3. `LOG_DATABASE_URL`
4. `SOLANA_DEVNET_DATABASE_URL`

You can keep these as separate databases on one instance for staging, but production and staging should not share the same Cloud SQL instance unless you explicitly accept the blast radius.

## Cloud Run Environment Matrix

Web service requires:

1. `APP_ORIGIN`
2. `SOLERA_API_INTERNAL_URL`
3. `SOLANA_MAINNET_RPC_URL`
4. `SOLANA_DEVNET_RPC_URL`
5. `SOLERA_PROXY_SHARED_KEY`
6. `NEWS_CLIENT_ID_SECRET`
7. `RATE_LIMIT_REDIS_URL` or `RATE_LIMIT_REDIS_REST_URL` + `RATE_LIMIT_REDIS_REST_TOKEN`
8. `NEXT_PUBLIC_APP_ORIGIN`
9. `NEXT_PUBLIC_API_BASE_URL`

API service requires:

1. `DATABASE_URL`
2. `OHLC_DATABASE_URL`
3. `LOG_DATABASE_URL`
4. `SOLANA_DEVNET_DATABASE_URL`
5. `SOLANA_MAINNET_RPC_URL`
6. `SOLANA_DEVNET_RPC_URL`
7. `JWT_SECRET`
8. `CORS_ORIGIN`
9. `SOLERA_PROXY_SHARED_KEY`
10. `RATE_LIMIT_REDIS_URL` or `RATE_LIMIT_REDIS_REST_URL` + `RATE_LIMIT_REDIS_REST_TOKEN`

Staking and mainnet hardening env stays on the API side.

Recommended web values for staging:

1. `APP_ORIGIN=https://staging.solera.work`
2. `NEXT_PUBLIC_APP_ORIGIN=https://staging.solera.work`
3. `NEXT_PUBLIC_API_BASE_URL=https://staging.solera.work/api/backend`
4. `SOLERA_API_INTERNAL_URL=https://api-staging.solera.work/api`

Recommended API values for staging:

1. `CORS_ORIGIN=https://staging.solera.work`
2. database URLs -> staging Cloud SQL databases
3. Redis URL -> staging Memorystore connection

Recommended web values for production:

1. `APP_ORIGIN=https://app.solera.work`
2. `NEXT_PUBLIC_APP_ORIGIN=https://app.solera.work`
3. `NEXT_PUBLIC_API_BASE_URL=https://app.solera.work/api/backend`
4. `SOLERA_API_INTERNAL_URL=https://api.solera.work/api`

Recommended API values for production:

1. `CORS_ORIGIN=https://app.solera.work`
2. database URLs -> production Cloud SQL databases
3. Redis URL -> production Memorystore connection

## Cloud Run Container Files

Container build files live here:

1. [apps/web/Dockerfile](apps/web/Dockerfile)
2. [apps/api/Dockerfile](apps/api/Dockerfile)
3. [\.dockerignore](.dockerignore)

Build these from the repository root:

```bash
docker build -f apps/web/Dockerfile -t solera-web .
docker build -f apps/api/Dockerfile -t solera-api .
```

Notes:

1. Builder stages use safe placeholder build arguments so Docker builds do not require committed secrets.
2. Runtime containers still require real environment variables from Cloud Run or Secret Manager.
3. For production web builds, pass the real public origin values as build args so any build-time public config stays aligned:

```bash
docker build \
  -f apps/web/Dockerfile \
  --build-arg BUILD_APP_ORIGIN=https://app.solera.work \
  --build-arg BUILD_PUBLIC_APP_ORIGIN=https://app.solera.work \
  --build-arg BUILD_PUBLIC_API_BASE_URL=https://app.solera.work/api/backend \
  --build-arg BUILD_API_INTERNAL_URL=https://api.solera.work/api \
  -t solera-web .
```

## Common Commands

Lint:

```bash
npm run lint:all
```

Build:

```bash
npm run build
```

Web only:

```bash
npm run lint:web
npm run build:web
```

API only:

```bash
npm run lint:api
npm run build:api
```

Staking operations:

```bash
npm run staking:test
npm run staking:mainnet:dry-run
```

Prisma:

```bash
npm run db:migrate:status
npm run db:migrate:deploy
npm run db:generate
```

## Staking Status

Current state:

1. Anchor programs exist in `programs/*`
2. Backend prepares and executes staking through centralized services
3. Frontend stake and claim flows are on-chain-first and no longer fall back to legacy persistence
4. Devnet staking mirror writes into `SOLANA_DEVNET_DATABASE_URL`

Operational note:

- Mainnet rollout and multisig hardening are operational steps, not architecture gaps
- `npm run staking:mainnet:dry-run` is the central readiness check for mainnet staking bootstrap, config updates, and funding gates

## Central Architecture Complete Checklist

- [x] Workspace-based monorepo
- [x] Central backend route catalog
- [x] Central admin capability policy
- [x] Central frontend request clients
- [x] Central admin async/resource layer
- [x] Central backend env access
- [x] Central web env access
- [x] Central staking orchestration layer
- [x] Legacy staking fallback removed
- [x] Root lint/build verified

## Repository Rule

Root `README.md` is the only retained architecture/documentation file in this repository.
