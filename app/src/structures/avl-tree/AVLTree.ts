import type { VisualizationStep } from '../common/types';
import { v4 as uuidv4 } from 'uuid';

export class AVLNode {
  id: string;
  value: number;
  height: number;
  left: AVLNode | null;
  right: AVLNode | null;

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
    node.left = AVLNode.fromJSON(data.left);
    node.right = AVLNode.fromJSON(data.right);
    return node;
  }

  clone(): AVLNode {
    const newNode = new AVLNode(this.value, this.id);
    newNode.height = this.height;
    if (this.left) newNode.left = this.left.clone();
    if (this.right) newNode.right = this.right.clone();
    return newNode;
  }
}

export class AVLTree {
  root: AVLNode | null;
  steps: VisualizationStep[];

  constructor() {
    this.root = null;
    this.steps = [];
  }

  toJSON(): string {
    return JSON.stringify(this.root);
  }

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

  height(node: AVLNode | null): number {
    return node ? node.height : 0;
  }

  getBalance(node: AVLNode | null): number {
    if (!node) return 0;
    return this.height(node.left) - this.height(node.right);
  }

  insert(value: number): VisualizationStep[] {
    this.steps = [];
    this.root = this._insert(this.root, value);
    this.addStep('complete', `Value ${value} insertion complete`);
    return this.steps;
  }

  private _insert(node: AVLNode | null, value: number): AVLNode {
    if (!node) {
      const newNode = new AVLNode(value);
      if (!this.root) this.root = newNode; 
      this.addStep('insert', `New leaf: ${value}`, [newNode.id]);
      return newNode;
    }
    this.addStep('highlight', `Search: ${value} vs ${node.value}`, [node.id]);
    if (value < node.value) node.left = this._insert(node.left, value);
    else if (value > node.value) node.right = this._insert(node.right, value);
    else return node;

    node.height = Math.max(this.height(node.left), this.height(node.right)) + 1;
    const b = this.getBalance(node);
    this.addStep('highlight', `Trace back: ${node.value} (BF: ${b})`, [node.id]);

    if (b > 1) {
        if (this.getBalance(node.left) >= 0) return this.rightRotate(node, false);
        else {
            this.addStep('message', `LR Case: Rotating left child first`);
            node.left = this.leftRotate(node.left!, false);
            return this.rightRotate(node, false);
        }
    }
    if (b < -1) {
        if (this.getBalance(node.right) <= 0) return this.leftRotate(node, false);
        else {
            this.addStep('message', `RL Case: Rotating right child first`);
            node.right = this.rightRotate(node.right!, false);
            return this.leftRotate(node, false);
        }
    }
    return node;
  }

  insertManual(value: number): VisualizationStep[] {
    this.steps = [];
    this.root = this._insertBST(this.root, value);
    this.addStep('complete', `Manual insertion done`);
    return this.steps;
  }

  private _insertBST(node: AVLNode | null, value: number): AVLNode {
    if (!node) {
      const newNode = new AVLNode(value);
      if (!this.root) this.root = newNode;
      this.addStep('insert', `Created node ${value}`, [newNode.id]);
      return newNode;
    }
    if (value < node.value) node.left = this._insertBST(node.left, value);
    else if (value > node.value) node.right = this._insertBST(node.right, value);
    node.height = Math.max(this.height(node.left), this.height(node.right)) + 1;
    return node;
  }

  deleteManual(value: number): VisualizationStep[] {
    this.steps = [];
    this.root = this._delete(this.root, value, false);
    this.addStep('complete', `Manual deletion done`);
    return this.steps;
  }

