import { join } from "path";

import { ensureDir, readJson, writeJson } from "./json.js";

function nowIso() {
  return new Date().toISOString();
}

function taskId() {
  const random = Math.random().toString(36).slice(2, 8);
  return `task-${Date.now().toString(36)}-${random}`;
}

export function createTaskStore(config) {
  const file = join(config.stateDir, "tasks.json");
  ensureDir(config.stateDir);

  function load() {
    return readJson(file, []);
  }

  function save(tasks) {
    writeJson(file, tasks.slice(0, 200));
  }

  return {
    file,
    list() {
      return load().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    create(input) {
      const task = {
        id: taskId(),
        source: input.source || "manual",
        channel: input.channel || input.source || "manual",
        title: input.title || (input.text || "Research task").slice(0, 80),
        text: input.text || "",
        userId: input.userId || "unknown",
        conversationId: input.conversationId || null,
        status: input.status || "queued",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        metadata: input.metadata || {},
      };

      const tasks = load();
      tasks.unshift(task);
      save(tasks);
      return task;
    },
  };
}
