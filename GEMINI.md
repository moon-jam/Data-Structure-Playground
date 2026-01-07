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
- [x] Double-Ended Heap (DEAP)
- [ ] Symmetric Min-Max Heap (SMMH)
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

### B-Tree Specific Lessons

#### Rendering & Animation
- **Layering (z-index)**: For multi-way trees, render child nodes and lines *before* the parent node in the JSX, and use a `depth`-based `zIndex` calculation (`100 - depth`) to ensure parent nodes always appear on top of their connector lines.
- **Explicit Positioning**: Use explicit `left` and `top` properties in Framer Motion `animate` props rather than `marginLeft` or `transform` for the main node containers to ensure smoother layout transitions during rebalancing.
- **Avoid Layout Animation Conflicts**: Use `key={node.id}` instead of `layoutId` for node reconciliation. Combining `layoutId` with explicit `left/top` animations can cause Framer Motion to auto-manage opacity/transform, resulting in nodes becoming invisible (`opacity: 0`) during transitions.
- **Layout Precision**: Remove ghost padding/margins from layout calculations. The `nodeBoxWidth` should exactly match the rendered width (`keys.length * KEY_WIDTH`), not include extra padding that causes positioning offsets.
- **Key Stability**: Use the actual data values as React `key` props when mapping through node keys. This allows Framer Motion to animate keys sliding left or right when a new value is inserted into the middle of a node.

#### Deletion Algorithm (Following Textbook Pattern)
The B-tree deletion implementation follows the classic two-phase approach from academic literature:

**Phase 1: Transform Internal to Leaf Deletion**
- If the key to delete is in an **internal node**, immediately swap it with its **predecessor** (largest key in left subtree).
- Display: `Swapped {key} with predecessor {pred}`
- This transforms all deletions into leaf deletions, simplifying the algorithm.

**Phase 2: Delete from Leaf with Rebalancing**
After Phase 1, the key is guaranteed to be in a leaf. Apply these cases:

1. **Case 1: Sufficient Keys** (`keys.length > ⌈m/2⌉ - 1`)
   - Directly remove the key without rebalancing
   - Display: `Removed {key} from leaf`

2. **Case 2: Underflow + Sibling Has Extra** (current node has `⌈m/2⌉-1`, sibling has `> ⌈m/2⌉-1`)
   - **Rotation (Borrow)**: Pull parent's separator key down, push sibling's key up
   - Display: `Rotation: borrowed from left/right sibling [{keys}] to [{keys}]`
   - No underflow propagates to parent

3. **Case 3: Both at Minimum** (both have exactly `⌈m/2⌉-1`)
   - **Combine (Merge)**: Merge child + parent separator + sibling
   - Display: `Combine: merged [{child}] with sibling [{sibling}] into [{result}]`
   - Parent loses one key → check parent for underflow recursively

**Underflow Propagation**
- After `Combine`, parent may underflow → recursively apply Cases 2/3 upward
- Priority: Always try Rotation before Combine (preserves tree structure)
- Root special case: If root becomes empty after child merge, promote the merged child as new root (tree height decreases)

**Snapshot Timing**
- Never call `addStep` while a node is temporarily detached from the tree (e.g., during a split before the parent links the new child)
- Always complete the structural modification first, then capture the state
- For swap operations: mutate both nodes first, then call `addStep` to show the swapped state

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
3.  **Localization (CRITICAL)**:
    -   Create `locales/{en,zh-TW}/<name>.json`.
    -   Register in `i18n.ts`.
    -   **UPDATE HOME PAGE**: Add the structure name and description to `locales/{en,zh-TW}/common.json` under `home.structures` to ensure the home page card displays localized content correctly. (Do not skip this!)
