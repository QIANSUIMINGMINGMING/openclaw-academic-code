#!/usr/bin/env node
import { createConfig } from "./lib/config.js";
import { bootstrapWorkspace } from "./lib/runtime-support.js";

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        index += 1;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0];

if (command !== "bootstrap") {
  console.error("Usage: node src/cli.js bootstrap --runtime all --project-root /path/to/workspace");
  process.exit(1);
}

if (!args["project-root"]) {
  console.error("--project-root is required");
  process.exit(1);
}

const config = createConfig();
const result = bootstrapWorkspace({
  runtime: args.runtime || "all",
  projectRoot: args["project-root"],
  overwrite: Boolean(args.force),
  config,
});

console.log(JSON.stringify(result, null, 2));
