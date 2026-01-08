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
      const gp = k.parent.parent!;
      
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
