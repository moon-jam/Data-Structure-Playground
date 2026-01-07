import { v4 as uuidv4 } from 'uuid';
import type { VisualizationStep } from '../common/types';

export class FibNode {
  id: string;
  key: number;
  degree: number;
  mark: boolean;
  parent: FibNode | null;
  child: FibNode | null;
  left: FibNode;
  right: FibNode;

  // Visual coordinates (will be calculated by layout engine)
  x: number = 0;
  y: number = 0;

  constructor(key: number) {
    this.id = uuidv4();
    this.key = key;
    this.degree = 0;
    this.mark = false;
    this.parent = null;
    this.child = null;
    this.left = this;
    this.right = this;
  }

  // Deep clone for snapshots
  clone(): FibNode {
    // Cloning a cyclic graph is tricky. 
    // We will need a map to track visited nodes to reconstruct the relationships correctly.
    // For the visualization snapshot, we often need a serialized tree structure.
    // Let's implement a simpler "to data" method for the snapshot system later.
    // For now, this is a placeholder.
    return this; 
  }
}

// Serializable representation for React state
export interface FibHeapSnapshot {
  roots: FibNodeSnapshot[];
  minNodeId: string | null;
  nodeCount: number;
  degreeTable?: (number | null)[];
}

export interface FibNodeSnapshot {
  id: string;
  key: number;
  degree: number;
  mark: boolean;
  children: FibNodeSnapshot[]; // Recursive structure for visualization
  isMin?: boolean;
}

export class FibonacciHeap {
  minNode: FibNode | null;
  nodeCount: number;
  steps: VisualizationStep[];
  private visStart: FibNode | null = null;

  constructor() {
    this.minNode = null;
    this.nodeCount = 0;
    this.steps = [];
    this.visStart = null;
  }

  // --- Snapshot System ---
  // Converts the cyclic linked list structure into a tree-like JSON for React rendering
  public getSnapshot(customRoots?: FibNode[]): FibHeapSnapshot {
    const roots: FibNodeSnapshot[] = [];
    
    const sourceRoots = customRoots || this.getStableRoots();
    sourceRoots.forEach(node => roots.push(this.serializeNode(node)));

    return {
      roots,
      minNodeId: this.minNode ? this.minNode.id : null,
      nodeCount: this.nodeCount,
    };
  }

  private serializeNode(node: FibNode, depth = 0): FibNodeSnapshot {
    if (depth > 50) {
        // Prevent infinite recursion if tree is corrupted
        return {
            id: node.id, key: node.key, degree: node.degree, mark: node.mark, children: [], isMin: false
        };
    }

    const children: FibNodeSnapshot[] = [];
    if (node.child) {
      let curr = node.child;
      let safeCount = 0;
      const startNode = curr;
      
      do {
        children.push(this.serializeNode(curr, depth + 1));
        curr = curr.right;
        safeCount++;
        if (safeCount > 1000) {
            console.warn("Cycle detected in child list serialization");
            break;
        }
      } while (curr !== startNode);
    }
    return {
      id: node.id,
      key: node.key,
      degree: node.degree,
      mark: node.mark,
      children,
      isMin: node === this.minNode
    };
  }

  private addStep(type: VisualizationStep['type'], message: string, targetIds: string[] = [], degreeTable?: (number | null)[], customRoots?: FibNode[]) {
    const snapshot = this.getSnapshot(customRoots);
    if (degreeTable) snapshot.degreeTable = degreeTable;
    this.steps.push({
      type,
      message,
      targetIds,
      payload: { snapshot } // We'll use 'snapshot' instead of 'rootSnapshot' for generic support
    });
  }

  // --- Core Operations ---

  public insert(key: number): VisualizationStep[] {
    this.steps = [];
    const node = new FibNode(key);
    
    if (!this.minNode) {
      this.minNode = node;
      this.visStart = node;
    } else {
      this.addToRootList(node);
      if (node.key < this.minNode.key) {
        this.minNode = node;
      }
    }
    this.nodeCount++;
    this.addStep('insert', `Inserted ${key} into root list`, [node.id]);
    return this.steps;
  }

