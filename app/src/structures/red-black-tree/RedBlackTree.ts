import { v4 as uuidv4 } from 'uuid';
import type { VisualizationStep } from '../common/types';

export type RBColor = 'red' | 'black';

export class RBNode {
  id: string;
  value: number;
  color: RBColor;
  left: RBNode | null;
  right: RBNode | null;
  parent: RBNode | null; // Parent pointer is crucial for RB Tree logic

  // Visual coordinates (managed by layout engine)
  x: number = 0;
  y: number = 0;

  constructor(value: number, color: RBColor = 'red') {
    this.id = uuidv4();
    this.value = value;
    this.color = color;
    this.left = null;
    this.right = null;
    this.parent = null;
  }

  clone(): RBNode {
    const newNode = new RBNode(this.value, this.color);
    newNode.id = this.id;
    if (this.left) {
      newNode.left = this.left.clone();
      newNode.left.parent = newNode;
    }
    if (this.right) {
      newNode.right = this.right.clone();
      newNode.right.parent = newNode;
    }
    return newNode;
  }
}

export type RBSnapshot = RBNode | null;

export interface RBViolation {
  type: 'root-red' | 'red-red' | 'black-height' | 'double-black' | 'deleted-black-node';
  nodeIds: string[];
  message: string;
  // Additional info for delete fixup
  parentId?: string;  // Parent of the double-black node
  isLeftChild?: boolean;  // Position of double-black node relative to parent
}

export class RedBlackTree {
  root: RBNode | null;
  steps: VisualizationStep[];
  deletionStrategy: 'predecessor' | 'successor';

  constructor(deletionStrategy: 'predecessor' | 'successor' = 'successor') {
    this.root = null;
    this.steps = [];
    this.deletionStrategy = deletionStrategy;
  }


  getSnapshot(): RBSnapshot {
    return this.root ? this.root.clone() : null;
  }

  /** Clears the tree */
  clear(): void {
    this.root = null;
    this.steps = [];
  }

  /** Find a node by value, returns the node or null if not found */
  find(value: number): RBNode | null {
    let current = this.root;
    while (current) {
      if (value === current.value) return current;
      if (value < current.value) current = current.left;
      else current = current.right;
    }
    return null;
  }

  /** Get a node by value (alias for find, used by lessons) */
  getNode(value: number): RBNode | null {
    return this.find(value);
  }

  private addStep(type: VisualizationStep['type'], message: string, targetIds: string[] = []) {
    this.steps.push({
      type,
      message,
      targetIds,
      payload: { snapshot: this.getSnapshot() }
    });
  }

  // --- Rotations ---
  // Left Rotate x
  //      x              y
  //     / \            / \
  //    α   y    =>    x   γ
  //       / \        / \
  //      β   γ      α   β
  private leftRotate(x: RBNode) {
    const y = x.right!;
    x.right = y.left;
    if (y.left) y.left.parent = x;
    y.parent = x.parent;

    if (!x.parent) {
      this.root = y;
    } else if (x === x.parent.left) {
      x.parent.left = y;
    } else {
      x.parent.right = y;
    }
    y.left = x;
    x.parent = y;

    // Capture state after rotation
    this.addStep('move', `Left rotation: node ${x.value} rotated with node ${y.value}`, [y.id, x.id]);
  }

  private rightRotate(y: RBNode) {
    const x = y.left!;
    y.left = x.right;
    if (x.right) x.right.parent = y;
    x.parent = y.parent;

    if (!y.parent) {
      this.root = x;
    } else if (y === y.parent.left) {
      y.parent.left = x;
    } else {
      y.parent.right = x;
    }
    x.right = y;
    y.parent = x;

    // Capture state after rotation
    this.addStep('move', `Right rotation: node ${y.value} rotated with node ${x.value}`, [x.id, y.id]);
  }

  // --- Insertion ---
  public insert(value: number): VisualizationStep[] {
    this.steps = [];

    const node = new RBNode(value, 'red'); // Always insert as red

    // Standard BST Insert
    if (!this.root) {
      node.color = 'black'; // Root property
      this.root = node;
      this.addStep('insert', `Inserted root ${value} (Black)`, [node.id]);
      return this.steps;
    }

    let curr: RBNode | null = this.root;
    let parent: RBNode | null = null;

    while (curr) {
      parent = curr;
      if (value < curr.value) {
        curr = curr.left;
      } else if (value > curr.value) {
        curr = curr.right;
      } else {
        this.addStep('error', `Value ${value} already exists`, [curr.id]);
        return this.steps;
      }
    }

    node.parent = parent;
    if (value < parent!.value) {
      parent!.left = node;
    } else {
      parent!.right = node;
    }

    this.addStep('insert', `Inserted ${value} (Red)`, [node.id]);

    // Fix Red-Red violation
    this.insertFixup(node);

    this.addStep('complete', `Insertion of ${value} complete`);
    return this.steps;
  }

