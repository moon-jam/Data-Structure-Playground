import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { LayoutNode } from './layout';

interface FibNodeProps {
  node: LayoutNode;
  highlightedIds?: string[];
  selectedId?: string | null;
  onNodeClick?: (id: string, val: number) => void;
}

const NODE_RADIUS = 25;

export const FibNode: React.FC<FibNodeProps> = ({ 
  node, highlightedIds = [], selectedId, onNodeClick 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isHighlighted = highlightedIds.includes(node.id);
  const isSelected = selectedId === node.id;
  const isMin = node.isMin;

  return (
    <>
      {/* Node Circle */}
      <motion.div
        layout
        layoutId={node.id}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => { e.stopPropagation(); onNodeClick?.(node.id, node.key); }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`absolute flex items-center justify-center border-2 rounded-full shadow-md z-20 font-bold select-none transition-colors cursor-pointer
          ${isSelected ? 'border-blue-600 bg-blue-100 ring-4 ring-blue-300' :
            isHighlighted ? 'border-amber-500 bg-amber-100 ring-4 ring-amber-200' : 
            isMin ? 'border-green-600 bg-green-100 ring-4 ring-green-200' :
            node.mark ? 'border-orange-500 bg-orange-100 text-orange-900' : 'border-blue-600 bg-white text-slate-800'}
        `}
        style={{
          width: NODE_RADIUS * 2,
          height: NODE_RADIUS * 2,
          left: node.x - NODE_RADIUS,
          top: node.y - NODE_RADIUS,
        }}
      >
        {node.key}
        
        {/* Degree Badge */}
        {true && (
          <div className="absolute -top-3 -right-3 bg-slate-800 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-white shadow-sm">
            {node.degree}
          </div>
        )}
        
        {/* Mark Indicator */}
        {node.mark && (
          <div className="absolute -bottom-1 -right-1 text-[10px]">✝️</div>
        )}
      </motion.div>

      {/* Render Children */}
      {node.children.map((child, idx) => {
        const nextChild = node.children[idx + 1];
        return (
        <React.Fragment key={child.id}>
          {/* Edge to Child (Parent -> Child) */}
          <svg className="absolute top-0 left-0 w-px h-px overflow-visible pointer-events-none z-10">
            <motion.line
              animate={{
                x1: node.x,
                y1: node.y + NODE_RADIUS,
                x2: child.x,
                y2: child.y - NODE_RADIUS
              }}
              stroke={isHovered ? "#3b82f6" : "#cbd5e1"}
              strokeWidth={isHovered ? "3" : "2"}
            />
          </svg>

          {/* Sibling Line (Child -> Next Sibling) */}
          {nextChild && (
             <svg className="absolute top-0 left-0 w-px h-px overflow-visible pointer-events-none z-10">
               <motion.line
                 animate={{
                   x1: child.x + NODE_RADIUS,
                   y1: child.y,
                   x2: nextChild.x - NODE_RADIUS,
                   y2: nextChild.y
                 }}
                 stroke={isHovered ? "#3b82f6" : "#94a3b8"}
                 strokeWidth={isHovered ? "2" : "1"}
                 strokeDasharray={isHovered ? "0" : "4 4"}
               />
             </svg>
          )}
          
          <FibNode 
            node={child} 
            highlightedIds={highlightedIds}
            selectedId={selectedId}
            onNodeClick={onNodeClick}
          />
        </React.Fragment>
      )})}
    </>
  );
};
