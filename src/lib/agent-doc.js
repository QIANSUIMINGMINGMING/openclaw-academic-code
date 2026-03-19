import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, basename } from "path";

function parseSummary(fullPath) {
  const stat = statSync(fullPath);
  const content = readFileSync(fullPath, "utf-8");
  const heading = content.match(/^#\s+(.+)/m)?.[1] || basename(fullPath);
  const acItems = [...content.matchAll(/- \[([ x])\] (AC-\d+:.+)/g)].map((match) => ({
    done: match[1] === "x",
    text: match[2],
  }));
  const recommendation = content.match(/## Recommendation\s*\n(.+)/)?.[1] || null;

  return {
    file: basename(fullPath),
    heading,
    acItems,
    recommendation,
    modified: stat.mtime.toISOString(),
    path: fullPath,
  };
}

export function findAgentDocs(config) {
  const results = {
    executor: [],
    validator: [],
  };

  for (const root of config.agentDocRoots) {
    for (const kind of ["executor", "validator"]) {
      const dir = join(root, ".agent-doc", "outbox", "summaries", kind);
      if (!existsSync(dir)) continue;

      for (const name of readdirSync(dir)) {
        if (!name.endsWith(".md")) continue;
        const fullPath = join(dir, name);
        const parsed = parseSummary(fullPath);
        results[kind].push({
          ...parsed,
          project: basename(root),
        });
      }
    }
  }

  results.executor.sort((a, b) => b.modified.localeCompare(a.modified));
  results.validator.sort((a, b) => b.modified.localeCompare(a.modified));

  return results;
}
