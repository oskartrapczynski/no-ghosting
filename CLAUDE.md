# No Ghosting — Project Context

## What is this?

Open-source anti-ghosting platform for HR/recruiting teams. It eliminates candidate ghosting by automatically sending follow-ups when recruiters don't respond within configured timeframes.

## Architecture

Turborepo monorepo with npm workspaces:

- `apps/backend` — NestJS backend (REST API, BullMQ job processing, cron scheduler)
- `apps/frontend` — React + Vite SPA (dashboard for HR teams)
- `packages/db` — Prisma schema & client (PostgreSQL)
- `packages/adapters` — ATS adapter plugin system (universal middleware pattern)
- `packages/channels` — Multi-channel delivery (email SMTP, SMS, ATS messaging)
- `packages/shared` — Shared TypeScript types

## Key Design Decisions

- **npm workspaces** — zero extra tooling, any Node 20+ user can `npm install` and go
- **Multi-tenant from day one** — each company is a Tenant, all queries scoped by tenantId
- **ATS adapters are plugins** ��� register via `registerAdapter()`, implement `AtsAdapter` interface
- **BullMQ for scheduling** — follow-up jobs are scheduled with delays, processed by workers
- **Cron every 15min** — scans for overdue follow-ups and enqueues them
- **Self-hosted + SaaS-ready** — Docker Compose for self-hosted, multi-tenant for SaaS

## Commands

```bash
npm install           # install all deps
npm run dev           # start all dev servers (via turbo)
npm run build         # build all packages
npm run db:push       # push schema to DB
npm run db:generate   # generate Prisma client
docker compose up -d  # full deployment
```

## Target Users

Large corporations with legacy ATS systems (Taleo, iCIMS, Workday, SuccessFactors). The platform integrates via adapter plugins that bridge these systems.
