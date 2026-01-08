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

## Critical Fix: State Restoration for Undo/Redo & History Navigation

### Problem Discovery
All data structures (except AVL Tree initially) had a critical bug where the **history** system only stored visualization steps but **not the actual data structure state**. This caused:
- **Undo/Redo**: Only rewound the UI animation but didn't restore the tree/heap internal state
- **History Logs Click**: Jumped to the visual state but kept the data structure at the latest state
- **Result**: New operations after undo/navigation executed on the wrong state, producing incorrect results

### Root Cause
```typescript
// ❌ WRONG - Only stores visualization steps
const [history, setHistory] = useState<{id: string, action: string, steps: VisualizationStep[]}[]>([]);

// When undoing:
setActiveSteps(entry.steps);  // ✓ Visual updates
setCurrentStepIdx(entry.steps.length - 1);  // ✓ Timeline updates
setHistoryIndex(targetIdx);  // ✓ History position updates
// ❌ BUT: tree.root / heap.heap / heap.minNode still at latest state!
```

### Solution Pattern

#### 1. Add `finalSnapshot` to History Type
Every history entry must store the **final state** of the data structure after the operation completes:

```typescript
// ✓ CORRECT - Includes final state snapshot
const [history, setHistory] = useState<{
  id: string, 
  action: string, 
  steps: VisualizationStep[], 
  finalSnapshot: SnapshotType  // <-- Add this field
}[]>([]);
```

**Snapshot Types by Structure:**
- **Trees** (AVL, RBTree, B-Tree): `TreeNode | null` (cloneable via `.clone()`)
- **Array-based Heaps** (MinMax, DEAP, SMMH): `number[]` or `(number | null)[]`
- **Complex Structures** (Fibonacci Heap): Custom object with `{ roots: [], minNodeId: string, nodeCount: number }`

#### 2. Update `startOperation` to Capture State
When starting a new operation, save the final snapshot from the last step or from the current data structure:

```typescript
const startOperation = (action: string, steps: VisualizationStep[]) => {
    stopPlayback();
    setActiveSteps(steps);
    setCurrentStepIdx(0);
    
    // ✓ Capture final state
    const finalSnapshot = steps.length > 0 && steps[steps.length - 1].payload?.snapshot 
        ? steps[steps.length - 1].payload.snapshot 
        : dataStructure.getSnapshot();  // Fallback to current state
    
    // ✓ Truncate history and append with snapshot
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ id: Math.random().toString(36), action, steps, finalSnapshot });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    startPlayback(steps.length);
};
```

#### 3. Implement `handleUndo` with State Restoration

```typescript
const handleUndo = () => {
    if (historyIndex <= 0 || isPlaying) return;
    stopPlayback();
    
    const targetIdx = historyIndex - 1;
    const entry = history[targetIdx];
    
    // ✓ CRITICAL: Restore data structure state
    // For trees with .clone():
    tree.root = entry.finalSnapshot ? entry.finalSnapshot.clone() : null;
    
    // For array-based heaps:
    heap.heap = [...entry.finalSnapshot];
    
    // For complex structures (Fibonacci Heap):
    heap.fromSnapshot(entry.finalSnapshot);
    
    // ✓ Update visual state
    setSnapshot(entry.finalSnapshot);
    setActiveSteps(entry.steps);
    setCurrentStepIdx(entry.steps.length > 0 ? entry.steps.length - 1 : -1);
    setHistoryIndex(targetIdx);
};
```

#### 4. Implement `handleRedo` with State Restoration

```typescript
const handleRedo = () => {
    if (historyIndex >= history.length - 1 || isPlaying) return;
    stopPlayback();
    
    const targetIdx = historyIndex + 1;
    const entry = history[targetIdx];
    
    setActiveSteps(entry.steps);
    setCurrentStepIdx(0);
    setHistoryIndex(targetIdx);
    
    if (entry.steps.length > 0) {
        startPlayback(entry.steps.length);
    } else {
        // ✓ For operations with no animation, restore directly
        tree.root = entry.finalSnapshot ? entry.finalSnapshot.clone() : null;
        setSnapshot(entry.finalSnapshot);
    }
};
```

#### 5. Update History Logs Click Handler
When clicking a history entry in the sidebar, restore both visual AND internal state:

