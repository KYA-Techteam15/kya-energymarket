# KYA-EnergyMarket — image de production (Coolify). Spec 001, FR-019.
# La même image sert dans tous les environnements : l'adresse publique (APP_BASE_URL), la base et
# les secrets arrivent par les variables d'environnement au démarrage.
# Construction locale : docker build --build-arg APP_VERSION=0.1.0 -t kya-energy-market .

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/domain/package.json packages/domain/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @kya-em/web build

FROM node:22-alpine AS runtime
WORKDIR /app
ARG APP_VERSION=0.1.0
ENV NODE_ENV=production APP_ENV=production APP_VERSION=$APP_VERSION PORT=3000
LABEL org.opencontainers.image.source="https://github.com/KYA-Techteam15/kya-energymarket" \
      org.opencontainers.image.description="KYA-EnergyMarket — la marketplace des logiciels de KYA-Energy Group"
COPY --from=build --chown=node:node /app/apps/web/.output ./.output
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", ".output/server/index.mjs"]
