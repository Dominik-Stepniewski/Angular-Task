# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS builder
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
COPY . .
RUN printf 'minimum-release-age=0\ndangerously-allow-all-builds=true\n' > .npmrc
RUN pnpm install --frozen-lockfile
RUN pnpm exec nx build service-a
RUN cd dist/apps/service-a && npm install --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder --chown=node:node /workspace/dist/apps/service-a ./
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "main.js"]
