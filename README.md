# ResearchOS Code

ResearchOS code repository for the executable parts behind the contest proposal.

This repo closes the main source gap between the proposal and the previously static materials by
providing one runnable service that supports:

- `Claude Code` workspace bootstrap
- `Codex` workspace bootstrap
- `OpenClaw + Feishu Bot` webhook intake
- `Web Dashboard` for cluster state, agent-doc summaries, runtime support, and queued tasks

## What Was Missing

The proposal described a real system with three entry paths:

- desktop agent work through `Claude Code`
- mobile / lightweight triggering through `OpenClaw + Feishu Bot`
- review and monitoring through a `Web Dashboard`

The earlier repository state mainly contained contest assets and a demo-only dashboard. This repo
now adds actual source code for the runtime bridge and task intake layer.

## Current Scope

Implemented here:

- HTTP service with JSON APIs and a dashboard
- Feishu event callback handling, including `url_verification`
- OpenClaw message intake endpoint
- persistent local task queue
- runtime bootstrap files for `CLAUDE.md`, `AGENTS.md`, and OpenClaw / Feishu metadata
- live reading of cluster reservation data and `.agent-doc` executor / validator summaries

Still external by design:

- Grobid deployment
- RKB / SQLite paper store
- real benchmark executors on the RDMA cluster
- actual OpenClaw upstream deployment

Those systems are modeled here as integration points rather than reimplemented in this repo.

## Layout

- [src/server.js](/home/muxi/openclaw-academic-code/src/server.js): main HTTP service
- [src/lib/runtime-support.js](/home/muxi/openclaw-academic-code/src/lib/runtime-support.js): runtime bootstrap and support matrix
- [src/lib/inbound.js](/home/muxi/openclaw-academic-code/src/lib/inbound.js): Feishu and OpenClaw payload normalization
- [src/lib/cluster.js](/home/muxi/openclaw-academic-code/src/lib/cluster.js): machine and reservation aggregation
- [src/lib/agent-doc.js](/home/muxi/openclaw-academic-code/src/lib/agent-doc.js): executor / validator summary discovery
- [src/lib/tasks.js](/home/muxi/openclaw-academic-code/src/lib/tasks.js): local persisted task queue

## Run

```bash
cd /home/muxi/openclaw-academic-code
npm start
```

Default server:

- `http://127.0.0.1:8600`

Important environment variables:

- `PORT`
- `RESEARCHOS_STATE_DIR`
- `RESEARCHOS_AGENT_DOC_ROOTS`
- `RESEARCHOS_CLUSTER_LEDGER`
- `RESEARCHOS_MACHINES_FILE`
- `RESEARCHOS_PUBLIC_BASE_URL`
- `OPENCLAW_SHARED_SECRET`
- `FEISHU_VERIFY_TOKEN`

See [.env.example](/home/muxi/openclaw-academic-code/.env.example).

## API

- `GET /api/health`
- `GET /api/cluster`
- `GET /api/experiments`
- `GET /api/tasks`
- `GET /api/runtimes`
- `POST /api/tasks`
- `POST /api/openclaw/hooks/message`
- `POST /api/feishu/events`
- `POST /api/workspaces/bootstrap`

## Bootstrap Example

Generate runtime files for a workspace:

```bash
node src/cli.js bootstrap --runtime all --project-root /path/to/workspace
```

This writes:

- `CLAUDE.md`
- `AGENTS.md`
- `.researchos/runtime-manifest.json`
- `.researchos/openclaw-extension.json`
- `.researchos/feishu-bot.json`

## Test

```bash
npm test
```
