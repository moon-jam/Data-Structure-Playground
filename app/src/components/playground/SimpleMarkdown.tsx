import React from 'react';

const renderInline = (input: string, onLinkClick?: (target: string) => void) => {
  const parts = input.split(/(\$\*[\s\S]+?\$|\*\*[\s\S]+?\*\*|\`[\s\S]+?\`|\*[\s\S]+?\*|\[\[[\s\S]+?\]\])/g);
  
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-extrabold text-amber-400 mx-0.5">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-slate-950 px-1.5 py-0.5 rounded text-blue-300 font-mono text-[11px] border border-slate-700/50 mx-0.5 inline-block leading-none shadow-inner">{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="italic text-slate-300 opacity-80 mx-0.5">{part.slice(1, -1)}</em>;
    if (part.startsWith('[[') && part.endsWith(']]')) {
        const [label, target] = part.slice(2, -2).split('|');
        return (<button key={i} onClick={() => onLinkClick?.(target)} className="text-blue-400 font-black border-b border-blue-400/30 hover:text-blue-300 transition-all cursor-pointer mx-0.5">{label}</button>);
    }
    return part;
  });
};

interface SimpleMarkdownProps {
  text: string | null | undefined;
  className?: string;
  onLinkClick?: (target: string) => void;
}

export const SimpleMarkdown: React.FC<SimpleMarkdownProps> = ({ text, className = '', onLinkClick }) => {
  if (!text) return null;

  const lines = text.split('\n');
  return (<div className={`${className} space-y-2 text-[13px]`}>{lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={lineIdx} className="h-2" />;
    if (trimmed.startsWith('|')) {
        if (trimmed.includes('---')) return null;
        const cells = trimmed.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
        const isHeader = (lineIdx === 0) || (lines[lineIdx+1] && lines[lineIdx+1].includes('---'));
        return (<div key={lineIdx} className={`flex border-b border-slate-800 py-2 gap-4 transition-colors ${isHeader ? 'bg-white/5 font-bold border-b-2 border-slate-700' : 'hover:bg-white/5'}`}>{cells.map((cell, cIdx) => (<div key={cIdx} className={`flex-1 px-2 text-sm ${isHeader ? 'text-slate-100' : 'text-slate-400'} break-words`}>{renderInline(cell.trim(), onLinkClick)}</div>))}
</div>);
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) { return (<div key={lineIdx} className="flex gap-3 pl-2 py-0.5"><span className="text-blue-500 font-black text-xs">•</span><div className="flex-grow leading-relaxed">{renderInline(line.trim().substring(2), onLinkClick)}</div></div>); } 
    return (<div key={lineIdx} className="leading-relaxed py-0.5">{renderInline(line, onLinkClick)}</div>);
  })}</div>);
};
