import { resolve, join } from "path";

import { ensureDir, fileExists, writeJson, writeText } from "./json.js";

const SKILLS = [
  "download-paper",
  "slidev",
  "executor",
  "validator",
  "lite-executor",
  "machines",
  "visual-validate",
  "diagram",
  "browse",
  "persist",
];

const RUNTIME_PROFILES = [
  {
    id: "claude-code",
    label: "Claude Code",
    description: "Desktop-first research workflow with CLAUDE.md and agent-doc continuity.",
    files: ["CLAUDE.md", ".researchos/runtime-manifest.json"],
  },
  {
    id: "codex",
    label: "Codex",
    description: "Workspace bootstrap for AGENTS.md and the same ResearchOS operating contract.",
    files: ["AGENTS.md", ".researchos/runtime-manifest.json"],
  },
  {
    id: "openclaw-feishu",
    label: "OpenClaw + Feishu Bot",
    description: "Webhook intake path for lightweight triggering away from the desk.",
    files: [".researchos/openclaw-extension.json", ".researchos/feishu-bot.json"],
  },
];

function buildBaseUrl(config) {
  return config.publicBaseUrl || `http://127.0.0.1:${config.port}`;
}

function manifestFor(runtime, config) {
  const baseUrl = buildBaseUrl(config);
  return {
    generatedAt: new Date().toISOString(),
    runtime,
    dashboardUrl: baseUrl,
    agentDocRoots: config.agentDocRoots,
    skills: SKILLS,
    endpoints: {
      health: `${baseUrl}/api/health`,
      tasks: `${baseUrl}/api/tasks`,
      cluster: `${baseUrl}/api/cluster`,
      experiments: `${baseUrl}/api/experiments`,
      openclawMessage: `${baseUrl}/api/openclaw/hooks/message`,
      feishuEvents: `${baseUrl}/api/feishu/events`,
      bootstrap: `${baseUrl}/api/workspaces/bootstrap`,
    },
  };
}

function claudeTemplate(config) {
  return `# ResearchOS Workspace

## Runtime

- Client: Claude Code
- Workflow: Planner / Executor / Validator
- State: persist progress to \`.agent-doc/\`
- Dashboard: ${buildBaseUrl(config)}

## Operating Notes

- Use \`.agent-doc/\` as the durable cross-session state hub.
- Keep cluster use behind \`cluster-reserve.py\`.
- Prefer concrete artifacts over chat-only progress.
- Escalate heavy execution to the OpenClaw / Feishu trigger path only when desk-free triggering is useful.

## Skills

${SKILLS.map((skill) => `- \`${skill}\``).join("\n")}
`;
}

function codexTemplate(config) {
  return `# ResearchOS Workspace

## Runtime

- Client: Codex
- Workflow: Planner / Executor / Validator
- State: persist progress to \`.agent-doc/\`
- Dashboard: ${buildBaseUrl(config)}

## Operating Notes

- Respect existing user changes and do not revert unrelated work.
- Keep task state mirrored into \`.agent-doc/\` before large context switches.
- Treat OpenClaw / Feishu as lightweight intake, not as the main review surface.
- Use the dashboard and JSON APIs for cluster, task, and summary review.

## Skills

${SKILLS.map((skill) => `- \`${skill}\``).join("\n")}
`;
}

function openClawConfig(config) {
  const baseUrl = buildBaseUrl(config);
  return {
    name: "researchos",
    version: "0.2.0",
    description: "ResearchOS intake bridge for OpenClaw and Feishu Bot.",
    endpoints: {
      messageWebhook: `${baseUrl}/api/openclaw/hooks/message`,
      feishuWebhook: `${baseUrl}/api/feishu/events`,
      dashboard: baseUrl,
    },
    sharedSecretHeader: "x-openclaw-secret",
    skills: SKILLS,
  };
}

function feishuConfig(config) {
  return {
    verifyTokenConfigured: Boolean(config.feishuVerifyToken),
    webhookPath: "/api/feishu/events",
    intakeChannel: "openclaw-feishu",
    notes: [
      "Supports url_verification challenge response.",
      "Accepts im.message.receive_v1 style payloads.",
      "Normalizes incoming text into the local ResearchOS task queue.",
    ],
  };
}

function maybeWriteFile(path, content, overwrite) {
  if (fileExists(path) && !overwrite) {
    return { path, written: false, reason: "exists" };
  }

  if (typeof content === "string") {
    writeText(path, content);
  } else {
    writeJson(path, content);
  }
  return { path, written: true };
}

export function listRuntimeProfiles(config) {
  return {
    dashboardUrl: buildBaseUrl(config),
    profiles: RUNTIME_PROFILES,
  };
}

export function bootstrapWorkspace({ runtime = "all", projectRoot, overwrite = false, config }) {
  const root = resolve(projectRoot);
  const stateDir = join(root, ".researchos");
  ensureDir(stateDir);

  const targets =
    runtime === "all"
      ? ["claude-code", "codex", "openclaw-feishu"]
      : [runtime];

  const manifest = manifestFor(runtime, config);
  const files = [];

  files.push(
    maybeWriteFile(join(stateDir, "runtime-manifest.json"), manifest, overwrite),
  );

  if (targets.includes("claude-code")) {
    files.push(maybeWriteFile(join(root, "CLAUDE.md"), claudeTemplate(config), overwrite));
  }

  if (targets.includes("codex")) {
    files.push(maybeWriteFile(join(root, "AGENTS.md"), codexTemplate(config), overwrite));
  }

  if (targets.includes("openclaw-feishu")) {
    files.push(
      maybeWriteFile(join(stateDir, "openclaw-extension.json"), openClawConfig(config), overwrite),
    );
    files.push(maybeWriteFile(join(stateDir, "feishu-bot.json"), feishuConfig(config), overwrite));
  }

  return {
    projectRoot: root,
    runtime,
    files,
  };
}