  private insertFixup(node: RBNode) {
    let k = node;

    while (k.parent && k.parent.color === 'red') {
      // k.parent is red, so k.parent cannot be root (root is black).
      // So grandparent exists.
      const gp = k.parent.parent;
      if (!gp) break;
      if (k.parent === gp.left) {
        const uncle = gp.right;

        // Case 3: Uncle is Red -> Recolor
        if (uncle && uncle.color === 'red') {
          this.addStep('highlight', `Case 3: Uncle ${uncle.value} is Red - Recoloring nodes ${k.parent.value}, ${uncle.value}, ${gp.value}`, [k.parent.id, uncle.id, gp.id]);
          k.parent.color = 'black';
          uncle.color = 'black';
          gp.color = 'red';
          this.addStep('move', `Recolored: Parent ${k.parent.value}→Black, Uncle ${uncle.value}→Black, Grandparent ${gp.value}→Red`, [k.parent.id, uncle.id, gp.id]);
          k = gp;
        } else {
          // Case 4: Uncle Black, Triangle (LR) -> Rotate to Line (LL)
          if (k === k.parent.right) {
            k = k.parent;
            this.addStep('highlight', `Case 4: Triangle (LR) - Left rotate node ${k.value}`, [k.id]);
            this.leftRotate(k);
          }
          // Case 5: Uncle Black, Line (LL) -> Recolor and Rotate
          this.addStep('highlight', `Case 5: Line (LL) - Operating on nodes ${k.parent!.value} and ${gp.value}`, [k.parent!.id, gp.id]);
          k.parent!.color = 'black';
          gp.color = 'red';
          this.addStep('move', `Recolored: Node ${k.parent!.value}→Black, Node ${gp.value}→Red`, [k.parent!.id, gp.id]);
          this.rightRotate(gp);
        }
      } else {
        // Mirror cases (Parent is Right Child)
        const uncle = gp.left;

        if (uncle && uncle.color === 'red') {
          this.addStep('highlight', `Case 3 (Mirror): Uncle ${uncle.value} is Red - Recoloring nodes ${k.parent.value}, ${uncle.value}, ${gp.value}`, [k.parent.id, uncle.id, gp.id]);
          k.parent.color = 'black';
          uncle.color = 'black';
          gp.color = 'red';
          this.addStep('move', `Recolored: Parent ${k.parent.value}→Black, Uncle ${uncle.value}→Black, Grandparent ${gp.value}→Red`, [k.parent.id, uncle.id, gp.id]);
          k = gp;
        } else {
          if (k === k.parent.left) {
            k = k.parent;
            this.addStep('highlight', `Case 4 (Mirror): Triangle (RL) - Right rotate node ${k.value}`, [k.id]);
            this.rightRotate(k);
          }
          this.addStep('highlight', `Case 5 (Mirror): Line (RR) - Operating on nodes ${k.parent!.value} and ${gp.value}`, [k.parent!.id, gp.id]);
          k.parent!.color = 'black';
          gp.color = 'red';
          this.addStep('move', `Recolored: Node ${k.parent!.value}→Black, Node ${gp.value}→Red`, [k.parent!.id, gp.id]);
          this.leftRotate(gp);
        }
      }
    }

    if (this.root!.color === 'red') {
      this.root!.color = 'black';
      this.addStep('move', `Root node ${this.root!.value} recolored to black`, [this.root!.id]);
    }
  }

  // --- Validation ---
  public validate(): RBViolation[] {
    const violations: RBViolation[] = [];
    if (!this.root) return violations;

    // 1. Root must be black
    if (this.root.color === 'red') {
      violations.push({ type: 'root-red', nodeIds: [this.root.id], message: 'Root must be black' });
    }

    // 2. No Red-Red violations
    this.checkRedRed(this.root, violations);

    // 3. Black Height Consistency
    this.checkBlackHeight(this.root, violations);

    return violations;
  }

  private checkRedRed(node: RBNode | null, violations: RBViolation[]) {
    if (!node) return;
    if (node.color === 'red') {
      if (node.left && node.left.color === 'red') {
        violations.push({ type: 'red-red', nodeIds: [node.id, node.left.id], message: 'Red node cannot have Red child' });
      }
      if (node.right && node.right.color === 'red') {
        violations.push({ type: 'red-red', nodeIds: [node.id, node.right.id], message: 'Red node cannot have Red child' });
      }
    }
    this.checkRedRed(node.left, violations);
    this.checkRedRed(node.right, violations);
  }

