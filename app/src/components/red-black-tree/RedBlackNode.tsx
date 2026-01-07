import React from 'react';
import { motion } from 'framer-motion';
import type { RBNode } from '../../structures/red-black-tree/RedBlackTree';

interface RedBlackNodeProps {
  node: RBNode;
  x: number;
  y: number;
  level: number;
  highlightedIds?: string[];
  selectedId?: string | null;
  onNodeClick?: (node: RBNode) => void;
}

const NODE_RADIUS = 25;

export const RedBlackNode: React.FC<RedBlackNodeProps> = ({ 
  node, x, y, level, highlightedIds = [], selectedId, onNodeClick 
}) => {
  const isHighlighted = highlightedIds.includes(node.id);
  const isSelected = selectedId === node.id;
  const isRed = node.color === 'red';

  return (
    <>
      {/* Node Circle */}
      <motion.div
        key={node.id}
        initial={{ left: x - NODE_RADIUS, top: y - NODE_RADIUS }}
        animate={{ left: x - NODE_RADIUS, top: y - NODE_RADIUS }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={(e) => { e.stopPropagation(); onNodeClick?.(node); }}
        className={`absolute flex items-center justify-center border-2 rounded-full shadow-md z-20 font-bold select-none text-white cursor-pointer hover:scale-110 transition-transform
          ${isSelected ? 'ring-4 ring-blue-400 border-blue-500' : isHighlighted ? 'ring-4 ring-amber-400 border-amber-500' : isRed ? 'border-red-600' : 'border-slate-800'}
          ${isRed ? 'bg-red-500' : 'bg-slate-900'}
        `}
        style={{
          width: NODE_RADIUS * 2,
          height: NODE_RADIUS * 2,
        }}
      >
        {node.value}
        
        {/* Null Leaves (Optional, maybe too cluttered?) */}
        {/* We generally don't show NIL nodes unless specifically teaching them. */}
      </motion.div>

      {/* Children */}
      {node.left && (
        <>
          <Edge parentX={x} parentY={y} childX={node.left.x} childY={node.left.y} childColor={node.left.color} />
          <RedBlackNode node={node.left} x={node.left.x} y={node.left.y} level={level + 1} highlightedIds={highlightedIds} selectedId={selectedId} onNodeClick={onNodeClick} />
        </>
      )}
      {node.right && (
        <>
          <Edge parentX={x} parentY={y} childX={node.right.x} childY={node.right.y} childColor={node.right.color} />
          <RedBlackNode node={node.right} x={node.right.x} y={node.right.y} level={level + 1} highlightedIds={highlightedIds} selectedId={selectedId} onNodeClick={onNodeClick} />
        </>
      )}
    </>
  );
};

const Edge = ({ parentX, parentY, childX, childY, childColor }: { parentX: number, parentY: number, childX: number, childY: number, childColor: 'red' | 'black' }) => {
  const strokeColor = childColor === 'red' ? '#ef4444' : '#cbd5e1'; // red-500 or slate-300
  return (
    <svg className="absolute top-0 left-0 w-px h-px overflow-visible pointer-events-none z-10">
      <motion.line
        initial={{ x1: parentX, y1: parentY + NODE_RADIUS, x2: childX, y2: childY - NODE_RADIUS }}
        animate={{ x1: parentX, y1: parentY + NODE_RADIUS, x2: childX, y2: childY - NODE_RADIUS }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        stroke={strokeColor}
        strokeWidth="2"
      />
    </svg>
  );
};
