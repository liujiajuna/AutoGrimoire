import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = resolve(repoRoot, "dist/cli/main.js");
const sampleTaskPath = resolve(repoRoot, "examples/sample-task.json");

const { loadMemoryFiles } = await import(
  pathToFileURL(resolve(repoRoot, "dist/memory/fileMemory.js")).href
);
const { applyBasicRules } = await import(
  pathToFileURL(resolve(repoRoot, "dist/rules/basicRules.js")).href
);
const { loadTaskFromFile } = await import(
  pathToFileURL(resolve(repoRoot, "dist/tasks/taskLoader.js")).href
);

async function createTempDir() {
  return mkdtemp(join(tmpdir(), "autogrimoire-"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, JSON.stringify(value), "utf8");
}

function makeTask(overrides = {}) {
  return {
    id: "TASK-TEST",
    title: "Improve deterministic planning",
    description: "Improve the local planning flow while keeping changes small and reviewable.",
    priority: "low",
    tags: ["planning"],
    ...overrides
  };
}

function makeMemory() {
  return [
    {
      path: "README.md",
      kind: "markdown",
      content: "Keep changes small and reviewable."
    }
  ];
}

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8"
  });
}

test("task loader normalizes a valid task payload", async () => {
  const dir = await createTempDir();
  const taskPath = join(dir, "task.json");

  await writeJson(taskPath, {
    id: " TASK-001 ",
    title: " Add safeguards ",
    description: " Validate task intake and keep errors clear. ",
    requestedBy: " maintainer ",
    priority: " HIGH ",
    tags: [" safety ", "cli", "safety"]
  });

  const task = await loadTaskFromFile(taskPath);

  assert.deepEqual(task, {
    id: "TASK-001",
    title: "Add safeguards",
    description: "Validate task intake and keep errors clear.",
    requestedBy: "maintainer",
    priority: "high",
    tags: ["safety", "cli"]
  });
});

test("task loader rejects malformed task payloads with clear errors", async () => {
  const dir = await createTempDir();
  const cases = [
    {
      name: "invalid-json",
      content: "{",
      error: /not valid JSON/
    },
    {
      name: "root-array",
      content: "[]",
      error: /root must be a JSON object/
    },
    {
      name: "missing-title",
      value: makeTask({ title: undefined }),
      error: /field 'title' is required/
    },
    {
      name: "empty-description",
      value: makeTask({ description: "   " }),
      error: /field 'description' is required/
    },
    {
      name: "invalid-priority",
      value: makeTask({ priority: "urgent" }),
      error: /priority/
    },
    {
      name: "invalid-tags",
      value: makeTask({ tags: ["safe", 42] }),
      error: /tags/
    },
    {
      name: "empty-tag",
      value: makeTask({ tags: ["safe", "   "] }),
      error: /non-empty strings/
    }
  ];

  for (const testCase of cases) {
    const taskPath = join(dir, `${testCase.name}.json`);
    if ("content" in testCase) {
      await writeFile(taskPath, testCase.content, "utf8");
    } else {
      await writeJson(taskPath, testCase.value);
    }

    await assert.rejects(loadTaskFromFile(taskPath), testCase.error);
  }
});

test("memory loader reads files and infers memory kinds", async () => {
  const dir = await createTempDir();
  const jsonPath = join(dir, "context.json");
  const markdownPath = join(dir, "notes.md");
  const longMarkdownPath = join(dir, "guide.markdown");
  const textPath = join(dir, "plain.txt");

  await writeFile(jsonPath, "{\"name\":\"AutoGrimoire\"}", "utf8");
  await writeFile(markdownPath, "# Notes", "utf8");
  await writeFile(longMarkdownPath, "# Guide", "utf8");
  await writeFile(textPath, "Plain text", "utf8");

  const records = await loadMemoryFiles([jsonPath, markdownPath, longMarkdownPath, textPath]);

  assert.deepEqual(
    records.map((record) => record.kind),
    ["json", "markdown", "markdown", "text"]
  );
  assert.deepEqual(
    records.map((record) => record.content),
    ["{\"name\":\"AutoGrimoire\"}", "# Notes", "# Guide", "Plain text"]
  );
});

test("basic rules produce low risk when inputs are complete and scoped", () => {
  const { plan, decisions } = applyBasicRules(makeTask(), makeMemory());

  assert.equal(plan.riskLevel, "low");
  assert.equal(plan.requiresHumanApproval, false);
  assert.deepEqual(plan.warnings, []);
  assert.equal(decisions.every((decision) => decision.passed), true);
});

test("basic rules warn for missing context and short descriptions", () => {
  const { plan } = applyBasicRules(
    makeTask({
      description: "Too short."
    }),
    []
  );

  assert.equal(plan.riskLevel, "medium");
  assert.equal(plan.warnings.length, 2);
  assert.match(plan.warnings.join("\n"), /Task description is short/);
  assert.match(plan.warnings.join("\n"), /No memory provided/);
});

test("basic rules require approval for high priority tasks", () => {
  const { plan } = applyBasicRules(makeTask({ priority: "high" }), makeMemory());

  assert.equal(plan.riskLevel, "high");
  assert.equal(plan.requiresHumanApproval, true);
  assert.match(plan.warnings.join("\n"), /High priority task/);
});

test("basic rules require approval for high-risk keywords", () => {
  const { plan } = applyBasicRules(
    makeTask({
      description: "Add dependency support for local report generation without changing execution."
    }),
    makeMemory()
  );

  assert.equal(plan.riskLevel, "medium");
  assert.equal(plan.requiresHumanApproval, true);
  assert.match(plan.warnings.join("\n"), /dependency or package changes/);
});

test("CLI prints help", () => {
  const result = runCli(["--help"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /autogrimoire --task <path-to-task\.json>/);
  assert.equal(result.stderr, "");
});

test("CLI rejects missing required task arguments", () => {
  const result = runCli([]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing required argument '--task'/);
});

test("CLI rejects missing option values", () => {
  const result = runCli(["--task"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing value for '--task'/);
});

test("CLI runs the sample task and prints JSON", () => {
  const result = runCli(["--task", sampleTaskPath, "--memory", resolve(repoRoot, "README.md")]);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");

  const output = JSON.parse(result.stdout);
  assert.equal(output.task.id, "TASK-001");
  assert.equal(output.memory.filesLoaded, 1);
  assert.equal(output.plan.riskLevel, "high");
  assert.equal(output.plan.requiresHumanApproval, true);
});

test("CLI ignores duplicate memory paths", () => {
  const readmePath = resolve(repoRoot, "README.md");
  const result = runCli([
    "--task",
    sampleTaskPath,
    "--memory",
    readmePath,
    "--memory",
    readmePath
  ]);

  assert.equal(result.status, 0);

  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.memory.filePaths, [readmePath]);
  assert.equal(output.memory.filesLoaded, 1);
});

test("CLI writes output JSON when --output is provided", async () => {
  const dir = await createTempDir();
  const outputPath = join(dir, "result.json");

  const result = runCli(["--task", sampleTaskPath, "--output", outputPath]);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");

  const stdoutJson = JSON.parse(result.stdout);
  const fileJson = JSON.parse(await readFile(outputPath, "utf8"));

  assert.deepEqual(fileJson, stdoutJson);
});
