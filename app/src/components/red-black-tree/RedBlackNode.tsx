import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { RBNode } from '../../structures/red-black-tree/RedBlackTree';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RedBlackNodeProps {
  node: RBNode;
  x: number;
  y: number;
  level: number;
  highlightedIds?: string[];
  selectedId?: string | null;
  onNodeClick?: (node: RBNode) => void;
  onNodeDrag?: (node: RBNode, direction: 'left' | 'right') => void;
  pulsingId?: string | null;
  violations?: RBViolation[];
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

import type { RBViolation } from '../../structures/red-black-tree/RedBlackTree';

const NODE_RADIUS = 25;

export const RedBlackNode: React.FC<RedBlackNodeProps> = ({
  node, x, y, level, highlightedIds = [], selectedId,
  onNodeClick, onNodeDrag, pulsingId, violations = [],
  onMouseEnter, onMouseLeave
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const isHighlighted = highlightedIds.includes(node.id);
  const isSelected = selectedId === node.id;
  const isRed = node.color === 'red';
  const isPulsing = pulsingId === node.id;
  const isDraggable = !!onNodeDrag;

  // Check for specific violations on this node
  const nodeViolations = violations.filter(v => v.nodeIds.includes(node.id));
  const hasError = nodeViolations.length > 0;
  const errorType = nodeViolations[0]?.type; // 'red-red', 'root-red', etc.

  // Framer Motion Drag - Track drag state to prevent click after drag
  const isDragging = useRef(false);

  const handleDragStart = () => {
    isDragging.current = true;
  };

  const handleDragEnd = (_: any, info: any) => {
    const offsetX = info.offset.x;
    if (Math.abs(offsetX) > 30 && onNodeDrag) {
      onNodeDrag(node, offsetX > 0 ? 'right' : 'left');
    }
    // Reset drag state after a short delay to allow onClick to check it
    setTimeout(() => { isDragging.current = false; }, 50);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only trigger click if we weren't dragging
    if (!isDragging.current) {
      onNodeClick?.(node);
    }
  };

  return (
    <>
      {/* Node Circle */}
      <motion.div
        key={node.id}
        initial={{ left: x - NODE_RADIUS, top: y - NODE_RADIUS }}
        animate={{ left: x - NODE_RADIUS, top: y - NODE_RADIUS }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={handleClick}
        onMouseEnter={() => { setIsHovering(true); onMouseEnter?.(); }}
        onMouseLeave={() => { setIsHovering(false); onMouseLeave?.(); }}
        drag={isDraggable ? "x" : false}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.2}
        dragSnapToOrigin={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`absolute flex items-center justify-center border-2 rounded-full shadow-md z-20 font-bold select-none text-white no-pan transition-transform
          ${isSelected ? 'ring-4 ring-blue-400 border-blue-500' : isHighlighted ? 'ring-4 ring-amber-400 border-amber-500' : isRed ? 'border-red-600' : 'border-slate-800'}
          ${isRed ? 'bg-red-500' : 'bg-slate-900'}
          ${hasError ? 'ring-4 ring-red-500/50 animate-pulse' : ''}
          ${isPulsing ? 'animate-bounce ring-4 ring-green-400' : ''}
          ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
        `}
        style={{
          width: NODE_RADIUS * 2,
          height: NODE_RADIUS * 2,
          touchAction: 'none'
        }}
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

        {node.value}

        {/* Violation Badge with visible hover tooltip */}
        {hasError && (
          <div className="absolute -top-3 -right-3 z-30 group">
            <div className="bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded-full border border-white shadow-sm whitespace-nowrap cursor-help">
              {errorType === 'red-red' ? '違規' : errorType === 'root-red' ? '根' : '黑高'}
            </div>
            {/* Tooltip - visible on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
              <div className="bg-slate-900 text-white text-[10px] px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                {errorType === 'red-red' && (
                  <span>⚠️ <b>紅紅違規</b>：紅色節點不能有紅色子節點</span>
                )}
                {errorType === 'root-red' && (
                  <span>⚠️ <b>根節點違規</b>：根節點必須是黑色</span>
                )}
                {errorType === 'black-height' && (
                  <span>⚠️ <b>黑高違規</b>：路徑上的黑色節點數量不一致</span>
                )}
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
            </div>
          </div>
        )}
      </motion.div>

      {/* Children */}
      {node.left && (
        <>
          <Edge parentX={x} parentY={y} childX={node.left.x} childY={node.left.y} childColor={node.left.color} hasError={violations.some(v => v.type === 'red-red' && v.nodeIds.includes(node.id) && v.nodeIds.includes(node.left!.id))} />
          <RedBlackNode node={node.left} x={node.left.x} y={node.left.y} level={level + 1} highlightedIds={highlightedIds} selectedId={selectedId} onNodeClick={onNodeClick} onNodeDrag={onNodeDrag} pulsingId={pulsingId} violations={violations} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
        </>
      )}
      {node.right && (
        <>
          <Edge parentX={x} parentY={y} childX={node.right.x} childY={node.right.y} childColor={node.right.color} hasError={violations.some(v => v.type === 'red-red' && v.nodeIds.includes(node.id) && v.nodeIds.includes(node.right!.id))} />
          <RedBlackNode node={node.right} x={node.right.x} y={node.right.y} level={level + 1} highlightedIds={highlightedIds} selectedId={selectedId} onNodeClick={onNodeClick} onNodeDrag={onNodeDrag} pulsingId={pulsingId} violations={violations} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
        </>
      )}
    </>
  );
};

const Edge = ({ parentX, parentY, childX, childY, childColor, hasError }: { parentX: number, parentY: number, childX: number, childY: number, childColor: 'red' | 'black', hasError?: boolean }) => {
  const strokeColor = hasError ? '#ef4444' : (childColor === 'red' ? '#ef4444' : '#cbd5e1'); // red-500 or slate-300
  return (
    <svg className="absolute top-0 left-0 w-px h-px overflow-visible pointer-events-none z-10">
      <motion.line
        initial={{ x1: parentX, y1: parentY + NODE_RADIUS, x2: childX, y2: childY - NODE_RADIUS }}
        animate={{ x1: parentX, y1: parentY + NODE_RADIUS, x2: childX, y2: childY - NODE_RADIUS }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        stroke={strokeColor}
        strokeWidth={hasError ? "4" : "2"}
        className={hasError ? 'animate-pulse opacity-50' : ''}
      />
    </svg>
  );
};
