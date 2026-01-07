import React from 'react';
import { motion } from 'framer-motion';

interface SmmhNodeProps {
  value: number | null;
  index: number;
  highlightedIndices: number[];
}

const NODE_SIZE = 40;
const VERTICAL_SPACING = 60;

export const SmmhNode: React.FC<SmmhNodeProps> = ({ value, index, highlightedIndices }) => {
  if (value === null && index > 1) return null;
  
  const isHighlighted = highlightedIndices.includes(index);
  const isMinSide = index % 2 === 0;

  // Level & Position calculation
  const level = Math.floor(Math.log2(index));
  const positionInLevel = index - Math.pow(2, level);
  const totalInLevel = Math.pow(2, level);
  const spread = Math.max(40, 800 / totalInLevel);
  
  const x = (positionInLevel - (totalInLevel - 1) / 2) * spread;
  const y = level * VERTICAL_SPACING;

  if (index === 1) {
      return (
        <div className="absolute flex items-center justify-center border-2 border-dashed border-slate-300 rounded-full z-10 font-bold select-none text-slate-400 bg-white" 
             style={{ width: NODE_SIZE, height: NODE_SIZE, marginLeft: -NODE_SIZE / 2, marginTop: -NODE_SIZE / 2, left: x, top: y }}>
            <span className="text-[10px]">Root</span>
        </div>
      );
  }

  return (
    <>
      <motion.div
        layout
        layoutId={`smmh-${index}`}
        initial={{ scale: 0 }}
        animate={{ x, y, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`absolute flex items-center justify-center border-2 rounded-full shadow-md z-20 font-bold select-none
          ${isHighlighted ? 'border-amber-500 bg-amber-100 ring-4 ring-amber-200 text-amber-900' : 
            isMinSide ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-red-500 bg-red-50 text-red-700'}
        `}
        style={{ width: NODE_SIZE, height: NODE_SIZE, marginLeft: -NODE_SIZE / 2, marginTop: -NODE_SIZE / 2 }}
      >
        {value}
        <div className="absolute -top-4 text-[9px] text-slate-400 font-mono">{index}</div>
      </motion.div>

      <ParentLine index={index} x={x} y={y} />
    </>
  );
};

const ParentLine = ({ index, x, y }: { index: number, x: number, y: number }) => {
  const pIndex = Math.floor(index / 2);
  const pLevel = Math.floor(Math.log2(pIndex));
  const pPos = pIndex - Math.pow(2, pLevel);
  const pTotal = Math.pow(2, pLevel);
  const pSpread = Math.max(40, 800 / pTotal);
  
  const parentX = (pPos - (pTotal - 1) / 2) * pSpread;
  const parentY = pLevel * VERTICAL_SPACING;

  return (
    <svg className="absolute top-0 left-0 w-px h-px overflow-visible pointer-events-none z-10">
      <motion.line
        initial={{ pathLength: 0 }}
        animate={{ x1: parentX, y1: parentY + NODE_SIZE / 2, x2: x, y2: y - NODE_SIZE / 2, pathLength: 1 }}
        stroke="#cbd5e1"
        strokeWidth="2"
      />
    </svg>
  );
};
