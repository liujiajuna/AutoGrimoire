#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

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
  autogrimoire --task <path-to-task.json> [--memory <path>]... [--output <path>]

Options:
  --task    JSON task file (required)
  --memory  Memory/context file (.json, .md, .markdown, or text). Repeatable.
            Duplicate memory paths are ignored.
  --output  Write execution result JSON to file and stdout
  --help    Show this help message
`);
}

function readOptionValue(argv: string[], index: number, optionName: string): string {
  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for '${optionName}'. Use --help for usage.`);
  }

  return value;
}

function addUniqueValue(values: string[], value: string): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}

export function parseArgs(argv: string[]): CliArgs {
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
      args.taskPath = readOptionValue(argv, index, "--task");
      index += 1;
      continue;
    }

    if (token === "--memory") {
      addUniqueValue(args.memoryPaths, readOptionValue(argv, index, "--memory"));
      index += 1;
      continue;
    }

    if (token === "--output") {
      args.outputPath = readOptionValue(argv, index, "--output");
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

async function writeOutputFile(outputPath: string, jsonOutput: string): Promise<void> {
  try {
    await writeFile(outputPath, `${jsonOutput}\n`, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to write output file '${outputPath}': ${message}`);
  }
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

  if (parsed.outputPath) {
    await writeOutputFile(parsed.outputPath, jsonOutput);
  }

  console.log(jsonOutput);
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;

if (import.meta.url === entryPoint) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`AutoGrimoire CLI error: ${message}`);
    process.exit(1);
  });
}
