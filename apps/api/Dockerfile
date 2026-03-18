FROM node:22-slim AS base
WORKDIR /app
ENV CI=true
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api ./apps/api
COPY apps/web/package.json apps/web/package.json
COPY packages ./packages
COPY scripts ./scripts
RUN npm ci

FROM base AS builder
ARG BUILD_DATABASE_URL=postgresql://solera:solera@placeholder-db:5432/solera
ARG BUILD_OHLC_DATABASE_URL=postgresql://ohlc:ohlc@placeholder-db:5432/solera_ohlc
ARG BUILD_LOG_DATABASE_URL=postgresql://audit:audit@placeholder-db:5432/solera_audit
ARG BUILD_SOLANA_DEVNET_DATABASE_URL=postgresql://devnet:devnet@placeholder-db:5432/solera_devnet
ARG BUILD_MAINNET_RPC_URL=https://placeholder-rpc-mainnet.solera.local
ARG BUILD_DEVNET_RPC_URL=https://placeholder-rpc-devnet.solera.local
ARG BUILD_JWT_KEY=placeholder-jwt-secret
ARG BUILD_CORS_ORIGIN=https://placeholder.solera.local
ARG BUILD_PROXY_KEY=placeholder-shared-key
ARG BUILD_REDIS_URL=redis://placeholder-redis:6379
COPY --from=deps /app /app
RUN export DATABASE_URL=${BUILD_DATABASE_URL} && \
    export OHLC_DATABASE_URL=${BUILD_OHLC_DATABASE_URL} && \
    export LOG_DATABASE_URL=${BUILD_LOG_DATABASE_URL} && \
    export SOLANA_DEVNET_DATABASE_URL=${BUILD_SOLANA_DEVNET_DATABASE_URL} && \
    export SOLANA_MAINNET_RPC_URL=${BUILD_MAINNET_RPC_URL} && \
    export SOLANA_DEVNET_RPC_URL=${BUILD_DEVNET_RPC_URL} && \
    export JWT_SECRET=${BUILD_JWT_KEY} && \
    export CORS_ORIGIN=${BUILD_CORS_ORIGIN} && \
    export SOLERA_PROXY_SHARED_KEY=${BUILD_PROXY_KEY} && \
    export RATE_LIMIT_REDIS_URL=${BUILD_REDIS_URL} && \
    npm run db:generate && npm run build:api

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8080
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/solera-staking-idl/package.json packages/solera-staking-idl/package.json
COPY packages/solera-staking-types/package.json packages/solera-staking-types/package.json
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev
COPY --from=builder /app/apps/api/node_modules/@prisma ./apps/api/node_modules/@prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/scripts ./apps/api/scripts
COPY --from=builder /app/packages ./packages
WORKDIR /app
EXPOSE 8080
CMD ["sh", "-c", "node apps/api/scripts/validate-backend-env.mjs && node apps/api/dist/main.js"]