  private checkBlackHeight(node: RBNode | null, violations: RBViolation[]): number {
    if (!node) return 1; // Null nodes are black

    const leftBH = this.checkBlackHeight(node.left, violations);
    const rightBH = this.checkBlackHeight(node.right, violations);

    if (leftBH !== rightBH && leftBH !== -1 && rightBH !== -1) {
      violations.push({ type: 'black-height', nodeIds: [node.id], message: `Black height mismatch: L=${leftBH}, R=${rightBH}` });
      return -1; // Propagate error
    }

    if (leftBH === -1 || rightBH === -1) return -1;

    return leftBH + (node.color === 'black' ? 1 : 0);
  }

  // --- Manual Operations ---
  public insertManual(value: number): VisualizationStep[] {
    this.steps = [];

    // Check for duplicate
    if (this.findNode(this.root, value)) {
      this.addStep('error', `Value ${value} already exists in the tree`);
      return this.steps;
    }

    const node = new RBNode(value, 'red');

    if (!this.root) {
      this.root = node; // Insert as Red initially
      this.addStep('insert', `Inserted root ${value} (Red) - Violation!`, [node.id]);
      return this.steps;
    }

    this._insertBST(this.root, node);
    this.addStep('insert', `Inserted ${value} (Red)`, [node.id]);

    const violations = this.validate();
    if (violations.length > 0) {
      this.addStep('error', `Violations found: ${violations.map(v => v.type).join(', ')}`, violations.flatMap(v => v.nodeIds));
    }

    return this.steps;
  }

  private _insertBST(parent: RBNode, node: RBNode) {
    if (node.value < parent.value) {
      if (!parent.left) {
        parent.left = node;
        node.parent = parent;
      } else {
        this._insertBST(parent.left, node);
      }
    } else {
      if (!parent.right) {
        parent.right = node;
        node.parent = parent;
      } else {
        this._insertBST(parent.right, node);
      }
    }
  }

  public toggleColor(nodeId: string): VisualizationStep[] {
    this.steps = [];
    const node = this.getNodeById(nodeId);
    if (node) {
      node.color = node.color === 'red' ? 'black' : 'red';
      this.addStep('move', `Toggled node ${node.value} to ${node.color}`, [node.id]);
    }
    return this.steps;
  }

  public rotateNode(value: number, direction: 'left' | 'right'): VisualizationStep[] {
    this.steps = [];
    const node = this.findNode(this.root, value);
    if (!node) return this.steps;

    if (direction === 'left') {
      if (!node.right) {
        this.addStep('error', 'Cannot rotate left: No right child', [node.id]);
        return this.steps;
      }
      this.leftRotate(node);
    } else {
      if (!node.left) {
        this.addStep('error', 'Cannot rotate right: No left child', [node.id]);
        return this.steps;
      }
      this.rightRotate(node);
    }
    return this.steps;
  }

  public findNode(node: RBNode | null, value: number): RBNode | null {
    if (!node) return null;
    if (node.value === value) return node;
    if (value < node.value) return this.findNode(node.left, value);
    return this.findNode(node.right, value);
  }

  public getNodeById(id: string): RBNode | null {
    return this._getNodeById(this.root, id);
  }

  private _getNodeById(node: RBNode | null, id: string): RBNode | null {
    if (!node) return null;
    if (node.id === id) return node;
    return this._getNodeById(node.left, id) || this._getNodeById(node.right, id);
  }

