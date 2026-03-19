import { homedir } from "os";
import { join, resolve } from "path";

function splitPathList(value, fallback) {
  if (!value) return fallback;
  return value
    .split(":")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => resolve(item));
}

export function createConfig(cwd = process.cwd(), env = process.env) {
  const home = homedir();
  const resolvedCwd = resolve(cwd);
  const port = parseInt(env.PORT || "8600", 10);

  return {
    cwd: resolvedCwd,
    home,
    port: Number.isFinite(port) ? port : 8600,
    stateDir: resolve(resolvedCwd, env.RESEARCHOS_STATE_DIR || ".researchos"),
    agentDocRoots: splitPathList(env.RESEARCHOS_AGENT_DOC_ROOTS, [resolvedCwd]),
    clusterLedger:
      env.RESEARCHOS_CLUSTER_LEDGER || join(home, ".claude/data/cluster-reservations.json"),
    machinesFile: env.RESEARCHOS_MACHINES_FILE || join(home, ".claude/data/machines.json"),
    publicBaseUrl: env.RESEARCHOS_PUBLIC_BASE_URL || "",
    openclawSharedSecret: env.OPENCLAW_SHARED_SECRET || "",
    feishuVerifyToken: env.FEISHU_VERIFY_TOKEN || "",
  };
}
