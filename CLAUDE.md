# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A more detailed developer context — including SOPs for adding a new structure, hard-won lessons (B-Tree rendering, Fibonacci Heap anchoring), and the full Undo/Redo state-restoration playbook — lives in `GEMINI.md` at the repo root. Read that file before non-trivial work on any data structure.

## Commands

All commands run from `app/` (the Vite project root):

```bash
npm install --legacy-peer-deps   # required: peer-dep conflicts otherwise
npm run dev                      # vite dev server
npm run build                    # tsc -b && vite build (also runs in pre-commit)
npm run lint                     # eslint .
```

There is **no test suite**. Verification is manual via the dev server.

A Husky `pre-commit` hook runs `npm run build` from `app/` and blocks the commit on TypeScript errors — fix type errors rather than bypassing the hook. Pushes to `main` auto-deploy via `.github/workflows/deploy.yml`.

## Architecture: Brain vs. View

The codebase is a single React 19 + Vite + Tailwind v4 SPA under `app/`. Each data structure follows a strict separation:

- **Brain** — `app/src/structures/<name>/`: pure TypeScript classes. Every mutating method (insert, delete, rotate, etc.) returns a `VisualizationStep[]`. Each step carries a deep-cloned snapshot of the entire structure so the UI can scrub time without re-running logic.
- **View** — `app/src/components/<name>/` + `app/src/pages/<Name>Page.tsx`: renders snapshots via Framer Motion (`layout` / `layoutId`) inside a `react-zoom-pan-pinch` canvas. Pages own an async playback engine (play/pause/step/scrub) over the step array.

Shared playground UI lives in `app/src/components/playground/` (`ControlIsland`, `PlaybackControls`, etc.). Pages compose three "islands" in the bottom bar: Operations, Timeline, Info.

### Snapshot contract — non-obvious

Snapshots are not just for animation playback; they are also the **source of truth for Undo/Redo and history-log clicks**. Each history entry must include a `finalSnapshot` and the page must restore the Brain's internal state (`tree.root = snapshot.clone()`, `heap.heap = [...snapshot]`, or `heap.fromSnapshot(...)` for Fibonacci Heap's circular lists) on undo/redo/jump — not just the visual state. Skipping this restoration is the single most common bug in this repo; see the "Critical Fix: State Restoration" section of `GEMINI.md` for the full pattern and the per-structure restoration recipe.

### Snapshot-timing rule

Never call `addStep` while a node is temporarily detached from the tree (e.g., mid-split, before the parent links the new child). Complete the structural mutation first, then snapshot. For swaps: mutate both nodes, then `addStep`.

## Conventions

- **i18n is mandatory.** All user-facing strings go through `useTranslation` (`react-i18next`). Locale files: `app/src/locales/{en,zh-TW}/<name>.json`, registered in `app/src/i18n.ts`. When adding a new structure you must also add its name + description to `locales/{en,zh-TW}/common.json` under `home.structures` — the home page card pulls from there.
- **Routing:** lazy route in `App.tsx`, card metadata in `app/src/data/structures.ts`.
- **Styling:** Tailwind v4 utilities only. Icons from `lucide-react`. Standard color semantics: blue=default, amber=highlight, red=delete/error, green=success/min.
- **React 19 caveat:** avoid layout libraries that rely on `findDOMNode`. Use Flexbox/Grid or explicit `left`/`top` Framer animations.
- **Multi-way trees (B-Tree, B+ Tree):** use `key={node.id}` (not `layoutId`) and explicit `left/top` props — combining `layoutId` with explicit positioning makes Framer auto-manage opacity and silently render nodes invisible. Render children/lines before parents in JSX and use `zIndex: 100 - depth` so parents stack above their connectors.
