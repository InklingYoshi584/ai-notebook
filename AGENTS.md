# AGENTS.md

Repository guidance for coding agents working in `D:\workspace\ai-notebook`.

## 1) Project Overview

- Stack: Next.js App Router (v16), React 19, TypeScript, Tailwind CSS v4.
- Runtime: Node.js (npm scripts).
- Code roots:
  - UI: `src/components`, `src/app/page.tsx`
  - API routes: `src/app/api/**/route.ts`
  - Domain/data layer: `src/lib/*`
- Path alias: `@/*` maps to `src/*`.

## 2) Source-of-Truth Rules

- Cursor rules: none found (`.cursor/rules/` missing, `.cursorrules` missing).
- Copilot rules: none found (`.github/copilot-instructions.md` missing).
- Therefore, this file is the active agent instruction set for repo-local conventions.

## 3) Install / Run Commands

- Install dependencies:
  - `npm install`
- Local dev:
  - `npm run dev`
- Local dev over LAN:
  - `npm run dev:lan`
- Production build:
  - `npm run build`
- Production start:
  - `npm run start`
- Production start over LAN:
  - `npm run start:lan`
- Lint:
  - `npm run lint`

## 4) Test Commands (Current State + Single-Test Guidance)

- Current state: no `test` script is configured in `package.json`.
- There is no test framework currently wired (no Jest/Vitest config detected).
- If asked to run tests now, report clearly:
  - "No test runner configured yet."

### If you add tests (recommended pattern)

- Prefer Vitest for unit tests in this repository.
- Suggested scripts to add:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
  - `"test:one": "vitest run"` (pass file path as extra args)

### Running a single test file (after test setup)

- Vitest:
  - `npx vitest run src/lib/store.test.ts`
- Vitest single test by name:
  - `npx vitest run src/lib/store.test.ts -t "creates chapter"`
- Jest equivalent (if Jest is chosen instead):
  - `npx jest src/lib/store.test.ts`
  - `npx jest src/lib/store.test.ts -t "creates chapter"`

## 5) Environment and Secrets

- Use `.env.local` for local secrets.
- Never hardcode API keys in source.
- Never commit secrets; keep `.env*` ignored.
- Important server env vars currently used:
  - `SILICONFLOW_API_KEY`
  - `SILICONFLOW_OCR_MODEL`
  - `SILICONFLOW_TEXT_MODEL`

## 6) TypeScript and API Design Conventions

- TypeScript is strict (`strict: true`). Keep types explicit at boundaries.
- Use `type` aliases for payloads and DTO-like shapes.
- Validate request body fields in API routes before processing.
- API route pattern in this repo:
  - Parse JSON body once.
  - Guard required fields.
  - Wrap logic in `try/catch`.
  - Return `NextResponse.json({ error }, { status })` on failures.
- Error messages should be user-readable where possible.

## 7) Import Conventions

- Use absolute alias imports for internal modules:
  - `import { foo } from "@/lib/foo"`
- Keep external imports first, then internal imports.
- Keep type imports explicit when useful:
  - `import type { Subject } from "@/lib/types"`
- Avoid unused imports; lint must pass clean.

## 8) Naming Conventions

- React components: PascalCase (`Dashboard`, `ChapterPreview`).
- Functions/variables: camelCase (`createItem`, `selectedNotebookId`).
- Types: PascalCase (`AppData`, `TemplatePresetId`).
- Route directories: lowercase by feature (`api/library`, `api/process`).
- File names:
  - Components: lowercase kebab or simple (`dashboard.tsx`) as currently used.
  - Lib modules: lowercase (`store.ts`, `siliconflow.ts`).

## 9) Formatting and Style

- Follow existing ESLint/Next config; do not fight formatter output.
- Use semicolons and double quotes (repo convention).
- Keep functions focused and composable.
- Prefer early returns over deep nesting.
- Prefer immutable updates in React state (`setState(prev => ...)`).

## 10) React/Next UI Guidelines

- App Router conventions:
  - Server component pages by default (`src/app/page.tsx`).
  - Add `"use client"` only where client state/hooks are needed.
- Keep mobile-first responsiveness intact:
  - Avoid horizontal overflow.
  - Use `min-w-0`, `max-w-full`, and constrained containers where needed.
- Keep preview interactions lightweight on mobile (dialogs/tabs).
- Reuse utility classes already established in `globals.css`:
  - `.field`, `.action-button`, `.danger-button`.

## 11) Data Layer and Persistence Rules

- Current persistence is file-based JSON in `data/notebooks.json`.
- Use `readStore`/`writeStore` helpers instead of ad hoc file access.
- Use existing store operations for CRUD behavior:
  - `createSubject`, `createNotebook`, `createChapter`
  - `renameLibraryItem`, `deleteLibraryItem`
  - `updateChapterNote`, `findStructureByIds`
- Keep timestamps updated when mutating records.

## 12) AI Integration Rules

- SiliconFlow requests are server-side only (`src/lib/siliconflow.ts`).
- Never expose API keys to client components.
- Keep OCR and transform calls separated as currently designed.
- Preserve helpful error handling for auth failures (401 invalid token guidance).

## 13) Change Workflow for Agents

- Before edits:
  - Read relevant files fully.
  - Follow existing patterns in nearby code.
- After edits, always run:
  - `npm run lint`
  - `npm run build`
- If you add tests, run the narrowest possible test scope first.
- Do not introduce unrelated refactors when solving focused tasks.

## 14) Git Hygiene for Agent Edits

- GitHub username for this repository owner is `InklingYoshi584`.
- Keep diffs minimal and task-scoped.
- For new features or bug fixes, always create or switch to a non-default working branch before making changes.
- Use conventional commit style when creating commits (for example: `feat: add notebook picker`, `fix: constrain mobile preview width`).
- Commit periodically during larger tasks so work is checkpointed in logical chunks.
- After a feature or fix is complete, merge the working branch back only after verification is done.
- Do not rewrite history unless explicitly requested.
- Do not add dependencies unless necessary; justify in PR/summary.

## 15) What to Document in Final Response

- List changed files with purpose.
- Report lint/build/test status.
- Note any follow-up actions required (env vars, migrations, test setup).

---

If future Cursor/Copilot rule files are added, merge their requirements into this file and treat stricter rules as higher priority.
