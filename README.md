# No Ghosting

Open-source anti-ghosting platform for recruiting teams. Automatically follows up with candidates when recruiters go silent, configurable per recruitment stage.

## Problem

Candidates apply, interview, and then... silence. Recruiters ghost candidates — not out of malice, but because legacy ATS systems don't enforce communication SLAs. No Ghosting fixes this by:

1. Syncing candidates and pipeline stages from your ATS
2. Monitoring time since last contact per candidate per stage
3. Automatically sending follow-ups via email/SMS when deadlines pass
4. Flagging ghosted candidates and tracking response rates

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Docker Compose                     │
├─────────────┬─────────────┬────────────┬────────────┤
│apps/frontend│apps/backend │ PostgreSQL │   Redis    │
│ React+Vite  │   NestJS    │   (data)   │ (queues)  │
├─────────────┴─────────────┴────────────┴────────────┤
│  packages/                                           │
│  ├── db        — Prisma schema & client             │
│  ├── adapters  — ATS adapter plugins                │
│  ├── channels  — Delivery channels (email/SMS)      │
│  └── shared    — Types & DTOs                       │
└─────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Prerequisites: Node 20+, Docker

# 1. Clone & install
git clone https://github.com/your-org/no-ghosting.git
cd no-ghosting
npm install

# 2. Start infrastructure
cp .env.example .env
docker compose up -d postgres redis

# 3. Run migrations
npm run db:push

# 4. Start dev servers
npm run dev
```

Dashboard: http://localhost:3000  
API: http://localhost:3001/api/health

## Full Docker deployment

```bash
docker compose up -d
```

## Key Concepts

### ATS Adapters

Plugin-based architecture. Each adapter syncs pipelines and candidates from a specific ATS:

```typescript
import type { AtsAdapter } from "@no-ghosting/adapters";

export const myAtsAdapter: AtsAdapter = {
  id: "my-ats",
  name: "My ATS",
  async testConnection(config) { /* ... */ },
  async sync(config) { /* ... */ },
};
```

Built-in adapters: `demo` (for testing). Planned: Taleo, iCIMS, Workday, SuccessFactors.

### Follow-up Rules

Configured per pipeline stage:

- **delayDays** — days of silence before triggering
- **channelType** — EMAIL, SMS, or ATS_MESSAGE
- **templateBody** — message template with `{{candidateName}}`, `{{stageName}}`, etc.
- **maxAttempts** — after N attempts without recruiter action, candidate is flagged as GHOSTED
- **escalate** — notify manager when max attempts reached

### Channels

- **Email** — SMTP/SendGrid (implemented)
- **SMS** — Twilio/MessageBird (placeholder)
- **ATS Message** — send through ATS API (placeholder)

## Tech Stack

- **Monorepo**: Turborepo + npm workspaces
- **Backend**: NestJS, BullMQ (job scheduling), Prisma
- **Frontend**: React + Vite
- **Database**: PostgreSQL
- **Queue**: Redis + BullMQ
- **Deployment**: Docker Compose

## License

MIT