  // --- Deletion ---
  public delete(value: number): VisualizationStep[] {
    this.steps = [];
    let z = this.root;
    while (z) {
      if (value < z.value) z = z.left;
      else if (value > z.value) z = z.right;
      else break;
    }

    if (!z) {
      this.addStep('error', `Value ${value} not found`);
      return this.steps;
    }

    this.addStep('highlight', `Found node ${value} to delete`, [z.id]);

    let y = z;
    let yOriginalColor = y.color;
    let x: RBNode | null;
    let xParent: RBNode | null;

    if (!z.left) {
      x = z.right;
      xParent = z.parent; // Parent of x will be z.parent
      this.transplant(z, z.right);
    } else if (!z.right) {
      x = z.left;
      xParent = z.parent;
      this.transplant(z, z.left);
    } else {
      // Use strategy to choose replacement node
      if (this.deletionStrategy === 'predecessor') {
        y = this.maximum(z.left);
        this.addStep('highlight', `Replace with predecessor (max of left subtree): ${y.value}`, [y.id, z.id]);
      } else {
        y = this.minimum(z.right);
        this.addStep('highlight', `Replace with successor (min of right subtree): ${y.value}`, [y.id, z.id]);
      }
      yOriginalColor = y.color;

      if (this.deletionStrategy === 'predecessor') {
        x = y.left;
        if (y.parent === z) {
          xParent = y;
        } else {
          xParent = y.parent;
          this.transplant(y, y.left);
          y.left = z.left;
          if (y.left) y.left.parent = y;
        }
        this.transplant(z, y);
        y.right = z.right;
        if (y.right) y.right.parent = y;
        y.color = z.color;
      } else {
        x = y.right;
        if (y.parent === z) {
          xParent = y;
        } else {
          xParent = y.parent;
          this.transplant(y, y.right);
          y.right = z.right;
          if (y.right) y.right.parent = y;
        }
        this.transplant(z, y);
        y.left = z.left;
        if (y.left) y.left.parent = y;
        y.color = z.color;
      }
    }

    if (yOriginalColor === 'black') {
      this.deleteFixup(x, x ? x.parent : xParent);
    }

    this.addStep('complete', `Deletion of ${value} complete`);
    return this.steps;
  }

  // --- Manual Deletion (no automatic fixup) ---
  // Returns { steps, needsFixup, fixupInfo } where fixupInfo contains position for manual fix
  public deleteManual(value: number): {
    steps: VisualizationStep[],
    needsFixup: boolean,
    fixupParentId: string | null,
    fixupIsLeft: boolean | null,
    deletedWasBlack: boolean
  } {
    this.steps = [];
    let z = this.root;
    while (z) {
      if (value < z.value) z = z.left;
      else if (value > z.value) z = z.right;
      else break;
    }

    if (!z) {
      this.addStep('error', `Value ${value} not found`);
      return { steps: this.steps, needsFixup: false, fixupParentId: null, fixupIsLeft: null, deletedWasBlack: false };
    }

    this.addStep('highlight', `Found node ${value} to delete`, [z.id]);

    let y = z;
    let yOriginalColor = y.color;
    let x: RBNode | null;
    let xParent: RBNode | null;
    let xIsLeft: boolean | null = null;

    if (!z.left) {
      x = z.right;
      xParent = z.parent;
      xIsLeft = z.parent ? z === z.parent.left : null;
      this.transplant(z, z.right);
      this.addStep('delete', `Removed node ${value} (no left child)`, []);
    } else if (!z.right) {
      x = z.left;
      xParent = z.parent;
      xIsLeft = z.parent ? z === z.parent.left : null;
      this.transplant(z, z.left);
      this.addStep('delete', `Removed node ${value} (no right child)`, []);
    } else {
      // Use strategy to choose replacement node
      if (this.deletionStrategy === 'predecessor') {
        y = this.maximum(z.left);
        this.addStep('highlight', `Replace with predecessor (max of left subtree): ${y.value}`, [y.id, z.id]);
      } else {
        y = this.minimum(z.right);
        this.addStep('highlight', `Replace with successor (min of right subtree): ${y.value}`, [y.id, z.id]);
      }
      yOriginalColor = y.color;

      if (this.deletionStrategy === 'predecessor') {
        x = y.left;
        if (y.parent === z) {
          xParent = y;
          xIsLeft = true; // x will be left child of y after transplant
        } else {
          xParent = y.parent;
          xIsLeft = y.parent ? y === y.parent.left : null;
          this.transplant(y, y.left);
          y.left = z.left;
          if (y.left) y.left.parent = y;
        }
        this.transplant(z, y);
        y.right = z.right;
        if (y.right) y.right.parent = y;
        y.color = z.color;
      } else {
        x = y.right;
        if (y.parent === z) {
          xParent = y;
          xIsLeft = false; // x will be right child of y after transplant
        } else {
          xParent = y.parent;
          xIsLeft = y.parent ? y === y.parent.left : null;
          this.transplant(y, y.right);
          y.right = z.right;
          if (y.right) y.right.parent = y;
        }
        this.transplant(z, y);
        y.left = z.left;
        if (y.left) y.left.parent = y;
        y.color = z.color;
      }
      this.addStep('delete', `Replaced ${z.value} with ${y.value}`, [y.id]);
    }

    // Check if fixup is needed (deleted/moved node was black)
    // CRITICAL FIX: Even if x is RED (simple replacement), we need to trigger fixup logic 
    // so the user can perform the "Recolor Red Replacement to Black" step manually.
    const needsFixup = yOriginalColor === 'black';

    if (needsFixup) {
      // Record violation for manual fix
      this.addStep('error', `Black node deleted - fixup required! Double-black at ${x ? `node ${x.value}` : 'NIL position'}`,
        xParent ? [xParent.id] : []);
    } else if (yOriginalColor === 'red') {
      this.addStep('complete', `Deletion complete - deleted node was Red, no fixup needed`);
    } else if (x && x.color === 'red') {
      // Simple case: x is red, just recolor to black
      this.addStep('highlight', `Node ${x.value} should be recolored to Black to restore balance`, [x.id]);
    }

    return {
      steps: this.steps,
      needsFixup,
      fixupParentId: xParent?.id || null,
      fixupIsLeft: xIsLeft,
      deletedWasBlack: yOriginalColor === 'black'
    };
  }

