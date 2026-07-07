# Lumana — Image Annotation Workbench

An Nx monorepo for searching and annotating images. Built with Angular 21 (frontend), NestJS (services), MongoDB, Redis, and NATS.

## What it does

- **Search** public images from Openverse via typeahead
- **Annotate** images by drawing labeled polygons on a canvas
- **Persist** annotations to MongoDB
- **Report** annotation activity (PDF) and metrics
- **Admin panel** for ingestion, uploads, logs, and reports

## Prerequisites

- Node 20+ with `pnpm` (`corepack enable`)
- Docker + Docker Compose

## Quick start

```bash
pnpm i
pnpm dev
```

This runs all services:

- **Frontend** on http://localhost:4200
- **Service A** (API) on http://localhost:3001
- **Service B** (Events/Reports) on http://localhost:3002
- **Infra** (MongoDB, Redis, NATS) via Docker

## Project structure

```
apps/
  frontend/     Angular 21 SPA (search, annotate, ops panel)
  service-a/    NestJS API (ingest, search, image proxy, annotations)
  service-b/    NestJS consumer (event logs, PDF reports, metrics)
libs/
  contracts/    Shared DTOs & event definitions
  mongo/        Reusable MongoDB module
  redis/        Reusable Redis + TimeSeries module
```

## Architecture

```
Browser (4200)
    ↓ HTTP
Service A (3001) ──NATS──> Service B (3002)
    ↓                           ↓
  Mongo                       Mongo
  Redis                       Redis
```

- **Service A**: Ingests images, searches, proxies images, stores annotations
- **Service B**: Consumes events, logs queries, generates PDF reports, metrics

## Key commands

```bash
# All services + frontend
pnpm dev

# Backend only
docker compose up -d --build

# Frontend only
pnpm exec nx serve frontend

# Lint, test, build all projects
pnpm exec nx run-many -t lint test build

# Service docs
# - Service A: http://localhost:3001/docs
# - Service B: http://localhost:3002/docs
```

## Run the backend workflow

```bash
# 1. Ingest images from Openverse
curl -X POST http://localhost:3001/ingest \
  -H 'content-type: application/json' -d '{"query":"cat","maxRecords":200}'

# 2. Upload dataset to Mongo
curl -F 'file=@data/dataset.json;type=application/json' \
  http://localhost:3001/upload

# 3. Search
curl 'http://localhost:3001/assets/search?q=cat&page=1&limit=20'

# 4. Annotate
curl -X POST http://localhost:3001/annotations \
  -H 'content-type: application/json' \
  -d '{"id":"a1","assetId":"<id>","label":"cat","points":[[0.1,0.1],[0.4,0.1],[0.4,0.5]],"rotationRad":0}'

# 5. View logs
curl 'http://localhost:3002/logs?type=annotate'

# 6. Get report & metrics
curl "http://localhost:3002/report/pdf?from=$(date -u -d '1 hour ago' +%FT%TZ)&to=$(date -u +%FT%TZ)" -o report.pdf
curl "http://localhost:3002/metrics?from=$(date -u -d '1 day ago' +%FT%TZ)&to=$(date -u +%FT%TZ)"
```
