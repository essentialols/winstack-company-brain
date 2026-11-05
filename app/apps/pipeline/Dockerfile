# Outside-In Brain pipeline worker.
# Build from the monorepo root (pnpm workspace needs the root lockfile):
#   docker build -f apps/pipeline/Dockerfile -t oib-pipeline .
# Railway: build context = repo root (app/), Dockerfile path = apps/pipeline/Dockerfile.
FROM node:22-slim AS builder
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared ./packages/shared
COPY apps/pipeline ./apps/pipeline
ENV CI=true HUSKY=0
RUN pnpm install --frozen-lockfile --filter @app-starter/pipeline... 
RUN pnpm --filter @app-starter/shared run build && pnpm --filter @app-starter/pipeline run build

FROM node:22-slim AS production
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared ./packages/shared
COPY apps/pipeline ./apps/pipeline
ENV CI=true HUSKY=0 NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod --filter @app-starter/pipeline...
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/pipeline/dist ./apps/pipeline/dist
WORKDIR /app/apps/pipeline
EXPOSE 8080
CMD ["node", "dist/index.js"]
