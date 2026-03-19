import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { createConfig } from "../lib/config.js";
import { bootstrapWorkspace } from "../lib/runtime-support.js";

test("bootstrapWorkspace writes runtime files for all supported clients", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "researchos-code-"));
  const config = createConfig(projectRoot, {
    PORT: "8600",
    RESEARCHOS_PUBLIC_BASE_URL: "http://127.0.0.1:8600",
  });

  const result = bootstrapWorkspace({
    runtime: "all",
    projectRoot,
    overwrite: false,
    config,
  });

  assert.equal(result.files.filter((file) => file.written).length, 5);
  assert.match(readFileSync(join(projectRoot, "CLAUDE.md"), "utf-8"), /Claude Code/);
  assert.match(readFileSync(join(projectRoot, "AGENTS.md"), "utf-8"), /Codex/);
  assert.match(
    readFileSync(join(projectRoot, ".researchos", "openclaw-extension.json"), "utf-8"),
    /openclaw/i,
  );
});
