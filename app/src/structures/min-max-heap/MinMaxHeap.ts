import type { VisualizationStep } from '../common/types';

// Snapshot is just the array for Min-Max Heap
export type MinMaxSnapshot = number[];

export class MinMaxHeap {
  heap: number[];
  steps: VisualizationStep[];

  constructor() {
    this.heap = [];
    this.steps = [];
  }

  getSnapshot(): MinMaxSnapshot {
    return [...this.heap];
  }

  private addStep(type: VisualizationStep['type'], message: string, targetIndices: number[] = []) {
    // Map indices to string IDs for the visualizer (usually we use "node-index")
    const targetIds = targetIndices.map(i => `node-${i}`);
    this.steps.push({
      type,
      message,
      targetIds,
      payload: { snapshot: this.getSnapshot() }
    });
  }

  // --- Core Operations ---

  public insert(value: number): VisualizationStep[] {
    this.steps = [];
    this.heap.push(value);
    const index = this.heap.length - 1;
    this.addStep('insert', `Inserted ${value} at index ${index}`, [index]);
    
    this.pushUp(index);
    this.addStep('complete', `Insertion of ${value} complete`);
    return this.steps;
  }

  public extractMin(): VisualizationStep[] {
    this.steps = [];
    if (this.heap.length === 0) return this.steps;
    
    const min = this.heap[0];
    this.addStep('highlight', `Extracting Min: ${min}`, [0]);
    
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.addStep('move', `Moved last element ${last} to root`, [0]);
      this.pushDown(0);
    }
    
    this.addStep('complete', `Extracted Min: ${min}`);
    return this.steps;
  }

  public extractMax(): VisualizationStep[] {
    this.steps = [];
    if (this.heap.length === 0) return this.steps;
    
    if (this.heap.length === 1) {
      const max = this.heap.pop();
      this.addStep('complete', `Extracted Max: ${max}`);
      return this.steps;
    }

    // Max is at index 1 or 2
    let maxIdx = 1;
    if (this.heap.length > 2 && this.heap[2] > this.heap[1]) {
      maxIdx = 2;
    }
    
    const max = this.heap[maxIdx];
    this.addStep('highlight', `Extracting Max: ${max}`, [maxIdx]);
    
    const last = this.heap.pop()!;
    // If we popped the max itself (it was the last element), we are done
    if (maxIdx < this.heap.length) { 
      this.heap[maxIdx] = last;
      this.addStep('move', `Moved last element ${last} to index ${maxIdx}`, [maxIdx]);
      this.pushDown(maxIdx);
    }
    
    this.addStep('complete', `Extracted Max: ${max}`);
    return this.steps;
  }

  // --- Algorithms ---

  private pushUp(i: number) {
    if (i === 0) return;
    const p = Math.floor((i - 1) / 2);
    
    if (this.isMinLevel(i)) {
      if (this.heap[i] > this.heap[p]) {
        this.addStep('highlight', `${this.heap[i]} > parent ${this.heap[p]} (Min Level Violation)`, [i, p]);
        this.swap(i, p);
        this.pushUpMax(p);
      } else {
        this.pushUpMin(i);
      }
    } else { // Max level
      if (this.heap[i] < this.heap[p]) {
        this.addStep('highlight', `${this.heap[i]} < parent ${this.heap[p]} (Max Level Violation)`, [i, p]);
        this.swap(i, p);
        this.pushUpMin(p);
      } else {
        this.pushUpMax(i);
      }
    }
  }

  private pushUpMin(i: number) {
    const gp = Math.floor((Math.floor((i - 1) / 2) - 1) / 2);
    if (gp >= 0 && this.heap[i] < this.heap[gp]) {
      this.addStep('highlight', `Min Level: ${this.heap[i]} < grandparent ${this.heap[gp]}`, [i, gp]);
      this.swap(i, gp);
      this.pushUpMin(gp);
    }
  }

  private pushUpMax(i: number) {
    const gp = Math.floor((Math.floor((i - 1) / 2) - 1) / 2);
    if (gp >= 0 && this.heap[i] > this.heap[gp]) {
      this.addStep('highlight', `Max Level: ${this.heap[i]} > grandparent ${this.heap[gp]}`, [i, gp]);
      this.swap(i, gp);
      this.pushUpMax(gp);
    }
  }

  private pushDown(i: number) {
    if (this.isMinLevel(i)) {
      this.pushDownMin(i);
    } else {
      this.pushDownMax(i);
    }
  }

  private pushDownMin(i: number) {
    let m = i;
    
    // Check children and grandchildren
    // We iterate manually or check all 6 descendants
    const descendants = this.getDescendants(i);
    
    if (descendants.length === 0) return;

    // Find smallest descendant
    for (const idx of descendants) {
        if (this.heap[idx] < this.heap[m]) m = idx;
    }

    if (m !== i) {
        this.addStep('highlight', `Min Level: Swapping with smallest descendant ${this.heap[m]}`, [i, m]);
        this.swap(i, m);
        
        // If m is a grandchild
        if (m >= 4 * i + 3) { 
            const p = Math.floor((m - 1) / 2);
            if (this.heap[m] > this.heap[p]) {
                this.addStep('highlight', `Swap back: ${this.heap[m]} > parent ${this.heap[p]}`, [m, p]);
                this.swap(m, p);
            }
            this.pushDownMin(m);
        }
    }
  }

  private pushDownMax(i: number) {
    let m = i;
    const descendants = this.getDescendants(i);
    
    if (descendants.length === 0) return;

    // Find largest descendant
    for (const idx of descendants) {
        if (this.heap[idx] > this.heap[m]) m = idx;
    }

    if (m !== i) {
        this.addStep('highlight', `Max Level: Swapping with largest descendant ${this.heap[m]}`, [i, m]);
        this.swap(i, m);
        
        // If m is a grandchild
        if (m >= 4 * i + 3) { 
            const p = Math.floor((m - 1) / 2);
            if (this.heap[m] < this.heap[p]) {
                this.addStep('highlight', `Swap back: ${this.heap[m]} < parent ${this.heap[p]}`, [m, p]);
                this.swap(m, p);
            }
            this.pushDownMax(m);
        }
    }
  }

  private getDescendants(i: number): number[] {
      const idxs: number[] = [];
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < this.heap.length) idxs.push(left);
      if (right < this.heap.length) idxs.push(right);
      
      const ll = 2 * left + 1;
      const lr = 2 * left + 2;
      const rl = 2 * right + 1;
      const rr = 2 * right + 2;
      
      if (ll < this.heap.length) idxs.push(ll);
      if (lr < this.heap.length) idxs.push(lr);
      if (rl < this.heap.length) idxs.push(rl);
      if (rr < this.heap.length) idxs.push(rr);
      
      return idxs;
  }

  private isMinLevel(i: number): boolean {
    const level = Math.floor(Math.log2(i + 1));
    return level % 2 === 0;
  }

  private swap(i: number, j: number) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}
