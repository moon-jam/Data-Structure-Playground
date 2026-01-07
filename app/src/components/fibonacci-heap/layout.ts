import type { FibNodeSnapshot } from '../../structures/fibonacci-heap/FibonacciHeap';

export interface LayoutNode extends FibNodeSnapshot {
  x: number;
  y: number;
  width: number;
  children: LayoutNode[];
}

const NODE_SIZE = 50; // Width of node circle
const SPACING_X = 20; // Horizontal gap between subtrees
const SPACING_Y = 80; // Vertical gap between levels

export const calculateLayout = (roots: FibNodeSnapshot[]): LayoutNode[] => {
  const processedRoots = roots.map(r => computeSubtree(r));
  
  let currentX = 0;
  for (const root of processedRoots) {
    // Determine the offset needed to place this tree next to the previous one
    // The root's 'x' inside processedRoots is relative to its own subtree left edge.
    // We place the left edge at currentX.
    shiftTree(root, currentX, 0);
    currentX += root.width + SPACING_X;
  }

  // Optional: Center the whole forest at 0
  const totalWidth = currentX - SPACING_X;
  const offsetX = -totalWidth / 2;
  processedRoots.forEach(r => shiftTree(r, offsetX, 0));

  return processedRoots;
};

// Computes dimensions and relative positions (starting at 0,0 for top-left of subtree bounds)
const computeSubtree = (node: FibNodeSnapshot): LayoutNode => {
  if (!node.children || node.children.length === 0) {
    return {
      ...node,
      children: [],
      x: NODE_SIZE / 2, // Center of the node
      y: 0,
      width: NODE_SIZE
    };
  }

  const processedChildren = node.children.map(computeSubtree);
  
  let currentX = 0;
  for (const child of processedChildren) {
    shiftTree(child, currentX, SPACING_Y);
    currentX += child.width + SPACING_X;
  }
  
  const totalChildrenWidth = currentX - SPACING_X;
  
  // Parent should be centered over children
  // The children bounds range from 0 to totalChildrenWidth
  const parentX = totalChildrenWidth / 2;

  // If parent is wider than children (unlikely with circle nodes but possible logic), center children under parent
  // But here NODE_SIZE is usually smaller than children width.
  
  // If single child, align directly
  // If multiple, align to center of bounds.
  
  // We need to ensure the parent doesn't overlap if children are very narrow? 
  // Minimum width is NODE_SIZE.
  
  const width = Math.max(NODE_SIZE, totalChildrenWidth);
  
  // If NODE_SIZE > totalChildrenWidth, we need to shift children to center them
  if (NODE_SIZE > totalChildrenWidth) {
      const shift = (NODE_SIZE - totalChildrenWidth) / 2;
      processedChildren.forEach(c => shiftTree(c, shift, 0));
  }

  return {
    ...node,
    children: processedChildren,
    x: Math.max(parentX, NODE_SIZE / 2),
    y: 0,
    width
  };
};

const shiftTree = (node: LayoutNode, dx: number, dy: number) => {
  node.x += dx;
  node.y += dy;
  node.children.forEach(c => shiftTree(c, dx, dy));
};
