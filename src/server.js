import { createServer } from "http";
import { pathToFileURL } from "url";

import { findAgentDocs } from "./lib/agent-doc.js";
import { getClusterStatus } from "./lib/cluster.js";
import { createConfig } from "./lib/config.js";
import { readJsonBody, sendHtml, sendJson, sendText } from "./lib/http.js";
import { normalizeFeishuEvent, normalizeOpenClawMessage } from "./lib/inbound.js";
import { listRuntimeProfiles, bootstrapWorkspace } from "./lib/runtime-support.js";
import { createTaskStore } from "./lib/tasks.js";

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderDashboard() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ResearchOS Code Dashboard</title>
  <style>
    :root {
      --bg: #0d1117;
      --surface: #161b22;
      --surface-2: #1f2630;
      --border: #30363d;
      --text: #e6edf3;
      --text-2: #8b949e;
      --accent: #58a6ff;
      --green: #3fb950;
      --yellow: #d29922;
      --red: #f85149;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 1180px; margin: 0 auto; padding: 28px 20px 40px; }
    h1 { margin: 0; font-size: 28px; }
    p { margin: 0; }
    .sub { color: var(--text-2); margin-top: 6px; margin-bottom: 24px; }
    .tabs { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; }
    .tab { border: 1px solid var(--border); background: var(--surface); color: var(--text-2); padding: 10px 14px; border-radius: 999px; cursor: pointer; }
    .tab.active { background: var(--accent); border-color: var(--accent); color: #fff; }
    .panel { display: none; }
    .panel.active { display: block; }
    .stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
    .stat, .card, .task-form { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
    .stat strong { display: block; font-size: 26px; }
    .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); }
    .card h3 { margin: 0 0 8px; font-size: 16px; }
    .muted { color: var(--text-2); }
    .list { display: grid; gap: 10px; }
    .summary { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px; }
    .summary .meta { color: var(--text-2); font-size: 12px; margin-top: 4px; }
    .summary ul { margin: 10px 0 0 18px; padding: 0; }
    .summary li { margin-bottom: 4px; }
    .ok { color: var(--green); }
    .warn { color: var(--yellow); }
    .bad { color: var(--red); }
    .task-form { margin-bottom: 16px; }
    textarea, select, input { width: 100%; margin-top: 8px; margin-bottom: 12px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: 10px; padding: 10px 12px; font: inherit; }
    button { background: var(--accent); color: #fff; border: 0; border-radius: 10px; padding: 10px 14px; cursor: pointer; font: inherit; }
    code { background: rgba(255,255,255,0.06); border-radius: 6px; padding: 2px 6px; }
    @media (max-width: 720px) { main { padding: 20px 14px 30px; } }
  </style>
</head>
<body>
  <main>
    <h1>ResearchOS Code Dashboard</h1>
    <p class="sub">Proposal-aligned runtime bridge for Claude Code, Codex, OpenClaw, and Feishu Bot.</p>

    <div class="tabs">
      <button class="tab active" data-panel="cluster">Cluster</button>
      <button class="tab" data-panel="experiments">Agent Doc</button>
      <button class="tab" data-panel="tasks">Runtimes & Tasks</button>
    </div>

    <section id="cluster" class="panel active">
      <div id="cluster-stats" class="stats"></div>
      <div id="cluster-grid" class="grid"></div>
    </section>

    <section id="experiments" class="panel">
      <div id="experiment-stats" class="stats"></div>
      <div class="grid">
        <div>
          <h3>Executor</h3>
          <div id="executor-list" class="list"></div>
        </div>
        <div>
          <h3>Validator</h3>
          <div id="validator-list" class="list"></div>
        </div>
      </div>
    </section>

    <section id="tasks" class="panel">
      <div id="runtime-grid" class="grid" style="margin-bottom:16px;"></div>
      <div class="task-form">
        <h3>Queue A Task</h3>
        <p class="muted">This feeds the same local task store used by the webhook intake routes.</p>
        <form id="task-form">
          <label>Source</label>
          <select id="task-source">
            <option value="manual">manual</option>
            <option value="codex">codex</option>
            <option value="claude-code">claude-code</option>
            <option value="openclaw-feishu">openclaw-feishu</option>
          </select>
          <label>Task</label>
          <textarea id="task-text" rows="4" placeholder="Summarize semantic scheduling baseline gaps"></textarea>
          <button type="submit">Create Task</button>
        </form>
      </div>
      <div id="task-stats" class="stats"></div>
      <div id="task-list" class="list"></div>
    </section>
  </main>

  <script>
    document.querySelectorAll(".tab").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
        document.querySelectorAll(".panel").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        document.getElementById(button.dataset.panel).classList.add("active");
      });
    });

    function renderStat(label, value) {
      return '<div class="stat"><strong>' + value + '</strong><span class="muted">' + label + '</span></div>';
    }

    function fmtDate(value) {
      if (!value) return '-';
      return new Date(value).toLocaleString();
    }

    async function loadCluster() {
      const data = await fetch('/api/cluster').then((res) => res.json());
      const free = data.nodes.filter((node) => node.status === 'free').length;
      const claimed = data.nodes.filter((node) => node.status === 'claimed').length;
      const expired = data.nodes.filter((node) => node.status === 'expired').length;
      document.getElementById('cluster-stats').innerHTML =
        renderStat('free nodes', free) +
        renderStat('claimed nodes', claimed) +
        renderStat('expired claims', expired) +
        renderStat('total nodes', data.nodes.length);
      document.getElementById('cluster-grid').innerHTML = data.nodes.map((node) =>
        '<div class="card">' +
          '<h3>' + node.name + '</h3>' +
          '<div class="muted">' + node.ip + (node.ib_ip ? ' · IB ' + node.ib_ip : '') + '</div>' +
          '<div class="muted">' + node.cpu_model + ' · ' + node.gpu_model + '</div>' +
          '<div class="' + (node.status === 'claimed' ? 'warn' : (node.status === 'expired' ? 'bad' : 'ok')) + '">status: ' + node.status + '</div>' +
          (node.claimedBy ? '<div class="muted">project: ' + node.claimedBy + '</div><div class="muted">expires: ' + fmtDate(node.expires) + '</div>' : '') +
        '</div>'
      ).join('');
    }

    function renderSummaryList(items) {
      if (!items.length) return '<div class="card muted">No summaries found.</div>';
      return items.map((item) =>
        '<div class="summary">' +
          '<strong>' + item.heading + '</strong>' +
          '<div class="meta">' + item.project + ' · ' + fmtDate(item.modified) + '</div>' +
          (item.acItems.length ? '<ul>' + item.acItems.map((ac) =>
            '<li class="' + (ac.done ? 'ok' : 'bad') + '">' + ac.text + '</li>'
          ).join('') + '</ul>' : '') +
          (item.recommendation ? '<div class="meta">Recommendation: ' + item.recommendation + '</div>' : '') +
        '</div>'
      ).join('');
    }

    async function loadExperiments() {
      const data = await fetch('/api/experiments').then((res) => res.json());
      document.getElementById('experiment-stats').innerHTML =
        renderStat('executor summaries', data.executor.length) +
        renderStat('validator summaries', data.validator.length);
      document.getElementById('executor-list').innerHTML = renderSummaryList(data.executor);
      document.getElementById('validator-list').innerHTML = renderSummaryList(data.validator);
    }

    async function loadRuntimes() {
      const data = await fetch('/api/runtimes').then((res) => res.json());
      document.getElementById('runtime-grid').innerHTML = data.profiles.map((profile) =>
        '<div class="card">' +
          '<h3>' + profile.label + '</h3>' +
          '<p class="muted">' + profile.description + '</p>' +
          '<div class="muted" style="margin-top:8px;">writes: ' + profile.files.join(', ') + '</div>' +
        '</div>'
      ).join('');
    }

    async function loadTasks() {
      const tasks = await fetch('/api/tasks').then((res) => res.json());
      const queued = tasks.filter((task) => task.status === 'queued').length;
      document.getElementById('task-stats').innerHTML =
        renderStat('queued', queued) +
        renderStat('total tasks', tasks.length);
      document.getElementById('task-list').innerHTML = tasks.length ? tasks.map((task) =>
        '<div class="summary">' +
          '<strong>' + task.title + '</strong>' +
          '<div class="meta">' + task.source + ' · ' + fmtDate(task.createdAt) + '</div>' +
          '<div style="margin-top:8px;">' + task.text.replace(/[&<>]/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch])) + '</div>' +
        '</div>'
      ).join('') : '<div class="card muted">No tasks yet.</div>';
    }

    document.getElementById('task-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const source = document.getElementById('task-source').value;
      const text = document.getElementById('task-text').value.trim();
      if (!text) return;
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, channel: source, text, title: text.slice(0, 80) })
      });
      document.getElementById('task-text').value = '';
      await loadTasks();
    });

    Promise.all([loadCluster(), loadExperiments(), loadRuntimes(), loadTasks()]);
  </script>