  // Helper to splice a node into the root list
  private addToRootList(node: FibNode) {
    if (!this.minNode) return; // Should not happen if called correctly
    
    const min = this.minNode;
    const minRight = min.right;
    
    min.right = node;
    node.left = min;
    node.right = minRight;
    minRight.left = node;
  }

  // Helper to remove a node from the root list
  private removeFromRootList(node: FibNode) {
    if (this.visStart === node) {
        this.visStart = (node.right === node) ? null : node.right;
    }
    if (node.right === node) {
      // Only one node in list
      return; 
    }
    node.left.right = node.right;
    node.right.left = node.left;
  }

  public extractMin(): VisualizationStep[] {
    this.steps = [];
    this._extractMin();
    return this.steps;
  }

  private _extractMin() {
    const z = this.minNode;
    if (!z) return;

    this.addStep('highlight', `Extracting min node: ${z.key}`, [z.id]);

    // 1. Move all children of z to the root list
    if (z.child) {
      let child = z.child;
      const children: FibNode[] = [];
      // Collect children first to avoid broken pointers during iteration
      do {
        children.push(child);
        child.parent = null; // Clear parent pointer
        child = child.right;
      } while (child !== z.child);

      // Splice children into root list
      children.forEach(c => {
        this.addToRootList(c);
        c.mark = false; // Unmark children when they become roots
      });
    }

    // 2. Remove z from root list
    this.removeFromRootList(z);

    if (z === z.right) {
      this.minNode = null;
    } else {
      this.minNode = z.right;
      this.addStep('highlight', `Temporarily set min pointer to ${this.minNode.key}`, [this.minNode.id]);
      this.consolidate();
    }

    this.nodeCount--;
    this.addStep('complete', `Extraction complete. New min: ${this.minNode?.key}`);
  }

  private consolidate() {
    this.addStep('message', 'Starting Consolidation (Degree Table)');
    
    const A: (FibNode | null)[] = new Array(50).fill(null);
    const getTableState = () => A.map(n => n ? n.key : null).filter((_, i) => i < 10 || A.slice(i).some(x => x !== null));

    const roots = this.getStableRoots();
    
    roots.forEach((w, idx) => {
      let x = w;
      let d = x.degree;
      
      const getVisibleRoots = (extra?: FibNode) => {
          const visible: FibNode[] = [];
          
          // 1. Processed roots: Only include if they are still parked in A
          for (let i = 0; i < idx; i++) {
              if (A.includes(roots[i])) visible.push(roots[i]);
          }
          
          // 2. Current node x (active)
          if (!visible.includes(x)) visible.push(x);
          
          // 3. Extra node y (being merged)
          if (extra && !visible.includes(extra)) visible.push(extra);
          
          // 4. Future roots
          for (let i = idx + 1; i < roots.length; i++) {
              if (roots[i] !== x && roots[i] !== extra) visible.push(roots[i]);
          }
          
          return visible;
      };

      this.addStep('highlight', `Processing root ${x.key} (Degree ${d})`, [x.id], getTableState(), getVisibleRoots());

      while (A[d] !== null) {
        let y = A[d]!; 
        
        if (x.key > y.key) {
          const temp = x; x = y; y = temp;
        }
        
        this.addStep('highlight', `Conflict! Degree ${d}: Linking ${y.key} under ${x.key}`, [x.id, y.id], getTableState(), getVisibleRoots(y));
        this.link(y, x);
        A[d] = null;
        this.addStep('highlight', `Merged ${y.key} into ${x.key}`, [x.id], getTableState(), getVisibleRoots());
        d++;
      }
      A[d] = x;
      this.addStep('message', `Node ${x.key} placed in Degree Table at index ${d}`, [x.id], getTableState(), getVisibleRoots());
    });

    // Reconstruct root list from Degree Table
    this.minNode = null;
    
    for (let i = 0; i < A.length; i++) {
      if (A[i]) {
        if (this.minNode === null) {
            this.minNode = A[i];
            A[i]!.left = A[i]!;
            A[i]!.right = A[i]!;
        } else {
            this.addToRootList(A[i]!);
            if (A[i]!.key < this.minNode.key) {
                this.minNode = A[i];
            }
        }
      }
    }
  }

