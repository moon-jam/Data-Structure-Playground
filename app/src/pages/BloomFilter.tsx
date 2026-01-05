import React from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';

export const BloomFilterPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6">
      <div className="bg-blue-50 p-6 rounded-full mb-8 animate-in zoom-in duration-500">
        <Sparkles size={64} className="text-blue-500" />
      </div>
      
      <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
        Bloom Filter? 簡單啦！
      </h1>
      
      <p className="text-xl text-slate-500 max-w-2xl mb-10 leading-relaxed font-medium">
        先看這篇就夠了！有空再來做，或者交給你發 PR 了 owo/
      </p>
      
      <a 
        href="https://moon-jam.me/Bloom-filters/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="group flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-600 transition-all shadow-xl hover:shadow-blue-500/30 hover:-translate-y-1 active:scale-95"
      >
        <span>前往教學文章</span>
        <ExternalLink size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
      </a>
    </div>
  );
};
