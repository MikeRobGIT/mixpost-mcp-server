# Repository Guidelines

## Project Structure & Module Organization
Core source files live in `src/`. `index.ts` wires up the MCP server, `client.ts` wraps Mixpost HTTP access, `tools.ts` registers MCP tools, and `types.ts` centralizes shared interfaces. Tests mirror runtime code under `tests/` with focused suites in `tests/api`, `tests/core`, `tests/integration`, and `tests/mcp`, plus shared helpers in `tests/utils.ts` and bootstrapping logic in `tests/setup.ts`. Assets beyond code are minimal; add supporting fixtures inside the relevant test subfolder.

## Build, Test, and Development Commands
Use Bun for day-to-day tasks. `bun install` resolves dependencies. `bun run dev` launches the TypeScript entrypoint for local development against live Mixpost credentials. `bun run build` emits `dist/` via `tsc --strict` and should succeed before release. `bun run test` executes the full test suite; append `--watch` or `--coverage` when iterating. Run `bun run lint` for Biome diagnostics and `bun run format` to apply formatting. `bun run typecheck` enforces the no-emit TypeScript pass.

## Coding Style & Naming Conventions
This project targets modern TypeScript with strict compiler options. Prefer descriptive camelCase for variables/functions and PascalCase for types and classes. Keep modules small and route shared helpers through `src/tools.ts` or `src/types.ts` as appropriate. Use Biome for linting and formatting; avoid manual style tweaks and run `bun run lint:fix` or `bun run format:src` before committing. Two-space indentation is standard across the codebase.

## Testing Guidelines
Write tests alongside the module they cover, matching folder names (e.g., `src/tools.ts` -> `tests/core/tools.test.ts`). Stick to Bun's built-in test runner semantics and favor deterministic fixtures. New features must include happy-path and failure coverage, and regression fixes should reference the issue in test descriptions. Run `bun run test:coverage` before merging substantial changes and keep coverage steady or improving.

## Commit & Pull Request Guidelines
Commits are single-purpose, use the imperative mood ("Add tool error mapping"), and stay under 72 characters when possible. Reference issues in bodies when applicable and keep diffs staged with `bun run lint` clean. Pull requests must summarize intent, list test evidence (commands and outputs), and document configuration updates such as new environment variables (`MIXPOST_*`). Include screenshots or terminal snippets when UI or CLI behavior changes. Request review from another maintainer before merging.

## Environment & Security Notes
Local development requires Mixpost credentials: `MIXPOST_BASE_URL`, `MIXPOST_WORKSPACE_UUID`, `MIXPOST_API_KEY`, and optional `MIXPOST_CORE_PATH`. Store them in `.env.local` (ignored) and never commit secrets. When capturing logs for debugging, redact tokens and workspace identifiers prior to sharing.
