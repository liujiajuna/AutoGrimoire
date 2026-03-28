#!/usr/bin/env node
import { writeFile } from "node:fs/promises";

import { runEngine } from "../core/engine.js";
import { loadMemoryFiles } from "../memory/fileMemory.js";
import { loadTaskFromFile } from "../tasks/taskLoader.js";

interface CliArgs {
  taskPath?: string;
  memoryPaths: string[];
  outputPath?: string;
}

function printHelp(): void {
  console.log(`AutoGrimoire CLI

Usage:
  autogrimoire --task <path> [--memory <path>]... [--output <path>]

Options:
  --task    Path to task JSON file (required)
  --memory  Path to memory/context file (.json, .md, .txt). Repeatable.
  --output  Optional output file path for execution result JSON
  --help    Show this help message
`);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    memoryPaths: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }

    if (token === "--task") {
      args.taskPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--memory") {
      const next = argv[index + 1];
      if (next) {
        args.memoryPaths.push(next);
      }
      index += 1;
      continue;
    }

    if (token === "--output") {
      args.outputPath = argv[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

export async function main(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv);

  if (!parsed.taskPath) {
    throw new Error("Missing required argument '--task'. Use --help for usage.");
  }

  const task = await loadTaskFromFile(parsed.taskPath);
  const memoryRecords = await loadMemoryFiles(parsed.memoryPaths);
  const result = runEngine(task, memoryRecords);

  const jsonOutput = JSON.stringify(result, null, 2);
  console.log(jsonOutput);

  if (parsed.outputPath) {
    await writeFile(parsed.outputPath, `${jsonOutput}\n`, "utf8");
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`AutoGrimoire CLI error: ${message}`);
  process.exit(1);
});
