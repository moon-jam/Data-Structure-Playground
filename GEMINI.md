# Developer Context: Data-Structure-Playground

## Project Overview
A highly interactive data structure learning platform. The current focus is on Tree-based structures, specifically the **AVL Tree**.

## Architecture (Brain vs. View)

### 1. Logic Layer (`Brain`)
- **Location**: `app/src/structures/`
- **Pattern**: Pure TypeScript classes (e.g., `AVLTree.ts`).
- **State Tracking**: Every modification method (insert, delete, rotate) returns a `VisualizationStep[]`.
- **Snapshots**: Each `VisualizationStep` contains a `rootSnapshot` (deep clone of the tree) to allow the UI to scrub through time without re-calculating logic.

### 2. Visualization Layer (`View`)
- **Location**: `app/src/pages/` and `app/src/components/`
- **Rendering**: Uses `TreeNode.tsx` recursively.
- **Animation**: `framer-motion` for layout transitions.
- **Timeline**: `AVLTreePage.tsx` implements an async playback engine that iterates through steps with controllable speed.

## Development Conventions

- **Internationalization**: All user-facing strings must use `useTranslation` hook. Translation files are in `app/src/locales/`.
- **Styling**: Strictly use **Tailwind CSS v4** utility classes.
- **Icons**: Use `lucide-react`.
- **Stability**: Avoid complex third-party layout libraries that rely on `findDOMNode` (React 19 compatibility). Use standard Flexbox/Grid for layout.

## Deployment Flow
- **Auto-deploy**: Pushing to `main` triggers GitHub Actions (`.github/workflows/deploy.yml`).

## Current Status (TODO.md)
- [x] AVL Tree (Playback engine, Tutorial mode, Drag interaction)
- [ ] Bloom Filter
- [ ] Min-Max Heap
- [ ] B tree / B+ tree
- [ ] Red black tree
- [ ] Trie / Patricia
