# CloudNote OCR

CloudNote OCR is a web app for turning class notes, whiteboard photos, and document screenshots into structured study material.

It uses SiliconFlow server-side APIs to:
- run OCR with `deepseek-ai/DeepSeek-OCR`
- transform OCR drafts into study-friendly Markdown
- generate mindmap-friendly output for quick review

The current version focuses on a lightweight cloud-style workspace with:
- subjects
- notebooks
- chapters
- Markdown preview
- mindmap preview
- mobile-first preview UX

## Features

- Upload note images or documents and process them through SiliconFlow
- Organize content by `Subject -> Notebook -> Chapter`
- Store OCR drafts and transformed notes in local JSON for the MVP
- Preview notes in two modes:
  - Markdown
  - Mindmap
- Use a mobile dialog to switch notebooks while keeping preview front and center
- Use a desktop sidebar to browse notebooks and preview content side by side

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- SiliconFlow chat completion APIs

## Requirements

- Node.js 20+ recommended
- npm
- A valid SiliconFlow API key

## Environment Variables

Create `/.env.local` with:

```env
SILICONFLOW_API_KEY=your_key_here
SILICONFLOW_OCR_MODEL=deepseek-ai/DeepSeek-OCR
SILICONFLOW_TEXT_MODEL=Pro/deepseek-ai/DeepSeek-V3.2
```

Notes:
- Do not commit `.env.local`
- SiliconFlow requests are server-side only
- If you get `401 Invalid Token`, rotate the key and restart the app

## Install

```bash
npm install
```

## Run Locally

Standard local dev:

```bash
npm run dev
```

LAN/dev on other devices in your network:

```bash
npm run dev:lan
```

Then open:

```text
http://localhost:3000
```

Or from another machine on the same network:

```text
http://<your-local-ip>:3000
```

## Production Build

Build:

```bash
npm run build
```

Run production server:

```bash
npm run start
```

Run production server over LAN:

```bash
npm run start:lan
```

## Lint

```bash
npm run lint
```

## Testing

There is no test runner configured yet.

If tests are added later, the recommended setup is Vitest. Example commands:

```bash
npx vitest run src/lib/store.test.ts
npx vitest run src/lib/store.test.ts -t "creates chapter"
```

## Project Structure

```text
src/
  app/
    api/
      bootstrap/
      chapters/[chapterId]/
      library/
      process/
    layout.tsx
    page.tsx
  components/
    dashboard.tsx
  lib/
    siliconflow.ts
    store.ts
    types.ts
data/
  notebooks.json
```

## API Overview

- `GET /api/bootstrap`
  - returns current workspace data
- `POST /api/library`
  - creates subjects, notebooks, or chapters
- `PATCH /api/chapters/[chapterId]`
  - updates saved chapter note content
- `POST /api/process`
  - runs OCR and note transformation for the selected chapter

## Storage Model

This MVP stores app data in `data/notebooks.json`.

That includes:
- subjects
- notebooks
- chapters
- OCR drafts
- generated Markdown
- generated mindmap data

This is convenient for local development, but a future production version should move to:
- a database for metadata
- object storage for uploads

## UI Model

### Mobile

- Preview-first layout
- Notebook switching in a dialog
- Add flow available in the same dialog

### Desktop

- Notebook picker in the left sidebar
- Preview area on the right
- Two preview buttons to switch modes

## Common Issues

### SiliconFlow 401

If OCR fails with a 401 error:
- verify `SILICONFLOW_API_KEY`
- rotate the key if it was exposed
- restart the Next.js server after updating `.env.local`

### LAN access not working

- make sure you use `npm run dev:lan` or `npm run start:lan`
- confirm both devices are on the same network
- allow Node.js or port `3000` through Windows Firewall if needed

## Git Workflow

This repo uses a branch-first workflow for features and fixes.

- create a non-default branch for new work
- use conventional commits
- verify with lint/build before merge

Example:

```bash
git checkout -b feat/add-export-flow
git commit -m "feat: add export flow"
```

## Agent Guidance

Agent-specific repository instructions live in `AGENTS.md`.

If you are using an agentic coding tool, read `AGENTS.md` first.
