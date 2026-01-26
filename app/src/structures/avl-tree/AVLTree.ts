import type { VisualizationStep } from '../common/types';
import { v4 as uuidv4 } from 'uuid';

export class AVLNode {
  id: string;
  value: number;
  height: number;
  left: AVLNode | null;
  right: AVLNode | null;
  x: number = 0; // Layout coordinate
  y: number = 0; // Layout coordinate

  constructor(value: number, id?: string) {
    this.id = id || uuidv4();
    this.value = value;
    this.height = 1;
    this.left = null;
    this.right = null;
  }

  static fromJSON(data: any): AVLNode | null {
    if (!data) return null;
    const node = new AVLNode(data.value, data.id);
    node.height = data.height;
    node.x = data.x || 0;
    node.y = data.y || 0;
    node.left = AVLNode.fromJSON(data.left);
    node.right = AVLNode.fromJSON(data.right);
    return node;
  }

  clone(): AVLNode {
    const newNode = new AVLNode(this.value, this.id);
    newNode.height = this.height;
    newNode.x = this.x;
    newNode.y = this.y;
    if (this.left) newNode.left = this.left.clone();
    if (this.right) newNode.right = this.right.clone();
    return newNode;
  }
}

export class AVLTree {
  root: AVLNode | null;
  steps: VisualizationStep[];
  deletionStrategy: 'predecessor' | 'successor';

  constructor(deletionStrategy: 'predecessor' | 'successor' = 'successor') {
    this.root = null;
    this.steps = [];
    this.deletionStrategy = deletionStrategy;
  }

  toJSON(): string { return JSON.stringify(this.root); }
  fromJSON(json: string): void {
    if (!json || json === 'null') this.root = null;
    else this.root = AVLNode.fromJSON(JSON.parse(json));
  }

  private addStep(type: VisualizationStep['type'], message: string, targetIds?: string[]) {
    this.steps.push({
      type, message, targetIds,
      payload: { rootSnapshot: this.root ? this.root.clone() : null }
    });
  }

  /** Find a node by value, returns the node or null if not found */
  find(value: number): AVLNode | null {
    let current = this.root;
    while (current) {
      if (value === current.value) return current;
      if (value < current.value) current = current.left;
      else current = current.right;
    }
    return null;
  }

  height(node: AVLNode | null): number { return node ? node.height : 0; }
  getBalance(node: AVLNode | null): number {
    if (!node) return 0;
    return this.height(node.left) - this.height(node.right);
  }

  private patchTree(oldNode: AVLNode, newNode: AVLNode) {
    if (this.root === oldNode) {
        this.root = newNode;
    } else {
        const parent = this.findParent(this.root, oldNode.value);
        if (parent) {
            if (parent.left === oldNode) parent.left = newNode;
            else parent.right = newNode;
        }
    }
  }

  insert(value: number): VisualizationStep[] {
    this.steps = [];
    if (!this.root) {
        this.root = new AVLNode(value);
        this.addStep('insert', `Created root node ${value}`, [this.root.id]);
    } else {
        this.root = this._insert(this.root, value);
    }
    this.addStep('complete', `Value ${value} insertion finished`);
    return this.steps;
  }

  private _insert(node: AVLNode, value: number): AVLNode {
    this.addStep('highlight', `Search: ${value} at ${node.value}`, [node.id]);

    if (value < node.value) {
        if (!node.left) {
            node.left = new AVLNode(value);
            this.addStep('insert', `Connected ${value} to the left of ${node.value}`, [node.left.id]);
        } else {
            node.left = this._insert(node.left, value);
        }
    } else if (value > node.value) {
        if (!node.right) {
            node.right = new AVLNode(value);
            this.addStep('insert', `Connected ${value} to the right of ${node.value}`, [node.right.id]);
        } else {
            node.right = this._insert(node.right, value);
        }
    } else return node;

    node.height = Math.max(this.height(node.left), this.height(node.right)) + 1;
    const b = this.getBalance(node);

    if (Math.abs(b) > 1) {
        if (b > 1) {
            if (this.getBalance(node.left) >= 0) return this.rightRotate(node, false);
            else {
                node.left = this.leftRotate(node.left!, false);
                return this.rightRotate(node, false);
            }
        } else {
            if (this.getBalance(node.right) <= 0) return this.leftRotate(node, false);
            else {
                node.right = this.rightRotate(node.right!, false);
                return this.leftRotate(node, false);
            }
        }
    } else {
        this.addStep('highlight', `Node ${node.value} balanced (BF: ${b})`, [node.id]);
    }
    return node;
  }

