import React from 'react';
import { motion } from 'framer-motion';

interface DeapNodeProps {
  value: number | null;
  index: number;
  highlightedIndices: number[];
}

const NODE_SIZE = 40;
const VERTICAL_SPACING = 60;

// Helper to check if node is in Min Heap or Max Heap
// We assume standard DEAP: Index 2 is Min Root, Index 3 is Max Root.
const getNodeType = (index: number) => {
  if (index <= 1) return 'root';
  // Check 2nd MSB
  const msb = Math.floor(Math.log2(index));
  const secondMsb = (index >> (msb - 1)) & 1;
  return secondMsb === 0 ? 'min' : 'max';
};

export const DeapNode: React.FC<DeapNodeProps> = ({ value, index, highlightedIndices }) => {
  if (value === null && index > 1) return null; // Don't render empty nodes?
  
  const isHighlighted = highlightedIndices.includes(index);
  const type = getNodeType(index);

  // Calculate coordinates based on index (Standard Binary Tree Layout)
  const level = Math.floor(Math.log2(index));
  const positionInLevel = index - Math.pow(2, level);
  const totalNodesInLevel = Math.pow(2, level);
  
  const spread = Math.max(40, 800 / Math.pow(2, level));
  const x = (positionInLevel - (totalNodesInLevel - 1) / 2) * spread;
  const y = level * VERTICAL_SPACING;

  // Root (Index 1) is hidden or placeholder? 
  // DEAP Root is empty. Let's show it as a small dot or ghost.
  if (index === 1) {
      return (
        <>
            <div className="absolute flex items-center justify-center border-2 border-dashed border-slate-300 rounded-full z-10 font-bold select-none text-slate-400 bg-white" 
                style={{ 
                    width: NODE_SIZE, 
                    height: NODE_SIZE, 
                    marginLeft: -NODE_SIZE / 2, 
                    marginTop: -NODE_SIZE / 2, 
                    left: x, 
                    top: y 
                }}>
                <span className="text-xs">Root</span>
            </div>
            {/* Draw lines to children */}
            <ParentLine index={2} x={(-0.5) * (Math.max(40, 800/2))} y={VERTICAL_SPACING} parentX={x} parentY={y} />
            <ParentLine index={3} x={(0.5) * (Math.max(40, 800/2))} y={VERTICAL_SPACING} parentX={x} parentY={y} />
        </>
      );
  }

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
            type === 'min' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-red-500 bg-red-50 text-red-700'}
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
      {index > 3 && ( // 2 and 3 connect to 1 via special handling above
        <ParentLine index={index} x={x} y={y} />
      )}
    </>
  );
};

const ParentLine = ({ index, x, y, parentX, parentY }: { index: number, x: number, y: number, parentX?: number, parentY?: number }) => {
  if (parentX === undefined || parentY === undefined) {
      // Calculate parent pos
      const parentIndex = Math.floor(index / 2);
      const pLevel = Math.floor(Math.log2(parentIndex));
      const pPos = parentIndex - Math.pow(2, pLevel);
      const pTotal = Math.pow(2, pLevel);
      const pSpread = Math.max(40, 800 / Math.pow(2, pLevel));
      parentX = (pPos - (pTotal - 1) / 2) * pSpread;
      parentY = pLevel * VERTICAL_SPACING;
  }

  return (
    <svg className="absolute top-0 left-0 w-px h-px overflow-visible pointer-events-none z-10">
      <motion.line
        initial={{ pathLength: 0 }}
        animate={{ x1: parentX, y1: parentY! + NODE_SIZE/2, x2: x, y2: y - NODE_SIZE/2, pathLength: 1 }}
        stroke="#cbd5e1"
        strokeWidth="2"
      />
    </svg>
  );
};
