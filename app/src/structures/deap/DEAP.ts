import type { VisualizationStep } from '../common/types';

// Snapshot is just the array. We use 1-based indexing logic, but store in 0-based array.
// To make it easier, let's just pad index 0 and 1 with null/dummy.
export type DeapSnapshot = (number | null)[];

export class DEAP {
  heap: (number | null)[];
  steps: VisualizationStep[];

  constructor() {
    // Index 0: Unused
    // Index 1: Root (Empty)
    // Index 2: Min-Heap Root
    // Index 3: Max-Heap Root
    this.heap = [null, null];
    this.steps = [];
  }

  getSnapshot(): DeapSnapshot {
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
    
    // Add to end
    const i = this.heap.length;
    this.heap.push(value);
    this.addStep('insert', `Inserted ${value} at position ${i}`, [i]);

    if (i === 2) {
        this.addStep('complete', `First element placed in Min-Heap root`);
        return this.steps;
    }
    if (i === 3) {
        // Special check: ensure 2 <= 3
        if (this.heap[2]! > this.heap[3]!) {
            this.addStep('highlight', `Min-Heap root > Max-Heap root. Swapping.`, [2, 3]);
            this.swap(2, 3);
        }
        this.addStep('complete', `Placed in Max-Heap root`);
        return this.steps;
    }

    // Determine if we are in Min or Max heap
    if (this.inMinHeap(i)) {
        let j = this.partner(i);
        
        // If partner doesn't exist, check partner's parent (effectively partner of i's parent)
        if (j >= this.heap.length) {
            j = Math.floor(j / 2);
        }

        if (this.heap[j] !== null && value > this.heap[j]!) {
            this.addStep('highlight', `${value} > partner ${this.heap[j]}, swap and push up Max`, [i, j]);
            this.swap(i, j);
            this.pushUpMax(j);
        } else {
            this.pushUpMin(i);
        }
    } else {
        const j = this.partner(i);
        if (j < this.heap.length && this.heap[j] !== null && value < this.heap[j]!) {
            this.addStep('highlight', `${value} < partner ${this.heap[j]}, swap and push up Min`, [i, j]);
            this.swap(i, j);
            this.pushUpMin(j);
        } else {
            this.pushUpMax(i);
        }
    }

    this.addStep('complete', `Insertion complete`);
    return this.steps;
  }

  public extractMin(): VisualizationStep[] {
      this.steps = [];
      if (this.heap.length <= 2) return this.steps; // Empty

      const min = this.heap[2];
      this.addStep('highlight', `Extracting Min: ${min}`, [2]);

      const last = this.heap.pop()!;
      if (this.heap.length > 2) {
          this.heap[2] = last;
          this.addStep('move', `Moved last element ${last} to Min Root`, [2]);
          this.pushDownMin(2);
      }
      
      this.addStep('complete', `Extracted Min: ${min}`);
      return this.steps;
  }

  public extractMax(): VisualizationStep[] {
      this.steps = [];
      if (this.heap.length <= 2) return this.steps;

      // If only one element (at index 2)
      if (this.heap.length === 3) {
          const max = this.heap[2];
          this.heap.pop();
          this.addStep('complete', `Extracted Max: ${max} (Single element)`);
          return this.steps;
      }

      const max = this.heap[3];
      this.addStep('highlight', `Extracting Max: ${max}`, [3]);

      const last = this.heap.pop()!;
      if (this.heap.length > 3) {
          this.heap[3] = last;
          this.addStep('move', `Moved last element ${last} to Max Root`, [3]);
          this.pushDownMax(3);
      }

      this.addStep('complete', `Extracted Max: ${max}`);
      return this.steps;
  }

  // --- Algorithms ---

  private pushUpMin(i: number) {
      let curr = i;
      while (curr > 2) { // 2 is root of min heap
          const p = Math.floor(curr / 2);
          if (this.heap[curr]! < this.heap[p]!) {
              this.addStep('highlight', `Min: ${this.heap[curr]} < parent ${this.heap[p]}, swap`, [curr, p]);
              this.swap(curr, p);
              curr = p;
          } else {
              break;
          }
      }
  }

