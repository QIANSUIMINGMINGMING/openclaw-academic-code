# ResearchOS

> 全栈并行科研助手
>
> 别人的 AI 读论文，我们的 AI 做科研。

ResearchOS is an end-to-end research operating system built around real research work, not just
paper chat. It connects topic intake, evidence gathering, structured execution, cluster-aware
experimentation, review, and deliverable packaging into one workflow.

This repository is the **code repository** for that system. It is the implementation-facing
counterpart to the contest proposal and public submission assets.

## What ResearchOS Is

ResearchOS is designed for the full research loop:

1. start from a research topic or question
2. gather papers and evidence
3. organize work through `PEV`:
   - `Planner`
   - `Executor`
   - `Validator`
4. coordinate shared compute and long-running work
5. turn results into survey, slides, proposal, poster, and demo assets

The proposal describes this as a **full-stack parallel research assistant**. The important idea is
parallelism, not just summarization:

- multiple agent sessions can work at the same time
- task state persists through `.agent-doc`
- shared cluster usage is visible and coordinated
- results can be reviewed and resumed instead of restarting from scratch

## Why This Repo Exists

The contest submission uses two separate repositories:

- public submission repo:
  `https://github.com/QIANSUIMINGMINGMING/openclaw-academic-submit`
- code repo:
  `https://github.com/QIANSUIMINGMINGMING/openclaw-academic-code`

The public repo is for stable links and final artifacts.

This repo is for the runnable system pieces behind the proposal:

- runtime bridge for `Claude Code`
- runtime bridge for `Codex`
- `OpenClaw + Feishu Bot` intake
- dashboard and task APIs
- cluster and `.agent-doc` visibility

## Project Story

ResearchOS is not positioned as “an AI that reads papers for you”.

It is positioned as a research operating layer with three user-facing entrances:

- `Claude Code`
  the main desktop entrance for deep research work
- `OpenClaw + Feishu Bot`
  a lightweight entrance for away-from-desk triggering
- `Web Dashboard`
  the review surface for global state, task queue, cluster usage, and experiment summaries

Under those entrances sits the same operating contract:

- structured work through `PEV`
- persistent state through `.agent-doc`
- resource visibility through cluster reservation data
- shared outputs that later sessions can continue from

That is the main alignment point with the proposal.

## Current Implementation In This Repo

This repo now closes the main source gap between the proposal and the earlier static materials by
providing one runnable service with:

- HTTP APIs and a dashboard
- Feishu event callback handling, including `url_verification`
- OpenClaw message intake
- a persistent local task queue
- runtime bootstrap for:
  - `CLAUDE.md`
  - `AGENTS.md`
  - `.researchos/runtime-manifest.json`
  - OpenClaw / Feishu metadata files
- live reading of:
  - cluster reservation data
  - machine inventory
  - `.agent-doc` executor summaries
  - `.agent-doc` validator summaries

In other words: the repo now contains actual runtime-support code for the proposal’s three-entry
story, not just screenshots or placeholder descriptions.

## What Is Still External

ResearchOS as described in the proposal spans more than this repository.

The following are intentionally treated as integrations rather than reimplemented here:

- Grobid deployment
- RKB / SQLite paper store
- real RDMA benchmark executors
- upstream OpenClaw deployment and registration
- submission-site hosting and public asset delivery

This repo focuses on the **bridge layer** between the research runtime story and executable code.

## Repository Layout

- [src/server.js](/home/muxi/openclaw-academic-code/src/server.js)
  main HTTP service and dashboard
- [src/lib/runtime-support.js](/home/muxi/openclaw-academic-code/src/lib/runtime-support.js)
  runtime support matrix and workspace bootstrap
- [src/lib/inbound.js](/home/muxi/openclaw-academic-code/src/lib/inbound.js)
  Feishu / OpenClaw payload normalization
- [src/lib/cluster.js](/home/muxi/openclaw-academic-code/src/lib/cluster.js)
  machine and reservation aggregation
- [src/lib/agent-doc.js](/home/muxi/openclaw-academic-code/src/lib/agent-doc.js)
  executor / validator summary discovery
- [src/lib/tasks.js](/home/muxi/openclaw-academic-code/src/lib/tasks.js)
  local persisted task queue
- [src/cli.js](/home/muxi/openclaw-academic-code/src/cli.js)
  workspace bootstrap entrypoint

## Quick Start

```bash
cd /home/muxi/openclaw-academic-code
npm start
```

Default local address:

- `http://127.0.0.1:8600`

The dashboard exposes:

- cluster state
- `.agent-doc` experiment summaries
- runtime support matrix
- queued tasks

## Environment

Important environment variables:

- `PORT`
- `RESEARCHOS_STATE_DIR`
- `RESEARCHOS_AGENT_DOC_ROOTS`
- `RESEARCHOS_CLUSTER_LEDGER`
- `RESEARCHOS_MACHINES_FILE`
- `RESEARCHOS_PUBLIC_BASE_URL`
- `OPENCLAW_SHARED_SECRET`
- `FEISHU_VERIFY_TOKEN`

Example configuration:

- [.env.example](/home/muxi/openclaw-academic-code/.env.example)

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

## Workspace Bootstrap

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

This is the main way the repo supports both `Claude Code` and `Codex` with one project contract.

## Validation

Run tests:

```bash
npm test
```

The current tests cover:

- OpenClaw payload normalization
- Feishu payload normalization
- runtime bootstrap file generation

## Proposal Alignment

This README intentionally follows the same high-level framing as the proposal:

- ResearchOS is a **full-stack** research system
- the core differentiator is **parallel research work**
- `PEV` is the organizing workflow
- `Claude Code`, `OpenClaw + Feishu Bot`, and the dashboard are complementary entrances
- the code repo is for implementation, while the submission repo is for stable public artifacts
