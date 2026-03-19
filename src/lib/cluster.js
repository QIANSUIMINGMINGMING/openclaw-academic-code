import { readJson } from "./json.js";

function parseUsedPercent(text) {
  if (!text) return null;
  const match = String(text).match(/\((\d+)% used\)/);
  return match ? parseInt(match[1], 10) : null;
}

function machineKind(machine) {
  if (machine.tags?.includes("lighthouse")) return "infra";
  if (machine.tags?.includes("workstation")) return "workstation";
  if (machine.tags?.includes("tempcloud")) return "tempcloud";
  if (machine.tags?.includes("gpu")) return "gpu";
  return "node";
}

export function getClusterStatus(config) {
  const ledger = readJson(config.clusterLedger, { reservations: {} });
  const machines = readJson(config.machinesFile, { machines: [] });
  const reservations = {};
  const now = new Date();

  for (const [project, reservation] of Object.entries(ledger.reservations || {})) {
    const expires = new Date(reservation.expires);
    reservations[project] = {
      ...reservation,
      expired: expires < now,
      remaining: expires < now ? "expired" : `${Math.round((expires - now) / 60000)}m`,
    };
  }

  const nodes = (machines.machines || []).map((machine) => {
    let claimedBy = null;
    let description = null;
    let expires = null;
    let expired = false;

    for (const [project, reservation] of Object.entries(reservations)) {
      if (reservation.nodes?.includes(machine.name)) {
        claimedBy = project;
        description = reservation.description || "";
        expires = reservation.expires || null;
        expired = reservation.expired;
        break;
      }
    }

    return {
      name: machine.name,
      ip: machine.ip,
      ib_ip: machine.ib_ip || null,
      tags: machine.tags || [],
      kind: machineKind(machine),
      gpu_model: machine.specs?.gpu_model || machine.specs?.gpu || "No GPU",
      ram: machine.specs?.ram || "?",
      cpu_model: machine.specs?.cpu || "?",
      cpu_cores: machine.specs?.physical_cores || machine.specs?.cores || "?",
      threads: machine.specs?.threads || "?",
      storage: machine.specs?.storage || "?",
      storage_used_pct: parseUsedPercent(machine.specs?.storage),
      purpose: machine.purpose || "",
      notes: machine.notes || "",
      status: claimedBy ? (expired ? "expired" : "claimed") : "free",
      claimedBy,
      description,
      expires,
    };
  });

  return { nodes, reservations };
}
