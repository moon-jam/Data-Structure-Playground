import { v4 as uuidv4 } from 'uuid';
import type { VisualizationStep } from '../common/types';

export class BPlusTreeNode {
  id: string;
  keys: number[];
  children: BPlusTreeNode[];
  isLeaf: boolean;
  next: BPlusTreeNode | null; // For leaf linkage

  constructor(isLeaf = false) {
    this.id = uuidv4();
    this.keys = [];
    this.children = [];
    this.isLeaf = isLeaf;
    this.next = null;
  }

  // Deep clone for snapshot (careful with cyclic 'next' links if not handled?)
  // 'next' is a reference. For snapshot, we can keep the reference or recreate structure.
  // Since visualizer rebuilds layout, we need to clone structure.
  // Cloning a graph (with horizontal links) requires a map to preserve references.
  // However, since 'next' only points to siblings, standard recursive clone works IF we rebuild 'next' links or ignore them?
  // Let's implement a graph clone helper.
  clone(map = new Map<BPlusTreeNode, BPlusTreeNode>()): BPlusTreeNode {
    if (map.has(this)) return map.get(this)!;

    const newNode = new BPlusTreeNode(this.isLeaf);
    newNode.id = this.id;
    newNode.keys = [...this.keys];
    map.set(this, newNode);

    newNode.children = this.children.map(child => child.clone(map));
    
    // We defer 'next' linking to a second pass or handle it if 'next' is already visited?
    // 'next' points to the right sibling.
    // In a tree traversal (preorder), we visit children.
    // Siblings are children of the same parent (usually).
    // Let's just clone children first.
    // Linking 'next' manually might be safer during tree traversal if we assume tree structure.
    
    // Actually, for visualization, we might not strictly need 'next' in the snapshot if we render based on children.
    // BUT we want to draw the link.
    // Let's rely on map.
    if (this.next) {
        // If next is already cloned, link it.
        // If not, we don't want to infinite recurse sideways.
        // B+ Tree 'next' only goes right. It's a list.
        // If we clone recursively down, we might not reach 'next' unless we traverse the list.
        // Let's leave 'next' as null in clone and let the visualizer or a separate 'relink' step handle it?
        // Or better: Clone the tree structure recursively.
        // Then do a pass to relink leaves?
        // Or just let 'next' be null in snapshots for now?
        // The visualizer might need it.
    }
    return newNode;
  }
}

export type BPlusTreeSnapshot = BPlusTreeNode | null;

export class BPlusTree {
  root: BPlusTreeNode | null;
  order!: number;
  maxKeys!: number;
  minKeys!: number;
  steps: VisualizationStep[];

  constructor(order: number = 3) {
    this.root = null;
    this.steps = [];
    this.setOrder(order);
  }

  public setOrder(m: number) {
    this.order = m;
    this.maxKeys = m - 1;
    this.minKeys = Math.ceil(m / 2) - 1;
  }

  // Helper to clone entire tree and relink leaves
  getSnapshot(): BPlusTreeSnapshot {
    if (!this.root) return null;
    
    // 1. Clone Tree Structure
    const map = new Map<BPlusTreeNode, BPlusTreeNode>();
    const newRoot = this.root.clone(map);

    // 2. Relink Leaves (Traverse original leaves and link new leaves)
    let curr: BPlusTreeNode | null = this.findLeftmostLeaf(this.root);
    let newCurr: BPlusTreeNode | null = map.get(curr!)!;
    
    while (curr && curr.next) {
        const nextOriginal: BPlusTreeNode = curr.next;
        const nextNew = map.get(nextOriginal);
        if (newCurr && nextNew) {
            newCurr.next = nextNew;
        }
        curr = nextOriginal;
        newCurr = nextNew || null;
    }

    return newRoot;
  }

  private findLeftmostLeaf(node: BPlusTreeNode): BPlusTreeNode {
      let curr = node;
      while (!curr.isLeaf) {
          curr = curr.children[0];
      }
      return curr;
  }

  private addStep(type: VisualizationStep['type'], message: string, targetIds: string[] = []) {
    this.steps.push({
      type,
      message,
      targetIds,
      payload: { snapshot: this.getSnapshot() }
    });
  }

  // --- Search ---
  public search(key: number): boolean {
      this.steps = [];
      if (!this.root) return false;
      return this.searchRecursive(this.root, key);
  }

