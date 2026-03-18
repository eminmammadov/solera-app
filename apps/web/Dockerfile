FROM node:22-slim AS base
WORKDIR /app
ENV CI=true

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/solera-staking-idl/package.json packages/solera-staking-idl/package.json
COPY packages/solera-staking-types/package.json packages/solera-staking-types/package.json
RUN npm ci

FROM base AS builder
ARG BUILD_APP_ORIGIN=https://placeholder.solera.local
ARG BUILD_API_INTERNAL_URL=https://placeholder-api.solera.local/api
ARG BUILD_MAINNET_RPC_URL=https://placeholder-rpc-mainnet.solera.local
ARG BUILD_DEVNET_RPC_URL=https://placeholder-rpc-devnet.solera.local
ARG BUILD_PROXY_KEY=placeholder-shared-key
ARG BUILD_NEWS_KEY=placeholder-news-secret
ARG BUILD_REDIS_URL=redis://placeholder-redis:6379
ARG BUILD_PUBLIC_APP_ORIGIN=https://placeholder.solera.local
ARG BUILD_PUBLIC_API_BASE_URL=https://placeholder.solera.local/api/backend
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
RUN APP_ORIGIN=${BUILD_APP_ORIGIN} \
    SOLERA_API_INTERNAL_URL=${BUILD_API_INTERNAL_URL} \
    SOLANA_MAINNET_RPC_URL=${BUILD_MAINNET_RPC_URL} \
    SOLANA_DEVNET_RPC_URL=${BUILD_DEVNET_RPC_URL} \
    SOLERA_PROXY_SHARED_KEY=${BUILD_PROXY_KEY} \
    NEWS_CLIENT_ID_SECRET=${BUILD_NEWS_KEY} \
    RATE_LIMIT_REDIS_URL=${BUILD_REDIS_URL} \
    NEXT_PUBLIC_APP_ORIGIN=${BUILD_PUBLIC_APP_ORIGIN} \
    NEXT_PUBLIC_API_BASE_URL=${BUILD_PUBLIC_API_BASE_URL} \
    npm run build:web

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8080
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/solera-staking-idl/package.json packages/solera-staking-idl/package.json
COPY packages/solera-staking-types/package.json packages/solera-staking-types/package.json
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/scripts ./scripts
WORKDIR /app/apps/web
EXPOSE 8080
CMD ["sh", "-c", "node ../../scripts/validate-web-env.mjs && node ../../node_modules/next/dist/bin/next start -p ${PORT:-8080} -H 0.0.0.0"]