  insertManual(value: number): VisualizationStep[] {
    this.steps = [];
    if (!this.root) {
        this.root = new AVLNode(value);
        this.addStep('insert', `Created root node ${value}`, [this.root.id]);
    } else {
        this.root = this._insertBST(this.root, value);
    }
    this.addStep('complete', `Manual insertion done`);
    return this.steps;
  }

  private _insertBST(node: AVLNode, value: number): AVLNode {
    if (value < node.value) {
        if (!node.left) node.left = new AVLNode(value);
        else node.left = this._insertBST(node.left, value);
    } else if (value > node.value) {
        if (!node.right) node.right = new AVLNode(value);
        else node.right = this._insertBST(node.right, value);
    }
    node.height = Math.max(this.height(node.left), this.height(node.right)) + 1;
    return node;
  }



  rotateNode(value: number, direction: 'left' | 'right'): VisualizationStep[] {
    this.steps = [];
    const parent = this.findParent(this.root, value);
    const node = (this.root?.value === value) ? this.root : (parent?.left?.value === value ? parent?.left : parent?.right);
    if (!node) return this.steps;
    if (direction === 'left' && !node.right) return [{ type: 'error', message: 'error.noRightChild', payload: {val: value}}];
    if (direction === 'right' && !node.left) return [{ type: 'error', message: 'error.noLeftChild', payload: {val: value}}];

    // Pointer swapping is internal to leftRotate/rightRotate
    if (direction === 'left') this.leftRotate(node, false);
    else this.rightRotate(node, false);

    // CRITICAL FIX: Manually update heights from root to ensure ancestors (and snapshot) are correct
    this.updateAllHeights(this.root);

    this.addStep('complete', `Rotation finished`);
    return this.steps;
  }

  public updateAllHeights(node: AVLNode | null): number {
    if (!node) return 0;
    node.height = Math.max(this.updateAllHeights(node.left), this.updateAllHeights(node.right)) + 1;
    return node.height;
  }

  public rightRotate(y: AVLNode, silent = true): AVLNode {
    const x = y.left!;
    const T2 = x.right;
    x.right = y;
    y.left = T2;
    y.height = Math.max(this.height(y.left), this.height(y.right)) + 1;
    x.height = Math.max(this.height(x.left), this.height(x.right)) + 1;
    
    this.patchTree(y, x);
    if (!silent) this.addStep('rotate', `Right rotating at ${y.value}`, [y.id, x.id]);
    return x;
  }

  public leftRotate(x: AVLNode, silent = true): AVLNode {
    const y = x.right!;
    const T2 = y.left;
    y.left = x;
    x.right = T2;
    x.height = Math.max(this.height(x.left), this.height(x.right)) + 1;
    y.height = Math.max(this.height(y.left), this.height(y.right)) + 1;
    
    this.patchTree(x, y);
    if (!silent) this.addStep('rotate', `Left rotating at ${x.value}`, [x.id, y.id]);
    return y;
  }

  delete(value: number): VisualizationStep[] {
    this.steps = [];
    // Check if value exists first
    if (!this.find(value)) {
      this.steps.push({ type: 'error', message: 'error.valueNotFound', targetIds: [], payload: { val: value } });
      return this.steps;
    }
    this.root = this._delete(this.root, value, true);
    this.addStep('complete', `Value ${value} deletion finished`);
    return this.steps;
  }

