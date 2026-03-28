# AGENTS.md

## Project purpose
AutoGrimoire is a rule-bound repository agent prototype focused on repository memory, task intake, and safe execution planning.

## Working rules
- Prefer small, coherent, reviewable changes.
- Avoid unnecessary dependencies.
- Prefer TypeScript + Node.js with simple architecture.
- Keep the CLI working at all times.
- Update README.md and docs/architecture.md when project structure changes.
- Prefer local-file memory storage for v1.
- Do not introduce databases, cloud services, or complex frameworks unless clearly required.
- Run build/typecheck after significant code changes if available.
- Keep names explicit and professional.
- Favor extensibility, but do not overengineer.
