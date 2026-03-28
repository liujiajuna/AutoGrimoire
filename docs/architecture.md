# AutoGrimoire Architecture (MVP)

## Goals

The MVP architecture is intentionally thin:
- load local context,
- load a structured task,
- apply deterministic planning rules,
- emit inspectable output.

## Design principles

1. **CLI-first**: one command should run the full flow.
2. **Local-first memory**: repository context comes from local files.
3. **Deterministic pipeline**: same inputs produce same plan shape.
4. **Safety before execution**: risk, warnings, and approvals are explicit.
5. **Easy extension points**: future adapters can plug in without rewriting core flow.

## Runtime flow

```txt
CLI args
  -> Task Loader (JSON validation)
  -> Memory Loader (json/markdown/text)
  -> Rule Engine (basic rules)
  -> Structured Execution Result (JSON)
```

## Module responsibilities

- `src/cli/main.ts`
  - Parses command-line arguments.
  - Handles help, runtime errors, and optional output file writing.

- `src/tasks/taskLoader.ts`
  - Reads task JSON.
  - Validates required fields and normalizes values.

- `src/memory/fileMemory.ts`
  - Loads context files.
  - Tags file kind (`json`, `markdown`, or `text`) for downstream processing.

- `src/rules/basicRules.ts`
  - Contains deterministic MVP rule checks.
  - Produces warnings, risk level, and plan steps.

- `src/core/engine.ts`
  - Orchestrates task + memory through rules.
  - Produces a complete `ExecutionResult`.

- `src/core/types.ts`
  - Defines shared data contracts.

## Extensibility plan

Future integrations should be added as isolated adapters:
- `src/integrations/github/` for issue/PR ingestion.
- Additional rule packs under `src/rules/`.
- Optional memory strategies under `src/memory/`.

Core engine signatures should remain stable so integrations are additive, not invasive.
