# AGENTS.md

## Purpose
AutoGrimoire is a practical, rule-bound repository agent focused on repository memory, task intake, and safe execution planning.

## Agent working agreement

- Prefer **small, coherent, reviewable changes** over broad refactors.
- Keep behavior deterministic and outputs inspectable.
- Use explicit, professional naming.
- Add code comments only when they clarify non-obvious intent; avoid noisy commentary.
- Validate your changes before finishing (build/typecheck/tests when available).
- Keep the CLI working at all times.

## Dependency policy

- Avoid unnecessary dependencies.
- Prefer built-in Node.js capabilities first.
- Introduce a new package only with clear, immediate MVP value.

## Architecture policy

- Prefer TypeScript + Node.js with a simple CLI-first architecture.
- Favor extensibility, but do not overengineer.
- Use local files (JSON/Markdown) for memory in v1.
- Do not add databases, external cloud services, or complex frameworks unless explicitly required.

## Documentation policy

- Update `README.md` and `docs/architecture.md` when structure or workflow changes.
- Keep docs aligned with actual CLI behavior and file layout.