  deleteManual(value: number): VisualizationStep[] {
    this.steps = [];
    // Check if value exists first
    if (!this.find(value)) {
      this.steps.push({ type: 'error', message: 'error.valueNotFound', targetIds: [], payload: { val: value } });
      return this.steps;
    }
    this.root = this._delete(this.root, value, false);
    this.addStep('complete', `Manual deletion done`);
    return this.steps;
  }

  private _delete(node: AVLNode | null, value: number, autoBalance: boolean): AVLNode | null {
    if (!node) return null;
    this.addStep('highlight', `Searching ${value}...`, [node.id]);
    
    if (value < node.value) {
      node.left = this._delete(node.left, value, autoBalance);
    } else if (value > node.value) {
      node.right = this._delete(node.right, value, autoBalance);
    } else {
      // Found the node to delete
      this.addStep('message', `Found ${value}. Removing...`);

      // Case 1: Leaf node (no children)
      if (!node.left && !node.right) {
        this.addStep('delete', `Deleted leaf node ${value}`, [node.id]);
        return null; // Node is removed
      }

      // Case 2: One child
      if (!node.left) {
        this.addStep('move', `Replacing ${value} with right child ${node.right!.value}`, [node.id, node.right!.id]);
        return node.right; // Replace with right child
      }
      if (!node.right) {
        this.addStep('move', `Replacing ${value} with left child ${node.left!.value}`, [node.id, node.left!.id]);
        return node.left; // Replace with left child
      }

      // Case 3: Two children - use successor or predecessor strategy
      if (this.deletionStrategy === 'successor') {
        // Successor is the minimum in right subtree (has no left child)
        const successor = this.minValueNode(node.right);
        const originalValue = node.value;
        const originalId = node.id;
        
        this.addStep('highlight', `Finding successor: ${successor.value}`, [successor.id]);
        this.addStep('move', `Replace ${originalValue} with successor ${successor.value}`, [originalId, successor.id]);
        
        // Swap value and id
        node.value = successor.value;
        node.id = successor.id;
        
        // First, delete the successor from its original position (with rebalancing if autoBalance)
        node.right = this._deleteMinSilent(node.right, autoBalance);
        
        // NOW add the delete step - snapshot shows tree AFTER deletion
        this.addStep('delete', `Deleted successor node from original position`, []);
      } else {
        // Predecessor is the maximum in left subtree (has no right child)
        const predecessor = this.maxValueNode(node.left);
        const originalValue = node.value;
        const originalId = node.id;
        
        this.addStep('highlight', `Finding predecessor: ${predecessor.value}`, [predecessor.id]);
        this.addStep('move', `Replace ${originalValue} with predecessor ${predecessor.value}`, [originalId, predecessor.id]);
        
        // Swap value and id
        node.value = predecessor.value;
        node.id = predecessor.id;
        
        // First, delete the predecessor from its original position (with rebalancing if autoBalance)
        node.left = this._deleteMaxSilent(node.left, autoBalance);
        
        // NOW add the delete step - snapshot shows tree AFTER deletion
        this.addStep('delete', `Deleted predecessor node from original position`, []);
      }
    }

    // Update height
    node.height = Math.max(this.height(node.left), this.height(node.right)) + 1;
    
    if (!autoBalance) return node;

    // Rebalance - this is where rotations get their own steps
    const b = this.getBalance(node);
    
    // Show imbalance first if there is one
    if (Math.abs(b) > 1) {
      this.addStep('highlight', `Node ${node.value} is imbalanced (BF: ${b})`, [node.id]);
    }

    // Left Left Case
    if (b > 1 && this.getBalance(node.left) >= 0)
        return this.rightRotate(node, false);

    // Left Right Case
    if (b > 1 && this.getBalance(node.left) < 0) {
        node.left = this.leftRotate(node.left!, false);
        return this.rightRotate(node, false);
    }

    // Right Right Case
    if (b < -1 && this.getBalance(node.right) <= 0)
        return this.leftRotate(node, false);

    // Right Left Case
    if (b < -1 && this.getBalance(node.right) > 0) {
        node.right = this.rightRotate(node.right!, false);
        return this.leftRotate(node, false);
    }

    return node;
  }