```typescript
// In the Logs tab rendering:
{history.slice(1).reverse().map((e, i) => (
  <button 
    key={e.id} 
    onClick={() => { 
      stopPlayback(); 
      const targetIdx = history.length - 1 - i;
      
      // ✓ Restore data structure state
      tree.root = e.finalSnapshot ? e.finalSnapshot.clone() : null;
      // OR: heap.heap = [...e.finalSnapshot];
      // OR: heap.fromSnapshot(e.finalSnapshot);
      
      setSnapshot(e.finalSnapshot);
      setActiveSteps(e.steps); 
      setCurrentStepIdx(e.steps.length - 1); 
      setHistoryIndex(targetIdx); 
    }} 
    className={`...`}
  >
```

#### 6. Update Initialization & Clear Operations
Include `finalSnapshot` in all history-modifying operations:

```typescript
// Initialization
useEffect(() => {
  if (historyIndex === -1) {
    setHistory([{ 
      id: 'init', 
      action: 'Initial', 
      steps: [], 
      finalSnapshot: null  // ✓ Include empty snapshot
    }]);
    setHistoryIndex(0);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// Clear operation
const handleClear = () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
    setResetConfirm(false);
    if (isPlaying) stopPlayback();
    
    tree.root = null;
    setSnapshot(null);
    setHistory([{ 
      id: 'init', 
      action: 'Cleared', 
      steps: [], 
      finalSnapshot: null  // ✓ Include empty snapshot
    }]);
    setHistoryIndex(0);
    // ... clear other state
};
```

### Implementation Requirements by Structure Type

#### Array-Based Heaps (MinMaxHeap, DEAP, SMMH)
- **Snapshot Type**: `number[]` or `(number | null)[]`
- **Restoration**: `heap.heap = [...entry.finalSnapshot]` (shallow copy sufficient)
- **getSnapshot()**: Already exists, returns `[...this.heap]`

#### Tree Structures (RB-Tree, B-Tree)
- **Snapshot Type**: `TreeNode | null`
- **Restoration**: `tree.root = entry.finalSnapshot ? entry.finalSnapshot.clone() : null`
- **Requirements**: Ensure `.clone()` method does **deep clone** with proper parent pointer updates

#### Fibonacci Heap (Complex Circular Structure)
- **Snapshot Type**: `FibHeapSnapshot` object
- **Restoration**: Requires `fromSnapshot()` method to rebuild circular doubly-linked lists
- **Implementation**: 
  ```typescript
  public fromSnapshot(snapshot: FibHeapSnapshot): void {
      this.minNode = null;
      this.nodeCount = snapshot.nodeCount;
      
      // Deserialize node tree
      const nodeMap = new Map<string, FibNode>();
      const rootNodes = snapshot.roots.map(r => this.deserializeNode(r, nodeMap));
      
      // Rebuild circular links
      for (let i = 0; i < rootNodes.length; i++) {
          const curr = rootNodes[i];
          curr.right = rootNodes[(i + 1) % rootNodes.length];
          curr.left = rootNodes[(i - 1 + rootNodes.length) % rootNodes.length];
      }
      
      // Restore min pointer
      this.minNode = snapshot.minNodeId ? nodeMap.get(snapshot.minNodeId)! : rootNodes[0];
  }
  ```

### Verification Checklist
After implementing state restoration for a data structure, verify:

- [ ] History includes `finalSnapshot` field
- [ ] `startOperation` captures and stores final snapshot
- [ ] `handleUndo` restores data structure internal state (not just UI)
- [ ] `handleRedo` restores state when needed
- [ ] History logs click handler restores state
- [ ] `handleClear` and initialization include empty snapshots
- [ ] PlaybackControls uses correct `canUndo`/`canRedo` logic (`historyIndex > 0` / `historyIndex < history.length - 1`)
- [ ] Test: Insert 1,2,3 → Undo → Insert 4 → Result should be [1,2,4], not [1,2,3,4]
- [ ] Test: Insert 1,2,3 → Click "Insert 2" in logs → Insert 4 → Result should be [1,2,4]

### Common Pitfalls to Avoid

1. **Forgetting to Restore State**: Only updating `setActiveSteps()` without touching `tree.root` or `heap.heap`
2. **Shallow Copy Issues**: Using `=` assignment for complex objects instead of `.clone()` or spread operator
3. **Missing fromSnapshot**: For complex structures like Fibonacci Heap, direct assignment breaks circular references
4. **Inconsistent PlaybackControls**: Using `currentStepIdx` instead of `historyIndex` for undo/redo enable state
5. **Missing Snapshot in Init/Clear**: Forgetting to include `finalSnapshot: null` in initial or cleared history entries
