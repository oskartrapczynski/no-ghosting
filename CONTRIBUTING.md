# Contributing to No Ghosting

Thanks for your interest! The project is in early access, so issues, ideas and feedback from people working with real recruiting pipelines are just as valuable as code.

## Getting started

Follow the [Quick start](README.md#quick-start) to run the stack locally, then:

```bash
npm run build   # build all packages
npm test        # run the test suite
```

## Workflow

1. Open an issue first for anything bigger than a small fix, so we can agree on the approach.
2. Branch off `dev` (not `main`): `feat/short-description`, `fix/short-description`.
3. Keep every commit green: `npm run build && npm test` must pass.
4. Open a pull request against `dev`. CI runs the build and tests automatically.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(adapters): add Greenhouse adapter
fix(follow-ups): count ignored nudges toward maxAttempts
docs(readme): clarify webhook payload
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `ci`, `chore`.

## Adding an ATS adapter

Adapters are the most valuable contribution: each one connects No Ghosting to another ATS.

1. Create `packages/adapters/src/<ats-id>-adapter.ts` implementing `AtsAdapter` (see [`base.ts`](packages/adapters/src/base.ts)):
   - `testConnection(config)`: verify credentials against the ATS API
   - `sync(config)`: return pipelines, recruiters and candidates as `AtsSyncResult`; report per-entity problems in `errors` instead of throwing
2. Export it from [`packages/adapters/src/index.ts`](packages/adapters/src/index.ts).
3. Register it in [`apps/backend/src/adapters/adapters.service.ts`](apps/backend/src/adapters/adapters.service.ts) with `registerAdapter()`.
4. Use [`demo-adapter.ts`](packages/adapters/src/demo-adapter.ts) as a reference, and add tests that cover mapping from the ATS's data to `AtsSyncResult`.

Never commit real API credentials. Adapters receive their config (API URL, keys) at runtime through the `config` argument, so nothing ATS-specific should be hardcoded.

## Questions

Open an issue, or reach out directly: contact details are in the [README](README.md#-built-by).
