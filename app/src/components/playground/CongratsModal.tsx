import React from 'react';
import { Trophy } from 'lucide-react';

interface CongratsModalProps {
  show: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onBackToMenu: () => void;
  backToMenuText: string;
}

export const CongratsModal: React.FC<CongratsModalProps> = ({ 
  show, title, description, onClose, onBackToMenu, backToMenuText 
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in">
        <div className="bg-white rounded-3xl shadow-2xl max-md w-full p-8 text-center space-y-6 animate-in zoom-in-95 duration-300 max-w-md">
            <div className="w-20 h-20 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-yellow-50">
                <Trophy size={40} />
            </div>
            <div className="space-y-2">
                <h2 className="text-3xl font-black text-slate-900">{title}</h2>
                <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line">{description}</p>
            </div>
            <div className="pt-4 space-y-3">
                <button 
                    onClick={onBackToMenu}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-500/20"
                >
                    {backToMenuText}
                </button>
                <button 
                    onClick={onClose}
                    className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors text-xs uppercase tracking-widest"
                >
                    Close
                </button>
            </div>
        </div>
    </div>
  );
};
