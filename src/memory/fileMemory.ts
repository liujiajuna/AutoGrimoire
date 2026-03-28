import { readFile } from "node:fs/promises";
import path from "node:path";

import type { MemoryRecord } from "../core/types.js";

function inferMemoryKind(filePath: string): MemoryRecord["kind"] {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".json") {
    return "json";
  }

  if (extension === ".md" || extension === ".markdown") {
    return "markdown";
  }

  return "text";
}

export async function loadMemoryFiles(paths: string[]): Promise<MemoryRecord[]> {
  const records: MemoryRecord[] = [];

  for (const filePath of paths) {
    const content = await readFile(filePath, "utf8");
    records.push({
      path: filePath,
      kind: inferMemoryKind(filePath),
      content
    });
  }

  return records;
}