</body>
</html>`;
}

function verifyOpenClawSecret(config, req) {
  if (!config.openclawSharedSecret) return true;
  return req.headers["x-openclaw-secret"] === config.openclawSharedSecret;
}

function verifyFeishuToken(config, payload) {
  if (!config.feishuVerifyToken) return true;
  const token = payload.header?.token || payload.token || "";
  return token === config.feishuVerifyToken;
}

export function buildServer(config = createConfig()) {
  const taskStore = createTaskStore(config);

  return createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-openclaw-secret");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/health") {
        sendJson(res, 200, { ok: true, service: "researchos-code" });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/cluster") {
        sendJson(res, 200, getClusterStatus(config));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/experiments") {
        sendJson(res, 200, findAgentDocs(config));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/tasks") {
        sendJson(res, 200, taskStore.list());
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/runtimes") {
        sendJson(res, 200, listRuntimeProfiles(config));
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/tasks") {
        const payload = await readJsonBody(req);
        const task = taskStore.create(payload);
        sendJson(res, 201, task);
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/openclaw/hooks/message") {
        if (!verifyOpenClawSecret(config, req)) {
          sendJson(res, 401, { ok: false, error: "invalid_openclaw_secret" });
          return;
        }
        const payload = await readJsonBody(req);
        const task = taskStore.create(normalizeOpenClawMessage(payload));
        sendJson(res, 201, { ok: true, task });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/feishu/events") {
        const payload = await readJsonBody(req);
        if (!verifyFeishuToken(config, payload)) {
          sendJson(res, 401, { code: 401, msg: "invalid_feishu_token" });
          return;
        }
        if (payload.type === "url_verification") {
          sendJson(res, 200, { challenge: payload.challenge });
          return;
        }
        const task = taskStore.create(normalizeFeishuEvent(payload));
        sendJson(res, 200, { code: 0, msg: "ok", data: { task_id: task.id } });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/workspaces/bootstrap") {
        const payload = await readJsonBody(req);
        if (!payload.projectRoot) {
          sendJson(res, 400, { ok: false, error: "projectRoot is required" });
          return;
        }
        const result = bootstrapWorkspace({
          runtime: payload.runtime || "all",
          projectRoot: payload.projectRoot,
          overwrite: Boolean(payload.overwrite),
          config,
        });
        sendJson(res, 200, result);
        return;
      }

      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        sendHtml(res, renderDashboard());
        return;
      }

      sendText(res, 404, `Not found: ${escapeHtml(url.pathname)}`);
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = createConfig();
  const server = buildServer(config);
  server.listen(config.port, "0.0.0.0", () => {
    console.log(`ResearchOS Code service listening on http://127.0.0.1:${config.port}`);
  });
}
