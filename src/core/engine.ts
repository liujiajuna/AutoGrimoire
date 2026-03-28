import type { ExecutionResult, MemoryRecord, TaskInput } from "./types.js";
import { applyBasicRules } from "../rules/basicRules.js";

export function runEngine(task: TaskInput, memory: MemoryRecord[]): ExecutionResult {
  const { decisions, plan } = applyBasicRules(task, memory);

  return {
    task,
    memory: {
      filesLoaded: memory.length,
      filePaths: memory.map((record) => record.path)
    },
    decisions,
    plan,
    generatedAt: new Date().toISOString()
  };
}
