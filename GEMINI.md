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
- **Interaction**: `react-zoom-pan-pinch` for a zoomable/draggable infinite canvas.
- **Timeline**: `AVLTreePage.tsx` implements an async playback engine that iterates through steps with controllable speed.

## Development Conventions

- **Internationalization**: All user-facing strings must use `useTranslation` hook. Translation files are in `app/src/locales/`.
- **Styling**: Strictly use **Tailwind CSS v4** utility classes.
- **Icons**: Use `lucide-react`.
- **Stability**: Avoid complex third-party layout libraries that rely on `findDOMNode` (React 19 compatibility). Use standard Flexbox/Grid for layout.

## Deployment Flow
- **Auto-deploy**: Pushing to `main` triggers GitHub Actions (`.github/workflows/deploy.yml`).

## Current Status (TODO.md)
- [x] AVL Tree (Playback, Tutorial, Drag interaction, Heuristics)
- [x] Fibonacci Heap (Consolidation Visualization, Degree Table, Decrease Key)
- [x] Min-Max Heap (Min/Max Levels, Array View)
- [ ] Bloom Filter
- [ ] B tree / B+ tree
- [ ] Red black tree
- [ ] Trie / Patricia

## Lessons Learned & Best Practices

### Animation & Layout Stability
- **Stable Identity**: Use `layoutId` (Framer Motion) on nodes to allow smooth transitions when they move between different parents (e.g., in Fibonacci Heap consolidation).
- **Stable Anchoring**: For structures where the "root" changes frequently (like Fibonacci Heap or Binomial Heap), maintain a persistent "Visual Anchor" (e.g., smallest ID node) to prevent the entire graph from rotating or scattering during `extractMin`.
- **Intermediate Steps**: When a complex structural change occurs (like merging trees), add an explicit intermediate visualization step to show the state *after* the link but *before* layout recalculation, ensuring users can follow the movement.

### Visual Clarity
- **Modular Islands**: The bottom bar should be divided into distinct "Islands" (Operations, Timeline, Info) to keep controls organized.
- **Legibility**: Ensure text sizes are at least 11px-12px for labels and buttons. Use uppercase + tracking for section headers.
- **Context Awareness**: Show auxiliary data (like Array View or Degree Table) in floating panels or dedicated islands to provide full context without cluttering the main tree view.

## SOP: Adding a New Data Structure

Follow this checklist to implement a new structure efficiently:

### Phase 1: Core Logic (`Brain`)
1.  **Create Logic File**: `app/src/structures/<name>/<Name>.ts`.
2.  **Define Snapshot**: Create a `Snapshot` interface (JSON-serializable) that captures the **entire** state needed for rendering.
3.  **Implement Steps**:
    -   Use an `addStep(type, msg, targetIds)` helper.
    -   Ensure `addStep` captures a **deep clone** of the state.
    -   For complex algorithms, add steps for *each* logical micro-operation (e.g., "Compare", "Swap", "Link").

### Phase 2: Visualization Components (`View`)
1.  **Create Node Component**: `app/src/components/<name>/<Node>.tsx`.
    -   Use `framer-motion` for `layout` animations.
    -   Accept `x`, `y` coordinates (if using absolute positioning) or rely on Flexbox if applicable.
    -   Implement **Layout Engine** (`layout.ts`) if the structure is a tree/graph to pre-calculate node positions and prevent overlap.
2.  **Visual Feedback**:
    -   Use standard colors: Blue (Default), Amber (Highlight), Red (Delete/Error), Green (Success/Min).
    -   Ensure all badges (Degree, Height, Index) are legible (min 10-12px font).

### Phase 3: Page Integration (`Page`)
1.  **Create Page**: `app/src/pages/<Name>Page.tsx`.
    -   **Imports**: Import `ControlIsland`, `PlaybackControls` from `../components/playground/`.
    -   **Layout**: Use the standard sidebar + canvas layout (copy from `MinMaxHeapPage.tsx` or `AVLTree.tsx`).
    -   **Islands**: Define 3 bottom bar islands:
        -   **Operations**: Input + Action Buttons.
        -   **Timeline**: `PlaybackControls`.
        -   **Info**: Stats like "Node Count", "Height", or special tables.
2.  **Routing**:
    -   Register lazy route in `App.tsx`.
    -   Add card entry in `data/structures.ts`.
3.  **Localization**:
    -   Create `locales/{en,zh-TW}/<name>.json`.
    -   Register in `i18n.ts`.
