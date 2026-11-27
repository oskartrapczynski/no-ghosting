# No Ghosting

> **Status: Early Access (v0.1).** The core engine works end-to-end; ATS integrations and additional channels are under active development. Looking for **3 pilot companies**. [See the offer ↓](#-pilot-program--3-spots)

Open-source platform that keeps recruiters from going silent on candidates. When a candidate has waited too long at any pipeline stage, No Ghosting **automatically nudges the responsible recruiter** and escalates if nothing happens.

---

## 🚀 Pilot Program: 3 spots

No Ghosting is in an early stage, and I want to shape it around real recruiting teams rather than assumptions.

**The first 3 companies that join get a free, hands-on implementation, done personally by the author:**

- ✅ Analysis of your current recruitment process and where candidate communication breaks down
- ✅ Setup and configuration of No Ghosting (self-hosted or hosted)
- ✅ Integration with your ATS: if an adapter doesn't exist yet, I'll build it
- ✅ Follow-up rules tailored to your pipeline stages and SLAs
- ✅ Direct line to the developer during the pilot, with no support-ticket queue

**In return:** honest feedback, and (optionally) permission to publish an anonymized case study.

👉 **Interested?** Get in touch: see [Contact](#-built-by) below or take the free audit on [noghosting.pl](https://noghosting.pl).

> 🇵🇱 **W skrócie:** aplikacja jest we wczesnej fazie rozwoju. **Pierwsze 3 firmy otrzymają bezpłatne wdrożenie bezpośrednio od twórcy**: analizę procesu, konfigurację, integrację z ATS i bezpośredni kontakt w trakcie pilotażu. W zamian prosimy o feedback.

---

## The problem

Candidates apply, interview, and then hear nothing. Usually it isn't bad intent: recruiters juggle dozens of processes, and legacy ATS systems (Taleo, iCIMS, Workday, SuccessFactors) don't enforce communication SLAs. The result is lost candidates, negative employer reviews, and damaged employer branding.

## How it works

1. **Sync** candidates, pipelines and stages from your ATS (via adapter plugins)
2. **Monitor** time since last contact per candidate, per stage
3. **Nudge the assigned recruiter** (email today; SMS and ATS messaging planned) when a stage's deadline passes
4. **Reset the clock** automatically when the recruiter replies (ATS webhook)
5. **Escalate & flag**: after N ignored nudges the candidate is marked as `GHOSTED` and a manager can be notified

The tool doesn't replace the human touch. It makes sure the recruiter remembers to reply.

## Roadmap

| Area | Status |
| --- | --- |
| Multi-tenant core (tenants, recruiters, pipelines, stages, candidates) | ✅ Done |
| Follow-up rules per stage (CRUD, templates with variables) | ✅ Done |
| Scheduling engine (cron scan every 15 min + BullMQ delayed jobs) | ✅ Done |
| Recruiter nudges via email (SMTP) | ✅ Done |
| ATS webhook: `recruiter-replied` resets the timer | ✅ Done |
| Dashboard (pipelines, candidates, rules, settings) | ✅ Done |
| Demo ATS adapter + seed data | ✅ Done |
| Authentication & user roles | 🚧 In progress |
| ATS adapters: Taleo, iCIMS, Workday, SuccessFactors | 🔜 Planned (driven by pilot needs) |
| SMS / Slack / ATS-message channels | 🔜 Planned |
| Analytics: response times, SLA compliance, ghosting rate | 🔜 Planned |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Docker Compose                    │
├─────────────┬─────────────┬────────────┬────────────┤
│apps/frontend│apps/backend │ PostgreSQL │   Redis    │
│ React+Vite  │   NestJS    │   (data)   │  (queues)  │
├─────────────┴─────────────┴────────────┴────────────┤
│  packages/                                          │
│  ├── db        — Prisma schema & client             │
│  ├── adapters  — ATS adapter plugins                │
│  ├── channels  — Delivery channels (email/SMS)      │
│  └── shared    — Types & DTOs                       │
└─────────────────────────────────────────────────────┘
```

## Quick start

```bash
# Prerequisites: Node 20+, Docker

# 1. Clone & install
git clone https://github.com/oskartrapczynski/no-ghosting.git
cd no-ghosting
npm install

# 2. Start infrastructure
cp .env.example .env
docker compose up -d postgres redis

# 3. Create schema and (optionally) seed demo data
npm run db:push
npm run db:seed

# 4. Start dev servers
npm run dev
```

Dashboard: http://localhost:3000
API: http://localhost:3001/api/health

Full deployment: `docker compose up -d`

## Key concepts

### ATS adapters

Plugin-based: each adapter syncs pipelines, candidates and recruiters from a specific ATS.

```typescript
import type { AtsAdapter } from "@no-ghosting/adapters";

export const myAtsAdapter: AtsAdapter = {
  id: "my-ats",
  name: "My ATS",
  async testConnection(config) { /* ... */ },
  async sync(config) { /* ... */ },
};
```

Built-in: `demo`. Enterprise adapters are planned and will be prioritized by pilot partners' needs.

### Follow-up rules

Configured per pipeline stage:

- **delayDays**: days of silence before the recruiter gets nudged
- **channelType**: `EMAIL`, `SMS` or `ATS_MESSAGE`
- **templateSubject / templateBody**: support `{{recruiterName}}`, `{{candidateName}}`, `{{stageName}}`, `{{daysSilent}}`, `{{attemptNumber}}` and more
- **maxAttempts**: after N ignored nudges the candidate is flagged as `GHOSTED`
- **escalate**: notify a manager when max attempts are reached

### Webhook

`POST /api/webhooks/ats/recruiter-replied` with `candidatePipelineId` or `candidateAtsId` marks the candidate as contacted and reschedules the next check.

## Tech stack

- **Monorepo**: Turborepo + npm workspaces
- **Backend**: NestJS, BullMQ, Prisma 7
- **Frontend**: React + Vite
- **Database**: PostgreSQL (local Docker or Neon serverless)
- **Queue**: Redis + BullMQ
- **Deployment**: Docker Compose (self-hosted), multi-tenant ready for SaaS

---

## 👋 Built by

**Oskar Trapczyński**, Full-stack Developer (TypeScript · React · NestJS · PostgreSQL)

I build software that removes friction from business processes: automations, integrations between systems that weren't designed to talk to each other, and internal tools that save teams hours every week. No Ghosting started from a simple observation: most candidate ghosting is a process problem, and process problems can be solved with good engineering.

**I'm open to full-time roles and freelance projects**, especially in process automation, system integrations and full-stack product development.

- 💼 LinkedIn: `TODO: add link`
- ✉️ Email: `TODO: add address`
- 🐙 GitHub: [@oskartrapczynski](https://github.com/oskartrapczynski)

If your team is dealing with a process that could run smoother, let's talk, whether it's about No Ghosting or something else entirely.

## License

MIT
