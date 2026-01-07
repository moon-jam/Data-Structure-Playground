import { v4 as uuidv4 } from 'uuid';
import type { VisualizationStep } from '../common/types';

export class BTreeNode {
  id: string;
  keys: number[];
  children: BTreeNode[];
  isLeaf: boolean;

  constructor(isLeaf = false) {
    this.id = uuidv4();
    this.keys = [];
    this.children = [];
    this.isLeaf = isLeaf;
  }

  // Deep clone for snapshot
  clone(): BTreeNode {
    const newNode = new BTreeNode(this.isLeaf);
    newNode.id = this.id;
    newNode.keys = [...this.keys];
    newNode.children = this.children.map(child => child.clone());
    return newNode;
  }
}

export type BTreeSnapshot = BTreeNode | null;

export class BTree {
  root: BTreeNode | null;
  order: number; // m
  minKeys: number; // t - 1
  maxKeys: number; // m - 1
  steps: VisualizationStep[];

  constructor(order: number = 3) {
    this.root = null;
    this.steps = [];
    this.order = order;
    this.maxKeys = order - 1;
    this.minKeys = Math.ceil(order / 2) - 1;
  }

  public setOrder(m: number) {
    this.order = m;
    this.maxKeys = m - 1;
    this.minKeys = Math.ceil(m / 2) - 1;
  }

  getSnapshot(): BTreeSnapshot {
    return this.root ? this.root.clone() : null;
  }

  private addStep(type: VisualizationStep['type'], message: string, targetIds: string[] = [], skipSnapshot = false) {
    this.steps.push({
      type,
      message,
      targetIds,
      payload: { snapshot: skipSnapshot ? undefined : this.getSnapshot() }
    });
  }

  // --- Search ---
  public search(key: number): boolean {
    this.steps = [];
    if (!this.root) return false;
    return this.searchRecursive(this.root, key);
  }

  private searchRecursive(node: BTreeNode, key: number): boolean {
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) {
      i++;
    }
    
    this.addStep('highlight', `Searching at node. Checking key at index ${i}`, [node.id], true);

    if (i < node.keys.length && key === node.keys[i]) {
      this.addStep('complete', `Found key ${key}`, [node.id], true);
      return true;
    }

    if (node.isLeaf) {
      this.addStep('error', `Key ${key} not found in leaf`, [node.id], true);
      return false;
    }

