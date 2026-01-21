import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AVLNode } from '../structures/avl-tree/AVLTree';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TreeNodeProps {
  node: AVLNode | null;
  x: number;
  y: number;
  level: number;
  parentX?: number;
  parentY?: number;
  unbalancedIds?: string[];
  selectedId?: string | null;
  highlightedIds?: string[];
  onNodeClick?: (node: AVLNode) => void;
  onNodeDrag?: (node: AVLNode, direction: 'left' | 'right') => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  getBalance?: (node: AVLNode | null) => number;
  pulsingId?: string | null;
  showHeight?: boolean;
  showBF?: boolean;
}




// Basic constants for layout

const NODE_RADIUS = 25;

const VERTICAL_SPACING = 80;
export const TreeNode: React.FC<TreeNodeProps> = ({
  node, x, y, level, parentX, parentY, unbalancedIds = [], selectedId, highlightedIds = [], onNodeClick, onNodeDrag, onMouseEnter, onMouseLeave, getBalance, pulsingId, showHeight = true, showBF = true
}) => {
  if (!node) return null;

  const [isHovering, setIsHovering] = useState(false);
  const isUnbalanced = unbalancedIds.includes(node.id);
  const isSelected = selectedId === node.id;
  const isHighlighted = highlightedIds.includes(node.id);
  const isPulsing = pulsingId === node.id;
  const isDraggable = !!onNodeDrag;
  const bf = getBalance ? getBalance(node) : 0;

  const spread = Math.pow(2, Math.max(0, node.height - 2)) * 50;

  const leftChildX = x - spread;

  const rightChildX = x + spread;

  const childY = y + VERTICAL_SPACING;
  return (

    <>

      {/* Draw Edge to Parent */}
      {parentX !== undefined && parentY !== undefined && (
        <svg
          className="absolute pointer-events-none"
          style={{
            overflow: 'visible',
            left: 0,
            top: 0,
            zIndex: -1
          }}
        >
          <motion.line
            x1={parentX}
            y1={parentY}
            x2={x}
            y2={y}
            stroke="#94a3b8" // slate-400 (darker)
            strokeWidth="3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5 }}
          />
        </svg>
      )}
      {/* Draw Children recursively */}
      <TreeNode
        node={node.left}
        x={leftChildX}
        y={childY}
        level={level + 1}
        parentX={x}
        parentY={y}
        unbalancedIds={unbalancedIds}
        selectedId={selectedId}
        highlightedIds={highlightedIds}
        onNodeClick={onNodeClick}
        onNodeDrag={onNodeDrag}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        getBalance={getBalance}
        pulsingId={pulsingId}

        showHeight={showHeight}

        showBF={showBF}
      />
      <TreeNode
        node={node.right}
        x={rightChildX}
        y={childY}
        level={level + 1}
        parentX={x}
        parentY={y}
        unbalancedIds={unbalancedIds}
        selectedId={selectedId}
        highlightedIds={highlightedIds}
        onNodeClick={onNodeClick}
        onNodeDrag={onNodeDrag}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        getBalance={getBalance}
        pulsingId={pulsingId}

        showHeight={showHeight}

        showBF={showBF}
      />

      {/* Draw Node */}
      <motion.div
        layout // Enable automatic transition between snapshots
        className={`absolute flex items-center justify-center border-2 rounded-full shadow-md z-10 transition-colors no-pan
                      ${isUnbalanced ? 'border-red-500 bg-red-50' : isSelected ? 'border-blue-600 ring-4 ring-blue-200 bg-white' : isHighlighted ? 'border-yellow-500 bg-yellow-100' : 'border-blue-500 bg-white'}
                      ${isPulsing ? 'ring-8 ring-blue-400/30 border-blue-600' : ''}
                      ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                    `}

        style={{
          width: NODE_RADIUS * 2,
          height: NODE_RADIUS * 2,
          left: x - NODE_RADIUS,
          top: y - NODE_RADIUS,
          touchAction: 'none',
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}

        drag={isDraggable ? "x" : false}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.2}
        dragSnapToOrigin={true}
        onDragEnd={(_e, info) => {
          if (!onNodeDrag) return;
          if (info.offset.x > 30) onNodeDrag(node, 'right');
          else if (info.offset.x < -30) onNodeDrag(node, 'left');
        }}
        onClick={(e) => { e.stopPropagation(); onNodeClick?.(node); }}
        onMouseEnter={() => { setIsHovering(true); onMouseEnter?.(); }}
        onMouseLeave={() => { setIsHovering(false); onMouseLeave?.(); }}
      >
        {/* Drag Direction Indicators */}
        {isDraggable && isHovering && (
          <>
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-blue-500 opacity-70 animate-pulse">
              <ChevronLeft size={18} />
            </div>
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-blue-500 opacity-70 animate-pulse">
              <ChevronRight size={18} />
            </div>
          </>
        )}

        <span className={`font-bold select-none ${isUnbalanced ? 'text-red-700' : 'text-slate-700'}`}>{node.value}</span>



        {/* Balance Factor Indicator */}

        {showBF && (
          <div className={`absolute -top-6 text-xs font-black px-1.5 py-0.5 rounded shadow-sm ${bf > 1 || bf < -1 ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'}`}>

            BF:{bf}

          </div>
        )}
        {/* Height Indicator */}

        {showHeight && (
          <div className="absolute -bottom-6 text-[11px] text-slate-400 select-none uppercase tracking-tighter font-bold">

            H:{node.height - 1}

          </div>
        )}

      </motion.div>

    </>

  );

};