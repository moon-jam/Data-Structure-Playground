import type { VisualizationStep } from '../common/types';

export type SmmhSnapshot = (number | null)[];

export class SMMH {
  heap: (number | null)[];
  steps: VisualizationStep[];

  constructor() {
    // Index 0: Unused
    // Index 1: Root (Empty in SMMH)
    // Data starts from index 2
    this.heap = [null, null];
    this.steps = [];
  }

  getSnapshot(): SmmhSnapshot {
    return [...this.heap];
  }

  private addStep(type: VisualizationStep['type'], message: string, targetIndices: number[] = []) {
    const targetIds = targetIndices.map(i => `node-${i}`);
    this.steps.push({
      type,
      message,
      targetIds,
      payload: { snapshot: this.getSnapshot() }
    });
  }

  public insert(value: number): VisualizationStep[] {
    this.steps = [];
    const i = this.heap.length;
    this.heap.push(value);
    this.addStep('insert', `Inserted ${value} at position ${i}`, [i]);

    if (i === 2) {
        this.addStep('complete', `First element placed in index 2`);
        return this.steps;
    }

    this.bubbleUp(i);
    this.addStep('complete', `Insertion complete`);
    return this.steps;
  }

  public extractMin(): VisualizationStep[] {
    this.steps = [];
    if (this.heap.length <= 2) return this.steps;

    const min = this.heap[2];
    this.addStep('highlight', `Extracting Min: ${min}`, [2]);

    const last = this.heap.pop()!;
    if (this.heap.length > 2) {
      this.heap[2] = last;
      this.addStep('move', `Moved last element ${last} to index 2`, [2]);
      this.pushDown(2);
    }

    this.addStep('complete', `Extracted Min: ${min}`);
    return this.steps;
  }

  public extractMax(): VisualizationStep[] {
    this.steps = [];
    if (this.heap.length <= 2) return this.steps;

    // Max is either at index 3 or index 2 (if only one element)
    const maxIdx = this.heap.length > 3 ? 3 : 2;
    const max = this.heap[maxIdx];
    this.addStep('highlight', `Extracting Max: ${max}`, [maxIdx]);

    const last = this.heap.pop()!;
    if (this.heap.length > maxIdx) {
      this.heap[maxIdx] = last;
      this.addStep('move', `Moved last element ${last} to index ${maxIdx}`, [maxIdx]);
      this.pushDown(maxIdx);
    }

    this.addStep('complete', `Extracted Max: ${max}`);
    return this.steps;
  }

  // --- Algorithms ---

  private bubbleUp(i: number) {
    let curr = i;
    while (curr > 3) {
      const p = Math.floor(curr / 4); // Grandparent index
      if (p < 1) break;

      const leftChildOfP = 2 * p;
      const rightChildOfP = 2 * p + 1;

      // P2 Violation: Check against parent's left child (Min boundary)
      if (this.heap[curr]! < this.heap[leftChildOfP]!) {
        this.addStep('highlight', `P2 Violation: ${this.heap[curr]} < Min Boundary ${this.heap[leftChildOfP]}`, [curr, leftChildOfP]);
        this.swap(curr, leftChildOfP);
        curr = leftChildOfP;
      } 
      // P2 Violation: Check against parent's right child (Max boundary)
      else if (this.heap[curr]! > this.heap[rightChildOfP]!) {
        this.addStep('highlight', `P2 Violation: ${this.heap[curr]} > Max Boundary ${this.heap[rightChildOfP]}`, [curr, rightChildOfP]);
        this.swap(curr, rightChildOfP);
        curr = rightChildOfP;
      } 
      else break;
    }

    // P1 Violation: Check siblings
    if (curr % 2 === 1 && this.heap[curr]! < this.heap[curr - 1]!) {
      this.addStep('highlight', `P1 Violation: Right sibling ${this.heap[curr]} < Left sibling ${this.heap[curr-1]}`, [curr, curr-1]);
      this.swap(curr, curr - 1);
      this.bubbleUp(curr - 1);
    } else if (curr % 2 === 0 && curr + 1 < this.heap.length && this.heap[curr]! > this.heap[curr + 1]!) {
      this.addStep('highlight', `P1 Violation: Left sibling ${this.heap[curr]} > Right sibling ${this.heap[curr+1]}`, [curr, curr+1]);
      this.swap(curr, curr + 1);
      this.bubbleUp(curr + 1);
    }
  }

  private pushDown(i: number) {
    let curr = i;
    while (true) {
      // SMMH pushDown is complex. We must find the smallest/largest in subtree.
      // For simplicity, we check P1 and P2 locally and trickle down.
      
      // Fix P1 (Siblings)
      if (curr % 2 === 0 && curr + 1 < this.heap.length && this.heap[curr]! > this.heap[curr+1]!) {
          this.addStep('highlight', `Fixing P1: Swapping siblings`, [curr, curr+1]);
          this.swap(curr, curr+1);
      } else if (curr % 2 === 1 && this.heap[curr]! < this.heap[curr-1]!) {
          this.addStep('highlight', `Fixing P1: Swapping siblings`, [curr, curr-1]);
          this.swap(curr, curr-1);
      }

      // Find best child to swap with
      const left = 2 * curr;
      const right = 2 * curr + 1;
      let next = curr;

      if (left < this.heap.length) {
          if (curr % 2 === 0) { // On "Min" side of siblings
              if (this.heap[left]! < this.heap[next]!) next = left;
          } else { // On "Max" side
              if (this.heap[left]! > this.heap[next]!) next = left;
          }
      }
      if (right < this.heap.length) {
          if (curr % 2 === 0) {
              if (this.heap[right]! < this.heap[next]!) next = right;
          } else {
              if (this.heap[right]! > this.heap[next]!) next = right;
          }
      }

      if (next !== curr) {
          this.addStep('highlight', `Trickle down to ${next}`, [curr, next]);
          this.swap(curr, next);
          curr = next;
      } else break;
    }
  }

  private swap(i: number, j: number) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}