    return this.searchRecursive(node.children[i], key);
  }

  // Helper to check if key exists (without adding steps)
  private searchKeyExists(node: BTreeNode, key: number): boolean {
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) {
      i++;
    }

    if (i < node.keys.length && key === node.keys[i]) {
      return true;
    }

    if (node.isLeaf) {
      return false;
    }

    return this.searchKeyExists(node.children[i], key);
  }

  // --- Insertion ---
  public insert(key: number): VisualizationStep[] {
    this.steps = [];
    
    if (!this.root) {
      this.root = new BTreeNode(true);
      this.root.keys = [key];
      this.addStep('insert', `Tree empty. Created root with key ${key}`, [this.root.id]);
      return this.steps;
    }

    // Capture initial state before any modifications
    this.addStep('highlight', `Starting insertion of ${key}`, [this.root.id]);

    const result = this.insertRecursive(this.root, key);
    
    if (result) {
        // Create and insert the new root immediately
        const oldRoot = this.root;
        const newRoot = new BTreeNode(false);
        newRoot.keys = [result.key];
        newRoot.children = [oldRoot, result.rightNode];
        this.root = newRoot;
        // Now capture the state - root is already pointing to newRoot
        this.addStep('move', `Created new root with key ${result.key}`, [newRoot.id]);
    }

    this.addStep('complete', `Insertion of ${key} complete`);
    return this.steps;
  }

  private insertRecursive(node: BTreeNode, key: number): { key: number, rightNode: BTreeNode } | null {
      let i = 0;
      while (i < node.keys.length && key > node.keys[i]) {
          i++;
      }

      if (node.isLeaf) {
          // Capture state before insertion
          this.addStep('highlight', `Found insertion position in leaf`, [node.id]);
          node.keys.splice(i, 0, key);
          // Capture state after insertion
          this.addStep('insert', `Inserted ${key} into leaf`, [node.id]);
          
          if (node.keys.length > this.maxKeys) {
              return this.splitNode(node);
          }
          return null;
      }

      this.addStep('highlight', `Descending to child ${i}`, [node.children[i].id]);
      const result = this.insertRecursive(node.children[i], key);

      if (result) {
          // First, insert the split results into parent to make them visible
          node.keys.splice(i, 0, result.key);
          node.children.splice(i + 1, 0, result.rightNode);
          // Then capture the state showing promoted key and new child
          this.addStep('move', `Promoted ${result.key} from split child`, [node.id, result.rightNode.id]);
          
          if (node.keys.length > this.maxKeys) {
              return this.splitNode(node);
          }
      }
      return null;
  }

  private splitNode(node: BTreeNode): { key: number, rightNode: BTreeNode } {
      const midIndex = Math.floor(node.keys.length / 2);
      const medianKey = node.keys[midIndex];
      
      const rightNode = new BTreeNode(node.isLeaf);
      rightNode.keys = node.keys.slice(midIndex + 1);
      
      if (!node.isLeaf) {
          rightNode.children = node.children.slice(midIndex + 1);
          node.children = node.children.slice(0, midIndex + 1);
      }
      
      node.keys = node.keys.slice(0, midIndex);
      
      return { key: medianKey, rightNode };
  }

  // --- Deletion ---
  public delete(key: number): VisualizationStep[] {
    this.steps = [];
    if (!this.root) {
      this.addStep('error', `Tree is empty. Cannot delete ${key}`);
      return this.steps;
    }

    // Check if key exists before attempting deletion
    if (!this.searchKeyExists(this.root, key)) {
      this.addStep('error', `Key ${key} not found in tree`);
      return this.steps;
    }

    // Capture initial state before deletion
    this.addStep('highlight', `Starting deletion of ${key}`, [this.root.id]);

    // Delete from tree (handles both internal and leaf deletion)
    this.deleteFromTree(this.root, key);

    // If root became empty (and not a leaf), shrink tree height
    if (this.root.keys.length === 0 && !this.root.isLeaf) {
      this.root = this.root.children[0];
      // Capture state after shrinking
      this.addStep('move', `Tree height reduced. New root: [${this.root.keys.join(',')}]`, [this.root.id]);
    } else if (this.root.keys.length === 0 && this.root.isLeaf) {
        // Tree became empty
        this.addStep('highlight', `Tree is now empty`, []);
        this.root = null;
    }

    this.addStep('complete', `Deletion of ${key} complete`);
    return this.steps;
  }

  // Delete from tree: if key in internal node, swap with predecessor then delete from leaf
  private deleteFromTree(node: BTreeNode, key: number): boolean {
    const idx = node.keys.findIndex(k => k === key);

    if (idx !== -1) {
      // Found the key in this node
      if (node.isLeaf) {
        // Key is in leaf - delete it
        const minKeys = Math.ceil(this.order / 2) - 1;
        
        // Case 1: p has at least ⌈m/2⌉ data pairs -> directly remove
        if (node.keys.length > minKeys) {
          node.keys.splice(idx, 1);
          this.addStep('delete', `Removed ${key} from leaf`, [node.id]);
          return false; // No underflow
        }
        
        // p has exactly ⌈m/2⌉-1 data pairs, will underflow after deletion
        node.keys.splice(idx, 1);
        this.addStep('delete', `Removed ${key} from leaf (underflow)`, [node.id]);
        return true; // Signal underflow
      } else {
        // Key is in internal node - swap with predecessor then delete from left subtree
        const leftChild = node.children[idx];
        const pred = this.findPredecessor(leftChild);
        
        // Swap
        const temp = node.keys[idx];
        node.keys[idx] = pred.value;
        pred.leafNode.keys[pred.keyIndex] = temp;
        
        this.addStep('move', `Swapped ${key} with predecessor ${pred.value}`, [node.id, pred.leafNode.id]);
        
        // Now delete the key from left subtree (where it was swapped to)
        const hasUnderflow = this.deleteFromTree(leftChild, key);
        
        if (hasUnderflow) {
          const parentUnderflow = this.handleUnderflow(node, idx);
          return parentUnderflow; // Propagate underflow upward
        }
        
        return false;
      }
    }

    // Key not in this node - navigate to child
    if (node.isLeaf) {
      // Not found (shouldn't happen if key exists)
      return false;
    }

    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) {
      i++;
    }
    
    const child = node.children[i];
    if (!child) return false;

    // Recursively delete from child
    const hasUnderflow = this.deleteFromTree(child, key);
    
    // Handle underflow in child
    if (hasUnderflow) {
      const parentUnderflow = this.handleUnderflow(node, i);
      return parentUnderflow; // Propagate underflow upward
    }
    
    return false;
  }

  // --- Rebalancing Helpers ---

  // Find predecessor without adding visualization steps (used for immediate swap)
  private findPredecessor(node: BTreeNode): { leafNode: BTreeNode, keyIndex: number, value: number } {
      let curr = node;
      // Navigate to rightmost leaf
      while (!curr.isLeaf) {
          curr = curr.children[curr.children.length - 1];
      }
      const keyIndex = curr.keys.length - 1;
      return { leafNode: curr, keyIndex, value: curr.keys[keyIndex] };
  }

  // Handle underflow: try rotation first, then combine
  // Returns true if parent also underflows after combine
  private handleUnderflow(parent: BTreeNode, childIdx: number): boolean {
    const minKeys = Math.ceil(this.order / 2) - 1;
    
    // Try to borrow from left sibling
    if (childIdx > 0) {
      const leftSibling = parent.children[childIdx - 1];
      // Case 2: q has at least ⌈m/2⌉ data pairs -> do rotation
      if (leftSibling.keys.length > minKeys) {
        this.rotateFromLeft(parent, childIdx);
        return false; // No underflow in parent
      }
    }
    
    // Try to borrow from right sibling
    if (childIdx < parent.children.length - 1) {
      const rightSibling = parent.children[childIdx + 1];
      // Case 2: q has at least ⌈m/2⌉ data pairs -> do rotation
      if (rightSibling.keys.length > minKeys) {
        this.rotateFromRight(parent, childIdx);
        return false; // No underflow in parent
      }
    }
    
    // Case 3: Both siblings have ⌈m/2⌉-1 data pairs -> do combine
    if (childIdx > 0) {
      return this.combineWithLeft(parent, childIdx);
    } else {
      return this.combineWithRight(parent, childIdx);
    }
  }

  private rotateFromLeft(parent: BTreeNode, childIdx: number) {
    const child = parent.children[childIdx];
    const leftSibling = parent.children[childIdx - 1];
    
    // Move parent's key down to child
    child.keys.unshift(parent.keys[childIdx - 1]);
    
    // Move left sibling's largest key up to parent
    parent.keys[childIdx - 1] = leftSibling.keys.pop()!;
    
    // If not leaf, move child pointer
    if (!child.isLeaf) {
      child.children.unshift(leftSibling.children.pop()!);
    }
    
    this.addStep('move', `Rotation: borrowed from left sibling [${leftSibling.keys.join(',')}] to [${child.keys.join(',')}]`, [parent.id, leftSibling.id, child.id]);
  }

  private rotateFromRight(parent: BTreeNode, childIdx: number) {
    const child = parent.children[childIdx];
    const rightSibling = parent.children[childIdx + 1];
    
    // Move parent's key down to child
    child.keys.push(parent.keys[childIdx]);
    
    // Move right sibling's smallest key up to parent
    parent.keys[childIdx] = rightSibling.keys.shift()!;
    
    // If not leaf, move child pointer
    if (!child.isLeaf) {
      child.children.push(rightSibling.children.shift()!);
    }
    
    this.addStep('move', `Rotation: borrowed from right sibling [${rightSibling.keys.join(',')}] to [${child.keys.join(',')}]`, [parent.id, child.id, rightSibling.id]);
  }

  private combineWithLeft(parent: BTreeNode, childIdx: number): boolean {
    const child = parent.children[childIdx];
    const leftSibling = parent.children[childIdx - 1];
    
    // Save original keys for display
    const childKeysStr = child.keys.join(',');
    const leftKeysStr = leftSibling.keys.join(',');
    
    // Combine: left sibling + parent key + child
    leftSibling.keys.push(parent.keys[childIdx - 1]);
    leftSibling.keys.push(...child.keys);
    
    if (!child.isLeaf) {
      leftSibling.children.push(...child.children);
    }
    
    const mergedKeysStr = leftSibling.keys.join(',');
    
    // Remove parent's key and child pointer
    parent.keys.splice(childIdx - 1, 1);
    parent.children.splice(childIdx, 1);
    
    this.addStep('move', `Combine: merged [${childKeysStr}] with left sibling [${leftKeysStr}] into [${mergedKeysStr}]`, [parent.id, leftSibling.id]);
    
    // Check if parent now has underflow
    const minKeys = Math.ceil(this.order / 2) - 1;
    return parent.keys.length < minKeys;
  }

  private combineWithRight(parent: BTreeNode, childIdx: number): boolean {
    const child = parent.children[childIdx];
    const rightSibling = parent.children[childIdx + 1];
    
    // Save original keys for display
    const childKeysStr = child.keys.join(',');
    const rightKeysStr = rightSibling.keys.join(',');
    
    // Combine: child + parent key + right sibling
    child.keys.push(parent.keys[childIdx]);
    child.keys.push(...rightSibling.keys);
    
    if (!child.isLeaf) {
      child.children.push(...rightSibling.children);
    }
    
    const mergedKeysStr = child.keys.join(',');
    
    // Remove parent's key and right child pointer
    parent.keys.splice(childIdx, 1);
    parent.children.splice(childIdx + 1, 1);
    
    this.addStep('move', `Combine: merged [${childKeysStr}] with right sibling [${rightKeysStr}] into [${mergedKeysStr}]`, [parent.id, child.id]);
    
    // Check if parent now has underflow
    const minKeys = Math.ceil(this.order / 2) - 1;
    return parent.keys.length < minKeys;
  }

}

