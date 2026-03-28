import { readFile } from "node:fs/promises";

import type { TaskInput, TaskPriority } from "../core/types.js";

const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error("Task field 'tags' must be an array of strings when provided.");
  }

  return value;
}

function requireStringField(obj: Record<string, unknown>, field: string): string {
  const value = obj[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Task field '${field}' is required and must be a non-empty string.`);
  }

  return value.trim();
}

function parsePriority(obj: Record<string, unknown>): TaskPriority {
  const value = obj.priority;

  if (typeof value !== "string" || !VALID_PRIORITIES.includes(value as TaskPriority)) {
    throw new Error("Task field 'priority' must be one of: low, medium, high.");
  }

  return value as TaskPriority;
}

export async function loadTaskFromFile(taskPath: string): Promise<TaskInput> {
  const raw = await readFile(taskPath, "utf8");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Task file '${taskPath}' is not valid JSON.`);
  }

  if (!isObject(parsed)) {
    throw new Error("Task file root must be a JSON object.");
  }

  const task: TaskInput = {
    id: requireStringField(parsed, "id"),
    title: requireStringField(parsed, "title"),
    description: requireStringField(parsed, "description"),
    priority: parsePriority(parsed),
    tags: toStringArray(parsed.tags)
  };

  if (typeof parsed.requestedBy === "string" && parsed.requestedBy.trim() !== "") {
    task.requestedBy = parsed.requestedBy.trim();
  }

  return task;
}