  /** Delete the minimum node. When autoBalance is true, rebalances the subtree. */
  private _deleteMinSilent(node: AVLNode | null, autoBalance: boolean = false): AVLNode | null {
    if (!node) return null;
    if (!node.left) return node.right; // This is the min, return its right child
    node.left = this._deleteMinSilent(node.left, autoBalance);
    node.height = Math.max(this.height(node.left), this.height(node.right)) + 1;
    
    if (!autoBalance) return node;
    
    // Rebalance this node after deletion
    const b = this.getBalance(node);
    if (b > 1 && this.getBalance(node.left) >= 0) return this.rightRotate(node, false);
    if (b > 1 && this.getBalance(node.left) < 0) {
        node.left = this.leftRotate(node.left!, false);
        return this.rightRotate(node, false);
    }
    if (b < -1 && this.getBalance(node.right) <= 0) return this.leftRotate(node, false);
    if (b < -1 && this.getBalance(node.right) > 0) {
        node.right = this.rightRotate(node.right!, false);
        return this.leftRotate(node, false);
    }
    return node;
  }

  /** Delete the maximum node. When autoBalance is true, rebalances the subtree. */
  private _deleteMaxSilent(node: AVLNode | null, autoBalance: boolean = false): AVLNode | null {
    if (!node) return null;
    if (!node.right) return node.left; // This is the max, return its left child
    node.right = this._deleteMaxSilent(node.right, autoBalance);
    node.height = Math.max(this.height(node.left), this.height(node.right)) + 1;
    
    if (!autoBalance) return node;
    
    // Rebalance this node after deletion
    const b = this.getBalance(node);
    if (b > 1 && this.getBalance(node.left) >= 0) return this.rightRotate(node, false);
    if (b > 1 && this.getBalance(node.left) < 0) {
        node.left = this.leftRotate(node.left!, false);
        return this.rightRotate(node, false);
    }
    if (b < -1 && this.getBalance(node.right) <= 0) return this.leftRotate(node, false);
    if (b < -1 && this.getBalance(node.right) > 0) {
        node.right = this.rightRotate(node.right!, false);
        return this.leftRotate(node, false);
    }
    return node;
  }



  private minValueNode(node: AVLNode): AVLNode {
    let curr = node;
    while (curr.left) curr = curr.left;
    return curr;
  }

  private maxValueNode(node: AVLNode): AVLNode {
    let curr = node;
    while (curr.right) curr = curr.right;
    return curr;
  }

  public findParent(node: AVLNode | null, val: number): AVLNode | null {
    if (!node || node.value === val) return null;
    if ((node.left?.value === val) || (node.right?.value === val)) return node;
    return val < node.value ? this.findParent(node.left, val) : this.findParent(node.right, val);
  }

  checkBalance(n: AVLNode | null = this.root): { allIds: string[], lowestId: string | null } {
    const ids: { id: string, depth: number }[] = [];
    this._check(n, ids, 0);
    if (ids.length === 0) return { allIds: [], lowestId: null };
    const lowest = ids.reduce((prev, curr) => (curr.depth > prev.depth) ? curr : prev);
    return { allIds: ids.map(i => i.id), lowestId: lowest.id };
  }

  private _check(n: AVLNode | null, ids: {id: string, depth: number}[], depth: number) {
    if (!n) return;
    const b = this.getBalance(n);
    if (b > 1 || b < -1) ids.push({ id: n.id, depth });
    this._check(n.left, ids, depth + 1);
    this._check(n.right, ids, depth + 1);
  }

  getNodeById(id: string): AVLNode | null { return this._getById(this.root, id); }
  private _getById(n: AVLNode | null, id: string): AVLNode | null {
    if (!n || n.id === id) return n;
    return this._getById(n.left, id) || this._getById(n.right, id);
  }
}