  private searchRecursive(node: BPlusTreeNode, key: number): boolean {
      if (node.isLeaf) {
          // Linear search in leaf (or binary)
          const found = node.keys.includes(key);
          if (found) this.addStep('complete', `Found key ${key} in leaf`, [node.id]);
          else this.addStep('error', `Key ${key} not found`, [node.id]);
          return found;
      }

      // Internal Node
      let i = 0;
      while (i < node.keys.length && key >= node.keys[i]) {
          i++;
      }
      // Note: B+ Tree internal keys are separators.
      // key < K[i] -> go to Child[i].
      // key >= K[i] -> go to Child[i+1].
      // Wait, standard definition:
      // Subtree i contains keys < K[i].
      // Subtree i+1 contains keys >= K[i].
      // So if key == K[i], we go right (i+1).
      // My loop: stops when key < node.keys[i].
      // So i is the index where key < K[i].
      // This means key >= K[i-1].
      // So Child[i] is the correct path.
      
      this.addStep('highlight', `Searching... key ${key} < ${node.keys[i] ?? 'inf'}`, [node.id]);
      return this.searchRecursive(node.children[i], key);
  }

  // --- Insertion ---
  public insert(key: number): VisualizationStep[] {
      this.steps = [];
      
      if (!this.root) {
          this.root = new BPlusTreeNode(true);
          this.root.keys = [key];
          this.addStep('insert', `Tree empty. Created root.`, [this.root.id]);
          return this.steps;
      }

      const result = this.insertRecursive(this.root, key);
      
      if (result) {
          // Root split
          const newRoot = new BPlusTreeNode(false);
          newRoot.keys = [result.key];
          newRoot.children = [this.root, result.rightNode];
          this.root = newRoot;
          this.addStep('move', `Root split. New root created.`, [newRoot.id]);
      }
      
      this.addStep('complete', `Insertion of ${key} complete`);
      return this.steps;
  }

  private insertRecursive(node: BPlusTreeNode, key: number): { key: number, rightNode: BPlusTreeNode } | null {
      if (node.isLeaf) {
          // Insert sorted
          let i = 0;
          while (i < node.keys.length && key > node.keys[i]) i++;
          
          if (i < node.keys.length && node.keys[i] === key) {
              this.addStep('error', `Key ${key} already exists`, [node.id]);
              return null; // Duplicate
          }

          node.keys.splice(i, 0, key);
          this.addStep('insert', `Inserted ${key} into leaf`, [node.id]);

          if (node.keys.length > this.maxKeys) {
              return this.splitLeaf(node);
          }
          return null;
      }

      // Internal Node
      let i = 0;
      while (i < node.keys.length && key >= node.keys[i]) i++;
      
      this.addStep('highlight', `Descending to child ${i}`, [node.children[i].id]);
      const result = this.insertRecursive(node.children[i], key);

      if (result) {
          this.addStep('highlight', `Child split. Integrating...`, [node.id]);
          // Insert separator and new child
          // i is the index where we went down.
          // Separator goes to keys[i].
          // New child goes to children[i+1].
          
          // Wait, if we descended to child[i], and it split into [child, rightNode] with 'key' separator.
          // The separator 'key' should be inserted into parent at index 'i'.
          // The 'rightNode' should be inserted at 'i+1'.
          
          // However, my search logic: key >= K[i] -> i++.
          // So child[i] covers range [K[i-1], K[i]).
          // When child[i] splits, the separator K' divides it.
          // We insert K' at i.
          // Keys become ... K[i-1], K', K[i] ...
          // Children become ... child[i], rightNode, child[i+1] ...
          
          node.keys.splice(i, 0, result.key);
          node.children.splice(i + 1, 0, result.rightNode);
          
          if (node.keys.length > this.maxKeys) {
              return this.splitInternal(node);
          }
      }
      return null;
  }

  private splitLeaf(node: BPlusTreeNode): { key: number, rightNode: BPlusTreeNode } {
      // Split leaf into two.
      // Copy up the middle key.
      const midIndex = Math.floor(node.keys.length / 2);
      const rightNode = new BPlusTreeNode(true);
      
      rightNode.keys = node.keys.slice(midIndex); // Right gets mid and everything after
      node.keys = node.keys.slice(0, midIndex);
      
      // Link leaves
      rightNode.next = node.next;
      node.next = rightNode;
      
      const upKey = rightNode.keys[0]; // Copy up the first key of right node
      
      this.addStep('move', `Split leaf. Copied up ${upKey}`, [node.id, rightNode.id]);
      return { key: upKey, rightNode };
  }

