import React from 'react';
import { motion } from 'framer-motion';
import type { LayoutNode } from './layout';

interface BTreeNodeProps {
  node: LayoutNode;
  highlightedIds?: string[];
  onKeyClick?: (key: number) => void;
  depth?: number; // Add depth parameter
}

const KEY_WIDTH = 40;
const NODE_HEIGHT = 40;

export const BTreeNode: React.FC<BTreeNodeProps> = ({ node, highlightedIds = [], onKeyClick, depth = 0 }) => {
  const isHighlighted = highlightedIds.includes(node.id);
  const nodeWidth = node.keys.length * KEY_WIDTH;
  
  // Calculate z-index: higher depth = lower z-index (further back)
  // Root (depth 0) has highest z-index
  const zIndex = 100 - depth;

  // Don't render empty nodes (happens during deletion transitions)
  if (node.keys.length === 0) {
    return (
      <>
        {node.children.map((child) => (
          <BTreeNode key={child.id} node={child} highlightedIds={highlightedIds} onKeyClick={onKeyClick} depth={depth + 1} />
        ))}
      </>
    );
  }

  return (
    <>
      {/* Render children first so parent nodes appear on top */}
      {node.children.map((child, idx) => {
        const nodeWidth = node.keys.length * KEY_WIDTH;
        // For n keys, we have n+1 children
        // Connection points should be at gaps: left edge, between keys, right edge
        // idx 0: left edge, idx 1: after key[0], idx 2: after key[1], etc.
        const connectionX = node.x - nodeWidth / 2 + (idx * KEY_WIDTH);

        return (
        <React.Fragment key={child.id}>
          {/* Connection Line */}
          <svg 
            className="absolute pointer-events-none" 
            style={{ 
              overflow: 'visible', 
              left: 0, 
              top: 0,
              width: 1,
              height: 1,
              zIndex: 5
            }}
          >
            <motion.line
              initial={{ pathLength: 0 }}
              animate={{ 
                x1: connectionX,
                y1: node.y + NODE_HEIGHT / 2, 
                x2: child.x, 
                y2: child.y - NODE_HEIGHT / 2,
                pathLength: 1
              }}
              stroke="#cbd5e1"
              strokeWidth="2"
            />
          </svg>
          <BTreeNode node={child} highlightedIds={highlightedIds} onKeyClick={onKeyClick} depth={depth + 1} />
        </React.Fragment>
      )})}

      {/* Render parent node last so it appears on top */}
      <motion.div
        key={node.id}
        animate={{ 
          left: node.x - nodeWidth / 2,
          top: node.y - NODE_HEIGHT / 2
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`absolute flex items-center bg-white border-2 rounded-lg shadow-md overflow-hidden
          ${isHighlighted ? 'border-amber-500 ring-4 ring-amber-200' : 'border-slate-800'}
        `}
        style={{
          width: nodeWidth,
          height: NODE_HEIGHT,
          zIndex: zIndex, // Use calculated z-index based on depth
        }}
      >
        {node.keys.map((key) => (
          <motion.div
            key={key} 
            onClick={(e) => { e.stopPropagation(); onKeyClick?.(key); }}
            className="flex items-center justify-center border-r border-slate-200 last:border-r-0 font-bold text-sm bg-slate-50 cursor-pointer hover:bg-blue-100 hover:text-blue-600 transition-colors"
            style={{ width: KEY_WIDTH, height: '100%' }}
          >
            {key}
          </motion.div>
        ))}
      </motion.div>
    </>
  );
};
