import type { BTreeNode } from '../../structures/b-tree/BTree';

export interface LayoutNode extends Omit<BTreeNode, 'clone' | 'children'> {
  x: number;
  y: number;
  width: number;
  children: LayoutNode[];
}

const KEY_WIDTH = 40;
const SPACING_X = 20; // Horizontal gap between sibling subtrees
const SPACING_Y = 100; // Vertical gap between levels

export const calculateLayout = (root: BTreeNode | null): LayoutNode | null => {
  if (!root) return null;
  return computeSubtree(root);
};

const computeSubtree = (node: BTreeNode): LayoutNode => {
  const layoutChildren = node.children.map(computeSubtree);
  
  // Calculate width of this node (just the box, no padding to match actual rendered width)
  const nodeBoxWidth = node.keys.length * KEY_WIDTH;

  // Calculate width required by children
  let childrenTotalWidth = 0;
  if (layoutChildren.length > 0) {
      layoutChildren.forEach(child => {
          childrenTotalWidth += child.width;
      });
      childrenTotalWidth += (layoutChildren.length - 1) * SPACING_X;
  }

  // Final subtree width is max of node box or children width
  const width = Math.max(nodeBoxWidth, childrenTotalWidth);

  // Position children
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
    x: 0, // Relative to subtree center
    y: 0,
    width
  };
};

const shiftTree = (node: LayoutNode, dx: number, dy: number) => {
  node.x += dx;
  node.y += dy;
  node.children.forEach(c => shiftTree(c, dx, dy));
};
