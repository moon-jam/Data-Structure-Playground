import type { BPlusTreeNode } from '../../structures/b-plus-tree/BPlusTree';

export interface LayoutNode extends Omit<BPlusTreeNode, 'clone' | 'children' | 'next'> {
  x: number;
  y: number;
  width: number;
  children: LayoutNode[];
  nextId: string | null; // Just the ID for visualization lookup
}

const KEY_WIDTH = 40;
const NODE_PADDING = 20;
const SPACING_X = 20;
const SPACING_Y = 100;

export const calculateLayout = (root: BPlusTreeNode | null): { root: LayoutNode | null, positions: Map<string, {x: number, y: number}> } => {
  if (!root) return { root: null, positions: new Map() };
  
  const positions = new Map<string, {x: number, y: number}>();
  const layoutRoot = computeSubtree(root, positions);
  
  // Center root at 0,0 (relative to itself, no shift needed as per previous fix)
  // But we need to populate positions map correctly.
  // computeSubtree sets relative positions.
  // We need absolute positions for 'next' link drawing?
  // computeSubtree calculates relative to parent? No, it calculates relative to 0,0 of its own bounding box center?
  // Let's check the BTree logic.
  // shiftTree applies delta.
  
  // We need a second pass or accumulated shift to get global coordinates for the positions map.
  // Actually, computeSubtree returns x,y relative to the subtree.
  // When we shift, we update x,y.
  // We should update the map during shift.
  
  // Refactor: compute, then update map.
  updatePositionsMap(layoutRoot, positions);
  
  return { root: layoutRoot, positions };
};

const updatePositionsMap = (node: LayoutNode, map: Map<string, {x: number, y: number}>) => {
    map.set(node.id, { x: node.x, y: node.y });
    node.children.forEach(c => updatePositionsMap(c, map));
};

const computeSubtree = (node: BPlusTreeNode, positions: Map<string, any>): LayoutNode => {
  const layoutChildren = node.children.map(c => computeSubtree(c, positions));
  
  const nodeBoxWidth = node.keys.length * KEY_WIDTH + NODE_PADDING;

  let childrenTotalWidth = 0;
  if (layoutChildren.length > 0) {
      layoutChildren.forEach(child => {
          childrenTotalWidth += child.width;
      });
      childrenTotalWidth += (layoutChildren.length - 1) * SPACING_X;
  }

  const width = Math.max(nodeBoxWidth, childrenTotalWidth);

  if (layoutChildren.length > 0) {
      let currentX = -childrenTotalWidth / 2;
      layoutChildren.forEach(child => {
          shiftTree(child, currentX + child.width / 2, SPACING_Y);
          currentX += child.width + SPACING_X;
      });
  }

  return {
    ...node,
    children: layoutChildren,
    x: 0,
    y: 0,
    width,
    nextId: node.next ? node.next.id : null
  };
};

const shiftTree = (node: LayoutNode, dx: number, dy: number) => {
  node.x += dx;
  node.y += dy;
  node.children.forEach(c => shiftTree(c, dx, dy));
};