  private splitInternal(node: BPlusTreeNode): { key: number, rightNode: BPlusTreeNode } {
      // Split internal node.
      // Push up the middle key (exclude from both).
      const midIndex = Math.floor(node.keys.length / 2);
      const upKey = node.keys[midIndex];
      
      const rightNode = new BPlusTreeNode(false);
      rightNode.keys = node.keys.slice(midIndex + 1);
      rightNode.children = node.children.slice(midIndex + 1);
      
      node.keys = node.keys.slice(0, midIndex);
      node.children = node.children.slice(0, midIndex + 1);
      
      this.addStep('move', `Split internal. Pushed up ${upKey}`, [node.id, rightNode.id]);
      return { key: upKey, rightNode };
  }

  // --- Deletion ---
  public delete(key: number): VisualizationStep[] {
      this.steps = [];
      
      if (!this.root) {
          this.addStep('error', `Tree is empty`);
          return this.steps;
      }

      // Check if key exists
      if (!this.searchKeyExists(this.root, key)) {
          this.addStep('error', `Key ${key} not found in tree`);
          return this.steps;
      }

      this.addStep('message', `Deleting ${key}...`);
      this.deleteRecursive(this.root, key);

      // If root is empty, set root to null or first child
      if (this.root.keys.length === 0) {
          if (this.root.isLeaf) {
              this.root = null;
              this.addStep('message', `Tree is now empty`);
          } else if (this.root.children.length > 0) {
              this.root = this.root.children[0];
              this.addStep('message', `Root was empty, promoted child to root`);
          }
      }

      this.addStep('complete', `Deleted ${key} successfully`);
      return this.steps;
  }

  private deleteRecursive(node: BPlusTreeNode, key: number): void {
      if (node.isLeaf) {
          // Delete from leaf
          const idx = node.keys.indexOf(key);
          if (idx !== -1) {
              this.addStep('highlight', `Found ${key} in leaf`, [node.id]);
              node.keys.splice(idx, 1);
              this.addStep('delete', `Removed ${key} from leaf`, [node.id]);
          }
          return;
      }

      // Internal node: find child to descend
      let i = 0;
      while (i < node.keys.length && key >= node.keys[i]) i++;
      
      const child = node.children[i];
      this.addStep('highlight', `Navigating to child ${i}`, [child.id]);
      
      // Delete from child
      this.deleteRecursive(child, key);

      // Handle underflow in child
      if (child.keys.length < this.minKeys) {
          this.addStep('message', `Child underflow detected`, [child.id]);
          this.handleUnderflow(node, i);
      }

      // Update routing keys if needed
      this.updateRoutingKeys(node);
  }

  private handleUnderflow(parent: BPlusTreeNode, childIdx: number): void {
      
      // Try to borrow from left sibling
      if (childIdx > 0) {
          const leftSibling = parent.children[childIdx - 1];
          if (leftSibling.keys.length > this.minKeys) {
              this.borrowFromLeft(parent, childIdx);
              return;
          }
      }

      // Try to borrow from right sibling
      if (childIdx < parent.children.length - 1) {
          const rightSibling = parent.children[childIdx + 1];
          if (rightSibling.keys.length > this.minKeys) {
              this.borrowFromRight(parent, childIdx);
              return;
          }
      }

      // Must merge
      if (childIdx > 0) {
          // Merge with left sibling
          this.mergeWithLeft(parent, childIdx);
      } else {
          // Merge with right sibling
          this.mergeWithRight(parent, childIdx);
      }
  }

  private borrowFromLeft(parent: BPlusTreeNode, childIdx: number): void {
      const child = parent.children[childIdx];
      const leftSibling = parent.children[childIdx - 1];

      if (child.isLeaf) {
          // Leaf borrow
          const borrowedKey = leftSibling.keys.pop()!;
          child.keys.unshift(borrowedKey);
          
          // Update parent separator
          parent.keys[childIdx - 1] = child.keys[0];
          
          this.addStep('move', `Borrowed ${borrowedKey} from left sibling`, [leftSibling.id, child.id]);
      } else {
          // Internal borrow: rotate through parent
          const parentKey = parent.keys[childIdx - 1];
          const borrowedKey = leftSibling.keys.pop()!;
          const borrowedChild = leftSibling.children.pop()!;
          
          child.keys.unshift(parentKey);
          child.children.unshift(borrowedChild);
          parent.keys[childIdx - 1] = borrowedKey;
          
          this.addStep('move', `Rotated through parent`, [leftSibling.id, child.id]);
      }
  }

