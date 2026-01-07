import React from 'react';

interface ControlIslandProps {
  label?: string;
  className?: string;
  children: React.ReactNode;
  tourId?: string;
  metadata?: string;
}

export const ControlIsland: React.FC<ControlIslandProps> = ({ 
  label, 
  className = '', 
  children, 
  tourId, 
  metadata 
}) => {
  return (
    <div className={`flex flex-col gap-2 bg-slate-50/50 border border-slate-100 p-2 sm:p-3 rounded-2xl ${className} ${tourId || ''}`}>
      {(label || metadata) && (
        <div className="flex items-center justify-between mb-1 px-1">
          {label && <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>}
          {metadata && <span className="text-[10px] font-black text-slate-400 uppercase">{metadata}</span>}
        </div>
      )}
      {children}
    </div>
  );
};
