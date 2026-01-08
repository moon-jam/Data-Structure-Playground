import React from 'react';
import { motion } from 'framer-motion';
import type { LayoutNode } from './layout';

interface BPlusTreeNodeProps {
  node: LayoutNode;
  positions: Map<string, {x: number, y: number}>;
  highlightedIds?: string[];
  onKeyClick?: (key: number) => void;
  depth?: number;
}

const KEY_WIDTH = 40;
const NODE_HEIGHT = 40;

export const BPlusTreeNode: React.FC<BPlusTreeNodeProps> = ({ node, positions, highlightedIds = [], onKeyClick, depth = 0 }) => {
  const isHighlighted = highlightedIds.includes(node.id);
  const nodeWidth = node.keys.length * KEY_WIDTH;
  const zIndex = 100 - depth;

  // Link to next leaf
  const nextPos = node.nextId ? positions.get(node.nextId) : null;

  return (
    <>
      {/* Children */}
      {node.children.map((child, idx) => {
        // Line logic similar to BTree
        const connectionX = node.x - nodeWidth / 2 + (idx * KEY_WIDTH); // Gap-based? Or simplified?
        // B+ Tree internal nodes are separators.
        // K[i] separates Child[i] and Child[i+1].
        // So line to Child[i] should be to the LEFT of K[i].
        // i=0 -> Left of K[0].
        // i=1 -> Right of K[0] / Left of K[1].
        
        // nodeWidth / 2 is center.
        // Left edge is node.x - nodeWidth/2.
        // K[i] starts at Left + i*KW.
        // Gap[i] is at Left + i*KW.
        // Correct.
        
        return (
        <React.Fragment key={child.id}>
          <svg className="absolute pointer-events-none" style={{ overflow: 'visible', left: 0, top: 0, width: 1, height: 1, zIndex: 5 }}>
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
          <BPlusTreeNode node={child} positions={positions} highlightedIds={highlightedIds} onKeyClick={onKeyClick} depth={depth + 1} />
        </React.Fragment>
      )})}

      {/* Next Link (Leaf Layer) */}
      {node.isLeaf && nextPos && (
          <svg className="absolute pointer-events-none" style={{ overflow: 'visible', left: 0, top: 0, width: 1, height: 1, zIndex: 5 }}>
            <motion.path
              animate={{ d: `M ${node.x + nodeWidth/2 + 5} ${node.y} L ${nextPos.x - 20} ${nextPos.y}` }}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="4 2"
              markerEnd="url(#arrowhead)"
            />
            <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="0" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#3b82f6" />
                </marker>
            </defs>
          </svg>
      )}

      {/* Node Box */}
      <motion.div
        key={node.id}
        animate={{ 
          left: node.x - nodeWidth / 2,
          top: node.y - NODE_HEIGHT / 2
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`absolute flex items-center border-2 rounded-lg shadow-md overflow-hidden
          ${isHighlighted ? 'border-amber-500 ring-4 ring-amber-200' : 'border-slate-800'}
          ${node.isLeaf ? 'bg-emerald-50' : 'bg-white'} 
        `}
        style={{ 
          width: nodeWidth, 
          height: NODE_HEIGHT, 
          zIndex 
        }}
      >
        {node.keys.map((key) => (
          <motion.div 
            key={key} 
            onClick={(e) => { e.stopPropagation(); onKeyClick?.(key); }}
            className="flex items-center justify-center border-r border-slate-200 last:border-r-0 font-bold text-sm cursor-pointer hover:bg-blue-100 hover:text-blue-600 transition-colors"
            style={{ width: KEY_WIDTH, height: '100%' }}
          >
            {key}
          </motion.div>
        ))}
      </motion.div>
    </>
  );
};