  private transplant(u: RBNode, v: RBNode | null) {
    if (!u.parent) {
      this.root = v;
    } else if (u === u.parent.left) {
      u.parent.left = v;
    } else {
      u.parent.right = v;
    }
    if (v) v.parent = u.parent;
  }

  private minimum(node: RBNode): RBNode {
    while (node.left) node = node.left;
    return node;
  }

  private maximum(node: RBNode): RBNode {
    while (node.right) node = node.right;
    return node;
  }

  private deleteFixup(x: RBNode | null, parent: RBNode | null) {
    while ((!x || x.color === 'black') && x !== this.root) {
      const isLeft = (parent?.left === x);

      if (isLeft) {
        let w = parent!.right;

        if (w && w.color === 'red') {
          this.addStep('highlight', `Fixup Case 1: Sibling ${w.value} is Red, operating on nodes ${w.value} and ${parent!.value}`, [w.id, parent!.id]);
          w.color = 'black';
          parent!.color = 'red';
          this.leftRotate(parent!);
          w = parent!.right;
        }

        if ((!w?.left || w.left.color === 'black') && (!w?.right || w.right.color === 'black')) {
          this.addStep('highlight', `Fixup Case 2: Sibling ${w ? w.value : 'null'} is Black with Black nephews`, [w ? w.id : parent!.id]);
          if (w) w.color = 'red';
          x = parent;
          parent = x?.parent || null;
        } else {
          if (!w?.right || w.right.color === 'black') {
            this.addStep('highlight', `Fixup Case 3: Close nephew is Red - Rotate sibling ${w!.value}`, [w!.id]);
            if (w?.left) w.left.color = 'black';
            if (w) w.color = 'red';
            this.rightRotate(w!);
            w = parent!.right;
          }
          this.addStep('highlight', `Fixup Case 4: Far nephew is Red - Rotate parent ${parent!.value}`, [parent!.id]);
          if (w) {
            w.color = parent!.color;
            if (w.right) w.right.color = 'black';
          }
          parent!.color = 'black';
          this.leftRotate(parent!);
          x = this.root;
          parent = null;
        }
      } else {
        let w = parent!.left;

        if (w && w.color === 'red') {
          this.addStep('highlight', `Fixup Case 1 (Mirror): Sibling ${w.value} is Red, operating on nodes ${w.value} and ${parent!.value}`, [w.id, parent!.id]);
          w.color = 'black';
          parent!.color = 'red';
          this.rightRotate(parent!);
          w = parent!.left;
        }

        if ((!w?.right || w.right.color === 'black') && (!w?.left || w.left.color === 'black')) {
          this.addStep('highlight', `Fixup Case 2 (Mirror): Sibling ${w ? w.value : 'null'} is Black with Black nephews`, [w ? w.id : parent!.id]);
          if (w) w.color = 'red';
          x = parent;
          parent = x?.parent || null;
        } else {
          if (!w?.left || w.left.color === 'black') {
            this.addStep('highlight', `Fixup Case 3 (Mirror): Close nephew is Red - Rotate sibling ${w!.value}`, [w!.id]);
            if (w?.right) w.right.color = 'black';
            if (w) w.color = 'red';
            this.leftRotate(w!);
            w = parent!.left;
          }
          this.addStep('highlight', `Fixup Case 4 (Mirror): Far nephew is Red - Rotate parent ${parent!.value}`, [parent!.id]);
          if (w) {
            w.color = parent!.color;
            if (w.left) w.left.color = 'black';
          }
          parent!.color = 'black';
          this.rightRotate(parent!);
          x = this.root;
          parent = null;
        }
      }
    }

    if (x) x.color = 'black';
  }
}
