# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS builder
WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ pkg-config \
      libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
COPY . .
RUN printf 'minimum-release-age=0\ndangerously-allow-all-builds=true\n' > .npmrc
RUN pnpm install --frozen-lockfile
RUN pnpm exec nx build service-b
RUN cd dist/apps/service-b && npm install --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
      fontconfig \
 && rm -rf /var/lib/apt/lists/*
COPY --from=builder --chown=node:node /workspace/dist/apps/service-b ./
USER node
EXPOSE 3000
CMD ["node", "main.js"]