  private borrowFromRight(parent: BPlusTreeNode, childIdx: number): void {
      const child = parent.children[childIdx];
      const rightSibling = parent.children[childIdx + 1];

      if (child.isLeaf) {
          // Leaf borrow
          const borrowedKey = rightSibling.keys.shift()!;
          child.keys.push(borrowedKey);
          
          // Update parent separator
          parent.keys[childIdx] = rightSibling.keys[0];
          
          this.addStep('move', `Borrowed ${borrowedKey} from right sibling`, [rightSibling.id, child.id]);
      } else {
          // Internal borrow: rotate through parent
          const parentKey = parent.keys[childIdx];
          const borrowedKey = rightSibling.keys.shift()!;
          const borrowedChild = rightSibling.children.shift()!;
          
          child.keys.push(parentKey);
          child.children.push(borrowedChild);
          parent.keys[childIdx] = borrowedKey;
          
          this.addStep('move', `Rotated through parent`, [rightSibling.id, child.id]);
      }
  }

  private mergeWithLeft(parent: BPlusTreeNode, childIdx: number): void {
      const child = parent.children[childIdx];
      const leftSibling = parent.children[childIdx - 1];

      if (child.isLeaf) {
          // Merge leaves
          leftSibling.keys.push(...child.keys);
          leftSibling.next = child.next;
          
          // Remove separator from parent
          parent.keys.splice(childIdx - 1, 1);
          parent.children.splice(childIdx, 1);
          
          this.addStep('move', `Merged with left sibling`, [leftSibling.id, child.id]);
      } else {
          // Merge internal nodes: pull down parent key
          const parentKey = parent.keys[childIdx - 1];
          leftSibling.keys.push(parentKey, ...child.keys);
          leftSibling.children.push(...child.children);
          
          // Remove separator from parent
          parent.keys.splice(childIdx - 1, 1);
          parent.children.splice(childIdx, 1);
          
          this.addStep('move', `Merged internal nodes with parent key ${parentKey}`, [leftSibling.id, child.id]);
      }
  }

  private mergeWithRight(parent: BPlusTreeNode, childIdx: number): void {
      const child = parent.children[childIdx];
      const rightSibling = parent.children[childIdx + 1];

      if (child.isLeaf) {
          // Merge leaves
          child.keys.push(...rightSibling.keys);
          child.next = rightSibling.next;
          
          // Remove separator from parent
          parent.keys.splice(childIdx, 1);
          parent.children.splice(childIdx + 1, 1);
          
          this.addStep('move', `Merged with right sibling`, [child.id, rightSibling.id]);
      } else {
          // Merge internal nodes: pull down parent key
          const parentKey = parent.keys[childIdx];
          child.keys.push(parentKey, ...rightSibling.keys);
          child.children.push(...rightSibling.children);
          
          // Remove separator from parent
          parent.keys.splice(childIdx, 1);
          parent.children.splice(childIdx + 1, 1);
          
          this.addStep('move', `Merged internal nodes with parent key ${parentKey}`, [child.id, rightSibling.id]);
      }
  }

  private updateRoutingKeys(node: BPlusTreeNode): void {
      // Update routing keys in internal nodes to match first keys of child subtrees
      if (!node.isLeaf) {
          for (let i = 0; i < node.keys.length && i + 1 < node.children.length; i++) {
              const rightChild = node.children[i + 1];
              if (rightChild.isLeaf) {
                  // For leaf children, routing key is first key of right child
                  if (rightChild.keys.length > 0) {
                      node.keys[i] = rightChild.keys[0];
                  }
              } else {
                  // For internal children, find leftmost key in right subtree
                  const leftmostKey = this.findLeftmostKey(rightChild);
                  if (leftmostKey !== null) {
                      node.keys[i] = leftmostKey;
                  }
              }
          }
      }
  }

  private findLeftmostKey(node: BPlusTreeNode): number | null {
      if (node.isLeaf) {
          return node.keys.length > 0 ? node.keys[0] : null;
      }
      return node.children.length > 0 ? this.findLeftmostKey(node.children[0]) : null;
  }

  // Helper to check if key exists (without adding steps)
  private searchKeyExists(node: BPlusTreeNode, key: number): boolean {
      if (node.isLeaf) {
          return node.keys.includes(key);
      }
      
      let i = 0;
      while (i < node.keys.length && key >= node.keys[i]) i++;
      return this.searchKeyExists(node.children[i], key);
  }
}
