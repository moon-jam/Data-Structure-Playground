import React from 'react';
import { motion } from 'framer-motion';

interface MinMaxNodeProps {
  value: number;
  index: number;
  highlightedIndices: number[];
}

const NODE_SIZE = 40;
const VERTICAL_SPACING = 60;

// Helper to check if level is Min (Even) or Max (Odd)
const isMinLevel = (index: number) => {
  const level = Math.floor(Math.log2(index + 1));
  return level % 2 === 0;
};

export const MinMaxNode: React.FC<MinMaxNodeProps> = ({ value, index, highlightedIndices }) => {
  const isHighlighted = highlightedIndices.includes(index);
  const isMin = isMinLevel(index);

  // Calculate coordinates based on index (Standard Binary Tree Layout)
  const level = Math.floor(Math.log2(index + 1));
  const positionInLevel = index - (Math.pow(2, level) - 1);
  const totalNodesInLevel = Math.pow(2, level);
  
  // Dynamic width based on depth? 
  // For a static view, let's assume max depth 5 (31 nodes).
  // Total width needed ~ 32 * NODE_SIZE.
  // Center is 0.
  // Spread decreases by level.
  // X = (positionInLevel - (totalNodesInLevel - 1) / 2) * SPREAD
  
  const spread = Math.max(40, 800 / Math.pow(2, level));
  const x = (positionInLevel - (totalNodesInLevel - 1) / 2) * spread;
  const y = level * VERTICAL_SPACING;

  return (
    <>
      {/* Node Circle */}
      <motion.div
        layout
        initial={{ scale: 0 }}
        animate={{ x, y, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`absolute flex items-center justify-center border-2 rounded-full shadow-md z-20 font-bold select-none
          ${isHighlighted ? 'border-amber-500 bg-amber-100 ring-4 ring-amber-200 text-amber-900' : 
            isMin ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-red-500 bg-red-50 text-red-700'}
        `}
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE,
          marginLeft: -NODE_SIZE / 2, // Center anchor
          marginTop: -NODE_SIZE / 2,
        }}
      >
        {value}
        
        {/* Index Badge */}
        <div className="absolute -top-4 text-[9px] text-slate-400 font-mono">{index}</div>
      </motion.div>

      {/* Parent Link */}
      {index > 0 && (
        <ParentLine index={index} x={x} y={y} />
      )}
    </>
  );
};

const ParentLine = ({ index, x, y }: { index: number, x: number, y: number }) => {
  const parentIndex = Math.floor((index - 1) / 2);
  const pLevel = Math.floor(Math.log2(parentIndex + 1));
  const pPos = parentIndex - (Math.pow(2, pLevel) - 1);
  const pTotal = Math.pow(2, pLevel);
  const pSpread = Math.max(40, 800 / Math.pow(2, pLevel));
  const parentX = (pPos - (pTotal - 1) / 2) * pSpread;
  const parentY = pLevel * VERTICAL_SPACING;

  return (
    <svg className="absolute top-0 left-0 w-px h-px overflow-visible pointer-events-none z-10">
      <motion.line
        initial={{ pathLength: 0 }}
        animate={{ x1: parentX, y1: parentY + NODE_SIZE/2, x2: x, y2: y - NODE_SIZE/2, pathLength: 1 }}
        stroke="#cbd5e1"
        strokeWidth="2"
      />
    </svg>
  );
};
