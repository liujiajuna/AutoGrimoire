# AutoGrimoire

AutoGrimoire is a practical, rule-bound repository agent prototype.

It is designed as an **automatic scribe for engineering projects**: it reads project context, accepts structured tasks, applies transparent safety and planning rules, and produces an inspectable execution plan.

## Why this exists

Many automation demos are either:
- too magical to trust,
- too heavyweight to adopt, or
- too vague to maintain.

AutoGrimoire starts from the opposite direction:
- local-first,
- explicit inputs and outputs,
- small safe steps,
- architecture one engineer can understand in one pass.

## MVP scope

This first version intentionally focuses on four core capabilities:

1. **Repository memory/context loading**
   - Load context from local JSON and Markdown files.
2. **Task intake**
   - Accept a task description from a local JSON file.
3. **Rule-based execution flow**
   - Apply a deterministic rule pipeline to produce a plan.
4. **Safe, inspectable output**
   - Emit structured JSON showing decisions, warnings, and proposed actions.

## Non-goals (for v1)

- No direct GitHub API integration yet.
- No database or cloud services.
- No autonomous code mutation loop.
- No hidden/opaque reasoning engine.

## Project structure

```txt
.
├── src/
│   ├── cli/             # CLI entrypoint and argument parsing
│   ├── core/            # Engine orchestration and shared types
│   ├── memory/          # Local-file memory/context loading
│   ├── tasks/           # Task input loading/validation
│   ├── rules/           # Deterministic planning/safety rules
│   └── index.ts         # Library exports
├── docs/
│   └── architecture.md  # High-level system design
├── examples/
│   └── sample-task.json # Example task payload
├── AGENTS.md            # Repository rules for agent contributors
└── README.md
```

## Quick start

### 1) Install dependencies

```bash
npm install
```

### 2) Build

```bash
npm run build
```

### 3) Run with the included sample task

```bash
npm run start -- --task examples/sample-task.json
```

### 4) Optionally provide additional memory files

```bash
npm run start -- \
  --task examples/sample-task.json \
  --memory docs/architecture.md \
  --memory README.md
```

The CLI prints a JSON execution plan including:
- normalized task data,
- risk level,
- warnings,
- step-by-step action plan,
- approval requirement.

## CLI usage

```bash
autogrimoire --task <path-to-task.json> [--memory <path>]... [--output <path>]
```

Options:
- `--task` (required): JSON task file.
- `--memory` (optional, repeatable): context files (`.json`, `.md`, or plain text).
- `--output` (optional): write execution result JSON to file instead of stdout-only.

## Example task format

```json
{
  "id": "TASK-001",
  "title": "Add validation to task intake",
  "description": "Ensure task input is rejected when mandatory fields are missing.",
  "requestedBy": "maintainer",
  "priority": "high",
  "tags": ["validation", "safety"]
}
```

## Roadmap

### Near-term
- Add richer rule packs (scope checks, dependency policy checks).
- Add markdown execution report output.
- Add task history snapshots in local files.

### Medium-term
- GitHub issue/PR ingestion adapter.
- Safe patch proposal mode (plan + patch preview).
- Configurable policy profiles per repository.

### Long-term
- Multi-step workflows with explicit checkpoints.
- Pluggable memory backends (while keeping local-first default).

## Contributing

Start small and keep changes reviewable. Read `AGENTS.md` before making changes.