  rotateNode(value: number, direction: 'left' | 'right'): VisualizationStep[] {
    this.steps = [];
    const parent = this.findParent(this.root, value);
    let node = (this.root?.value === value) ? this.root : (parent?.left?.value === value ? parent?.left : parent?.right);
    if (!node) return this.steps;
    if (direction === 'left' && !node.right) return [{ type: 'error', message: 'error.noRightChild', payload: {val: value}}];
    if (direction === 'right' && !node.left) return [{ type: 'error', message: 'error.noLeftChild', payload: {val: value}}];

    const newNode = direction === 'left' ? this.leftRotate(node, false) : this.rightRotate(node, false);
    if (!parent) this.root = newNode;
    else if (parent.left === node) parent.left = newNode;
    else parent.right = newNode;

    this.updateHeight(this.root);
    this.addStep('complete', `Rotation finished`);
    return this.steps;
  }

  public rightRotate(y: AVLNode, silent = true): AVLNode {
    const x = y.left!;
    const T2 = x.right;
    x.right = y;
    y.left = T2;
    y.height = Math.max(this.height(y.left), this.height(y.right)) + 1;
    x.height = Math.max(this.height(x.left), this.height(x.right)) + 1;
    if (!silent) this.addStep('rotate', `Right rotate: ${y.value} moves down-right`, [y.id, x.id]);
    return x;
  }

  public leftRotate(x: AVLNode, silent = true): AVLNode {
    const y = x.right!;
    const T2 = y.left;
    y.left = x;
    x.right = T2;
    x.height = Math.max(this.height(x.left), this.height(x.right)) + 1;
    y.height = Math.max(this.height(y.left), this.height(y.right)) + 1;
    if (!silent) this.addStep('rotate', `Left rotate: ${x.value} moves down-left`, [x.id, y.id]);
    return y;
  }

  delete(value: number): VisualizationStep[] {
    this.steps = [];
    this.root = this._delete(this.root, value, true);
    this.addStep('complete', `Value ${value} deletion complete`);
    return this.steps;
  }

  private _delete(node: AVLNode | null, value: number, autoBalance: boolean): AVLNode | null {
    if (!node) return null;
    this.addStep('highlight', `Search: ${value} vs ${node.value}`, [node.id]);
    if (value < node.value) node.left = this._delete(node.left, value, autoBalance);
    else if (value > node.value) node.right = this._delete(node.right, value, autoBalance);
    else {
      if (!node.left || !node.right) node = node.left || node.right;
      else {
        const temp = this.minValueNode(node.right);
        node.value = temp.value;
        node.id = temp.id;
        node.right = this._delete(node.right, temp.value, autoBalance);
      }
    }
    if (!node) return null;
    node.height = Math.max(this.height(node.left), this.height(node.right)) + 1;
    if (!autoBalance) return node;
    const b = this.getBalance(node);
    if (b > 1) {
        if (this.getBalance(node.left) >= 0) return this.rightRotate(node, false);
        else { node.left = this.leftRotate(node.left!, false); return this.rightRotate(node, false); }
    }
    if (b < -1) {
        if (this.getBalance(node.right) <= 0) return this.leftRotate(node, false);
        else { node.right = this.rightRotate(node.right!, false); return this.leftRotate(node, false); }
    }
    return node;
  }

  private minValueNode(node: AVLNode): AVLNode {
    let curr = node;
    while (curr.left) curr = curr.left;
    return curr;
  }

  private findParent(node: AVLNode | null, val: number): AVLNode | null {
    if (!node || node.value === val) return null;
    if ((node.left?.value === val) || (node.right?.value === val)) return node;
    return val < node.value ? this.findParent(node.left, val) : this.findParent(node.right, val);
  }

  private updateHeight(node: AVLNode | null) {
    if (!node) return;
    this.updateHeight(node.left);
    this.updateHeight(node.right);
    node.height = Math.max(this.height(node.left), this.height(node.right)) + 1;
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

  getNodeById(id: string): AVLNode | null {
    return this._getById(this.root, id);
  }

  private _getById(n: AVLNode | null, id: string): AVLNode | null {
    if (!n || n.id === id) return n;
    return this._getById(n.left, id) || this._getById(n.right, id);
  }
}
