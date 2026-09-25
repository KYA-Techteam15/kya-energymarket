# KYA-EnergyMarket — image de production (Coolify). Spec 001, FR-019.
# Construction : docker build --build-arg APP_VERSION=0.1.0 --build-arg VITE_APP_BASE_URL=https://... -t kya-energy-market .

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc* ./
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/domain/package.json packages/domain/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_APP_BASE_URL=http://localhost:3000
ENV VITE_APP_BASE_URL=$VITE_APP_BASE_URL
RUN pnpm --filter @kya-em/web build

FROM node:22-alpine AS runtime
WORKDIR /app
ARG APP_VERSION=0.1.0
ENV NODE_ENV=production APP_ENV=production APP_VERSION=$APP_VERSION PORT=3000
COPY --from=build --chown=node:node /app/apps/web/.output ./.output
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", ".output/server/index.mjs"]