  private pushUpMax(i: number) {
      let curr = i;
      while (curr > 3) { // 3 is root of max heap
          const p = Math.floor(curr / 2);
          if (this.heap[curr]! > this.heap[p]!) {
              this.addStep('highlight', `Max: ${this.heap[curr]} > parent ${this.heap[p]}, swap`, [curr, p]);
              this.swap(curr, p);
              curr = p;
          } else {
              break;
          }
      }
  }

  private pushDownMin(i: number) {
      let curr = i;
      while (true) {
          const left = 2 * curr;
          const right = 2 * curr + 1;
          let smallest = curr;

          if (left < this.heap.length && this.heap[left]! < this.heap[smallest]!) smallest = left;
          if (right < this.heap.length && this.heap[right]! < this.heap[smallest]!) smallest = right;

          if (smallest !== curr) {
              this.addStep('highlight', `Min: Swapping with smaller child ${this.heap[smallest]}`, [curr, smallest]);
              this.swap(curr, smallest);
              curr = smallest;
          } else {
              // Check DEAP property with partner
              const p = this.partner(curr);
              if (p < this.heap.length) {
                  if (this.heap[curr]! > this.heap[p]!) {
                      this.addStep('highlight', `DEAP Violation: Min ${this.heap[curr]} > Max Partner ${this.heap[p]}`, [curr, p]);
                      this.swap(curr, p);
                      this.pushUpMax(p);
                  }
              } else if (p > 3) {
                  // Partner doesn't exist, check partner's parent
                  const pp = Math.floor(p / 2);
                  if (this.heap[curr]! > this.heap[pp]!) {
                      this.addStep('highlight', `DEAP Violation: Min ${this.heap[curr]} > Max Partner's Parent ${this.heap[pp]}`, [curr, pp]);
                      this.swap(curr, pp);
                      this.pushUpMax(pp);
                  }
              }
              break;
          }
      }
  }

  private pushDownMax(i: number) {
      let curr = i;
      while (true) {
          const left = 2 * curr;
          const right = 2 * curr + 1;
          let largest = curr;

          if (left < this.heap.length && this.heap[left]! > this.heap[largest]!) largest = left;
          if (right < this.heap.length && this.heap[right]! > this.heap[largest]!) largest = right;

          if (largest !== curr) {
              this.addStep('highlight', `Max: Swapping with larger child ${this.heap[largest]}`, [curr, largest]);
              this.swap(curr, largest);
              curr = largest;
          } else {
              // Check DEAP property with partner
              const p = this.partner(curr);
              // If p exists, we are in Max heap, so partner is in Min heap.
              // Min heap is smaller indices. Partner is "min partner".
              // p is the corresponding node in Min Heap.
              
              if (this.heap[p]! > this.heap[curr]!) {
                  this.addStep('highlight', `DEAP Violation: Max ${this.heap[curr]} < Min Partner ${this.heap[p]}`, [curr, p]);
                  this.swap(curr, p);
                  this.pushUpMin(p);
              }
              break;
          }
      }
  }

  // --- Helpers ---

  private swap(i: number, j: number) {
      const temp = this.heap[i];
      this.heap[i] = this.heap[j];
      this.heap[j] = temp;
  }

  private inMinHeap(i: number): boolean {
      // Check 2nd MSB? Or just trace up.
      // Root is 1. Left is 2. Right is 3.
      if (i <= 1) return false; // Should not happen
      if (i === 2) return true;
      if (i === 3) return false;
      return this.inMinHeap(Math.floor(i / 2));
  }

  private partner(i: number): number {
      // If i is in Min, find j in Max.
      // Min subheap root is 2. Max subheap root is 3.
      // They are symmetric.
      // To map i (in Min) to j (in Max):
      // Remove MSB of i, replace with ...?
      // Actually simpler: Add 2^(depth-1) to i?
      
      // Let's use bit manipulation.
      // i = 1xxxx (binary). 2nd bit is 0 for Min, 1 for Max.
      // Flip the 2nd MSB.
      const msb = Math.floor(Math.log2(i));
      const mask = 1 << (msb - 1);
      return i ^ mask;
  }
}