  private link(y: FibNode, x: FibNode) {
    // remove y from root list
    this.removeFromRootList(y);
    
    // make y a child of x
    y.parent = x;
    if (!x.child) {
      x.child = y;
      y.right = y;
      y.left = y;
    } else {
      // Add to child list
      const c = x.child;
      y.right = c.right;
      y.left = c;
      c.right.left = y;
      c.right = y;
    }
    
    x.degree++;
    y.mark = false;
  }

  private getStableRoots(): FibNode[] {
    if (!this.minNode) return [];
    
    // Use visStart as the stable anchor
    const startNode = this.visStart || this.minNode;
    
    const nodes: FibNode[] = [];
    let curr = startNode;
    let count = 0;
    
    do {
      nodes.push(curr);
      curr = curr.right;
      count++;
      if (count > this.nodeCount + 10) break;
    } while (curr !== startNode);

    return nodes;
  }

  // --- New Operations ---

  public decreaseKey(nodeId: string, newKey: number): VisualizationStep[] {
    this.steps = [];
    const node = this.findNode(nodeId);
    if (!node) {
      this.addStep('error', `Node not found: ${nodeId}`);
      return this.steps;
    }
    if (newKey > node.key) {
      this.addStep('error', `New key ${newKey} is greater than current key ${node.key}`);
      return this.steps;
    }

    this.addStep('highlight', `Decrease key of ${node.key} to ${newKey}`, [node.id]);
    node.key = newKey;
    const parent = node.parent;

    if (parent && node.key < parent.key) {
      this.addStep('highlight', `Heap violation! ${node.key} < parent ${parent.key}. Cutting...`, [node.id, parent.id]);
      this.cut(node, parent);
      this.cascadingCut(parent);
    }

    if (node.key < this.minNode!.key) {
      this.minNode = node;
      this.addStep('highlight', `New min node: ${node.key}`, [node.id]);
    }
    
    this.addStep('complete', `Decrease Key finished`);
    return this.steps;
  }

  public delete(nodeId: string): VisualizationStep[] {
    this.steps = [];
    const node = this.findNode(nodeId);
    if (!node) return this.steps;

    this.addStep('highlight', `Deleting node ${node.key}`, [node.id]);
    this.addStep('message', `Decreasing key to -Infinity to force bubble up`);
    
    // Force bubble up
    const parent = node.parent;
    if (parent) {
       this.cut(node, parent);
       this.cascadingCut(parent);
    }
    this.minNode = node; // Force it to be min
    
    // Now extract min
    this._extractMin();
    
    return this.steps;
  }

  private cut(node: FibNode, parent: FibNode) {
    // remove from child list
    if (node.right === node) {
      parent.child = null;
    } else {
      node.left.right = node.right;
      node.right.left = node.left;
      if (parent.child === node) parent.child = node.right;
    }
    parent.degree--;
    
    // add to root list
    this.addToRootList(node);
    node.parent = null;
    node.mark = false;
    this.addStep('move', `Cut node ${node.key} from parent ${parent.key}`, [node.id]);
  }

  private cascadingCut(node: FibNode) {
    const parent = node.parent;
    if (parent) {
      if (!node.mark) {
        node.mark = true;
        this.addStep('highlight', `Marked node ${node.key}`, [node.id]);
      } else {
        this.addStep('highlight', `Node ${node.key} already marked. Cascading cut!`, [node.id]);
        this.cut(node, parent);
        this.cascadingCut(parent);
      }
    }
  }

  private findNode(id: string): FibNode | null {
    if (!this.minNode) return null;
    
    let roots = this.getStableRoots();
    for (const root of roots) {
       const found = this._findInTree(root, id);
       if (found) return found;
    }
    return null;
  }

  private _findInTree(node: FibNode, id: string): FibNode | null {
    if (node.id === id) return node;
    if (node.child) {
      let curr = node.child;
      do {
        const res = this._findInTree(curr, id);
        if (res) return res;
        curr = curr.right;
      } while (curr !== node.child);
    }
    return null;
  }
}
